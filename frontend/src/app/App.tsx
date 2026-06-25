import { useState, useEffect, useRef, useCallback } from 'react';
import type { Theme, SidebarSection, BottomTab, Notebook, FileNode, Variable, Cell } from './types';
import { NAVRANG_COLORS } from './mockData';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { NotebookView } from './components/NotebookView';
import { BottomPanel } from './components/BottomPanel';
import { SettingsModal } from './components/SettingsModal';
import { MenuBar } from './components/MenuBar';
import { I18nProvider, useI18n } from './i18n';
import { getPreference, setPreference, addRecentFile, getRecentFiles, addExecutionHistory, saveCachedNotebook, getCachedNotebook, removeCachedNotebook } from './db';
import { getBackendUrl, getWebSocketUrl } from './utils/backendUrl';

type WsMessage = {
  type: string;
  notebook_id?: string;
  cell_id?: string;
  status?: string;
  output_type?: string;
  content?: string;
  execution_count?: number;
  variables?: Variable[];
};

function applyWsMessage(notebooks: Notebook[], msg: WsMessage): { notebooks: Notebook[]; executionCount?: number; variables?: Variable[] } {
  if (msg.type === 'variables') {
    return { notebooks, variables: msg.variables };
  }

  if (!msg.notebook_id || !msg.cell_id) {
    return { notebooks };
  }

  const nextNotebooks = notebooks.map(n => {
    if (n.id !== msg.notebook_id) return n;

    return {
      ...n,
      cells: n.cells.map(c => {
        if (c.id !== msg.cell_id) return c;

        if (msg.type === 'status') {
          return { ...c, isRunning: msg.status === 'busy' };
        }

        if (msg.type === 'output') {
          if (msg.output_type === 'stdout' || msg.output_type === 'stderr') {
            const prevContent = c.output && c.output.type === 'text' ? c.output.content : '';
            return {
              ...c,
              output: {
                type: 'text',
                content: prevContent + (msg.content || ''),
              },
            };
          }

          if (msg.output_type === 'error') {
            return {
              ...c,
              output: {
                type: 'error',
                content: msg.content || '',
              },
            };
          }

          if (msg.output_type === 'image/png') {
            const prefix = (msg.content || '').startsWith('data:') ? '' : 'data:image/png;base64,';
            return {
              ...c,
              output: {
                type: 'text',
                content: prefix + (msg.content || ''),
              },
            };
          }

          return {
            ...c,
            output: {
              type: msg.output_type === 'text/html' ? 'html' : 'text',
              content: msg.content || '',
            },
          };
        }

        if (msg.type === 'finished') {
          const duration = c.startTime ? parseFloat(((Date.now() - c.startTime) / 1000).toFixed(2)) : undefined;
          return {
            ...c,
            isRunning: false,
            executionCount: msg.execution_count,
            executionTime: duration,
          };
        }

        return c;
      }),
    };
  });

  return {
    notebooks: nextNotebooks,
    executionCount: msg.type === 'finished' ? msg.execution_count : undefined,
  };
}

