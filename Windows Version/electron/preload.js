const { contextBridge } = require('electron');

const backendPort = Number(new URLSearchParams(window.location.search).get('backendPort')) || 8000;

contextBridge.exposeInMainWorld('BACKEND_PORT', backendPort);