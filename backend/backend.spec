# -*- mode: python ; coding: utf-8 -*-
# backend.spec — PyInstaller build spec for Navrang Notebook backend (Windows)
#
# BUILD INSTRUCTIONS (run on Windows):
#   pip install pyinstaller
#   pyinstaller backend.spec
#
# Output: dist/backend_dist/backend.exe

from PyInstaller.utils.hooks import collect_data_files, collect_submodules
import sys
import os

block_cipher = None

# ─── Collect all required data files ───────────────────────────────────────────
datas = []
datas += collect_data_files('ipykernel')
datas += collect_data_files('zmq')
datas += collect_data_files('uvicorn')
datas += collect_data_files('fastapi')

# ─── Hidden imports (modules that PyInstaller static analysis misses) ──────────
hiddenimports = []
hiddenimports += collect_submodules('ipykernel')
hiddenimports += collect_submodules('zmq')
hiddenimports += [
    # uvicorn internals
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.http.h11_impl',
    'uvicorn.protocols.http.httptools_impl',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.protocols.websockets.wsproto_impl',
    'uvicorn.protocols.websockets.websockets_impl',
    'uvicorn.lifespan.on',
    'uvicorn.lifespan.off',
    # fastapi / starlette
    'fastapi',
    'starlette.routing',
    'starlette.middleware.cors',
    'starlette.staticfiles',
    'starlette.responses',
    # pydantic
    'pydantic',
    'pydantic.deprecated.class_validators',
    # app modules
    'app.main',
    'app.config',
    'app.kernel_manager',
    'app.notebook_manager',
    # standard libs often missed
    'multiprocessing.spawn',
    'asyncio',
    'json',
    'logging',
    'signal',
    'socket',
    # jupyter / zmq
    'jupyter_client',
    'jupyter_core',
]

a = Analysis(
    ['run_server.py'],
    pathex=['.'],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Exclude heavy unused packages to reduce size and startup time
        'tkinter',
        'matplotlib',   # Not needed in backend server
        'PIL',
        'test',
        'unittest',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,          # Hide console window in production
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='backend_dist',
)
