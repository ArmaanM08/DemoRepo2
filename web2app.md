# Windows Desktop App Handoff Prompt for Navrang Pustika

Use this document as the handoff brief for the next developer. The current repository is a React (Vite) + FastAPI notebook application that has already had a first pass of desktop conversion work done in this workspace. The remaining work must be finished on a Windows laptop, then validated as an offline installer that launches without a browser.

## What Is Already In Place

The following source-level work has already been implemented in the repo and should be preserved:

- Backend config already supports Windows paths in packaged mode. See [backend/app/config.py](backend/app/config.py).
- The backend entrypoint for PyInstaller exists in [backend/run_server.py](backend/run_server.py).
- A PyInstaller spec file already exists in [backend/backend.spec](backend/backend.spec).
- The frontend now uses shared backend URL helpers in [frontend/src/app/utils/backendUrl.ts](frontend/src/app/utils/backendUrl.ts).
- Hardcoded localhost usage in the editable frontend source has been replaced with dynamic helpers in [frontend/src/app/App.tsx](frontend/src/app/App.tsx), [frontend/src/app/components/Sidebar.tsx](frontend/src/app/components/Sidebar.tsx), and [frontend/src/app/components/BottomPanel.tsx](frontend/src/app/components/BottomPanel.tsx).
- WebSocket update batching has already been added to [frontend/src/app/App.tsx](frontend/src/app/App.tsx) to reduce lag and unnecessary re-renders.
- Between-cell insertion is already implemented in [frontend/src/app/components/NotebookView.tsx](frontend/src/app/components/NotebookView.tsx).
- A Windows Electron wrapper scaffold already exists in [Windows Version/electron/main.js](Windows%20Version/electron/main.js), [Windows Version/electron/preload.js](Windows%20Version/electron/preload.js), and [Windows Version/electron/wait-for-backend.js](Windows%20Version/electron/wait-for-backend.js).
- A Windows build script exists in [Windows Version/build.bat](Windows%20Version/build.bat).
- The Windows packaging `package.json` already contains Electron and NSIS configuration in [Windows Version/package.json](Windows%20Version/package.json).

Do not rework these pieces unless a bug is found while validating them on Windows.

## Remaining Work

The next developer should complete the remaining packaging and reliability work on a Windows machine.

### 1. Finish the Windows desktop bootstrap

- Confirm [Windows Version/electron/main.js](Windows%20Version/electron/main.js) correctly locates the packaged `backend.exe` from `process.resourcesPath` after electron-builder packaging.
- Confirm the frontend build is loaded from the correct path in both dev and packaged modes.
- Keep the backend startup handshake as a poll-based readiness check, not a fixed delay.
- Ensure the window only opens after the backend health endpoint is responsive.
- Make sure backend shutdown is clean when the app closes.
- If needed, add a small splash/loading screen while polling the backend.

### 2. Finish installer packaging

- Verify the `extraResources` path in [Windows Version/package.json](Windows%20Version/package.json) copies the compiled backend output into the final app package.
- Confirm the frontend build output is copied or referenced correctly before running electron-builder.
- Verify the NSIS installer target builds to a `setup.exe` output.
- Confirm the app installs without requiring Python or Node on the end-user machine.

### 3. Validate backend/runtime portability

- Verify the packaged backend can launch ipykernel and ZMQ correctly under PyInstaller on Windows.
- Confirm [backend/app/config.py](backend/app/config.py) points to the correct writable workspace under `%APPDATA%\NavrangNotebook\workspace` when frozen.
- Confirm the temporary kernel connection directory is writable in packaged mode.
- Verify the Windows venv path logic still works in development mode.

### 4. Complete UI verification

- Confirm the welcome screen remains simplified and does not show the old feature tile grid.
- Confirm between-cell insertion works across multiple notebooks and does not interfere with drag-and-drop reordering.
- Confirm add-before/add-after behavior is correct for code and markdown insertion.
- Confirm notebook execution still works after the WebSocket batching change.

### 5. Finish the performance pass

- Reconfirm the app no longer floods React state updates on every backend message.
- Verify autosave does not trigger excessive writes or polling.
- Check that notebook cache updates are not rewriting IndexedDB unnecessarily.
- If there are still CPU spikes, profile the frontend and fix the specific hot path rather than adding more polling.

## Windows Build Procedure

Run these steps on a Windows laptop:

1. Build the backend executable with PyInstaller from the backend folder.
2. Build the frontend production bundle.
3. Copy or stage the frontend build output into the Windows app folder if required by the packaging layout.
4. Run electron-builder from the Windows Version folder.
5. Install the generated NSIS installer on a clean Windows test machine.

Use the build script in [Windows Version/build.bat](Windows%20Version/build.bat) as the canonical starting point, but update it if the actual Windows paths or packaging layout differ.

## Required Validation

The next developer should not stop at compilation alone. They need to verify the actual desktop app behavior.

### Source-level checks

- Confirm there are no remaining hardcoded `localhost:8000` or `127.0.0.1:8000` references in editable frontend source.
- Confirm all frontend imports resolve after the helper extraction.
- Confirm the Electron wrapper files run without syntax errors.

### Windows-only checks

- Launch the packaged app and confirm the backend starts automatically.
- Wait for the backend health endpoint before rendering the UI.
- Confirm notebooks open, save, rename, duplicate, and execute.
- Confirm between-cell insertion works in both empty and populated notebooks.
- Confirm the installer produces a working desktop shortcut.
- Confirm the app still runs offline after installation with no browser dependency.

## Current Acceptance Criteria

The handoff is done only when all of the following are true:

- The Windows installer builds successfully.
- The installed app launches into Electron, not a browser.
- The backend executable starts automatically and becomes ready before the UI loads.
- Notebook execution works.
- Between-cell insertion works.
- The app no longer depends on a fixed `localhost:8000` endpoint.
- Startup is stable and not based on a blind 1500 ms delay.
- The packaged app can be installed and used offline on a clean Windows machine.

## Notes For The Next Developer

- Do not try to generate the Windows `.exe` on macOS; build it on Windows.
- If the packaged app cannot find `backend.exe`, inspect the final electron-builder resource layout first.
- If the backend takes too long to boot on first launch, extend the readiness polling window rather than reverting to a blind timeout.
- If the UI becomes sluggish, inspect React state updates and WebSocket message handling before adding new polling or timers.
- Keep the implementation minimal and production-focused. Avoid adding features unrelated to the desktop packaging path.

If you are the next developer reading this, your task is to complete the remaining Windows packaging work, verify the installer, and leave behind a build that can be reproduced by another developer on a Windows laptop.
