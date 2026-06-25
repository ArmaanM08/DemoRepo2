import { useState, useRef, useEffect } from 'react';
import { Terminal, Hash, FileOutput, X, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import type { Theme, BottomTab, Variable } from '../types';
import { getWebSocketUrl } from '../utils/backendUrl';

interface BottomPanelProps {
  theme: Theme;
  activeTab: BottomTab;
  onTabChange: (tab: BottomTab) => void;
  onClose: () => void;
  variables: Variable[];
  t: (key: string) => string;
}

function simulateTerminalCommand(cmd: string): string {
  const c = cmd.trim();
  if (!c) return '';

  if (c === 'ls' || c === 'ls -la') {
    return `total 48\ndrwxr-xr-x  8 user  staff   256 Jun  9 10:32 .\ndrwxr-xr-x 14 user  staff   448 Jun  9 09:15 ..\n-rw-r--r--  1 user  staff  1240 Jun  9 10:32 README.md\n-rw-r--r--  1 user  staff  8192 Jun  9 10:31 Sales Data Analysis.ipynb\n-rw-r--r--  1 user  staff  5632 Jun  9 09:55 ML Classification Model.ipynb\n-rw-r--r--  1 user  staff  4096 Jun  9 10:15 Python Essentials.ipynb\ndrwxr-xr-x  3 user  staff    96 Jun  9 09:15 data/\ndrwxr-xr-x  2 user  staff    64 Jun  9 09:15 exports/`;
  }

  if (c === 'pwd') return '/home/user/navrang-pustika';

  if (c === 'python --version' || c === 'python3 --version') {
    return 'Python 3.11.7';
  }

  if (c.startsWith('pip install ')) {
    const pkg = c.replace('pip install ', '');
    return `Collecting ${pkg}\n  Downloading ${pkg}-latest-py3-none-any.whl (128 kB)\nInstalling collected packages: ${pkg}\nSuccessfully installed ${pkg}`;
  }

  if (c.startsWith('pip list')) {
    return `Package         Version\n--------------- -------\nnumpy           1.26.2\npandas          2.1.4\nmatplotlib      3.8.2\nscikit-learn    1.3.2\njupyter         1.0.0\nnavrang-ai      0.3.1\nchromadb        0.4.18\nfaiss-cpu       1.7.4`;
  }

  if (c === 'clear' || c === 'cls') return '\x1bclear';

  if (c.startsWith('python ') || c.startsWith('python3 ')) {
    return `Running ${c.split(' ')[1]}...\n✓ Done`;
  }

  if (c === 'ollama list') {
    return `NAME                    ID              SIZE    MODIFIED\ngemma:2b                b50d6c999e59    1.7 GB  2 hours ago\nphi3:mini               4f2222927938    2.2 GB  5 hours ago\ndeepseek-coder:1.3b     c0e8ca8a7d44    776 MB  1 day ago`;
  }

  if (c === 'ollama run gemma:2b') {
    return `>>> Send a message (/? for help)`;
  }

  if (c === 'navrang --version') {
    return 'Navrang Pustika v0.3.1 — Think Locally, Create Privately.';
  }

  if (c === 'help' || c === '?') {
    return `Available commands:
  ls         — List files
  pwd        — Print working directory
  python     — Run Python
  pip        — Package manager
  ollama     — Manage AI models
  navrang    — Navrang CLI
  clear      — Clear terminal`;
  }

  if (c === 'exit' || c === 'quit') {
    return 'Use the × button to close the terminal.';
  }

  return `bash: ${c.split(' ')[0]}: command not found`;
}

function TerminalPanel({ theme, isDark }: { theme: Theme; isDark: boolean }) {
  const [history, setHistory] = useState<{ cmd: string; out: string }[]>([
    { cmd: '', out: `Navrang Pustika Terminal\nPython 3.12.6 • Kernel: Local\n` },
  ]);
  const [input, setInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  useEffect(() => {
    const ws = new WebSocket(getWebSocketUrl('/api/terminal/ws'));
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.output === "\x1bclear") {
        setHistory([]);
      } else {
        setHistory(h => {
          if (h.length === 0) return [{ cmd: "", out: msg.output }];
          const last = h[h.length - 1];
          return [...h.slice(0, -1), { ...last, out: last.out + msg.output }];
        });
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const runCommand = () => {
    if (!input.trim()) return;
    const trimmedCmd = input.trim();
    if (trimmedCmd === 'clear' || trimmedCmd === 'cls') {
      setHistory([]);
      setInput('');
      return;
    }

    setHistory(h => [...h, { cmd: input, out: "" }]);
    wsRef.current?.send(JSON.stringify({ command: trimmedCmd }));
    setCmdHistory(h => [input, ...h]);
    setHistoryIndex(-1);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      runCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(historyIndex + 1, cmdHistory.length - 1);
      setHistoryIndex(next);
      setInput(cmdHistory[next] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.max(historyIndex - 1, -1);
      setHistoryIndex(next);
      setInput(next === -1 ? '' : cmdHistory[next]);
    }
  };

  return (
    <div
      className="flex-1 p-3 overflow-y-auto font-mono cursor-text"
      style={{ background: isDark ? '#0d1117' : '#1e2729', color: '#4ade80', fontSize: '12px', lineHeight: 1.6 }}
      onClick={() => inputRef.current?.focus()}
    >
      {history.map((item, i) => (
        <div key={i}>
          {item.cmd && (
            <div className="flex items-center gap-1">
              <span style={{ color: '#22c55e' }}>(navrang-env)</span>
              <span style={{ color: '#4ade80' }}> $ </span>
              <span style={{ color: '#e6edf3' }}>{item.cmd}</span>
            </div>
          )}
          {item.out && (
            <pre
              style={{
                color: item.out.includes('command not found') ? '#f97316' : '#8b949e',
                whiteSpace: 'pre-wrap',
                margin: '2px 0 8px',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {item.out}
            </pre>
          )}
        </div>
      ))}
      <div className="flex items-center gap-1">
        <span style={{ color: '#22c55e' }}>(navrang-env)</span>
        <span style={{ color: '#4ade80' }}> $ </span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 outline-none bg-transparent"
          style={{ color: '#e6edf3', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}
          autoFocus
          spellCheck={false}
        />
        <span
          style={{
            width: 7, height: 13, background: '#4ade80',
            animation: 'pulse 1s step-end infinite',
          }}
        />
      </div>
      <div ref={bottomRef} />
    </div>
  );
}

function VariablesPanel({ variables, isDark, t }: { variables: Variable[]; isDark: boolean; t: (key: string) => string }) {
  return (
    <div className="flex-1 overflow-auto p-2">
      {variables.length === 0 ? (
        <p style={{ fontSize: '12px', color: isDark ? '#8b949e' : '#656d76', textAlign: 'center', padding: 16 }}>
          {t('bottomPanel.noVariables') || 'No variables defined. Run a cell first.'}
        </p>
      ) : (
        <table className="w-full" style={{ fontSize: '12px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${isDark ? '#30363d' : '#d0d7de'}` }}>
              {[t('bottomPanel.name') || 'Name', t('bottomPanel.type') || 'Type', t('bottomPanel.value') || 'Value / Shape'].map(h => (
                <th
                  key={h}
                  className="text-left py-1.5 px-2"
                  style={{ color: isDark ? '#8b949e' : '#656d76', fontSize: '10px', letterSpacing: '0.05em' }}
                >
                  {h.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {variables.map((v, i) => (
              <tr
                key={i}
                style={{ borderBottom: `1px solid ${isDark ? '#21262d' : '#f0f2f4'}` }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = isDark ? '#21262d' : '#f0f2f4'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <td className="py-1.5 px-2">
                  <code style={{ color: '#22c55e', fontFamily: "'JetBrains Mono', monospace" }}>{v.name}</code>
                </td>
                <td className="py-1.5 px-2">
                  <span
                    className="px-1.5 py-0.5 rounded"
                    style={{
                      fontSize: '10px',
                      background: isDark ? '#21262d' : '#f0f2f4',
                      color: isDark ? '#8b949e' : '#656d76',
                    }}
                  >
                    {v.type}
                  </span>
                </td>
                <td className="py-1.5 px-2" style={{ color: isDark ? '#e6edf3' : '#1f2328' }}>
                  {v.shape || v.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function OutputPanel({ isDark, t }: { isDark: boolean; t: (key: string) => string }) {
  const outputs = [
    { level: 'info', time: '10:32:15', msg: t('logs.kernelStarted') || 'Kernel started successfully' },
    { level: 'info', time: '10:32:18', msg: (t('logs.cellExecuted') || 'Cell [1] executed in 0.23s').replace('{index}', '1').replace('{time}', '0.23') },
    { level: 'info', time: '10:32:20', msg: (t('logs.cellExecuted') || 'Cell [2] executed in 0.81s').replace('{index}', '2').replace('{time}', '0.81') },
    { level: 'info', time: '10:32:22', msg: (t('logs.cellExecuted') || 'Cell [3] executed in 0.17s').replace('{index}', '3').replace('{time}', '0.17') },
    { level: 'warn', time: '10:32:22', msg: 'FutureWarning: DataFrame.groupby with axis != 0 is deprecated' },
    { level: 'info', time: '10:32:45', msg: t('logs.autoSaveCompleted') || 'Auto-save completed' },
  ];

  const colors = {
    info: '#22c55e',
    warn: '#eab308',
    error: '#ef4444',
  };

  return (
    <div className="flex-1 overflow-auto p-2">
      {outputs.map((o, i) => (
        <div key={i} className="flex items-start gap-2 py-1" style={{ fontSize: '11px', fontFamily: 'monospace' }}>
          <span style={{ color: isDark ? '#484f58' : '#b0b7c3', flexShrink: 0 }}>{o.time}</span>
          <span
            className="px-1 rounded flex-shrink-0"
            style={{
              fontSize: '9px',
              background: colors[o.level as keyof typeof colors] + '20',
              color: colors[o.level as keyof typeof colors],
            }}
          >
            {o.level.toUpperCase()}
          </span>
          <span style={{ color: isDark ? '#8b949e' : '#656d76' }}>{o.msg}</span>
        </div>
      ))}
    </div>
  );
}

export function BottomPanel({ theme, activeTab, onTabChange, onClose, variables, t }: BottomPanelProps) {
  const isDark = theme === 'dark';
  const [maximized, setMaximized] = useState(false);

  const tabs = [
    { id: 'terminal' as BottomTab, icon: Terminal, label: t('bottomPanel.terminal') },
    { id: 'variables' as BottomTab, icon: Hash, label: t('bottomPanel.variables') },
    { id: 'output' as BottomTab, icon: FileOutput, label: t('bottomPanel.output') },
  ];

  return (
    <div
      className="flex flex-col border-t flex-shrink-0"
      style={{
        height: maximized ? '60%' : 220,
        background: isDark ? '#0d1117' : '#1e2729',
        borderColor: isDark ? '#30363d' : '#d0d7de',
      }}
    >
      {/* Tab bar */}
      <div
        className="flex items-center gap-0 flex-shrink-0 border-b"
        style={{
          background: isDark ? '#161b22' : '#0d1117',
          borderColor: isDark ? '#30363d' : '#333',
        }}
      >
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className="flex items-center gap-1.5 px-3 py-1.5"
            style={{
              fontSize: '11px',
              color: activeTab === id ? '#22c55e' : '#8b949e',
              background: activeTab === id ? isDark ? '#0d1117' : '#1e2729' : 'transparent',
              borderBottom: activeTab === id ? '1px solid #22c55e' : '1px solid transparent',
            }}
          >
            <Icon size={11} />
            {label}
          </button>
        ))}

        <div className="flex-1" />

        <button
          onClick={() => setMaximized(m => !m)}
          className="p-1.5"
          style={{ color: '#8b949e' }}
        >
          {maximized ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
        </button>
        <button
          onClick={onClose}
          className="p-1.5 mr-1"
          style={{ color: '#8b949e' }}
        >
          <X size={11} />
        </button>
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'terminal' && <TerminalPanel theme={theme} isDark={isDark} />}
        {activeTab === 'variables' && <VariablesPanel variables={variables} isDark={isDark} t={t} />}
        {activeTab === 'output' && <OutputPanel isDark={isDark} t={t} />}
      </div>
    </div>
  );
}
