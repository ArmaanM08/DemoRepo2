import os
import sys
import json
import logging
import asyncio
from typing import Dict
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app.config import WORKSPACE_DIR, VENV_PYTHON
from app.kernel_manager import KernelManager
from app.notebook_manager import load_ipynb, save_ipynb, export_to_py

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Navrang Notebook Backend", version="0.3.1")

# Enable CORS for frontend development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registry of active notebook kernels: notebook_id -> KernelManager
KERNELS: Dict[str, KernelManager] = {}

class FileCreateRequest(BaseModel):
    path: str
    type: str  # 'notebook', 'folder', 'file'

class FileRenameRequest(BaseModel):
    old_path: str
    new_path: str

class NotebookSaveRequest(BaseModel):
    path: str
    cells: list

class NotebookExportRequest(BaseModel):
    path: str
    format: str

# --- FILE OPERATIONS API ---

def get_dir_node(abs_path: str, rel_path: str) -> dict:
    """Helper to build a directory tree recursively matching frontend FileNode type."""
    name = os.path.basename(abs_path)
    
    # Hide system/hidden folders
    if name.startswith('.') or name in ('node_modules', 'venv', '__pycache__', 'temp', 'backend', 'frontend'):
        return None

    if os.path.isdir(abs_path):
        children = []
        try:
            for item in os.listdir(abs_path):
                child_abs = os.path.join(abs_path, item)
                child_rel = os.path.join(rel_path, item) if rel_path else item
                node = get_dir_node(child_abs, child_rel)
                if node:
                    children.append(node)
        except Exception:
            pass
        
        # Sort directories first, then alphabetically
        children.sort(key=lambda x: (x["type"] != "folder", x["name"].lower()))
        
        return {
            "id": rel_path,
            "name": name,
            "type": "folder",
            "expanded": False,
            "children": children
        }
    else:
        # Determine if it's a notebook or regular file
        node_type = "notebook" if name.endswith(".ipynb") else "file"
        color = "#22c55e" if node_type == "notebook" else None
        
        return {
            "id": rel_path,
            "name": name,
            "type": node_type,
            "color": color
        }

@app.get("/api/files")
def list_files():
    """Returns the workspace file directory structure."""
    try:
        root_nodes = []
        for item in os.listdir(WORKSPACE_DIR):
            abs_path = os.path.join(WORKSPACE_DIR, item)
            node = get_dir_node(abs_path, item)
            if node:
                root_nodes.append(node)
                
        # Sort folder nodes first
        root_nodes.sort(key=lambda x: (x["type"] != "folder", x["name"].lower()))
        return root_nodes
    except Exception as e:
        logger.error(f"Error listing files: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/files/create")
def create_file(req: FileCreateRequest):
    """Creates a new notebook, folder, or standard file."""
    abs_path = os.path.join(WORKSPACE_DIR, req.path)
    if os.path.exists(abs_path):
        raise HTTPException(status_code=400, detail="File already exists.")

    try:
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        if req.type == "folder":
            os.makedirs(abs_path, exist_ok=True)
        elif req.type == "notebook":
            # Save an empty notebook JSON
            save_ipynb(req.path, [])
        else:
            with open(abs_path, 'w') as f:
                f.write("")
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Error creating file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/files/rename")
def rename_file(req: FileRenameRequest):
    """Renames an existing file or directory."""
    abs_old = os.path.join(WORKSPACE_DIR, req.old_path)
    abs_new = os.path.join(WORKSPACE_DIR, req.new_path)
    
    if not os.path.exists(abs_old):
        raise HTTPException(status_code=404, detail="Source file not found.")
    if os.path.exists(abs_new):
        raise HTTPException(status_code=400, detail="Target path already exists.")

    try:
        os.rename(abs_old, abs_new)
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Error renaming file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/files")
def delete_file(path: str):
    """Deletes a file or directory recursively."""
    abs_path = os.path.join(WORKSPACE_DIR, path)
    if not os.path.exists(abs_path):
        raise HTTPException(status_code=404, detail="File not found.")

    try:
        if os.path.isdir(abs_path):
            shutil.rmtree(abs_path)
        else:
            os.remove(abs_path)
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Error deleting file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- NOTEBOOK CRUD API ---

@app.get("/api/notebooks")
def get_notebook(path: str):
    """Loads and returns a notebook from the workspace."""
    try:
        cells = load_ipynb(path)
        return {"cells": cells}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error loading notebook: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/notebooks/save")
