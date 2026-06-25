import { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play, Loader2, Trash2, Copy, ChevronDown, ChevronRight,
  Plus, Code, FileText, GripVertical
} from 'lucide-react';
import type { Theme, Cell, CellType } from '../types';

interface CodeCellProps {
  cell: Cell;
  index: number;
  theme: Theme;
  executionCounter: number;
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onRun: (id: string) => void;
  onAddBelow: (id: string, type: CellType) => void;
  onChangeType: (id: string, type: CellType) => void;
  onCollapse: (id: string) => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
  isDragging?: boolean;
  showLineNumbers?: boolean;
  wrapText?: boolean;
  t: (key: string) => string;
  fontSize?: number;
  fontFamily?: string;
}

function renderOutput(content: string, type: string, isDark: boolean) {
  if (content === '<chart>') {
    return (
      <div className="p-3 rounded" style={{ background: isDark ? '#0d1117' : '#f6f8fa' }}>
        <div
          className="w-full rounded p-4 flex items-center justify-center"
          style={{ background: isDark ? '#161b22' : '#ffffff', border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}` }}
        >
          <svg width="300" height="160" viewBox="0 0 300 160" style={{ fontFamily: 'monospace' }}>
            <rect width="300" height="160" fill={isDark ? '#161b22' : '#ffffff'} />
            {/* Bar chart for sales data */}
            {[
              { x: 40, h: 80, label: 'Oct', color: '#22c55e' },
              { x: 120, h: 100, label: 'Nov', color: '#3b82f6' },
              { x: 200, h: 130, label: 'Dec', color: '#8b5cf6' },
            ].map(bar => (
              <g key={bar.label}>
                <rect
                  x={bar.x} y={140 - bar.h}
                  width={60} height={bar.h}
                  fill={bar.color} rx="4" opacity="0.8"
                />
                <text
                  x={bar.x + 30} y={155}
                  textAnchor="middle" fill={isDark ? '#8b949e' : '#656d76'}
                  fontSize="10"
                >
                  {bar.label}
                </text>
              </g>
            ))}
            <text x="150" y="15" textAnchor="middle" fill={isDark ? '#e6edf3' : '#1f2328'} fontSize="11">
              Monthly Sales Chart
            </text>
          </svg>
        </div>
        <p style={{ fontSize: '10px', color: '#22c55e', marginTop: 4 }}>
          [matplotlib figure] — interactive chart rendered
        </p>
      </div>
    );
  }

  return (
    <pre
      className="rounded p-3 overflow-x-auto"
      style={{
        fontSize: '12px',
        lineHeight: 1.6,
        fontFamily: "'JetBrains Mono', monospace",
        background: type === 'error'
          ? isDark ? '#2d1a1a' : '#fff5f5'
          : isDark ? '#0d1117' : '#f6f8fa',
        color: type === 'error'
          ? '#ef4444'
          : isDark ? '#e6edf3' : '#1f2328',
        border: `1px solid ${type === 'error' ? '#ef444440' : isDark ? '#30363d' : '#d0d7de'}`,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {content}
    </pre>
  );
}

export function CodeCell({
  cell, index, theme, executionCounter, onUpdate, onDelete, onRun,
  onAddBelow, onChangeType, onCollapse, isSelected, onSelect, isDragging = false,
  showLineNumbers = true, wrapText = false, t, fontSize = 14, fontFamily = 'monospace',
}: CodeCellProps) {
  const isDark = theme === 'dark';
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.max(textareaRef.current.scrollHeight, 60) + 'px';
    }
  }, [cell.content, cell.collapsed]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newContent = cell.content.substring(0, start) + '    ' + cell.content.substring(end);
      onUpdate(cell.id, newContent);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 4;
      });
    }
    if (e.shiftKey && e.key === 'Enter') {
      e.preventDefault();
      onRun(cell.id);
    }
  }, [cell.content, cell.id, onUpdate, onRun]);

  const handleCopy = () => {
    navigator.clipboard.writeText(cell.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const bg = isDark ? '#161b22' : '#ffffff';
  const border = isDark ? '#30363d' : '#e5e7eb';
  const selectedBorder = '#22c55e';

  return (
    <div
      className="relative mb-3 rounded-xl overflow-hidden transition-all"
      style={{
        background: bg,
        border: `1px solid ${isSelected ? selectedBorder : border}`,
        boxShadow: isSelected ? '0 0 0 2px #22c55e20' : 'none',
      }}
      onClick={() => onSelect(cell.id)}
    >
      {/* Cell gutter */}
      <div
        className="flex items-start"
        style={{ borderLeft: `3px solid ${cell.type === 'code' ? '#22c55e' : '#3b82f6'}20` }}
      >
        {/* Left gutter */}
        <div
          className="flex flex-col items-center pt-2 flex-shrink-0"
          style={{ width: 52, paddingLeft: 4 }}
        >
          {/* Drag handle */}
          <GripVertical size={12} style={{ color: isDark ? '#484f58' : '#c0c7d0', marginBottom: 2, cursor: isDragging ? 'grabbing' : 'grab' }} />

          {/* Execution count */}
          <span
            style={{
              fontSize: '10px',
              fontFamily: 'monospace',
              color: isDark ? '#8b949e' : '#8b949e',
              lineHeight: 1,
            }}
          >
            {cell.executionCount !== null ? `[${cell.executionCount}]` : '[ ]'}
          </span>

          {/* Run button */}
          <button
            onClick={e => { e.stopPropagation(); onRun(cell.id); }}
            className="mt-1 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
            style={{
              background: cell.isRunning ? '#dc2626' : '#22c55e',
              color: 'white',
            }}
            title="Run (Shift+Enter)"
          >
            {cell.isRunning
              ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
              : <Play size={9} fill="currentColor" />
            }
          </button>
        </div>

        {/* Cell body */}
        <div className="flex-1 min-w-0">
          {/* Cell toolbar */}
          <div
            className="flex items-center gap-1 px-2 py-1 border-b"
            style={{ borderColor: isDark ? '#21262d' : '#f0f2f4' }}
          >
            {/* Type selector */}
            <div className="relative">
              <button
                className="flex items-center gap-1 px-1.5 py-0.5 rounded"
                style={{
                  fontSize: '10px',
                  background: isDark ? '#21262d' : '#f0f2f4',
                  color: isDark ? '#8b949e' : '#656d76',
                }}
                onClick={e => { e.stopPropagation(); setShowTypeMenu(!showTypeMenu); }}
              >
                {cell.type === 'code' ? <Code size={9} /> : <FileText size={9} />}
                {cell.type === 'code' ? 'Code' : 'Markdown'}
                <ChevronDown size={8} />
              </button>
              {showTypeMenu && (
                <div
                  className="absolute top-full left-0 mt-1 rounded shadow-lg z-20 overflow-hidden"
                  style={{
                    background: isDark ? '#21262d' : '#ffffff',
                    border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
                    minWidth: 100,
                  }}
                >
                  {(['code', 'markdown'] as CellType[]).map(t => (
                    <button
                      key={t}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-left"
                      style={{
                        fontSize: '11px',
                        color: isDark ? '#e6edf3' : '#1f2328',
                        background: cell.type === t ? isDark ? '#1a2e1f' : '#dcfce7' : 'transparent',
                      }}
                      onClick={e => {
                        e.stopPropagation();
                        onChangeType(cell.id, t);
                        setShowTypeMenu(false);
                      }}
                    >
                      {t === 'code' ? <Code size={10} /> : <FileText size={10} />}
                      {t === 'code' ? 'Code' : 'Markdown'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1" />

            {/* Actions */}
            <button
              onClick={e => { e.stopPropagation(); handleCopy(); }}
              className="p-1 rounded"
              style={{ color: isDark ? '#8b949e' : '#656d76', fontSize: '10px' }}
              title="Copy"
            >
              {copied ? '✓' : <Copy size={10} />}
            </button>

            <button
              onClick={e => { e.stopPropagation(); onCollapse(cell.id); }}
              className="p-1 rounded"
              style={{ color: isDark ? '#8b949e' : '#656d76' }}
              title="Collapse"
            >
              {cell.collapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete(cell.id); }}
              className="p-1 rounded"
              style={{ color: isDark ? '#8b949e' : '#656d76' }}
              title="Delete cell"
              onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.color = '#ef4444'; }}
              onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.color = isDark ? '#8b949e' : '#656d76'; }}
            >
              <Trash2 size={10} />
            </button>
          </div>

          {/* Editor */}
          {!cell.collapsed && (
            <div className="relative flex">
              {/* Line numbers */}
              {showLineNumbers && (
                <div
                  className="flex flex-col items-end pr-2 py-4 text-right select-none"
                  style={{
                    fontSize: '12px',
                    lineHeight: 1.6,
                    fontFamily: 'monospace',
                    color: isDark ? '#484f58' : '#6b7280',
                    minWidth: '30px',
                    background: isDark ? '#0d1117' : '#f9fafb',
                  }}
                >
                  {cell.content.split('\n').map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={cell.content}
                onChange={e => onUpdate(cell.id, e.target.value)}
                onKeyDown={handleKeyDown}
                className="code-area w-full outline-none p-4"
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: 1.6,
                  background: isDark ? '#0d1117' : '#f9fafb',
                  color: isDark ? '#e6edf3' : '#1f2328',
                  minHeight: 80,
                  display: 'block',
                  tabSize: 4,
                  fontFamily: fontFamily,
                  resize: 'vertical',
                  whiteSpace: wrapText ? 'pre-wrap' : 'pre',
                  overflowWrap: wrapText ? 'break-word' : 'normal',
                }}
                spellCheck={false}
                placeholder={cell.type === 'code' ? t('notebook.writePythonCode') : t('notebook.writeMarkdown')}
              />
            </div>
          )}
        </div>
      </div>


    </div>
  );
}
