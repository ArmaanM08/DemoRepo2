const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');
const { spawn } = require('child_process');
const { waitForBackend } = require('./wait-for-backend');

let mainWindow = null;
let backendProcess = null;
let backendPort = 8000;
let isQuitting = false;

function getBackendExecutablePath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'backend', 'backend.exe');
  }

  return path.resolve(__dirname, '..', '..', '..', 'backend', 'dist', 'backend_dist', 'backend.exe');
}

function findFreePort(startPort = 8000, endPort = 8999) {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      if (port > endPort) {
        reject(new Error('No free port found'));
        return;
      }

      const server = net.createServer();
      server.unref();
      server.on('error', () => tryPort(port + 1));
      server.listen(port, '127.0.0.1', () => {
        const selectedPort = server.address().port;
        server.close(() => resolve(selectedPort));
      });
    };

    tryPort(startPort);
  });
}

async function startBackend() {
  const backendExecutable = getBackendExecutablePath();
  if (!fs.existsSync(backendExecutable)) {
    throw new Error(`backend.exe not found at ${backendExecutable}`);
  }

  backendPort = await findFreePort(8000, 8999);
  backendProcess = spawn(backendExecutable, [String(backendPort)], {
    stdio: 'inherit',
    windowsHide: true,
    cwd: path.dirname(backendExecutable),
    env: {
      ...process.env,
      PYTHONUNBUFFERED: '1',
    },
  });

  backendProcess.on('exit', (code) => {
    backendProcess = null;
    if (code !== 0 && !isQuitting) {
      dialog.showErrorBox('Navrang Notebook', `Backend exited unexpectedly with code ${code}.`);
    }
  });

  await waitForBackend(backendPort, 30000);
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    backgroundColor: '#0d1117',
    show: false,
    title: 'Navrang Notebook',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      additionalArguments: [`--backend-port=${backendPort}`],
    },
  });

  const frontendIndex = app.isPackaged
    ? path.join(__dirname, '..', 'dist', 'index.html')
    : path.resolve(__dirname, '..', '..', '..', 'frontend', 'dist', 'index.html');

  await mainWindow.loadFile(frontendIndex, { query: { backendPort: String(backendPort) } });
  mainWindow.once('ready-to-show', () => mainWindow?.show());

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    await startBackend();
    await createWindow();
  } catch (error) {
    dialog.showErrorBox('Navrang Notebook', error instanceof Error ? error.message : 'Failed to start backend.');
    app.quit();
  }
});

app.on('window-all-closed', () => {
  isQuitting = true;
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill();
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && backendProcess) {
    void createWindow();
  }
});