import unittest
import asyncio
import os
import sys

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.kernel_manager import KernelManager

class TestKernelManager(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.kernel = KernelManager()
        await self.kernel.start_kernel()

    async def asyncTearDown(self):
        await self.kernel.shutdown_kernel()

    async def test_kernel_spawning(self):
        """Verify the kernel launches and responds to a health check (ping)."""
        is_healthy = await self.kernel.check_health()
        self.assertTrue(is_healthy)

    async def test_code_execution_stdout(self):
        """Verify simple prints return stdout correctly."""
        code = "print('hello from test')"
        outputs = []
        async for msg in self.kernel.execute(code):
            if msg["type"] == "stdout":
                outputs.append(msg["content"])
        
        self.assertIn("hello from test\n", outputs)

    async def test_state_persistence(self):
        """Verify variable state persists across executions."""
        # Execute cell 1
        async for _ in self.kernel.execute("x = 42"):
            pass

        # Execute cell 2 and read x
        outputs = []
        async for msg in self.kernel.execute("print(x)"):
            if msg["type"] == "stdout":
                outputs.append(msg["content"])

        self.assertIn("42\n", outputs)

    async def test_interrupt_execution(self):
        """Verify long sleeping tasks can be interrupted, producing KeyboardInterrupt."""
        # Run sleeping command in background task
        code = "import time\ntime.sleep(10)"
        
        async def run_code():
            messages = []
            async for msg in self.kernel.execute(code):
                messages.append(msg)
            return messages

        task = asyncio.create_task(run_code())
        # Give it a moment to begin executing
        await asyncio.sleep(0.5)

        # Trigger interrupt
        await self.kernel.interrupt()

        messages = await task
        
        # Verify an error of KeyboardInterrupt occurred
        error_found = False
        for msg in messages:
            if msg["type"] == "error":
                error_found = True
                self.assertIn("KeyboardInterrupt", msg["content"])
        
        self.assertTrue(error_found, "Interrupt did not raise KeyboardInterrupt error message")

if __name__ == "__main__":
    unittest.main()
