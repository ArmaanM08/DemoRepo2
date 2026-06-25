import { X, Terminal, Play, AlertCircle } from 'lucide-react';
import type { Theme, Cell } from '../types';

interface CodeOutputPanelProps {
  theme: Theme;
  cells: Cell[];
  onClose: () => void;
  activeNotebookName?: string;
}

export function CodeOutputPanel({ theme, cells, onClose, activeNotebookName }: CodeOutputPanelProps) {
  const isDark = theme === 'dark';
  
  // Filter cells that have outputs
  const cellsWithOutput = cells.filter(cell => cell.output !== null && cell.type === 'code');

  return (
    <div
      className="flex flex-col border-l"
      style={{
        width: '400px',
        background: isDark ? '#161b22' : '#ffffff',
        borderColor: isDark ? '#30363d' : '#d0d7de',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{
          borderColor: isDark ? '#30363d' : '#d0d7de',
          background: isDark ? '#0d1117' : '#f6f8fa',
        }}
      >
        <div className="flex items-center gap-2">
          <Terminal size={14} style={{ color: isDark ? '#8b949e' : '#6e7781' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: isDark ? '#e6edf3' : '#1f2328' }}>
            Code Output
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-500/20"
          style={{ color: isDark ? '#8b949e' : '#6e7781' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Notebook name */}
      {activeNotebookName && (
        <div
          className="px-3 py-2 border-b"
          style={{
            borderColor: isDark ? '#21262d' : '#e9ecef',
            background: isDark ? '#161b22' : '#ffffff',
          }}
        >
          <span style={{ fontSize: '11px', color: isDark ? '#8b949e' : '#656d76' }}>
            {activeNotebookName}
          </span>
        </div>
      )}

      {/* Outputs */}
      <div className="flex-1 overflow-y-auto">
        {cellsWithOutput.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full p-8 text-center"
            style={{ color: isDark ? '#8b949e' : '#6e7781' }}
          >
            <Terminal size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <p style={{ fontSize: '12px', marginBottom: '4px' }}>No code output yet</p>
            <p style={{ fontSize: '11px', opacity: 0.7 }}>
              Run code cells to see output here
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {cellsWithOutput.map((cell, index) => (
              <div
                key={cell.id}
                className="rounded-lg overflow-hidden"
                style={{
                  background: isDark ? '#0d1117' : '#f6f8fa',
                  border: `1px solid ${isDark ? '#21262d' : '#e9ecef'}`,
                }}
              >
                {/* Cell header */}
                <div
                  className="flex items-center gap-2 px-3 py-2 border-b"
                  style={{
                    borderColor: isDark ? '#21262d' : '#e9ecef',
                    background: isDark ? '#161b22' : '#ffffff',
                  }}
                >
                  <Play
                    size={10}
                    fill="currentColor"
                    style={{ color: cell.output?.type === 'error' ? '#ef4444' : '#22c55e' }}
                  />
                  <span style={{ fontSize: '11px', color: isDark ? '#8b949e' : '#656d76' }}>
                    Cell [{cell.executionCount}]
                  </span>
                  {cell.output?.type === 'error' && (
                    <AlertCircle size={10} style={{ color: '#ef4444' }} />
                  )}
                </div>

                {/* Output content */}
                <div
                  className="px-3 py-2 overflow-x-auto"
                  style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                    fontSize: '11px',
                    lineHeight: '1.5',
                    color: cell.output?.type === 'error'
                      ? '#ef4444'
                      : (isDark ? '#e6edf3' : '#1f2328'),
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {cell.output?.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="px-3 py-2 border-t flex items-center justify-between"
        style={{
          borderColor: isDark ? '#30363d' : '#d0d7de',
          background: isDark ? '#0d1117' : '#f6f8fa',
        }}
      >
        <span style={{ fontSize: '10px', color: isDark ? '#8b949e' : '#656d76' }}>
          {cellsWithOutput.length} output{cellsWithOutput.length !== 1 ? 's' : ''}
        </span>
        <span style={{ fontSize: '10px', color: isDark ? '#8b949e' : '#656d76' }}>
          {cells.filter(c => c.type === 'code').length} code cells
        </span>
      </div>
    </div>
  );
}
