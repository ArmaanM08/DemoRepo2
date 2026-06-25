export function getBackendPort(): number {
  const port = (window as Window & { BACKEND_PORT?: number }).BACKEND_PORT || 8000;
  return Number(port) || 8000;
}

export function getBackendUrl(path: string): string {
  return `http://127.0.0.1:${getBackendPort()}${path}`;
}

export function getWebSocketUrl(path: string): string {
  return `ws://127.0.0.1:${getBackendPort()}${path}`;
}