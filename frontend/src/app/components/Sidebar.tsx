import { useState, useEffect } from 'react';
import {
  ChevronRight, ChevronDown, Folder, FolderOpen, FileText,
  Plus, Trash2, Edit2, FolderPlus
} from 'lucide-react';
import type { Theme, FileNode, Notebook } from '../types';
import { getBackendUrl } from '../utils/backendUrl';

interface SidebarProps {
  theme: Theme;
  files: FileNode[];
  setFiles: (f: FileNode[]) => void;
  activeNotebookId: string;
  onOpenNotebook: (id: string, name: string) => void;
  onRename?: (oldPath: string, newPath: string) => void;
  onDeleteFile?: (path: string) => void;
  t: (key: string) => string;
  notebooks: Notebook[];
  onSelectCell?: (id: string | null) => void;
}

function FileTreeNode({
  node, depth, theme, activeNotebookId, onOpenNotebook, onToggle, onDelete, onRename, t,
}: {
  node: FileNode;
  depth: number;
  theme: Theme;
  activeNotebookId: string;
  onOpenNotebook: (id: string, name: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (oldPath: string, newName: string) => void;
  t: (key: string) => string;
}) {
  const isDark = theme === 'dark';
  const isActive = node.type === 'notebook' && activeNotebookId === node.id;
  const [hovered, setHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);

  useEffect(() => {
    setEditName(node.name);
  }, [node.name]);

  const icon = () => {
    if (node.type === 'folder') {
      return node.expanded
        ? <FolderOpen size={13} style={{ color: '#eab308', flexShrink: 0 }} />
        : <Folder size={13} style={{ color: '#eab308', flexShrink: 0 }} />;
    }
    if (node.type === 'notebook') {
      return (
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: node.color || '#22c55e' }}
        />
      );
    }
    return <FileText size={12} style={{ color: isDark ? '#8b949e' : '#656d76', flexShrink: 0 }} />;
  };

  return (
    <div>
      <div
        className="flex items-center gap-1 py-0.5 px-1 rounded cursor-pointer group"
        style={{
          paddingLeft: `${depth * 12 + 4}px`,
          background: isActive
            ? isDark ? '#1a2e1f' : '#dcfce7'
            : hovered ? isDark ? '#21262d' : '#f0f2f4' : 'transparent',
          borderLeft: isActive ? '2px solid #22c55e' : '2px solid transparent',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => {
          if (node.type === 'folder') onToggle(node.id);
          else if (node.type === 'notebook') onOpenNotebook(node.id, node.name);
        }}
      >
        {node.type === 'folder' && (
          <span style={{ color: isDark ? '#8b949e' : '#656d76', flexShrink: 0 }}>
            {node.expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          </span>
        )}
        {node.type !== 'folder' && <span className="w-2.5 flex-shrink-0" />}

        {icon()}

        {isEditing ? (
          <input
            autoFocus
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onBlur={async () => {
              if (editName.trim() && editName !== node.name) {
                await onRename(node.id, editName);
              }
              setIsEditing(false);
            }}
            onKeyDown={async e => {
              if (e.key === 'Enter') {
                if (editName.trim() && editName !== node.name) {
                  await onRename(node.id, editName);
                }
                setIsEditing(false);
              } else if (e.key === 'Escape') {
                setEditName(node.name);
                setIsEditing(false);
              }
            }}
            onClick={e => e.stopPropagation()}
            className="flex-1 px-1 rounded border outline-none font-sans"
            style={{
              fontSize: '11px',
              height: '18px',
              background: isDark ? '#0d1117' : '#ffffff',
              border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
              color: isDark ? '#e6edf3' : '#1f2328',
            }}
          />
        ) : (
          <span
            className="flex-1 truncate"
            style={{
              fontSize: '12px',
              color: isActive ? '#22c55e' : isDark ? '#e6edf3' : '#1f2328',
            }}
            onDoubleClick={e => { e.stopPropagation(); setIsEditing(true); }}
          >
            {node.name}
          </span>
        )}

        {hovered && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
            <button
              className="p-0.5 rounded hover:bg-gray-500/10 cursor-pointer"
              style={{ color: isDark ? '#8b949e' : '#656d76' }}
              onClick={e => { e.stopPropagation(); setIsEditing(true); }}
              title={t('cell.rename') || "Rename"}
            >
              <Edit2 size={10} />
            </button>
            <button
              className="p-0.5 rounded hover:bg-gray-500/10 cursor-pointer"
              style={{ color: isDark ? '#8b949e' : '#656d76' }}
              onClick={e => { e.stopPropagation(); onDelete(node.id); }}
              title={t('cell.delete') || "Delete"}
            >
              <Trash2 size={10} />
            </button>
          </div>
        )}
      </div>

      {node.type === 'folder' && node.expanded && node.children?.map(child => (
        <FileTreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          theme={theme}
          activeNotebookId={activeNotebookId}
          onOpenNotebook={onOpenNotebook}
          onToggle={onToggle}
          onDelete={onDelete}
          onRename={onRename}
          t={t}
        />
      ))}
    </div>
  );
}

