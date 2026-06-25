const DB_NAME = 'NavrangDB';
const DB_VERSION = 1;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('preferences')) {
        db.createObjectStore('preferences');
      }
      if (!db.objectStoreNames.contains('recent_files')) {
        db.createObjectStore('recent_files', { keyPath: 'path' });
      }
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'path' });
      }
      if (!db.objectStoreNames.contains('execution_history')) {
        db.createObjectStore('execution_history', { keyPath: 'timestamp' });
      }
      if (!db.objectStoreNames.contains('cached_notebooks')) {
        db.createObjectStore('cached_notebooks', { keyPath: 'path' });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Preference Stores CRUD
export async function getPreference<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('preferences', 'readonly');
      const store = tx.objectStore('preferences');
      const req = store.get(key);
      req.onsuccess = () => {
        resolve(req.result !== undefined ? req.result : defaultValue);
      };
      req.onerror = () => resolve(defaultValue);
    });
  } catch {
    return defaultValue;
  }
}

export async function setPreference<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('preferences', 'readwrite');
      const store = tx.objectStore('preferences');
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('Error saving preference', e);
  }
}

// Recent Files CRUD
export interface RecentFile {
  path: string;
  name: string;
  lastOpened: number;
}

export async function getRecentFiles(): Promise<RecentFile[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('recent_files', 'readonly');
      const store = tx.objectStore('recent_files');
      const req = store.getAll();
      req.onsuccess = () => {
        const list = req.result as RecentFile[];
        list.sort((a, b) => b.lastOpened - a.lastOpened);
        resolve(list);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function addRecentFile(path: string, name: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('recent_files', 'readwrite');
      const store = tx.objectStore('recent_files');
      const req = store.put({
        path,
        name,
        lastOpened: Date.now()
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('Error adding recent file', e);
  }
}

export async function removeRecentFile(path: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('recent_files', 'readwrite');
      const store = tx.objectStore('recent_files');
      const req = store.delete(path);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('Error deleting recent file', e);
  }
}

// Execution History Logger
export interface ExecutionLog {
  timestamp: number;
  notebookId: string;
  cellId: string;
  code: string;
  status: 'ok' | 'error';
}

export async function addExecutionHistory(log: Omit<ExecutionLog, 'timestamp'>): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('execution_history', 'readwrite');
      const store = tx.objectStore('execution_history');
      const req = store.put({
        ...log,
        timestamp: Date.now()
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('Error logging execution', e);
  }
}

// Cached Notebooks CRUD
export async function saveCachedNotebook(path: string, cells: any[]): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cached_notebooks', 'readwrite');
      const store = tx.objectStore('cached_notebooks');
      const req = store.put({
        path,
        cells,
        lastModified: Date.now()
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('Error caching notebook', e);
  }
}

export async function getCachedNotebook(path: string): Promise<any[] | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('cached_notebooks', 'readonly');
      const store = tx.objectStore('cached_notebooks');
      const req = store.get(path);
      req.onsuccess = () => {
        resolve(req.result ? req.result.cells : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function removeCachedNotebook(path: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('cached_notebooks', 'readwrite');
      const store = tx.objectStore('cached_notebooks');
      const req = store.delete(path);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('Error removing cached notebook', e);
  }
}
