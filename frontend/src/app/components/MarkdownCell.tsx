import { useState } from 'react';
import { Edit3, Eye, Trash2, ChevronDown, ChevronRight, Plus, GripVertical } from 'lucide-react';
import type { Theme, Cell, CellType } from '../types';

interface MarkdownCellProps {
  cell: Cell;
  theme: Theme;
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onAddBelow: (id: string, type: CellType) => void;
  onCollapse: (id: string) => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
  isDragging?: boolean;
  t: (key: string) => string;
}

function renderMarkdown(text: string, isDark: boolean): string {
  let html = text
    // Headings
    .replace(/^### (.+)$/gm, `<h3 style="font-size:14px;font-weight:600;color:${isDark ? '#e6edf3' : '#1f2328'};margin:12px 0 6px">$1</h3>`)
    .replace(/^## (.+)$/gm, `<h2 style="font-size:16px;font-weight:600;color:${isDark ? '#e6edf3' : '#1f2328'};margin:14px 0 8px;border-bottom:1px solid ${isDark ? '#30363d' : '#d0d7de'};padding-bottom:4px">$1</h2>`)
    .replace(/^# (.+)$/gm, `<h1 style="font-size:20px;font-weight:600;color:#22c55e;margin:16px 0 10px;border-bottom:2px solid #22c55e;padding-bottom:6px">$1</h1>`)
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, `<code style="background:${isDark ? '#21262d' : '#f0f2f4'};color:#22c55e;padding:1px 5px;border-radius:3px;font-family:'JetBrains Mono',monospace;font-size:12px">$1</code>`)
    // Code blocks
    .replace(/```(\w+)?\n([\s\S]+?)```/g, (_, lang, code) =>
      `<pre style="background:${isDark ? '#0d1117' : '#f8f9fa'};color:${isDark ? '#e6edf3' : '#1f2328'};padding:12px;border-radius:6px;overflow-x:auto;border:1px solid ${isDark ? '#30363d' : '#d0d7de'};margin:8px 0;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.6"><code>${code.trim()}</code></pre>`
    )
    // Blockquote
    .replace(/^> (.+)$/gm, `<blockquote style="border-left:3px solid #22c55e;padding:4px 12px;color:${isDark ? '#8b949e' : '#656d76'};margin:8px 0;background:${isDark ? '#1a2e1f' : '#f0fdf4'};border-radius:0 4px 4px 0">$1</blockquote>`)
    // Unordered list
    .replace(/^- (.+)$/gm, `<li style="margin:2px 0;padding-left:4px;color:${isDark ? '#e6edf3' : '#1f2328'}">$1</li>`)
    // Ordered list items
    .replace(/^\d+\. (.+)$/gm, `<li style="margin:2px 0;padding-left:4px;color:${isDark ? '#e6edf3' : '#1f2328'};list-style-type:decimal">$1</li>`)
    // Table
    .replace(/^\|(.+)\|$/gm, (line) => {
      if (line.includes('---')) {
        return '';
      }
      const cells = line.split('|').filter(c => c.trim());
      return `<tr>${cells.map(c => `<td style="padding:4px 10px;border:1px solid ${isDark ? '#30363d' : '#d0d7de'};font-size:12px">${c.trim()}</td>`).join('')}</tr>`;
    })
    // Horizontal rule
    .replace(/^---$/gm, `<hr style="border:none;border-top:1px solid ${isDark ? '#30363d' : '#d0d7de'};margin:12px 0" />`)
    // Paragraph (line breaks)
    .replace(/\n\n/g, '</p><p style="margin:6px 0">')
    .replace(/\n/g, '<br/>');

  // Wrap li elements in ul
  html = html.replace(/((<li[^>]*>.*<\/li>\s*)+)/g, `<ul style="padding-left:20px;margin:6px 0;list-style-type:disc">$1</ul>`);

  return `<div style="line-height:1.6;font-size:13px;color:${isDark ? '#e6edf3' : '#1f2328'}">${html}</div>`;
}

export function MarkdownCell({
  cell, theme, onUpdate, onDelete, onAddBelow, onCollapse, isSelected, onSelect, isDragging = false, t,
}: MarkdownCellProps) {
  const isDark = theme === 'dark';
  const [editing, setEditing] = useState(false);

  const bg = isDark ? '#161b22' : '#ffffff';
  const border = isDark ? '#30363d' : '#d0d7de';

  return (
    <div
      className="relative mb-2 rounded-lg overflow-hidden"
      style={{
        background: bg,
        border: `1px solid ${isSelected ? '#22c55e' : border}`,
        boxShadow: isSelected ? '0 0 0 1px #22c55e20' : 'none',
      }}
      onClick={() => onSelect(cell.id)}
      onDoubleClick={() => setEditing(true)}
    >
      <div className="flex items-start" style={{ borderLeft: '3px solid #3b82f620' }}>
        {/* Gutter */}
        <div className="flex flex-col items-center pt-2 flex-shrink-0 gap-1" style={{ width: 52, paddingLeft: 4 }}>
          <GripVertical size={12} style={{ color: isDark ? '#484f58' : '#c0c7d0', cursor: isDragging ? 'grabbing' : 'grab' }} />
          <span style={{ fontSize: '10px', color: isDark ? '#8b949e' : '#8b949e', fontFamily: 'monospace' }}>
            MD
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div
            className="flex items-center gap-1 px-2 py-1 border-b"
            style={{ borderColor: isDark ? '#21262d' : '#f0f2f4' }}
          >
            <span
              className="px-1.5 py-0.5 rounded"
              style={{
                fontSize: '10px',
                background: isDark ? '#21262d' : '#f0f2f4',
                color: isDark ? '#8b949e' : '#656d76',
              }}
            >
              Markdown
            </span>
            <div className="flex-1" />
            <button
              onClick={e => { e.stopPropagation(); setEditing(!editing); }}
              className="p-1 rounded"
              style={{ color: editing ? '#22c55e' : isDark ? '#8b949e' : '#656d76' }}
              title={editing ? 'Preview' : 'Edit'}
            >
              {editing ? <Eye size={10} /> : <Edit3 size={10} />}
            </button>
            <button
              onClick={e => { e.stopPropagation(); onCollapse(cell.id); }}
              className="p-1 rounded"
              style={{ color: isDark ? '#8b949e' : '#656d76' }}
            >
              {cell.collapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
            </button>

            <button
              onClick={e => { e.stopPropagation(); onDelete(cell.id); }}
              className="p-1 rounded"
              style={{ color: isDark ? '#8b949e' : '#656d76' }}
              onMouseEnter={ev => { (ev.currentTarget as HTMLElement).style.color = '#ef4444'; }}
              onMouseLeave={ev => { (ev.currentTarget as HTMLElement).style.color = isDark ? '#8b949e' : '#656d76'; }}
            >
              <Trash2 size={10} />
            </button>
          </div>

          {!cell.collapsed && (
            editing ? (
              <textarea
                autoFocus
                value={cell.content}
                onChange={e => onUpdate(cell.id, e.target.value)}
                onBlur={() => setEditing(false)}
                className="code-area w-full resize-none outline-none p-3"
                style={{
                  fontSize: '13px',
                  lineHeight: 1.6,
                  background: isDark ? '#0d1117' : '#f8f9fa',
                  color: isDark ? '#e6edf3' : '#1f2328',
                  minHeight: 80,
                  display: 'block',
                }}
                spellCheck={false}
              />
            ) : (
              <div
                className="p-4"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(cell.content, isDark) }}
                onDoubleClick={() => setEditing(true)}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}
