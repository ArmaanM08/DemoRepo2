@echo off
setlocal enabledelayedexpansion

REM ───────────────────────────────────────────────────────────
REM  Navrang Pustika — One-click launcher for Windows
REM  Double-click this file to start everything.
REM ───────────────────────────────────────────────────────────

set "SCRIPT_DIR=%~dp0"
set "BACKEND_PORT=8000"
set "FRONTEND_PORT=5173"

echo ============================================
echo   Navrang Pustika — Starting...
echo   OS: Windows
echo ============================================

REM ── Backend ────────────────────────────────────────
echo.
echo [1/3] Setting up backend...
cd /d "%SCRIPT_DIR%backend"

if not exist "venv" (
    echo   ^> Creating Python virtual environment...
    python -m venv venv
)

echo   ^> Activating venv ^& installing dependencies...
call venv\Scripts\activate.bat
pip install -r requirements.txt --quiet

echo   ^> Starting backend server (port !BACKEND_PORT!)...
start "Navrang-Backend" /B uvicorn app.main:app --host 127.0.0.1 --port !BACKEND_PORT!

REM ── Frontend ───────────────────────────────────────
echo.
echo [2/3] Setting up frontend...
cd /d "%SCRIPT_DIR%frontend"

if not exist "node_modules" (
    echo   ^> Installing frontend dependencies...
    npm install
)

echo   ^> Starting frontend dev server (port !FRONTEND_PORT!)...
start "Navrang-Frontend" /B npx vite --port !FRONTEND_PORT!

REM ── Open browser ──────────────────────────────────
echo.
echo [3/3] Opening browser...
timeout /t 4 /nobreak > nul

start http://localhost:!FRONTEND_PORT!

echo.
echo ============================================
echo   Frontend : http://localhost:!FRONTEND_PORT!
echo   Backend  : http://127.0.0.1:!BACKEND_PORT!
echo   Close this window to stop all servers.
echo ============================================

pause