function SearchPanel({
  theme, notebooks = [], onOpenNotebook, onSelectCell, t
}: {
  theme: Theme;
  notebooks: Notebook[];
  onOpenNotebook: (id: string, name: string) => void;
  onSelectCell?: (id: string | null) => void;
  t: (key: string) => string;
}) {
  const isDark = theme === 'dark';
  const [query, setQuery] = useState('');

  const results: any[] = [];
  if (query.trim()) {
    notebooks.forEach(nb => {
      nb.cells.forEach((cell, idx) => {
        if (cell.content.toLowerCase().includes(query.toLowerCase())) {
          const lines = cell.content.split('\n');
          lines.forEach((lineText, lineIdx) => {
            if (lineText.toLowerCase().includes(query.toLowerCase())) {
              results.push({
                notebookId: nb.id,
                notebookName: nb.name,
                cellId: cell.id,
                cellIndex: idx + 1,
                lineText: lineText.trim(),
                lineNum: lineIdx + 1,
              });
            }
          });
        }
      });
    });
  }

  return (
    <div className="p-2 flex flex-col h-full">
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={t('sidebar.searchPlaceholder')}
        className="w-full px-2 py-1.5 rounded border outline-none"
        style={{
          fontSize: '12px',
          background: isDark ? '#21262d' : '#f0f2f4',
          border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
          color: isDark ? '#e6edf3' : '#1f2328',
        }}
      />
      <div className="mt-2 space-y-1.5 flex-1 overflow-y-auto max-h-[300px]">
        {results.map((r, i) => (
          <div
            key={i}
            onClick={() => {
              onOpenNotebook(r.notebookId, r.notebookName);
              if (onSelectCell) {
                onSelectCell(r.cellId);
              }
            }}
            className="p-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            style={{
              background: isDark ? '#21262d' : '#f8f9fa',
              border: `1px solid ${isDark ? '#30363d' : '#e9ecef'}`,
            }}
          >
            <div style={{ fontSize: '11px', color: '#22c55e', fontFamily: 'monospace' }}>{r.lineText}</div>
            <div style={{ fontSize: '10px', color: isDark ? '#8b949e' : '#656d76', marginTop: 2 }}>
              {r.notebookName} • {t('sidebar.cell')} {r.cellIndex} : {t('sidebar.line')} {r.lineNum}
            </div>
          </div>
        ))}
        {query && results.length === 0 && (
          <p style={{ fontSize: '11px', color: isDark ? '#8b949e' : '#656d76', textAlign: 'center', padding: '8px' }}>
            {t('sidebar.noResults')}
          </p>
        )}
      </div>
    </div>
  );
}

