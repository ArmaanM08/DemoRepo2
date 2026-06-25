import { useState, useRef, useEffect } from 'react';
import { Plus, Play, RotateCcw, X, Undo, Redo } from 'lucide-react';
import type { Theme, Notebook, Cell, CellType } from '../types';
import { simulateExecution } from '../mockData';
import { CodeCell } from './CodeCell';
import { MarkdownCell } from './MarkdownCell';

interface NotebookViewProps {
  theme: Theme;
  notebooks: Notebook[];
  activeNotebookId: string;
  setActiveNotebookId: (id: string) => void;
  onUpdateNotebooks: (notebooks: Notebook[]) => void;
  executionCounter: number;
  setExecutionCounter: (n: number) => void;
  onUpdateVariables: (cells: Cell[]) => void;
  showLineNumbers: boolean;
  wrapText: boolean;
  t: (key: string) => string;
  onRunCell?: (cellId: string) => void;
  selectedCellId?: string | null;
  onSelectCell?: (id: string | null) => void;
  registerActions?: (actions: any) => void;
  fontSize?: number;
  fontFamily?: string;
}

function generateId() {
  return `cell-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function WelcomeScreen({ theme, onNewNotebook, t }: { theme: Theme; onNewNotebook: () => void; t: (key: string) => string }) {
  const isDark = theme === 'dark';

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto"
      style={{ background: isDark ? '#0d1117' : '#f6f8fa' }}
    >
      <div className="max-w-lg w-full text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
          >
            <span style={{ fontSize: '28px', color: 'white' }}>📓</span>
          </div>
          <div className="text-left">
            <h1 style={{ fontSize: '28px', color: '#22c55e' }}>Navrang Pustika</h1>
            <p style={{ fontSize: '13px', color: isDark ? '#8b949e' : '#656d76' }}>
              नवरंग पुस्तिका — Think Locally, Create Privately.
            </p>
          </div>
        </div>

        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8"
          style={{ background: isDark ? '#1a2e1f' : '#dcfce7', border: '1px solid #22c55e40' }}
        >
          <span className="w-2 h-2 rounded-full bg-green-500" style={{ animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: '12px', color: '#22c55e' }}>
            {t('notebook.welcomeStatus') || 'Offline Mode Active • Python 3.11 Ready'}
          </span>
        </div>

        <button
          onClick={onNewNotebook}
          className="flex items-center gap-2 mx-auto px-6 py-3 rounded-lg"
          style={{ background: '#22c55e', color: '#0a0a0a', fontSize: '14px' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#16a34a'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#22c55e'; }}
        >
          <Plus size={16} />
          {t('notebook.createNewNotebook') || 'Create New Notebook'}
        </button>
      </div>
    </div>
  );
}

function InsertCellBar({
  index,
  isDark,
  onInsert,
  isDragging,
}: {
  index: number;
  isDark: boolean;
  onInsert: (type: CellType) => void;
  isDragging: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  if (isDragging) return null;
  return (
    <div
      className="flex items-center gap-0 my-1 relative"
      style={{ height: '18px' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          flex: 1,
          height: '1px',
          background: hovered ? '#22c55e44' : 'transparent',
          transition: 'background 0.2s',
        }}
      />
      {hovered && (
        <div
          className="flex items-center gap-1 absolute left-1/2"
          style={{
            transform: 'translateX(-50%)',
            background: isDark ? '#161b22' : '#ffffff',
            border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
            borderRadius: '20px',
            padding: '2px 8px',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 10,
          }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onInsert('code'); }}
            style={{
              fontSize: '11px',
              color: '#22c55e',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#22c55e22')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            + Code
          </button>
          <span style={{ color: isDark ? '#30363d' : '#d0d7de', fontSize: '10px' }}>│</span>
          <button
            onClick={(e) => { e.stopPropagation(); onInsert('markdown'); }}
            style={{
              fontSize: '11px',
              color: '#3b82f6',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#3b82f622')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            + Markdown
          </button>
        </div>
      )}
    </div>
  );
}

export function NotebookView(props: NotebookViewProps) {
  const {
    theme, notebooks, activeNotebookId, setActiveNotebookId,
    onUpdateNotebooks, executionCounter, setExecutionCounter, onUpdateVariables,
    showLineNumbers, wrapText, t, onRunCell, registerActions, fontSize, fontFamily
  } = props;
  const isDark = theme === 'dark';
  const [localSelectedCellId, setLocalSelectedCellId] = useState<string | null>(null);
  const selectedCellId = props.selectedCellId !== undefined ? props.selectedCellId : localSelectedCellId;
  const setSelectedCellId = props.onSelectCell || setLocalSelectedCellId;
  const [runningCells, setRunningCells] = useState<Set<string>>(new Set());
  const [draggedCellId, setDraggedCellId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const cellsContainerRef = useRef<HTMLDivElement>(null);
  const [history, setHistory] = useState<Cell[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [clipboard, setClipboard] = useState<Cell | null>(null);
  const [layout, setLayout] = useState<'side-by-side' | 'stacked'>('side-by-side');

  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset typing state when selected cell changes
  useEffect(() => {
    isTypingRef.current = false;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [selectedCellId]);

  // Synchronize history when activeNotebookId changes
  useEffect(() => {
    if (activeNotebook) {
      setHistory([activeNotebook.cells.map(c => ({ ...c }))]);
      setHistoryIndex(0);
    } else {
      setHistory([]);
      setHistoryIndex(-1);
    }
  }, [activeNotebookId]);

  const activeNotebook = notebooks.find(n => n.id === activeNotebookId) || null;

  const activeNotebookRef = useRef<Notebook | null>(null);
  const historyIndexRef = useRef(-1);

  useEffect(() => {
    activeNotebookRef.current = activeNotebook;
  }, [activeNotebook]);

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeNotebook || !selectedCellId) return;

      const cell = activeNotebook.cells.find(c => c.id === selectedCellId);
      if (!cell) return;

      // Shift+Enter: Run cell and move to next
      if (e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        runCell(selectedCellId);
        const currentIndex = activeNotebook.cells.findIndex(c => c.id === selectedCellId);
        if (currentIndex < activeNotebook.cells.length - 1) {
          setSelectedCellId(activeNotebook.cells[currentIndex + 1].id);
        }
      }

      // Ctrl+Enter: Run cell and stay
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        runCell(selectedCellId);
      }

      // Alt+Enter: Run cell and insert below
      if (e.altKey && e.key === 'Enter') {
        e.preventDefault();
        runCell(selectedCellId);
        addCell(selectedCellId, 'code');
      }

      // Ctrl+Z: Undo
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Ctrl+Y or Ctrl+Shift+Z: Redo
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        redo();
      }

      // DD: Delete cell
      if (e.key === 'd' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const lastKeyPress = (e as any).lastKeyPress;
        if (lastKeyPress === 'd') {
          e.preventDefault();
          deleteCell(selectedCellId);
          const currentIndex = activeNotebook.cells.findIndex(c => c.id === selectedCellId);
          if (currentIndex > 0) {
            setSelectedCellId(activeNotebook.cells[currentIndex - 1].id);
          } else if (activeNotebook.cells.length > 1) {
            setSelectedCellId(activeNotebook.cells[0].id);
          }
        }
        (e as any).lastKeyPress = 'd';
        setTimeout(() => (e as any).lastKeyPress = null, 500);
      }

      // A: Add cell above
      if (e.key === 'a' && !e.ctrlKey && !e.altKey && !e.metaKey && cell.type === 'code') {
        const lastKeyPress = (e as any).lastKeyPress;
        if (lastKeyPress === 'a') {
          e.preventDefault();
          const currentIndex = activeNotebook.cells.findIndex(c => c.id === selectedCellId);
          const newCell: Cell = {
            id: generateId(),
            type: 'code',
            content: '',
            output: null,
            executionCount: null,
            isRunning: false,
            collapsed: false,
          };
          const newCells = [...activeNotebook.cells];
          newCells.splice(currentIndex, 0, newCell);
          updateNotebook(activeNotebook.id, newCells, true);
          setSelectedCellId(newCell.id);
        }
        (e as any).lastKeyPress = 'a';
        setTimeout(() => (e as any).lastKeyPress = null, 500);
      }

      // B: Add cell below
      if (e.key === 'b' && !e.ctrlKey && !e.altKey && !e.metaKey && cell.type === 'code') {
        const lastKeyPress = (e as any).lastKeyPress;
        if (lastKeyPress === 'b') {
          e.preventDefault();
          addCell(selectedCellId, 'code');
        }
        (e as any).lastKeyPress = 'b';
        setTimeout(() => (e as any).lastKeyPress = null, 500);
      }

      // M: Convert to markdown
      if (e.key === 'm' && !e.ctrlKey && !e.altKey && !e.metaKey && cell.type === 'code') {
        const lastKeyPress = (e as any).lastKeyPress;
        if (lastKeyPress === 'm') {
          e.preventDefault();
          changeType(selectedCellId, 'markdown');
        }
        (e as any).lastKeyPress = 'm';
        setTimeout(() => (e as any).lastKeyPress = null, 500);
      }

      // Y: Convert to code
      if (e.key === 'y' && !e.ctrlKey && !e.altKey && !e.metaKey && cell.type === 'markdown') {
        const lastKeyPress = (e as any).lastKeyPress;
        if (lastKeyPress === 'y') {
          e.preventDefault();
          changeType(selectedCellId, 'code');
        }
        (e as any).lastKeyPress = 'y';
        setTimeout(() => (e as any).lastKeyPress = null, 500);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeNotebook, selectedCellId, history, historyIndex]);

  const saveCurrentStateToHistory = () => {
    const currentNotebook = activeNotebookRef.current;
    if (!currentNotebook) return;
    setHistory(prevHistory => {
      const newHistory = prevHistory.slice(0, historyIndexRef.current + 1);
      newHistory.push(currentNotebook.cells.map(c => ({ ...c })));
      return newHistory;
    });
    setHistoryIndex(prevIndex => {
      const nextIndex = prevIndex + 1;
      historyIndexRef.current = nextIndex;
      return nextIndex;
    });
  };

  const updateNotebook = (notebookId: string, cells: Cell[], saveToHistory: boolean = false) => {
    if (saveToHistory && activeNotebook) {
      isTypingRef.current = false;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(cells.map(c => ({ ...c })));
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
    onUpdateNotebooks(notebooks.map(n => n.id === notebookId ? { ...n, cells } : n));
    onUpdateVariables(cells);
  };

  const undo = () => {
    if (historyIndex <= 0 || !activeNotebook) return;
    const prevIndex = historyIndex - 1;
    const previousCells = history[prevIndex];
    onUpdateNotebooks(notebooks.map(n => n.id === activeNotebook.id ? { ...n, cells: previousCells } : n));
    onUpdateVariables(previousCells);
    setHistoryIndex(prevIndex);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1 || !activeNotebook) return;
    const nextIndex = historyIndex + 1;
    const nextCells = history[nextIndex];
    onUpdateNotebooks(notebooks.map(n => n.id === activeNotebook.id ? { ...n, cells: nextCells } : n));
    onUpdateVariables(nextCells);
    setHistoryIndex(nextIndex);
  };

  const updateCell = (cellId: string, content: string) => {
    if (!activeNotebook) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
    }

    updateNotebook(activeNotebook.id, activeNotebook.cells.map(c =>
      c.id === cellId ? { ...c, content } : c
    ), false);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      saveCurrentStateToHistory();
    }, 1000);
  };

  const clearOutput = (cellId: string) => {
    if (!activeNotebook) return;
    updateNotebook(activeNotebook.id, activeNotebook.cells.map(c =>
      c.id === cellId ? { ...c, output: null, executionTime: undefined } : c
    ), true);
  };

  const clearAllOutputs = () => {
    if (!activeNotebook) return;
    updateNotebook(activeNotebook.id, activeNotebook.cells.map(c =>
      ({ ...c, output: null, executionTime: undefined })
    ), true);
  };

  const deleteCell = (cellId: string) => {
    if (!activeNotebook) return;
    updateNotebook(activeNotebook.id, activeNotebook.cells.filter(c => c.id !== cellId), true);
  };

  const copyCell = () => {
    if (!activeNotebook || !selectedCellId) return;
    const cell = activeNotebook.cells.find(c => c.id === selectedCellId);
    if (cell) {
      setClipboard(cell);
    }
  };

  const cutCell = () => {
    if (!activeNotebook || !selectedCellId) return;
    const cellIndex = activeNotebook.cells.findIndex(c => c.id === selectedCellId);
    if (cellIndex !== -1) {
      const cell = activeNotebook.cells[cellIndex];
      setClipboard(cell);
      const remainingCells = activeNotebook.cells.filter(c => c.id !== selectedCellId);
      updateNotebook(activeNotebook.id, remainingCells, true);
      if (remainingCells.length > 0) {
        const nextSelectIdx = Math.min(cellIndex, remainingCells.length - 1);
        setSelectedCellId(remainingCells[nextSelectIdx].id);
      } else {
        setSelectedCellId(null);
      }
    }
  };

  const pasteCell = () => {
    if (!activeNotebook || !clipboard) return;
    const newCell: Cell = {
      ...clipboard,
      id: generateId(),
      executionCount: null,
      isRunning: false,
    };
    const newCells = [...activeNotebook.cells];
    if (selectedCellId) {
      const idx = activeNotebook.cells.findIndex(c => c.id === selectedCellId);
      newCells.splice(idx + 1, 0, newCell);
    } else {
      newCells.push(newCell);
    }
    updateNotebook(activeNotebook.id, newCells, true);
    setSelectedCellId(newCell.id);
  };

  const pasteCellAbove = () => {
    if (!activeNotebook || !clipboard) return;
    const newCell: Cell = {
      ...clipboard,
      id: generateId(),
      executionCount: null,
      isRunning: false,
    };
    const newCells = [...activeNotebook.cells];
    if (selectedCellId) {
      const idx = activeNotebook.cells.findIndex(c => c.id === selectedCellId);
      newCells.splice(idx, 0, newCell);
    } else {
      newCells.unshift(newCell);
    }
    updateNotebook(activeNotebook.id, newCells, true);
    setSelectedCellId(newCell.id);
  };

  const moveCellUp = () => {
    if (!activeNotebook || !selectedCellId) return;
    const idx = activeNotebook.cells.findIndex(c => c.id === selectedCellId);
    if (idx > 0) {
      const newCells = [...activeNotebook.cells];
      const temp = newCells[idx];
      newCells[idx] = newCells[idx - 1];
      newCells[idx - 1] = temp;
      updateNotebook(activeNotebook.id, newCells, true);
    }
  };

  const moveCellDown = () => {
    if (!activeNotebook || !selectedCellId) return;
    const idx = activeNotebook.cells.findIndex(c => c.id === selectedCellId);
    if (idx !== -1 && idx < activeNotebook.cells.length - 1) {
      const newCells = [...activeNotebook.cells];
      const temp = newCells[idx];
      newCells[idx] = newCells[idx + 1];
      newCells[idx + 1] = temp;
      updateNotebook(activeNotebook.id, newCells, true);
    }
  };

  const splitCell = () => {
    if (!activeNotebook || !selectedCellId) return;
    const idx = activeNotebook.cells.findIndex(c => c.id === selectedCellId);
    if (idx === -1) return;
    const cell = activeNotebook.cells[idx];
    
    let splitIndex = Math.floor(cell.content.length / 2);
    if (document.activeElement instanceof HTMLTextAreaElement && document.activeElement.value === cell.content) {
      splitIndex = document.activeElement.selectionStart;
    }
    
    const part1 = cell.content.substring(0, splitIndex);
    const part2 = cell.content.substring(splitIndex);
    
    const newCell: Cell = {
      id: generateId(),
      type: cell.type,
      content: part2,
      output: null,
      executionCount: null,
      isRunning: false,
      collapsed: false,
    };
    
    const newCells = [...activeNotebook.cells];
    newCells[idx] = { ...cell, content: part1 };
    newCells.splice(idx + 1, 0, newCell);
    
    updateNotebook(activeNotebook.id, newCells, true);
    setSelectedCellId(newCell.id);
  };

  const mergeCells = () => {
    if (!activeNotebook || !selectedCellId) return;
    const idx = activeNotebook.cells.findIndex(c => c.id === selectedCellId);
    if (idx === -1 || idx >= activeNotebook.cells.length - 1) return;
    
    const cell = activeNotebook.cells[idx];
    const nextCell = activeNotebook.cells[idx + 1];
    
    const mergedContent = cell.content + '\n' + nextCell.content;
    
    const newCells = [...activeNotebook.cells];
    newCells[idx] = { ...cell, content: mergedContent };
    newCells.splice(idx + 1, 1);
    
    updateNotebook(activeNotebook.id, newCells, true);
    setSelectedCellId(cell.id);
  };

  const collapseCode = () => {
    if (!activeNotebook || !selectedCellId) return;
    const newCells = activeNotebook.cells.map(c => 
      c.id === selectedCellId ? { ...c, collapsed: true } : c
    );
    updateNotebook(activeNotebook.id, newCells, true);
  };

  const expandCode = () => {
    if (!activeNotebook || !selectedCellId) return;
    const newCells = activeNotebook.cells.map(c => 
      c.id === selectedCellId ? { ...c, collapsed: false } : c
    );
    updateNotebook(activeNotebook.id, newCells, true);
  };

  const collapseOutput = (cellId?: string) => {
    if (!activeNotebook) return;
    const targetId = cellId || selectedCellId;
    if (!targetId) return;
    const newCells = activeNotebook.cells.map(c => 
      c.id === targetId ? { ...c, outputCollapsed: true } : c
    );
    updateNotebook(activeNotebook.id, newCells, true);
  };

  const expandOutput = (cellId?: string) => {
    if (!activeNotebook) return;
    const targetId = cellId || selectedCellId;
    if (!targetId) return;
    const newCells = activeNotebook.cells.map(c => 
      c.id === targetId ? { ...c, outputCollapsed: false } : c
    );
    updateNotebook(activeNotebook.id, newCells, true);
  };

  const collapseAllCode = () => {
    if (!activeNotebook) return;
    const newCells = activeNotebook.cells.map(c => ({ ...c, collapsed: true }));
    updateNotebook(activeNotebook.id, newCells, true);
  };

  const expandAllCode = () => {
    if (!activeNotebook) return;
    const newCells = activeNotebook.cells.map(c => ({ ...c, collapsed: false }));
    updateNotebook(activeNotebook.id, newCells, true);
  };

  const collapseAllOutput = () => {
    if (!activeNotebook) return;
    const newCells = activeNotebook.cells.map(c => ({ ...c, outputCollapsed: true }));
    updateNotebook(activeNotebook.id, newCells, true);
  };

  const expandAllOutput = () => {
    if (!activeNotebook) return;
    const newCells = activeNotebook.cells.map(c => ({ ...c, outputCollapsed: false }));
    updateNotebook(activeNotebook.id, newCells, true);
  };

  useEffect(() => {
    if (registerActions) {
      registerActions({
        undo,
        redo,
        cutCell,
        copyCell,
        pasteCell,
        pasteCellAbove,
        deleteCell: () => selectedCellId && deleteCell(selectedCellId),
        selectAll: () => {
          if (document.activeElement instanceof HTMLTextAreaElement || document.activeElement instanceof HTMLInputElement) {
            document.activeElement.select();
          }
        },
        moveCellUp,
        moveCellDown,
        splitCell,
        mergeCells,
        collapseCode,
        collapseOutput: () => collapseOutput(),
        collapseAllCode,
        collapseAllOutput,
        expandCode,
        expandOutput: () => expandOutput(),
        expandAllCode,
        expandAllOutput,
        toggleLayout: () => setLayout(l => l === 'side-by-side' ? 'stacked' : 'side-by-side'),
        clearOutput: () => selectedCellId && clearOutput(selectedCellId),
        clearAllOutputs,
        canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1,
      });
    }
  }, [
    registerActions, activeNotebook, selectedCellId, clipboard, layout,
    historyIndex, history.length
  ]);

  const runCell = async (cellId: string) => {
    if (onRunCell) {
      onRunCell(cellId);
      return;
    }
    if (!activeNotebook) return;
    const cell = activeNotebook.cells.find(c => c.id === cellId);
    if (!cell || cell.type !== 'code') return;

    setRunningCells(s => new Set([...s, cellId]));
    const currentCounter = executionCounter + 1;
    const startTime = Date.now();

    // Mark as running
    updateNotebook(activeNotebook.id, activeNotebook.cells.map(c =>
      c.id === cellId ? { ...c, isRunning: true, output: null } : c
    ));

    // Simulate execution delay
    await new Promise(r => setTimeout(r, 400 + Math.random() * 600));

    const { output, isError } = simulateExecution(cell.content, currentCounter);
    const duration = parseFloat(((Date.now() - startTime) / 1000).toFixed(2));

    setExecutionCounter(currentCounter);
    setRunningCells(s => {
      const next = new Set(s);
      next.delete(cellId);
      return next;
    });

    updateNotebook(activeNotebook.id, activeNotebook.cells.map(c =>
      c.id === cellId
        ? {
            ...c,
            isRunning: false,
            executionCount: currentCounter,
            output: output !== null ? { type: isError ? 'error' : 'text', content: output } : null,
            executionTime: duration,
          }
        : c
    ));
  };

  const runAllCells = async () => {
    if (!activeNotebook) return;
    for (const cell of activeNotebook.cells) {
      if (cell.type === 'code') {
        await runCell(cell.id);
      }
    }
  };

  const insertCellAt = (index: number, type: CellType) => {
    if (!activeNotebook) return;
    const newCell: Cell = {
      id: generateId(),
      type,
      content: type === 'code' ? '' : '## New Section\n\nAdd your notes here.',
      output: null,
      executionCount: null,
      isRunning: false,
      collapsed: false,
    };

    const newCells = [...activeNotebook.cells];
    newCells.splice(Math.max(0, Math.min(index, newCells.length)), 0, newCell);
    updateNotebook(activeNotebook.id, newCells, true);
    setSelectedCellId(newCell.id);
  };

  const addCell = (afterId: string | null, type: CellType) => {
    if (!activeNotebook) return;
    if (afterId === null) {
      insertCellAt(activeNotebook.cells.length, type);
      return;
    }

    const idx = activeNotebook.cells.findIndex(c => c.id === afterId);
    insertCellAt(idx === -1 ? activeNotebook.cells.length : idx + 1, type);
  };

  const changeType = (cellId: string, type: CellType) => {
    if (!activeNotebook) return;
    updateNotebook(activeNotebook.id, activeNotebook.cells.map(c =>
      c.id === cellId ? { ...c, type, output: null } : c
    ), true);
  };

  const collapseCell = (cellId: string) => {
    if (!activeNotebook) return;
    updateNotebook(activeNotebook.id, activeNotebook.cells.map(c =>
      c.id === cellId ? { ...c, collapsed: !c.collapsed } : c
    ));
  };

  const handleDragStart = (cellId: string) => {
    setDraggedCellId(cellId);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedCellId === null) return;
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedCellId(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!activeNotebook || draggedCellId === null || dragOverIndex === null) return;

    const draggedIndex = activeNotebook.cells.findIndex(c => c.id === draggedCellId);
    if (draggedIndex === targetIndex) return;

    const newCells = [...activeNotebook.cells];
    const [draggedCell] = newCells.splice(draggedIndex, 1);
    newCells.splice(targetIndex, 0, draggedCell);

    updateNotebook(activeNotebook.id, newCells, true);
    setDraggedCellId(null);
    setDragOverIndex(null);
  };

  // Auto-scroll during drag
  useEffect(() => {
    if (!draggedCellId || !cellsContainerRef.current) return;

    const container = cellsContainerRef.current;
    let scrollInterval: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const scrollThreshold = 50;
      const scrollSpeed = 10;

      if (e.clientY - rect.top < scrollThreshold) {
        if (!scrollInterval) {
          scrollInterval = window.setInterval(() => {
            container.scrollTop -= scrollSpeed;
          }, 16);
        }
      } else if (rect.bottom - e.clientY < scrollThreshold) {
        if (!scrollInterval) {
          scrollInterval = window.setInterval(() => {
            container.scrollTop += scrollSpeed;
          }, 16);
        }
      } else {
        if (scrollInterval) {
          window.clearInterval(scrollInterval);
          scrollInterval = null;
        }
      }
    };

    const handleMouseUp = () => {
      if (scrollInterval) {
        window.clearInterval(scrollInterval);
        scrollInterval = null;
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      if (scrollInterval) {
        window.clearInterval(scrollInterval);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedCellId]);

  const addNewNotebook = () => {
    const newNb: Notebook = {
      id: `nb-${Date.now()}`,
      name: `Untitled Notebook`,
      color: '#22c55e',
      cells: [
        {
          id: generateId(),
          type: 'markdown',
          content: '# New Notebook\n\nStart writing here...',
          output: null,
          executionCount: null,
          isRunning: false,
          collapsed: false,
        },
        {
          id: generateId(),
          type: 'code',
          content: '# Your first code cell\nprint("Hello from Navrang Pustika!")',
          output: null,
          executionCount: null,
          isRunning: false,
          collapsed: false,
        },
      ],
    };
    onUpdateNotebooks([...notebooks, newNb]);
    setActiveNotebookId(newNb.id);
  };

  const closeNotebook = (nbId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (notebooks.length === 1) return;
    const remaining = notebooks.filter(n => n.id !== nbId);
    onUpdateNotebooks(remaining);
    if (activeNotebookId === nbId) {
      setActiveNotebookId(remaining[0].id);
    }
  };

  if (notebooks.length === 0) {
    return <WelcomeScreen theme={theme} onNewNotebook={addNewNotebook} t={t} />;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Notebook toolbar */}
      {activeNotebook && (
        <div
          className="flex items-center gap-2 px-4 py-2 border-b flex-shrink-0"
          style={{
            background: isDark ? '#0d1117' : '#ffffff',
            borderColor: isDark ? '#21262d' : '#e5e7eb',
          }}
        >
          <button
            onClick={runAllCells}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
            style={{
              fontSize: '12px',
              background: '#22c55e',
              color: '#ffffff',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#16a34a'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#22c55e'; }}
          >
            <Play size={11} fill="currentColor" />
            {t('notebook.runAll')}
          </button>

          <div className="flex-1" />

          {/* Undo/Redo buttons */}
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              fontSize: '12px',
              color: isDark ? '#8b949e' : '#6b7280',
            }}
            title="Undo (Ctrl+Z)"
          >
            <Undo size={11} />
            {t('notebook.undo')}
          </button>

          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              fontSize: '12px',
              color: isDark ? '#8b949e' : '#6b7280',
            }}
            title="Redo (Ctrl+Y)"
          >
            <Redo size={11} />
            {t('notebook.redo')}
          </button>
        </div>
      )}

      {/* Cells */}
      <div
        ref={cellsContainerRef}
        className="flex-1 overflow-y-auto"
        style={{ background: isDark ? '#0d1117' : '#ffffff' }}
        onClick={() => setSelectedCellId(null)}
      >
        {activeNotebook && (
          <div className="px-6 py-6">
            {/* Add cell at top */}
            <div className="flex justify-center mb-3 opacity-0 hover:opacity-100 transition-opacity">
              <button
                onClick={() => {
                  insertCellAt(0, 'code');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all"
                style={{
                  fontSize: '12px',
                  background: isDark ? '#21262d' : '#f9fafb',
                  border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                  color: isDark ? '#8b949e' : '#6b7280',
                }}
              >
                <Plus size={11} /> Add cell at top
              </button>
            </div>

            {/* Cell Rows */}
            {activeNotebook.cells.map((cell, index) => (
              <div key={`cell-group-${cell.id}`}>
              <div
                key={cell.id}
                className={`flex ${layout === 'stacked' ? 'flex-col' : 'flex-row'} gap-0 mb-3 relative transition-all duration-200`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  handleDragStart(cell.id);
                }}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, index)}
                style={{
                  opacity: draggedCellId === cell.id ? 0.4 : 1,
                  transform: draggedCellId === cell.id ? 'scale(0.98)' : 'scale(1)',
                  cursor: draggedCellId ? 'grabbing' : 'default',
                }}
              >
                {/* Insertion line indicator */}
                {dragOverIndex === index && draggedCellId !== cell.id && (
                  <div
                    className="absolute left-0 right-0 z-10 pointer-events-none"
                    style={{
                      height: '3px',
                      background: '#22c55e',
                      top: '-6px',
                      boxShadow: '0 0 12px #22c55e',
                      borderRadius: '2px',
                    }}
                  />
                )}

                {/* Code/Markdown Cell */}
                <div 
                  className="flex-1" 
                  style={{ 
                    minWidth: layout === 'side-by-side' ? '400px' : '100%',
                    width: layout === 'side-by-side' ? undefined : '100%',
                    flex: layout === 'side-by-side' ? undefined : '1 1 auto'
                  }}
                >
                  {cell.type === 'markdown' ? (
                    <MarkdownCell
                      cell={cell}
                      theme={theme}
                      onUpdate={updateCell}
                      onDelete={deleteCell}
                      onAddBelow={addCell}
                      onCollapse={collapseCell}
                      isSelected={selectedCellId === cell.id}
                      onSelect={setSelectedCellId}
                      isDragging={draggedCellId === cell.id}
                      t={t}
                    />
                  ) : (
                    <CodeCell
                      cell={cell}
                      index={index}
                      theme={theme}
                      executionCounter={executionCounter}
                      onUpdate={updateCell}
                      onDelete={deleteCell}
                      onRun={runCell}
                      onAddBelow={addCell}
                      onChangeType={changeType}
                      onCollapse={collapseCell}
                      isSelected={selectedCellId === cell.id}
                      onSelect={setSelectedCellId}
                      isDragging={draggedCellId === cell.id}
                      showLineNumbers={showLineNumbers}
                      wrapText={wrapText}
                      t={t}
                      fontSize={fontSize}
                      fontFamily={fontFamily}
                    />
                  )}
                </div>

                {/* Vertical Divider */}
                {layout === 'side-by-side' && (
                  <div
                    className="w-1 cursor-col-resize hover:bg-green-500 transition-colors flex-shrink-0"
                    style={{ background: isDark ? '#30363d' : '#e5e7eb' }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const startX = e.clientX;
                      const leftSection = e.currentTarget.previousElementSibling as HTMLElement;
                      const rightSection = e.currentTarget.nextElementSibling as HTMLElement;
                      const startWidth = leftSection.offsetWidth;

                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        const deltaX = moveEvent.clientX - startX;
                        const newWidth = Math.max(400, Math.min(window.innerWidth - 400, startWidth + deltaX));
                        leftSection.style.flex = '0 0 ' + newWidth + 'px';
                        leftSection.style.width = newWidth + 'px';
                      };

                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };

                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                  />
                )}

                {/* Output Section */}
                <div
                  className="flex-1 overflow-auto"
                  style={{
                    minWidth: layout === 'side-by-side' ? '300px' : '100%',
                    width: layout === 'side-by-side' ? undefined : '100%',
                    marginTop: layout === 'stacked' ? '8px' : '0px',
                    maxHeight: '600px',
                    background: isDark ? '#0d1117' : '#f8f9fa',
                    border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                    borderRadius: '8px',
                  }}
                >
                  {cell.type === 'code' && cell.output ? (
                    cell.outputCollapsed ? (
                      <div 
                        className="p-3 text-center text-xs text-gray-500 cursor-pointer hover:underline" 
                        onClick={(e) => { e.stopPropagation(); expandOutput(cell.id); }}
                      >
                        Output Collapsed (Click to expand)
                      </div>
                    ) : (
                      <div className="p-3">
                      <div
                        className="flex items-center justify-between mb-2 pb-2 border-b"
                        style={{ borderColor: isDark ? '#21262d' : '#e5e7eb' }}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="font-mono text-xs"
                            style={{ color: isDark ? '#8b949e' : '#6b7280' }}
                          >
                            [{cell.executionCount}]
                          </span>
                          {cell.output.type === 'error' && (
                            <span
                              className="px-2 py-0.5 rounded text-xs"
                              style={{ background: '#ef444420', color: '#ef4444' }}
                            >
                              Error
                            </span>
                          )}
                          {cell.executionTime !== undefined && (
                            <span
                              className="text-xs"
                              style={{ color: isDark ? '#8b949e' : '#6b7280' }}
                            >
                              {t('cell.executedIn')} {cell.executionTime}s
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateNotebook(activeNotebook.id, activeNotebook.cells.map(c =>
                              c.id === cell.id ? { ...c, output: null, executionTime: undefined } : c
                            ), true);
                          }}
                          className="px-1.5 py-0.5 rounded text-[10px] border hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                          style={{
                            borderColor: isDark ? '#30363d' : '#d0d7de',
                            color: isDark ? '#8b949e' : '#6b7280',
                            background: isDark ? '#21262d' : '#ffffff',
                          }}
                        >
                          {t('cell.clearOutput')}
                        </button>
                      </div>
                      <div
                        className="font-mono text-xs overflow-auto"
                        style={{
                          color: cell.output.type === 'error'
                            ? '#ef4444'
                            : (isDark ? '#e6edf3' : '#1f2328'),
                          whiteSpace: cell.output.content.startsWith('data:image/') ? 'normal' : 'pre-wrap',
                          wordBreak: 'break-word',
                          lineHeight: 1.6,
                        }}
                      >
                        {cell.output.type === 'html' ? (
                          <div dangerouslySetInnerHTML={{ __html: cell.output.content }} />
                        ) : cell.output.content.startsWith('data:image/') ? (
                          <img
                            src={cell.output.content}
                            alt="Plot Output"
                            className="max-w-full h-auto rounded bg-white p-1"
                          />
                        ) : (
                          cell.output.content
                        )}
                      </div>
                    </div>
                  )
                  ) : (
                    <div
                      className="flex items-center justify-center h-full"
                      style={{ color: isDark ? '#8b949e' : '#9ca3af', minHeight: '80px' }}
                    >
                      <div className="text-center">
                        <div className="text-sm">{cell.type === 'code' ? t('cell.noOutput') : t('cell.markdown')}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {index < activeNotebook.cells.length - 1 && (
                <InsertCellBar
                  index={index + 1}
                  isDark={isDark}
                  onInsert={(type) => insertCellAt(index + 1, type)}
                  isDragging={!!draggedCellId}
                />
              )}
              </div>
            ))}

            {/* Add cell at bottom */}
            <div className="flex justify-center mt-6 gap-2">
              <button
                onClick={() => insertCellAt(activeNotebook.cells.length, 'code')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all"
                style={{
                  fontSize: '12px',
                  background: isDark ? '#161b22' : '#f9fafb',
                  border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                  color: isDark ? '#8b949e' : '#6b7280',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#22c55e'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = isDark ? '#30363d' : '#e5e7eb'; }}
              >
                <Plus size={12} /> {t('cell.code')}
              </button>
              <button
                onClick={() => insertCellAt(activeNotebook.cells.length, 'markdown')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all"
                style={{
                  fontSize: '12px',
                  background: isDark ? '#161b22' : '#f9fafb',
                  border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                  color: isDark ? '#8b949e' : '#6b7280',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#3b82f6'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = isDark ? '#30363d' : '#e5e7eb'; }}
              >
                <Plus size={12} /> {t('cell.markdown')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
