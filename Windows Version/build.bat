@echo off
setlocal enabledelayedexpansion

echo [1/4] Installing Electron dependencies...
call npm install
if errorlevel 1 exit /b 1

echo [2/4] Building frontend...
call npm run build-frontend
if errorlevel 1 exit /b 1

echo [2b/4] Copying frontend build into the Windows app bundle...
call npm run copy-frontend
if errorlevel 1 exit /b 1

echo [3/4] Packaging Python backend with PyInstaller...
pushd ..\backend
call pyinstaller backend.spec
if errorlevel 1 (
  popd
  exit /b 1
)
popd

echo [4/4] Building Windows installer...
call npm run dist
if errorlevel 1 exit /b 1

echo Build completed successfully.