import asyncio
import json
import os
import sys
import uuid
import datetime
import subprocess
import signal
import zmq
import zmq.asyncio
import logging
from typing import AsyncGenerator, Dict, Any, Tuple
from app.config import TEMP_DIR, VENV_PYTHON

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

def get_free_port() -> int:
    """Finds a free port on localhost."""
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        return s.getsockname()[1]

class KernelManager:
    def __init__(self, python_exec: str = str(VENV_PYTHON), cwd: str = None):
        self.python_exec = python_exec
        self.cwd = cwd
        self.process: subprocess.Popen = None
        self.connection_file: str = None
        self.ports: Dict[str, int] = {}
        self.context: zmq.asyncio.Context = None
        
        # ZMQ Sockets
        self.shell_socket: zmq.asyncio.Socket = None
        self.iopub_socket: zmq.asyncio.Socket = None
        self.control_socket: zmq.asyncio.Socket = None
        self.hb_socket: zmq.asyncio.Socket = None
        
        self.session_id = str(uuid.uuid4())
        self.is_running = False

    async def start_kernel(self):
        """Starts the ipykernel subprocess and establishes ZMQ connections."""
        if self.is_running:
            await self.shutdown_kernel()

        # 1. Allocate free ports
        self.ports = {
            "shell_port": get_free_port(),
            "iopub_port": get_free_port(),
            "stdin_port": get_free_port(),
            "control_port": get_free_port(),
            "hb_port": get_free_port()
        }

        # 2. Write connection file
        self.connection_file = os.path.join(TEMP_DIR, f"kernel-{uuid.uuid4()}.json")
        connection_config = {
            "ip": "127.0.0.1",
            "transport": "tcp",
            "signature_scheme": "hmac-sha256",
            "key": "",  # Empty key means no HMAC signatures required (easier local communication)
            **self.ports
        }
        with open(self.connection_file, 'w') as f:
            json.dump(connection_config, f)

        # 3. Launch ipykernel launcher subprocess
        cmd = [
            self.python_exec,
            "-m",
            "ipykernel_launcher",
            "-f",
            self.connection_file
        ]
        
        logger.info(f"Spawning kernel: {' '.join(cmd)}")
        
        # Set process creation flags for cross-platform interrupt signal handling
        if sys.platform == 'win32':
            self.process = subprocess.Popen(
                cmd,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=self.cwd
            )
        else:
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=self.cwd
            )

        # 4. Connect ZMQ Sockets
        self.context = zmq.asyncio.Context()
        
        self.shell_socket = self.context.socket(zmq.DEALER)
        self.shell_socket.connect(f"tcp://127.0.0.1:{self.ports['shell_port']}")

        self.control_socket = self.context.socket(zmq.DEALER)
        self.control_socket.connect(f"tcp://127.0.0.1:{self.ports['control_port']}")

        self.iopub_socket = self.context.socket(zmq.SUB)
        self.iopub_socket.setsockopt(zmq.SUBSCRIBE, b'')
        self.iopub_socket.connect(f"tcp://127.0.0.1:{self.ports['iopub_port']}")

        # Heartbeat REQ socket
        self.hb_socket = self.context.socket(zmq.REQ)
        self.hb_socket.connect(f"tcp://127.0.0.1:{self.ports['hb_port']}")

        self.is_running = True
        logger.info("Kernel started and ZMQ connections established.")

        # Run setup commands to enable inline plotting automatically
        await self.run_setup_commands()

    async def run_setup_commands(self):
        """Runs standard setup imports like inline matplotlib in the kernel background."""
        setup_code = (
            "import matplotlib\n"
            "matplotlib.use('module://matplotlib_inline.backend_inline')\n"
            "import matplotlib.pyplot as plt\n"
            "%matplotlib inline\n"
        )
        # Execute silently
        async for _ in self.execute(setup_code, silent=True):
            pass

    async def shutdown_kernel(self):
        """Cleanly shuts down the ZMQ sockets and terminates the process."""
        self.is_running = False
        
        # 1. Close sockets
        for sock in [self.shell_socket, self.iopub_socket, self.control_socket, self.hb_socket]:
            if sock:
                try:
                    sock.close(linger=0)
                except Exception as e:
                    logger.error(f"Error closing socket: {e}")

        # 2. Terminate subprocess
        if self.process:
            try:
                self.process.terminate()
                # Give it a moment to terminate
                for _ in range(10):
                    if self.process.poll() is not None:
                        break
                    await asyncio.sleep(0.1)
                
                # Force kill if still running
                if self.process.poll() is None:
                    self.process.kill()
            except Exception as e:
                logger.error(f"Error terminating kernel process: {e}")
            self.process = None

        # 3. Destroy context
        if self.context:
            try:
                self.context.destroy(linger=0)
            except Exception as e:
                logger.error(f"Error destroying ZMQ context: {e}")
            self.context = None

        # 4. Clean connection file
        if self.connection_file and os.path.exists(self.connection_file):
            try:
                os.remove(self.connection_file)
            except Exception as e:
                logger.error(f"Error removing connection file: {e}")
            self.connection_file = None

        logger.info("Kernel successfully shut down.")

    async def interrupt(self):
        """Interrupts the currently executing cells."""
        if not self.process or self.process.poll() is not None:
            logger.warning("Kernel is not running, cannot interrupt.")
            return

        logger.info("Interrupting kernel execution...")
        try:
            if sys.platform == 'win32':
                # On Windows, os.kill with CTRL_C_EVENT interrupts process groups
                os.kill(self.process.pid, signal.CTRL_C_EVENT)
            else:
                self.process.send_signal(signal.SIGINT)
        except Exception as e:
            logger.error(f"Failed to interrupt kernel: {e}")

    def _pack_message(self, msg_type: str, content: Dict[str, Any], silent: bool = False) -> list:
        """Packs a message according to the Jupyter Wire Protocol."""
        header = {
            "msg_id": str(uuid.uuid4()),
            "username": "navrang",
            "session": self.session_id,
            "date": datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00', 'Z'),
            "msg_type": msg_type,
            "version": "5.3"
        }
        
        return [
            b'<IDS|MSG>',
            b'',  # empty signature
            json.dumps(header).encode('utf-8'),
            json.dumps({}).encode('utf-8'),  # empty parent header
            json.dumps({}).encode('utf-8'),  # empty metadata
            json.dumps(content).encode('utf-8')
        ]

    def _unpack_message(self, frames: list) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
        """Unpacks Jupyter wire protocol ZMQ frames."""
        delim_idx = -1
        for i, frame in enumerate(frames):
            if frame == b'<IDS|MSG>':
                delim_idx = i
                break
        
        if delim_idx == -1:
            raise ValueError("Jupyter message delimiter not found in ZMQ frames.")

        header = json.loads(frames[delim_idx + 2].decode('utf-8'))
        parent_header = json.loads(frames[delim_idx + 3].decode('utf-8'))
        metadata = json.loads(frames[delim_idx + 4].decode('utf-8'))
        content = json.loads(frames[delim_idx + 5].decode('utf-8'))

        return header, parent_header, metadata, content

    async def execute(self, code: str, silent: bool = False) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Sends an execution request to the kernel and yields outputs as they arrive.
        Outputs are yielded in standard format: { "type": "stdout/stderr/error/execute_result/display_data", "content": ... }
        """
        if not self.is_running:
            raise RuntimeError("Kernel is not running. Please start the kernel first.")

        # 1. Construct execute_request message
        content = {
            "code": code,
            "silent": silent,
            "store_history": not silent,
            "user_expressions": {},
            "allow_stdin": False,
            "stop_on_error": True
        }
        
        msg_frames = self._pack_message("execute_request", content, silent)
        msg_header = json.loads(msg_frames[2].decode('utf-8'))
        msg_id = msg_header["msg_id"]

        # Send request
        await self.shell_socket.send_multipart(msg_frames)

        # 2. Wait for reply and stream IOPub outputs
        reply_received = False
        idle_received = False
        execution_count = None

        shell_task = None
        iopub_task = None

        try:
            while not (reply_received and idle_received):
                if not reply_received and shell_task is None:
                    shell_task = asyncio.ensure_future(self.shell_socket.recv_multipart())
                if not idle_received and iopub_task is None:
                    iopub_task = asyncio.ensure_future(self.iopub_socket.recv_multipart())

                pending_tasks = []
                if shell_task is not None:
                    pending_tasks.append(shell_task)
                if iopub_task is not None:
                    pending_tasks.append(iopub_task)

                if not pending_tasks:
                    break

                # Wait for any socket to yield a message
                done, _ = await asyncio.wait(
                    pending_tasks,
                    return_when=asyncio.FIRST_COMPLETED
                )

                for completed_task in done:
                    frames = completed_task.result()
                    
                    if completed_task is shell_task:
                        shell_task = None
                    elif completed_task is iopub_task:
                        iopub_task = None

                    header, parent_header, metadata, msg_content = self._unpack_message(frames)
                    
                    # Match messages targeting our current execution request
                    if parent_header.get("msg_id") != msg_id:
                        continue

                    msg_type = header["msg_type"]

                    if msg_type == "status":
                        state = msg_content.get("execution_state")
                        if state == "idle":
                            idle_received = True
                    
                    elif msg_type == "execute_reply":
                        reply_received = True
                        execution_count = msg_content.get("execution_count")
                        # Yield completion status
                        yield {
                            "type": "finished",
                            "status": msg_content.get("status"),  # 'ok' or 'error'
                            "execution_count": execution_count
                        }
                    
                    elif msg_type == "stream":
                        name = msg_content.get("name")  # 'stdout' or 'stderr'
                        text = msg_content.get("text")
                        yield {
                            "type": name,
                            "content": text
                        }
                    
                    elif msg_type == "execute_result" or msg_type == "display_data":
                        data = msg_content.get("data", {})
                        # Prioritize rendering format: image/png, text/html, then text/plain
                        if "image/png" in data:
                            yield {
                                "type": "image/png",
                                "content": data["image/png"]  # Base64 string
                            }
                        elif "text/html" in data:
                            yield {
                                "type": "text/html",
                                "content": data["text/html"]
                            }
                        elif "text/plain" in data:
                            yield {
                                "type": "text/plain",
                                "content": data["text/plain"]
                            }
                    
                    elif msg_type == "error":
                        ename = msg_content.get("ename")
                        evalue = msg_content.get("evalue")
                        traceback = msg_content.get("traceback")
                        yield {
                            "type": "error",
                            "ename": ename,
                            "evalue": evalue,
                            "content": "\n".join(traceback)
                        }
        finally:
            if shell_task is not None and not shell_task.done():
                shell_task.cancel()
            if iopub_task is not None and not iopub_task.done():
                iopub_task.cancel()

    async def get_variables(self) -> list:
        """Queries the kernel session for variable inspector contents."""
        # Execute variable inspection python code dynamically
        var_query_code = (
            "import json, sys\n"
            "def _inspect_variables():\n"
            "    globals_dict = {k: v for k, v in globals().items() if not k.startswith('_')}\n"
            "    res = []\n"
            "    for name, val in globals_dict.items():\n"
            "        try:\n"
            "            t = type(val).__name__\n"
            "            if t == 'module': continue\n"
            "            v_str = str(val)\n"
            "            if len(v_str) > 100: v_str = v_str[:97] + '...'\n"
            "            shape_str = ''\n"
            "            if hasattr(val, 'shape'):\n"
            "                shape_str = f'{val.shape[0]} rows x {val.shape[1]} cols' if len(val.shape) == 2 else str(val.shape)\n"
            "            res.append({'name': name, 'type': t, 'value': v_str, 'shape': shape_str})\n"
            "        except: pass\n"
            "    print('__VARS_JSON_START__' + json.dumps(res) + '__VARS_JSON_END__')\n"
            "_inspect_variables()\n"
            "del _inspect_variables\n"
        )
        
        variables = []
        async for msg in self.execute(var_query_code, silent=True):
            if msg["type"] == "stdout":
                text = msg["content"]
                if "__VARS_JSON_START__" in text and "__VARS_JSON_END__" in text:
                    try:
                        start = text.find("__VARS_JSON_START__") + len("__VARS_JSON_START__")
                        end = text.find("__VARS_JSON_END__")
                        json_str = text[start:end]
                        variables = json.loads(json_str)
                    except Exception as e:
                        logger.error(f"Error parsing variable inspect output: {e}")
        return variables

    async def check_health(self) -> bool:
        """Performs a ping to check if the kernel is alive."""
        if not self.is_running or not self.process or self.process.poll() is not None:
            return False
        
        # Ping the control channel or heartbeat REQ socket
        try:
            # Send empty ping request on heartbeat channel
            await self.hb_socket.send(b'ping')
            
            # Use asyncio.wait_for to prevent hanging on response
            response = await asyncio.wait_for(self.hb_socket.recv(), timeout=1.0)
            return response == b'ping'
        except Exception:
            return False