export function Sidebar({
  theme, files, setFiles, activeNotebookId, onOpenNotebook, onRename, onDeleteFile, t, notebooks, onSelectCell
}: SidebarProps) {
  const isDark = theme === 'dark';

  const toggleFolder = (id: string) => {
    const toggle = (nodes: FileNode[]): FileNode[] =>
      nodes.map(n =>
        n.id === id
          ? { ...n, expanded: !n.expanded }
          : { ...n, children: n.children ? toggle(n.children) : undefined }
      );
    setFiles(toggle(files));
  };

  const renameNode = async (oldPath: string, newName: string) => {
    const parts = oldPath.split('/');
    parts[parts.length - 1] = newName;
    const newPath = parts.join('/');
    if (onRename) {
      onRename(oldPath, newPath);
      return;
    }
    try {
      await fetch(getBackendUrl('/api/files/rename'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_path: oldPath, new_path: newPath })
      });
      const response = await fetch(getBackendUrl('/api/files'));
      const data = await response.json();
      setFiles(data);
    } catch (e) {
      console.error("Error renaming file", e);
    }
  };

  const deleteNode = async (id: string) => {
    if (onDeleteFile) {
      onDeleteFile(id);
      return;
    }
    try {
      await fetch(`${getBackendUrl('/api/files')}?path=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      const response = await fetch(getBackendUrl('/api/files'));
      const data = await response.json();
      setFiles(data);
    } catch (e) {
      console.error("Error deleting file", e);
    }
  };

  const addNewNotebook = async () => {
    const filename = `Untitled_${Date.now().toString().slice(-4)}.ipynb`;
    try {
      await fetch(getBackendUrl('/api/files/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filename, type: 'notebook' })
      });
      const response = await fetch(getBackendUrl('/api/files'));
      const data = await response.json();
      setFiles(data);
    } catch (e) {
      console.error("Error creating notebook", e);
    }
  };

  const addNewFolder = async () => {
    const folderName = prompt(t('sidebar.enterFolderName') || "Enter folder name:");
    if (!folderName) return;
    try {
      await fetch(getBackendUrl('/api/files/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: folderName, type: 'folder' })
      });
      const response = await fetch(getBackendUrl('/api/files'));
      const data = await response.json();
      setFiles(data);
    } catch (e) {
      console.error("Error creating folder", e);
    }
  };

  return (
    <div 
      className="flex flex-col h-full flex-shrink-0 border-r" 
      style={{ 
        width: 280,
        background: isDark ? '#161b22' : '#f8f9fa',
        borderColor: isDark ? '#30363d' : '#d0d7de',
      }}
    >
      {/* File Explorer Section */}
      <div className="flex-1 flex flex-col min-h-[200px] overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2 flex-shrink-0 border-b"
          style={{ borderColor: isDark ? '#30363d' : '#d0d7de' }}
        >
          <span style={{ fontSize: '10px', color: isDark ? '#8b949e' : '#656d76', letterSpacing: '0.05em', fontWeight: 600 }}>
            {t('sidebar.explorer')}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={addNewNotebook}
              title={t('sidebar.newNotebook')}
              className="p-0.5 rounded transition-colors hover:bg-gray-500/10 cursor-pointer"
              style={{ color: isDark ? '#8b949e' : '#656d76' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#22c55e'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = isDark ? '#8b949e' : '#656d76'; }}
            >
              <Plus size={13} />
            </button>
            <button
              onClick={addNewFolder}
              title={t('sidebar.newFolder')}
              className="p-0.5 rounded transition-colors hover:bg-gray-500/10 cursor-pointer"
              style={{ color: isDark ? '#8b949e' : '#656d76' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#eab308'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = isDark ? '#8b949e' : '#656d76'; }}
            >
              <FolderPlus size={13} />
            </button>
          </div>
        </div>
        {/* Tree Content */}
        <div className="flex-1 overflow-y-auto py-1 px-1">
          {files.map(node => (
            <FileTreeNode
              key={node.id}
              node={node}
              depth={0}
              theme={theme}
              activeNotebookId={activeNotebookId}
              onOpenNotebook={onOpenNotebook}
              onToggle={toggleFolder}
              onDelete={deleteNode}
              onRename={renameNode}
              t={t}
            />
          ))}
        </div>
      </div>

      {/* Horizontal Splitter / Divider */}
      <div 
        style={{ height: '1px', background: isDark ? '#30363d' : '#d0d7de' }} 
      />

      {/* Search Section */}
      <div className="flex-1 flex flex-col min-h-[200px] overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center px-3 py-2 flex-shrink-0 border-b"
          style={{ borderColor: isDark ? '#30363d' : '#d0d7de' }}
        >
          <span style={{ fontSize: '10px', color: isDark ? '#8b949e' : '#656d76', letterSpacing: '0.05em', fontWeight: 600 }}>
            {t('sidebar.search')}
          </span>
        </div>
        {/* Search Content */}
        <div className="flex-1 overflow-y-auto">
          <SearchPanel 
            theme={theme} 
            notebooks={notebooks} 
            onOpenNotebook={onOpenNotebook} 
            onSelectCell={onSelectCell} 
            t={t}
          />
        </div>
      </div>

      {/* Status bar */}
      <div
        className="px-3 py-1.5 border-t flex-shrink-0"
        style={{ borderColor: isDark ? '#30363d' : '#d0d7de' }}
      >
        <div style={{ fontSize: '10px', color: '#22c55e' }}>● Python 3.11 • {t('sidebar.offline')}</div>
      </div>
    </div>
  );
}