function AppContent() {
  const { language, setLanguage, t } = useI18n();
  const [theme, setTheme] = useState<Theme>('light');
  const [sidebarSection, setSidebarSection] = useState<SidebarSection>('files');
  const [showBottom, setShowBottom] = useState(false);
  const [showExplorer, setShowExplorer] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>('terminal');

  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [activeNotebookId, setActiveNotebookId] = useState<string>('');
  const [files, setFiles] = useState<FileNode[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [executionCounter, setExecutionCounter] = useState(0);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [notebookActions, setNotebookActions] = useState<any>({});
  const [closedNotebooks, setClosedNotebooks] = useState<string[]>([]);

  // Menu-related state
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wrapText, setWrapText] = useState(false);
  const [showOutput, setShowOutput] = useState(true);
  const [showTerminal, setShowTerminal] = useState(false);

  // New preference states
  const [fontSize, setFontSize] = useState<number>(14);
  const [fontFamily, setFontFamily] = useState<string>('monospace');
  const [autoSaveInterval, setAutoSaveInterval] = useState<number>(60000);
  const [settingsTab, setSettingsTab] = useState<'settings' | 'shortcuts' | 'documentation' | 'about'>('settings');

  const wsRef = useRef<WebSocket | null>(null);
  const wsMessageQueueRef = useRef<WsMessage[]>([]);
  const wsFlushFrameRef = useRef<number | null>(null);
  const notebookCacheRef = useRef<Map<string, string>>(new Map());
  const isDark = theme === 'dark';
  const activeNotebook = notebooks.find(n => n.id === activeNotebookId) || null;

  const activeNotebookRef = useRef<Notebook | null>(null);
  activeNotebookRef.current = activeNotebook;

  useEffect(() => {
    notebooks.forEach(nb => {
      const snapshot = JSON.stringify(nb.cells);
      if (notebookCacheRef.current.get(nb.id) === snapshot) return;
      notebookCacheRef.current.set(nb.id, snapshot);
      saveCachedNotebook(nb.id, nb.cells);
    });

    const notebookIds = new Set(notebooks.map(nb => nb.id));
    Array.from(notebookCacheRef.current.keys()).forEach(id => {
      if (!notebookIds.has(id)) {
        notebookCacheRef.current.delete(id);
      }
    });
  }, [notebooks]);

  // Auto-save interval
  useEffect(() => {
    if (autoSaveInterval <= 0) return;
    const timer = setInterval(() => {
      if (activeNotebookRef.current) {
        fetch(getBackendUrl('/api/notebooks/save'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: activeNotebookRef.current.id,
            cells: activeNotebookRef.current.cells
          })
        }).catch(e => console.error("Auto-save failed", e));
      }
    }, autoSaveInterval);

    return () => clearInterval(timer);
  }, [autoSaveInterval]);

  const handleRenameFile = async (oldPath: string, newPath: string) => {
    try {
      const response = await fetch(getBackendUrl('/api/files/rename'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_path: oldPath, new_path: newPath })
      });
      if (response.ok) {
        // Sync active notebook and list
        setNotebooks(prev => prev.map(n => {
          if (n.id === oldPath) {
            removeCachedNotebook(oldPath);
            saveCachedNotebook(newPath, n.cells);
            return { ...n, id: newPath, name: newPath.replace('.ipynb', '') };
          }
          return n;
        }));
        if (activeNotebookId === oldPath) {
          setActiveNotebookId(newPath);
        }
        await fetchFiles();
      } else {
        alert("Failed to rename file. Make sure destination does not exist.");
      }
    } catch (e) {
      console.error("Error renaming file", e);
    }
  };

  const handleDeleteFile = async (path: string) => {
    try {
      const response = await fetch(`${getBackendUrl('/api/files')}?path=${encodeURIComponent(path)}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setNotebooks(prev => prev.filter(n => n.id !== path));
        if (activeNotebookId === path) {
          setActiveNotebookId('');
        }
        await removeCachedNotebook(path);
        await fetchFiles();
      }
    } catch (e) {
      console.error("Error deleting file", e);
    }
  };

  const handleFontSizeChange = (sz: number) => {
    setFontSize(sz);
    setPreference('fontSize', sz);
  };

  const handleFontFamilyChange = (family: string) => {
    setFontFamily(family);
    setPreference('fontFamily', family);
  };

  const handleAutoSaveIntervalChange = (interval: number) => {
    setAutoSaveInterval(interval);
    setPreference('autoSaveInterval', interval);
  };

  const openSettingsWithTab = (tab: 'settings' | 'shortcuts' | 'documentation' | 'about') => {
    setSettingsTab(tab);
    setShowSettings(true);
  };

  // WebSocket connection to execution server
  const flushWsMessages = useCallback(() => {
    wsFlushFrameRef.current = null;
    const pendingMessages = wsMessageQueueRef.current.splice(0);
    if (pendingMessages.length === 0) return;

    let latestVariables: Variable[] | undefined;
    let latestExecutionCount: number | undefined;

    setNotebooks(prev => {
      let current = prev;

      pendingMessages.forEach(msg => {
        if (msg.type === 'output' && msg.output_type === 'error' && msg.notebook_id && msg.cell_id) {
          const notebook = current.find(n => n.id === msg.notebook_id);
          const cell = notebook?.cells.find(c => c.id === msg.cell_id);
          if (notebook && cell) {
            addExecutionHistory({
              notebookId: msg.notebook_id,
              cellId: msg.cell_id,
              code: cell.content,
              status: 'error',
            });
          }
        }

        if (msg.type === 'finished' && msg.status === 'ok' && msg.notebook_id && msg.cell_id) {
          const notebook = current.find(n => n.id === msg.notebook_id);
          const cell = notebook?.cells.find(c => c.id === msg.cell_id);
          if (notebook && cell) {
            addExecutionHistory({
              notebookId: msg.notebook_id,
              cellId: msg.cell_id,
              code: cell.content,
              status: 'ok',
            });
          }
        }

        const result = applyWsMessage(current, msg);
        current = result.notebooks;

        if (result.variables) {
          latestVariables = result.variables;
        }
        if (typeof result.executionCount === 'number') {
          latestExecutionCount = result.executionCount;
        }
      });

      return current;
    });

    if (latestVariables) {
      setVariables(latestVariables);
    }
    if (typeof latestExecutionCount === 'number') {
      setExecutionCounter(latestExecutionCount);
    }
  }, []);

  const scheduleWsFlush = useCallback(() => {
    if (wsFlushFrameRef.current !== null) return;
    wsFlushFrameRef.current = window.requestAnimationFrame(() => {
      flushWsMessages();
    });
  }, [flushWsMessages]);

  const connectWS = useCallback(() => {
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
    }
    const ws = new WebSocket(getWebSocketUrl('/api/kernels/ws'));
    wsRef.current = ws;

    ws.onmessage = (event) => {
      wsMessageQueueRef.current.push(JSON.parse(event.data));
      scheduleWsFlush();
    };
  }, []);

  // Fetch file explorer tree from backend
  const fetchFiles = async () => {
    try {
      const response = await fetch(getBackendUrl('/api/files'));
      const data = await response.json();
      setFiles(data);
    } catch (e) {
      console.error("Error fetching files", e);
    }
  };

  // Mount logic
  useEffect(() => {
    fetchFiles();
    getPreference<Theme>('theme', 'light').then(setTheme);
    getPreference<number>('fontSize', 14).then(setFontSize);
    getPreference<string>('fontFamily', 'monospace').then(setFontFamily);
    getPreference<number>('autoSaveInterval', 60000).then(setAutoSaveInterval);
    connectWS();

    return () => {
      if (wsFlushFrameRef.current !== null) {
        window.cancelAnimationFrame(wsFlushFrameRef.current);
      }
      wsRef.current?.close();
    };
  }, [connectWS]);

  const handleOpenRecent = async () => {
    const recents = await getRecentFiles();
    if (recents.length === 0) {
      alert(t('file.noRecentNotebooks') || "No recent notebooks found.");
      return;
    }
    const listStr = recents.map((f, i) => `${i + 1}. ${f.name}`).join('\n');
    const promptMsg = (t('file.selectRecentNotebook') || "Select recent notebook (enter number 1-{count}):\n{list}")
      .replace('{count}', recents.length.toString())
      .replace('{list}', listStr);
    const choice = prompt(promptMsg);
    if (!choice) return;
    const idx = parseInt(choice, 10) - 1;
    if (idx >= 0 && idx < recents.length) {
      const selected = recents[idx];
      await handleOpenNotebookFile(selected.path, selected.name);
    } else {
      alert(t('file.invalidChoice') || "Invalid choice.");
    }
  };

  const handleSave = async (silent: boolean = false) => {
    if (!activeNotebook) return;
    try {
      await fetch(getBackendUrl('/api/notebooks/save'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: activeNotebook.id, cells: activeNotebook.cells })
      });
      if (!silent) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (e) {
      console.error("Error saving notebook", e);
    }
  };

  const handleSaveAs = async () => {
    if (!activeNotebook) return;
    const newPath = prompt(t('file.saveAsPrompt') || "Save as (enter filename, e.g. path/to/notebook.ipynb):", activeNotebook.id);
    if (!newPath) return;
    try {
      await fetch(getBackendUrl('/api/files/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newPath, type: 'notebook' })
      });
      await fetch(getBackendUrl('/api/notebooks/save'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newPath, cells: activeNotebook.cells })
      });
      await fetchFiles();
      await handleOpenNotebookFile(newPath, newPath.split('/').pop() || '');
    } catch (e) {
      console.error("Error in Save As", e);
    }
  };

  const handleSaveAll = async () => {
    try {
      await Promise.all(notebooks.map(nb => 
        fetch(getBackendUrl('/api/notebooks/save'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: nb.id, cells: nb.cells })
        })
      ));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Error saving all notebooks", e);
    }
  };

  const handleRenameNotebook = async () => {
    if (!activeNotebook) return;
    const currentName = activeNotebook.id.split('/').pop() || '';
    const newName = prompt(t('file.renamePrompt') || "Enter new name for notebook:", currentName);
    if (!newName) return;
    const parts = activeNotebook.id.split('/');
    parts[parts.length - 1] = newName;
    const newPath = parts.join('/');
    await handleRenameFile(activeNotebook.id, newPath);
  };

  const handleDuplicateNotebook = async () => {
    if (!activeNotebook) return;
    const currentName = activeNotebook.id.split('/').pop() || '';
    const extIdx = currentName.lastIndexOf('.');
    const base = extIdx !== -1 ? currentName.slice(0, extIdx) : currentName;
    const ext = extIdx !== -1 ? currentName.slice(extIdx) : '';
    const newName = prompt(t('file.duplicatePrompt') || "Duplicate notebook as:", `${base}_copy${ext}`);
    if (!newName) return;
    const parts = activeNotebook.id.split('/');
    parts[parts.length - 1] = newName;
    const newPath = parts.join('/');
    try {
      await fetch(getBackendUrl('/api/files/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newPath, type: 'notebook' })
      });
      await fetch(getBackendUrl('/api/notebooks/save'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newPath, cells: activeNotebook.cells })
      });
      await fetchFiles();
      await handleOpenNotebookFile(newPath, newName);
    } catch (e) {
      console.error("Error duplicating notebook", e);
    }
  };

  const handleReloadFromDisk = async () => {
    if (!activeNotebook) return;
    if (!confirm(t('file.reloadConfirm') || "Are you sure you want to reload from disk? All unsaved changes will be lost.")) return;
    try {
      const response = await fetch(`${getBackendUrl('/api/notebooks')}?path=${encodeURIComponent(activeNotebook.id)}`);
      const data = await response.json();
      setNotebooks(prev => prev.map(n => n.id === activeNotebook.id ? { ...n, cells: data.cells } : n));
    } catch (e) {
      console.error("Error reloading notebook", e);
    }
  };

  const handleOpenNotebookFile = async (path: string, name: string) => {
    const existing = notebooks.find(n => n.id === path);
    if (existing) {
      setActiveNotebookId(path);
      return;
    }
    try {
      const response = await fetch(`${getBackendUrl('/api/notebooks')}?path=${encodeURIComponent(path)}`);
      if (response.ok) {
        const data = await response.json();
        const newNb: Notebook = {
          id: path,
          name: name.replace('.ipynb', ''),
          color: NAVRANG_COLORS[Math.floor(Math.random() * NAVRANG_COLORS.length)],
          cells: data.cells
        };
        setNotebooks(prev => [...prev, newNb]);
        setActiveNotebookId(path);
        await addRecentFile(path, name);
        await saveCachedNotebook(path, data.cells);
      } else {
        throw new Error("Backend response error");
      }
    } catch (e) {
      console.error("Error loading notebook from backend, trying IndexedDB cache...", e);
      const cachedCells = await getCachedNotebook(path);
      if (cachedCells) {
        const newNb: Notebook = {
          id: path,
          name: name.replace('.ipynb', ''),
          color: NAVRANG_COLORS[Math.floor(Math.random() * NAVRANG_COLORS.length)],
          cells: cachedCells
        };
        setNotebooks(prev => [...prev, newNb]);
        setActiveNotebookId(path);
        await addRecentFile(path, name);
      } else {
        alert("Failed to load notebook from server or offline cache.");
      }
    }
  };

  const handleUpdateVariables = (cells: Cell[]) => {
    // Let backend handle variable inspection dynamically
  };

  const handleReconnectKernel = () => {
    connectWS();
    alert("Kernel reconnected successfully.");
  };

  const handleShutdownKernel = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    alert("Kernel shut down successfully.");
  };

  const handleCloseNotebook = () => {
    if (activeNotebookId) {
      setClosedNotebooks(prev => [...prev, activeNotebookId]);
      if (notebooks.length > 1) {
        const remaining = notebooks.filter(n => n.id !== activeNotebookId);
        setNotebooks(remaining);
        setActiveNotebookId(remaining[0].id);
      } else {
        setNotebooks([]);
        setActiveNotebookId('');
      }
    }
  };

  const handleCloseAll = () => {
    notebooks.forEach(n => {
      setClosedNotebooks(prev => [...prev, n.id]);
    });
    setNotebooks([]);
    setActiveNotebookId('');
  };

  const handleReopenClosed = () => {
    if (closedNotebooks.length > 0) {
      const next = closedNotebooks[closedNotebooks.length - 1];
      setClosedNotebooks(prev => prev.slice(0, -1));
      handleOpenNotebookFile(next, next.split('/').pop() || '');
    } else {
      alert("No closed notebooks to reopen.");
    }
  };

  // Menu handlers
  const handleNewNotebook = async () => {
    const filename = `Untitled_${Date.now().toString().slice(-4)}.ipynb`;
    try {
      await fetch(getBackendUrl('/api/files/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filename, type: 'notebook' })
      });
      await fetchFiles();
      await handleOpenNotebookFile(filename, filename);
    } catch (e) {
      console.error("Error creating notebook", e);
    }
  };

  const handleNewNote = async () => {
    const filename = `Note_${Date.now().toString().slice(-4)}.ipynb`;
    try {
      await fetch(getBackendUrl('/api/files/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filename, type: 'notebook' })
      });
      await fetchFiles();
      await handleOpenNotebookFile(filename, filename);
    } catch (e) {
      console.error("Error creating note", e);
    }
  };

  const handleOpenNotebook = async () => {
    const promptMsg = t('file.openNotebookPrompt') || "Enter the absolute path of the notebook (.ipynb file) to open:";
    const filePath = prompt(promptMsg);
    if (!filePath || !filePath.trim()) return;

    const trimmedPath = filePath.trim();
    if (!trimmedPath.toLowerCase().endsWith('.ipynb')) {
      alert(t('file.invalidExtension') || "Invalid file. Please open a Jupyter Notebook (.ipynb) file.");
      return;
    }

    const name = trimmedPath.split(/[/\\]/).pop() || trimmedPath;
    await handleOpenNotebookFile(trimmedPath, name);
  };


  const handleExport = async (format: string) => {
    if (!activeNotebook || format !== "py") return;
    try {
      await fetch(getBackendUrl('/api/notebooks/export'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: activeNotebook.id, format })
      });
      alert(`Notebook exported successfully as ${activeNotebook.id.replace('.ipynb', '.py')}`);
      await fetchFiles();
    } catch (e) {
      console.error("Error exporting notebook", e);
    }
  };

  const handleDownload = () => {
    if (!activeNotebook) return;
    const blob = new Blob([JSON.stringify({ cells: activeNotebook.cells }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeNotebook.name}.ipynb`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCutCell = () => console.log('Cut cell');
  const handleCopyCell = () => console.log('Copy cell');
  const handlePasteCell = () => console.log('Paste cell');
  const handleDeleteCell = () => {
    if (activeNotebook && selectedCellId) {
      const remainingCells = activeNotebook.cells.filter(c => c.id !== selectedCellId);
      setNotebooks(prev => prev.map(n => n.id === activeNotebook.id ? { ...n, cells: remainingCells } : n));
    }
  };
  const handleSelectAll = () => console.log('Select all');
  const handleMoveCellUp = () => console.log('Move cell up');
  const handleMoveCellDown = () => console.log('Move cell down');
  const handleSplitCell = () => console.log('Split cell');
  const handleMergeCells = () => console.log('Merge cells');
  const handleClearOutput = () => {
    notebookActions.clearOutput?.();
  };
  const handleClearAllOutputs = () => {
    notebookActions.clearAllOutputs?.();
  };
  const handleFind = () => console.log('Find');

  const handleToggleLineNumbers = () => setShowLineNumbers(!showLineNumbers);
  const handleToggleWrapText = () => setWrapText(!wrapText);
  const handleToggleOutput = () => setShowOutput(!showOutput);
  const handleToggleTerminal = () => {
    setShowTerminal(!showTerminal);
    setShowBottom(!showTerminal);
  };

  const handleCollapseCode = () => console.log('Collapse code');
  const handleCollapseOutput = () => console.log('Collapse output');
  const handleCollapseAllCode = () => console.log('Collapse all code');
  const handleCollapseAllOutput = () => console.log('Collapse all output');
  const handleExpandCode = () => console.log('Expand code');
  const handleExpandOutput = () => console.log('Expand output');
  const handleExpandAllCode = () => console.log('Expand all code');
  const handleExpandAllOutput = () => console.log('Expand all output');
  const handleRenderSideBySide = () => console.log('Render side-by-side');

  const handleRunCellWS = (cellId: string) => {
    if (!activeNotebook) return;
    const cell = activeNotebook.cells.find(c => c.id === cellId);
    if (!cell || cell.type !== 'code') return;

    setNotebooks(prev => prev.map(n => {
      if (n.id !== activeNotebook.id) return n;
      return {
        ...n,
        cells: n.cells.map(c => c.id === cellId ? { ...c, isRunning: true, output: null, startTime: Date.now() } : c)
      };
    }));

    wsRef.current?.send(JSON.stringify({
      type: "execute",
      notebook_id: activeNotebook.id,
      cell_id: cellId,
      code: cell.content
    }));
  };

  const handleRunAndMoveNext = () => {
    if (activeNotebook && selectedCellId) {
      handleRunCellWS(selectedCellId);
      const idx = activeNotebook.cells.findIndex(c => c.id === selectedCellId);
      if (idx < activeNotebook.cells.length - 1) {
        setSelectedCellId(activeNotebook.cells[idx + 1].id);
      }
    }
  };

  const handleRunAndInsertBelow = () => {
    if (activeNotebook && selectedCellId) {
      handleRunCellWS(selectedCellId);
      const newCell: Cell = {
        id: `cell-${Date.now()}`,
        type: 'code',
        content: '',
        output: null,
        executionCount: null,
        isRunning: false,
        collapsed: false,
      };
      const idx = activeNotebook.cells.findIndex(c => c.id === selectedCellId);
      const newCells = [...activeNotebook.cells];
      newCells.splice(idx + 1, 0, newCell);
      setNotebooks(prev => prev.map(n => n.id === activeNotebook.id ? { ...n, cells: newCells } : n));
      setSelectedCellId(newCell.id);
    }
  };

  const handleRunAll = () => {
    if (!activeNotebook) return;
    activeNotebook.cells.forEach(cell => {
      if (cell.type === 'code') handleRunCellWS(cell.id);
    });
  };

  const handleRunAllBelow = () => {
    if (activeNotebook && selectedCellId) {
      const idx = activeNotebook.cells.findIndex(c => c.id === selectedCellId);
      activeNotebook.cells.slice(idx).forEach(cell => {
        if (cell.type === 'code') handleRunCellWS(cell.id);
      });
    }
  };

  const handleRunAllAbove = () => {
    if (activeNotebook && selectedCellId) {
      const idx = activeNotebook.cells.findIndex(c => c.id === selectedCellId);
      activeNotebook.cells.slice(0, idx).forEach(cell => {
        if (cell.type === 'code') handleRunCellWS(cell.id);
      });
    }
  };

  const handleRenderMarkdown = () => notebookActions.renderMarkdown?.();

  const handleInterruptKernel = () => {
    if (activeNotebook) {
      wsRef.current?.send(JSON.stringify({
        type: "interrupt",
        notebook_id: activeNotebook.id
      }));
    }
  };

  const handleRestartKernel = () => {
    if (activeNotebook) {
      wsRef.current?.send(JSON.stringify({
        type: "restart",
        notebook_id: activeNotebook.id
      }));
    }
  };

  const handleRestartAndRunAll = () => {
    if (activeNotebook) {
      handleRestartKernel();
      setTimeout(handleRunAll, 1000);
    }
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    setPreference('theme', nextTheme);
  };

  const handleSwitchOpenNotes = () => {
    const idx = notebooks.findIndex(n => n.id === activeNotebookId);
    if (idx !== -1 && notebooks.length > 1) {
      const nextIdx = (idx + 1) % notebooks.length;
      setActiveNotebookId(notebooks[nextIdx].id);
    }
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input, textarea, or contenteditable element
      if (
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        // If typing in input, only intercept Ctrl+S/Cmd+S for saving
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault();
          handleSave(false);
        }
        return;
      }

      // Ctrl+S / Cmd+S: Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave(false);
      }

      // Ctrl+N: New notebook
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        handleNewNotebook();
      }

      // Ctrl+O: Open notebook
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        handleOpenNotebook();
      }

      // Ctrl+W: Close notebook
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        handleCloseNotebook();
      }

      // Ctrl+Tab: Switch open notes
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        handleSwitchOpenNotes();
      }

      // Ctrl+L: Toggle line numbers
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        handleToggleLineNumbers();
      }

      // Ctrl+Shift+W: Wrap text
      if (e.ctrlKey && e.shiftKey && e.key === 'W') {
        e.preventDefault();
        handleToggleWrapText();
      }

      // Ctrl+B: Toggle explorer
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        setShowExplorer(v => !v);
      }

      // Ctrl+`: Toggle terminal
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        handleToggleTerminal();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [notebooks, activeNotebookId, showLineNumbers, wrapText, showExplorer, showTerminal]);

  return (
    <div
      className={`${theme} h-screen flex flex-col overflow-hidden`}
      style={{ background: isDark ? '#0d1117' : '#ffffff', color: isDark ? '#e6edf3' : '#1f2328' }}
    >
      {/* Menu Bar */}
      <MenuBar
        theme={theme}
        onNewNotebook={handleNewNotebook}
        onOpenNotebook={handleOpenNotebook}
        onOpenRecent={handleOpenRecent}
        onSave={() => handleSave(false)}
        onSaveAs={handleSaveAs}
        onSaveAll={handleSaveAll}
        onRenameNotebook={handleRenameNotebook}
        onDuplicateNotebook={handleDuplicateNotebook}
        onReloadFromDisk={handleReloadFromDisk}
        onExport={handleExport}
        onDownload={handleDownload}
        onPrint={handlePrint}
        onUndo={() => notebookActions.undo?.()}
        onRedo={() => notebookActions.redo?.()}
        onCutCell={() => notebookActions.cutCell?.()}
        onCopyCell={() => notebookActions.copyCell?.()}
        onPasteCell={() => notebookActions.pasteCell?.()}
        onPasteCellAbove={() => notebookActions.pasteCellAbove?.()}
        onDeleteCell={() => notebookActions.deleteCell?.()}
        onSelectAll={() => notebookActions.selectAll?.()}
        onMoveCellUp={() => notebookActions.moveCellUp?.()}
        onMoveCellDown={() => notebookActions.moveCellDown?.()}
        onSplitCell={() => notebookActions.splitCell?.()}
        onMergeCells={() => notebookActions.mergeCells?.()}
        onClearOutput={handleClearOutput}
        onClearAllOutputs={handleClearAllOutputs}
        onFind={() => {
          setShowExplorer(true);
          setTimeout(() => {
            const searchInput = document.querySelector('input[placeholder="Search in notebooks..."]') as HTMLInputElement;
            if (searchInput) {
              searchInput.focus();
              searchInput.select();
            }
          }, 100);
        }}
        onToggleLineNumbers={handleToggleLineNumbers}
        onToggleWrapText={handleToggleWrapText}
        onToggleExplorer={() => setShowExplorer(v => !v)}
        onToggleOutput={handleToggleOutput}
        onToggleTerminal={handleToggleTerminal}
        onCollapseCode={() => notebookActions.collapseCode?.()}
        onCollapseOutput={() => notebookActions.collapseOutput?.()}
        onCollapseAllCode={() => notebookActions.collapseAllCode?.()}
        onCollapseAllOutput={() => notebookActions.collapseAllOutput?.()}
        onExpandCode={() => notebookActions.expandCode?.()}
        onExpandOutput={() => notebookActions.expandOutput?.()}
        onExpandAllCode={() => notebookActions.expandAllCode?.()}
        onExpandAllOutput={() => notebookActions.expandAllOutput?.()}
        onRenderSideBySide={() => notebookActions.toggleLayout?.()}
        onToggleTheme={handleToggleTheme}
        onRunCell={() => selectedCellId && handleRunCellWS(selectedCellId)}
        onRunAndMoveNext={handleRunAndMoveNext}
        onRunAndInsertBelow={handleRunAndInsertBelow}
        onRunAll={handleRunAll}
        onRunAllBelow={handleRunAllBelow}
        onRunAllAbove={handleRunAllAbove}
        onRenderMarkdown={handleRenderMarkdown}
        onInterruptKernel={handleInterruptKernel}
        onRestartKernel={handleRestartKernel}
        onRestartAndRunAll={handleRestartAndRunAll}
        onReconnectKernel={handleReconnectKernel}
        onShutdownKernel={handleShutdownKernel}
        onCloseNotebook={handleCloseNotebook}
        onCloseAll={handleCloseAll}
        onReopenClosed={handleReopenClosed}
        onSettings={() => openSettingsWithTab('settings')}
        onSwitchOpenNotes={handleSwitchOpenNotes}
        showLineNumbers={showLineNumbers}
        wrapText={wrapText}
        showExplorer={showExplorer}
        showOutput={showOutput}
        showTerminal={showTerminal}
        canUndo={notebookActions.canUndo || false}
        canRedo={notebookActions.canRedo || false}
        t={t}
      />

      {/* Top bar */}
      <TopBar
        theme={theme}
        setTheme={setTheme}
        activeNotebook={activeNotebook}
        onRunAll={handleRunAll}
        onStop={handleInterruptKernel}
        onSave={handleSave}
        onNewNotebook={handleNewNotebook}
        isRunning={isRunningAll}
        aiModel="Gemma 2B"
        language={language}
        setLanguage={setLanguage}
        t={t}
      />

      {/* Save notification */}
      {saved && (
        <div
          className="fixed top-14 right-4 z-50 px-3 py-1.5 rounded shadow-lg"
          style={{
            background: '#1a2e1f',
            border: '1px solid #22c55e',
            color: '#4ade80',
            fontSize: '12px',
          }}
        >
          ✓ Saved successfully
        </div>
      )}

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Explorer Panel */}
        {showExplorer && (
          <Sidebar
            theme={theme}
            files={files}
            setFiles={setFiles}
            activeNotebookId={activeNotebookId}
            onOpenNotebook={handleOpenNotebookFile}
            onRename={handleRenameFile}
            onDeleteFile={handleDeleteFile}
            notebooks={notebooks}
            onSelectCell={setSelectedCellId}
            t={t}
          />
        )}

        {/* Main content - Notebook View */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <NotebookView
            theme={theme}
            notebooks={notebooks}
            activeNotebookId={activeNotebookId}
            setActiveNotebookId={setActiveNotebookId}
            onUpdateNotebooks={setNotebooks}
            executionCounter={executionCounter}
            setExecutionCounter={setExecutionCounter}
            onUpdateVariables={handleUpdateVariables}
            showLineNumbers={showLineNumbers}
            wrapText={wrapText}
            t={t}
            onRunCell={handleRunCellWS}
            selectedCellId={selectedCellId}
            onSelectCell={setSelectedCellId}
            registerActions={setNotebookActions}
            fontSize={fontSize}
            fontFamily={fontFamily}
          />

          {/* Bottom panel */}
          {showBottom && (
            <BottomPanel
              theme={theme}
              activeTab={bottomTab}
              onTabChange={setBottomTab}
              onClose={() => setShowBottom(false)}
              variables={variables}
              t={t}
            />
          )}
        </div>
      </div>

      {/* Status bar */}
      <div
        className="flex items-center gap-4 px-4 py-2 flex-shrink-0 border-t"
        style={{
          background: isDark ? '#161b22' : '#ffffff',
          borderColor: isDark ? '#30363d' : '#e5e7eb',
          height: 36,
        }}
      >
        <span style={{ fontSize: '12px', color: isDark ? '#8b949e' : '#6b7280', fontWeight: 500 }}>
          🌿 Navrang Pustika
        </span>
        <span style={{ fontSize: '11px', color: isDark ? '#8b949e' : '#9ca3af' }}>
          Python 3.11.7 • Local
        </span>
        <div className="flex-1" />

        <span style={{ fontSize: '11px', color: isDark ? '#8b949e' : '#9ca3af' }}>
          {activeNotebook ? `${activeNotebook.cells.length} cells` : 'No notebook'}
        </span>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          theme={theme}
          showExplorer={showExplorer}
          showLineNumbers={showLineNumbers}
          wrapText={wrapText}
          showOutput={showOutput}
          showTerminal={showTerminal}
          fontSize={fontSize}
          fontFamily={fontFamily}
          autoSaveInterval={autoSaveInterval}
          onToggleExplorer={() => setShowExplorer(v => !v)}
          onToggleTheme={handleToggleTheme}
          onToggleLineNumbers={handleToggleLineNumbers}
          onToggleWrapText={handleToggleWrapText}
          onToggleOutput={handleToggleOutput}
          onToggleTerminal={handleToggleTerminal}
          onFontSizeChange={handleFontSizeChange}
          onFontFamilyChange={handleFontFamilyChange}
          onAutoSaveIntervalChange={handleAutoSaveIntervalChange}
          activeTab={settingsTab}
          setActiveTab={setSettingsTab}
          onClose={() => setShowSettings(false)}
          t={t}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}
