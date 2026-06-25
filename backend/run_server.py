# backend/run_server.py
# Entry point for PyInstaller compilation and standalone execution.
# This script is used by PyInstaller to produce backend.exe for Windows.

import multiprocessing
import sys
import os

def main():
    # CRITICAL: freeze_support() must be called before anything else on Windows
    # to prevent recursive subprocess spawning when the PyInstaller bundle launches.
    multiprocessing.freeze_support()

    # Add the bundled app directory to Python path so imports resolve correctly
    if getattr(sys, 'frozen', False):
        # Running as compiled PyInstaller exe
        bundle_dir = sys._MEIPASS
        sys.path.insert(0, bundle_dir)

    import uvicorn
    from app.main import app

    # Accept port from command line argument (injected by Electron main.js)
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except (ValueError, IndexError):
            pass

    # Determine host — always 127.0.0.1 for local-only desktop app
    host = "127.0.0.1"

    print(f"[NavrangBackend] Starting FastAPI on {host}:{port}", flush=True)

    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="warning",   # Reduce log verbosity for production
        access_log=False,      # Disable access logs to reduce CPU overhead
    )

if __name__ == "__main__":
    main()