def save_notebook(req: NotebookSaveRequest):
    """Saves notebook cell arrays into workspace path."""
    try:
        save_ipynb(req.path, req.cells)
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Error saving notebook: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/notebooks/export")
def export_notebook(req: NotebookExportRequest):
    """Exports notebook to py Python format."""
    if req.format != "py":
        raise HTTPException(status_code=400, detail="Unsupported export format.")
    
    py_path = req.path.replace(".ipynb", ".py")
    try:
        export_to_py(req.path, py_path)
        return {"status": "ok", "exported_path": py_path}
    except Exception as e:
        logger.error(f"Error exporting notebook: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- EXECUTION WEBOSCKETS ---

async def get_or_create_kernel(notebook_id: str) -> KernelManager:
    """Gets or initializes the KernelManager for a notebook session."""
    if notebook_id not in KERNELS:
        if os.path.isabs(notebook_id):
            abs_notebook_path = os.path.normpath(notebook_id)
        else:
            abs_notebook_path = os.path.normpath(os.path.join(WORKSPACE_DIR, notebook_id))
        
        notebook_dir = os.path.dirname(abs_notebook_path)
        if not os.path.exists(notebook_dir):
            notebook_dir = WORKSPACE_DIR
            
        kernel = KernelManager(cwd=notebook_dir)
        await kernel.start_kernel()
        KERNELS[notebook_id] = kernel
    return KERNELS[notebook_id]

@app.websocket("/api/kernels/ws")
async def execution_websocket(websocket: WebSocket):
    await websocket.accept()
    logger.info("Kernel execution WS connection accepted.")
    
    try:
        while True:
            data = await websocket.receive_text()
            req = json.loads(data)
            
            req_type = req.get("type")
            notebook_id = req.get("notebook_id")
            
            if not notebook_id:
                await websocket.send_json({"type": "error", "message": "Missing notebook_id"})
                continue
                
            if req_type == "execute":
                cell_id = req.get("cell_id")
                code = req.get("code", "")
                
                try:
                    kernel = await get_or_create_kernel(notebook_id)
                    
                    # Notify frontend that execution has started
                    await websocket.send_json({
                        "type": "status",
                        "notebook_id": notebook_id,
                        "cell_id": cell_id,
                        "status": "busy"
                    })
                    
                    # Run execution and stream updates
                    async for out_msg in kernel.execute(code):
                        if out_msg["type"] == "finished":
                            await websocket.send_json({
                                "type": "finished",
                                "notebook_id": notebook_id,
                                "cell_id": cell_id,
                                "status": out_msg["status"],
                                "execution_count": out_msg["execution_count"]
                            })
                        else:
                            await websocket.send_json({
                                "type": "output",
                                "notebook_id": notebook_id,
                                "cell_id": cell_id,
                                "output_type": out_msg["type"],
                                "content": out_msg.get("content", ""),
                                "ename": out_msg.get("ename"),
                                "evalue": out_msg.get("evalue")
                            })
                        
                    # Request updated variables from the kernel session
                    variables = await kernel.get_variables()
                    await websocket.send_json({
                        "type": "variables",
                        "notebook_id": notebook_id,
                        "variables": variables
                    })
                    
                except Exception as e:
                    logger.error(f"Execution error on cell {cell_id}: {e}")
                    await websocket.send_json({
                        "type": "output",
                        "notebook_id": notebook_id,
                        "cell_id": cell_id,
                        "type": "error",
                        "content": f"Execution failed: {str(e)}"
                    })
                finally:
                    # Notify completion
                    await websocket.send_json({
                        "type": "status",
                        "notebook_id": notebook_id,
                        "cell_id": cell_id,
                        "status": "idle"
                    })
                    
            elif req_type == "interrupt":
                if notebook_id in KERNELS:
                    await KERNELS[notebook_id].interrupt()
                    await websocket.send_json({
                        "type": "notification",
                        "notebook_id": notebook_id,
                        "message": "Execution interrupted"
                    })
                    
            elif req_type == "restart":
                if notebook_id in KERNELS:
                    kernel = KERNELS[notebook_id]
                    await websocket.send_json({
                        "type": "notification",
                        "notebook_id": notebook_id,
                        "message": "Restarting kernel..."
                    })
                    await kernel.shutdown_kernel()
                    await kernel.start_kernel()
                    await websocket.send_json({
                        "type": "notification",
                        "notebook_id": notebook_id,
                        "message": "Kernel restarted successfully"
                    })
                    # Clear variables state
                    await websocket.send_json({
                        "type": "variables",
                        "notebook_id": notebook_id,
                        "variables": []
                    })
                    
    except WebSocketDisconnect:
        logger.info("Kernel execution WS disconnected.")
    except Exception as e:
        logger.error(f"Error in execution websocket loop: {e}")

# --- TERMINAL WEBOSCKET API ---

@app.websocket("/api/terminal/ws")
async def terminal_websocket(websocket: WebSocket):
    await websocket.accept()
    logger.info("Terminal WS connection accepted.")
    
    try:
        while True:
            # Receive shell command from user
            data = await websocket.receive_text()
            req = json.loads(data)
            cmd = req.get("command", "").strip()
            
            if not cmd:
                continue

            if cmd == "clear" or cmd == "cls":
                await websocket.send_json({"output": "\x1bclear"})
                continue
                
            # Run command asynchronously, using our virtualenv environment path prepended
            env = os.environ.copy()
            venv_bin = os.path.dirname(VENV_PYTHON)
            env["PATH"] = f"{venv_bin}{os.pathsep}{env.get('PATH', '')}"
            
            logger.info(f"Running terminal command: {cmd}")
            
            try:
                # We spawn the shell command, capturing stdout and stderr
                proc = await asyncio.create_subprocess_shell(
                    cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    env=env,
                    cwd=str(WORKSPACE_DIR)
                )
                
                # Helper to read stream and forward to socket
                async def read_stream(stream, name):
                    while True:
                        line = await stream.readline()
                        if not line:
                            break
                        line_str = line.decode('utf-8', errors='replace')
                        await websocket.send_json({"output": line_str})
                
                # Run stdout and stderr reading concurrently
                await asyncio.gather(
                    read_stream(proc.stdout, "stdout"),
                    read_stream(proc.stderr, "stderr")
                )
                
                await proc.wait()
                
            except Exception as e:
                await websocket.send_json({"output": f"Shell error: {str(e)}\n"})
                
    except WebSocketDisconnect:
        logger.info("Terminal WS disconnected.")
    except Exception as e:
        logger.error(f"Error in terminal websocket loop: {e}")

# --- STATIC FILE SERVING FOR PRODUCTION PACKAGING ---

# Check if built frontend assets exist
frontend_dist_path = os.path.join(WORKSPACE_DIR, "frontend", "dist")
if os.path.exists(frontend_dist_path):
    logger.info(f"Mounting static files from {frontend_dist_path}")
    app.mount("/", StaticFiles(directory=frontend_dist_path, html=True), name="static")
else:
    logger.warning("Vite dist folder not found. API only mode enabled.")
