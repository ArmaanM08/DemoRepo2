import os
import sys
from pathlib import Path

# ─── Detect if running as a PyInstaller-compiled executable ───────────────────
IS_FROZEN = getattr(sys, 'frozen', False)

# ─── Backend directory ─────────────────────────────────────────────────────────
if IS_FROZEN:
    # When packaged with PyInstaller, __file__ is inside the bundle.
    # The actual exe is at sys.executable. Parent of that is backend_dist/.
    BACKEND_DIR = Path(sys.executable).resolve().parent
else:
    # Dev mode: this config.py lives in backend/app/, so parent.parent = backend/
    BACKEND_DIR = Path(__file__).resolve().parent.parent

# ─── Workspace directory ───────────────────────────────────────────────────────
if IS_FROZEN:
    # In packaged mode, use a writable user-specific workspace directory.
    # This prevents writing notebooks to read-only install directories.
    if sys.platform == 'win32':
        _appdata = os.environ.get('APPDATA', Path.home() / 'AppData' / 'Roaming')
        WORKSPACE_DIR = Path(_appdata) / 'NavrangNotebook' / 'workspace'
    else:
        WORKSPACE_DIR = Path.home() / '.navrang_notebook' / 'workspace'
    WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)
else:
    # Dev mode: workspace is the project root
    WORKSPACE_DIR = BACKEND_DIR.parent.resolve()

# ─── Python executable ────────────────────────────────────────────────────────
if IS_FROZEN:
    # In frozen mode, use the system Python (must be installed on the user's PC)
    # or fall back to the bundled ipykernel if available.
    if sys.platform == 'win32':
        VENV_PYTHON = Path(sys.executable).parent / 'python.exe'
        if not VENV_PYTHON.exists():
            # Look for Python in PATH
            import shutil
            _py = shutil.which('python')
            VENV_PYTHON = Path(_py) if _py else Path('python')
    else:
        import shutil
        _py = shutil.which('python3') or shutil.which('python')
        VENV_PYTHON = Path(_py) if _py else Path('python3')
else:
    # Dev mode: prefer venv Python
    if sys.platform == 'win32':
        # Windows venv uses Scripts\ not bin\
        VENV_PYTHON = BACKEND_DIR / 'venv' / 'Scripts' / 'python.exe'
    else:
        VENV_PYTHON = BACKEND_DIR / 'venv' / 'bin' / 'python3'

    if not VENV_PYTHON.exists():
        import shutil as _shutil
        _py = _shutil.which('python3') or _shutil.which('python')
        VENV_PYTHON = Path(_py) if _py else Path('python3')

PORT = 8000
HOST = "127.0.0.1"

# ─── Temp folder for kernel connection files ───────────────────────────────────
if IS_FROZEN:
    if sys.platform == 'win32':
        _appdata = os.environ.get('APPDATA', Path.home() / 'AppData' / 'Roaming')
        TEMP_DIR = Path(_appdata) / 'NavrangNotebook' / 'temp'
    else:
        TEMP_DIR = Path.home() / '.navrang_notebook' / 'temp'
else:
    TEMP_DIR = BACKEND_DIR / 'temp'

TEMP_DIR.mkdir(parents=True, exist_ok=True)
