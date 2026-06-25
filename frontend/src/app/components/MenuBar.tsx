import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Theme } from '../types';

interface MenuBarProps {
  theme: Theme;
  onNewNotebook: () => void;
  onOpenNotebook: () => void;
  onOpenRecent: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onSaveAll: () => void;
  onRenameNotebook: () => void;
  onDuplicateNotebook: () => void;
  onReloadFromDisk: () => void;
  onExport: (format: string) => void;
  onDownload: () => void;
  onPrint: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCutCell: () => void;
  onCopyCell: () => void;
  onPasteCell: () => void;
  onPasteCellAbove: () => void;
  onDeleteCell: () => void;
  onSelectAll: () => void;
  onMoveCellUp: () => void;
  onMoveCellDown: () => void;
  onSplitCell: () => void;
  onMergeCells: () => void;
  onClearOutput: () => void;
  onClearAllOutputs: () => void;
  onFind: () => void;
  onToggleLineNumbers: () => void;
  onToggleWrapText: () => void;
  onToggleExplorer: () => void;
  onToggleOutput: () => void;
  onToggleTerminal: () => void;
  onCollapseCode: () => void;
  onCollapseOutput: () => void;
  onCollapseAllCode: () => void;
  onCollapseAllOutput: () => void;
  onExpandCode: () => void;
  onExpandOutput: () => void;
  onExpandAllCode: () => void;
  onExpandAllOutput: () => void;
  onRenderSideBySide: () => void;
  onToggleTheme: () => void;
  onRunCell: () => void;
  onRunAndMoveNext: () => void;
  onRunAndInsertBelow: () => void;
  onRunAll: () => void;
  onRunAllBelow: () => void;
  onRunAllAbove: () => void;
  onRenderMarkdown: () => void;
  onInterruptKernel: () => void;
  onRestartKernel: () => void;
  onRestartAndRunAll: () => void;
  onReconnectKernel: () => void;
  onShutdownKernel: () => void;
  onCloseNotebook: () => void;
  onCloseAll: () => void;
  onReopenClosed: () => void;
  onSettings: () => void;
  onSwitchOpenNotes: () => void;
  showLineNumbers: boolean;
  wrapText: boolean;
  showExplorer: boolean;
  showOutput: boolean;
  showTerminal: boolean;
  canUndo: boolean;
  canRedo: boolean;
  t: (key: string) => string;
}

export function MenuBar({
  theme,
  onNewNotebook,
  onOpenNotebook,
  onOpenRecent,
  onSave,
  onSaveAs,
  onSaveAll,
  onRenameNotebook,
  onDuplicateNotebook,
  onReloadFromDisk,
  onExport,
  onDownload,
  onPrint,
  onUndo,
  onRedo,
  onCutCell,
  onCopyCell,
  onPasteCell,
  onPasteCellAbove,
  onDeleteCell,
  onSelectAll,
  onMoveCellUp,
  onMoveCellDown,
  onSplitCell,
  onMergeCells,
  onClearOutput,
  onClearAllOutputs,
  onFind,
  onToggleLineNumbers,
  onToggleWrapText,
  onToggleExplorer,
  onToggleOutput,
  onToggleTerminal,
  onCollapseCode,
  onCollapseOutput,
  onCollapseAllCode,
  onCollapseAllOutput,
  onExpandCode,
  onExpandOutput,
  onExpandAllCode,
  onExpandAllOutput,
  onRenderSideBySide,
  onToggleTheme,
  onRunCell,
  onRunAndMoveNext,
  onRunAndInsertBelow,
  onRunAll,
  onRunAllBelow,
  onRunAllAbove,
  onRenderMarkdown,
  onInterruptKernel,
  onRestartKernel,
  onRestartAndRunAll,
  onReconnectKernel,
  onShutdownKernel,
  onCloseNotebook,
  onCloseAll,
  onReopenClosed,
  onSettings,
  onSwitchOpenNotes,
  showLineNumbers,
  wrapText,
  showExplorer,
  showOutput,
  showTerminal,
  canUndo,
  canRedo,
  t,
}: MenuBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const isDark = theme === 'dark';

  const menus = [
    {
      id: 'file',
      label: t('menu.file'),
      items: [
        { label: t('file.newNotebook'), shortcut: 'Ctrl+N', action: onNewNotebook },
        { divider: true },
        { label: t('file.openNotebook'), shortcut: 'Ctrl+O', action: onOpenNotebook },
        { label: t('file.openRecent'), action: onOpenRecent },
        { divider: true },
        { label: t('file.saveNotebook'), shortcut: 'Ctrl+S', action: onSave },
        { label: t('file.saveAs'), shortcut: 'Ctrl+Shift+S', action: onSaveAs },
        { label: t('file.saveAll'), action: onSaveAll },
        { divider: true },
        { label: t('file.renameNotebook'), action: onRenameNotebook },
        { label: t('file.duplicateNotebook'), action: onDuplicateNotebook },
        { label: t('file.reloadFromDisk'), action: onReloadFromDisk },
        { divider: true },
        { label: t('file.downloadNotebook'), shortcut: 'Ctrl+Shift+D', action: onDownload },
        { label: t('file.exportAsPython') || 'Export as Python (.py)', action: () => onExport('py') },
        { divider: true },
        { label: t('file.print'), shortcut: 'Ctrl+P', action: onPrint },
      ],
    },
    {
      id: 'edit',
      label: t('menu.edit'),
      items: [
        { label: t('edit.undo'), shortcut: 'Ctrl+Z', action: onUndo, disabled: !canUndo },
        { label: t('edit.redo'), shortcut: 'Ctrl+Y', action: onRedo, disabled: !canRedo },
        { divider: true },
        { label: t('edit.undoCellOperation'), shortcut: 'Ctrl+Z', action: onUndo, disabled: !canUndo },
        { label: t('edit.redoCellOperation'), shortcut: 'Ctrl+Y', action: onRedo, disabled: !canRedo },
        { divider: true },
        { label: t('edit.cutCell'), shortcut: 'Ctrl+X', action: onCutCell },
        { label: t('edit.copyCell'), shortcut: 'Ctrl+C', action: onCopyCell },
        { label: t('edit.pasteBelow'), shortcut: 'Ctrl+V', action: onPasteCell },
        { label: t('edit.pasteAbove'), shortcut: 'Ctrl+Shift+V', action: onPasteCellAbove },
        { label: t('edit.deleteCell'), shortcut: 'DD', action: onDeleteCell },
        { divider: true },
        { label: t('edit.selectAllCells'), shortcut: 'Ctrl+A', action: onSelectAll },
        { divider: true },
        { label: t('edit.moveCellUp'), shortcut: 'Ctrl+Shift+↑', action: onMoveCellUp },
        { label: t('edit.moveCellDown'), shortcut: 'Ctrl+Shift+↓', action: onMoveCellDown },
        { divider: true },
        { label: t('edit.splitCell'), shortcut: 'Ctrl+Shift+-', action: onSplitCell },
        { label: t('edit.mergeSelectedCells'), shortcut: 'Ctrl+Shift+M', action: onMergeCells },
        { divider: true },
        { label: t('edit.clearCellOutput'), action: onClearOutput },
        { label: t('edit.clearOutputsOfAllCells'), action: onClearAllOutputs },
        { divider: true },
        { label: t('edit.find'), shortcut: 'Ctrl+F', action: onFind },
      ],
    },
    {
      id: 'view',
      label: t('menu.view'),
      items: [
        { label: t('view.showLineNumbers'), shortcut: 'Ctrl+L', action: onToggleLineNumbers, checked: showLineNumbers },
        { label: t('view.wrapText'), shortcut: 'Ctrl+Shift+W', action: onToggleWrapText, checked: wrapText },
        { divider: true },
        { label: t('view.toggleProjectExplorer'), shortcut: 'Ctrl+B', action: onToggleExplorer, checked: showExplorer },
        { label: t('view.toggleOutputArea'), action: onToggleOutput, checked: showOutput },
        { label: t('view.toggleTerminal'), shortcut: 'Ctrl+`', action: onToggleTerminal, checked: showTerminal },
        { divider: true },
        { label: t('view.collapseSelectedCode'), action: onCollapseCode },
        { label: t('view.collapseSelectedOutput'), action: onCollapseOutput },
        { label: t('view.collapseAllCode'), action: onCollapseAllCode },
        { label: t('view.collapseAllOutputs'), action: onCollapseAllOutput },
        { divider: true },
        { label: t('view.expandSelectedCode'), action: onExpandCode },
        { label: t('view.expandSelectedOutput'), action: onExpandOutput },
        { label: t('view.expandAllCode'), action: onExpandAllCode },
        { label: t('view.expandAllOutputs'), action: onExpandAllOutput },
        { divider: true },
        { label: t('view.renderSideBySide'), action: onRenderSideBySide },
        { divider: true },
        { label: t('view.toggleDarkMode'), shortcut: 'Ctrl+Shift+D', action: onToggleTheme },
      ],
    },
    {
      id: 'run',
      label: t('menu.run'),
      items: [
        { label: t('run.runSelectedCell'), shortcut: 'Shift+Enter', action: onRunCell },
        { label: t('run.runAndMoveNext'), shortcut: 'Ctrl+Enter', action: onRunAndMoveNext },
        { label: t('run.runAndInsertBelow'), shortcut: 'Alt+Enter', action: onRunAndInsertBelow },
        { divider: true },
        { label: t('run.runAllCells'), shortcut: 'Ctrl+Shift+Enter', action: onRunAll },
        { label: t('run.runAllBelow'), action: onRunAllBelow },
        { label: t('run.runAllAbove'), action: onRunAllAbove },
        { divider: true },
        { label: t('run.renderMarkdownCells'), action: onRenderMarkdown },
      ],
    },
    {
      id: 'kernel',
      label: t('menu.kernel'),
      items: [
        { label: t('kernel.interruptKernel'), shortcut: 'I,I', action: onInterruptKernel },
        { label: t('kernel.restartKernel'), shortcut: '0,0', action: onRestartKernel },
        { label: t('kernel.restartAndRunAll'), action: onRestartAndRunAll },
        { label: t('kernel.reconnectKernel'), action: onReconnectKernel },
        { label: t('kernel.shutdownKernel'), action: onShutdownKernel },
      ],
    },
    {
      id: 'tabs',
      label: t('menu.tabs'),
      items: [
        { label: t('tabs.closeCurrentNotebook'), shortcut: 'Ctrl+W', action: onCloseNotebook },
        { label: t('tabs.closeAll'), action: onCloseAll },
        { divider: true },
        { label: t('tabs.switchBetweenOpenNotes'), shortcut: 'Ctrl+Tab', action: onSwitchOpenNotes },
        { label: t('tabs.reopenClosedNotebook'), action: onReopenClosed },
      ],
    },
    {
      id: 'settings',
      label: t('menu.settings'),
    },
  ];

  const MenuItem = ({ item, depth = 0 }: { item: any; depth?: number }) => {
    if (item.divider) {
      return <div style={{ height: '1px', background: isDark ? '#30363d' : '#e5e7eb', margin: '4px 0' }} />;
    }

    if (item.submenu) {
      return (
        <div className="relative group">
          <button
            className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
            style={{
              fontSize: '13px',
              color: isDark ? '#e6edf3' : '#1f2328',
              paddingLeft: `${12 + depth * 16}px`,
            }}
          >
            <span>{item.label}</span>
            <ChevronDown size={12} />
          </button>
          <div className="absolute left-full top-0 ml-1 hidden group-hover:block">
            <div
              className="rounded shadow-lg overflow-hidden"
              style={{
                background: isDark ? '#21262d' : '#ffffff',
                border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
                minWidth: '180px',
              }}
            >
              {item.submenu.map((subItem: any, idx: number) => (
                <MenuItem key={idx} item={subItem} depth={depth + 1} />
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <button
        onClick={() => {
          item.action?.();
          setActiveMenu(null);
        }}
        disabled={item.disabled}
        className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
        style={{
          fontSize: '13px',
          color: item.disabled ? (isDark ? '#484f58' : '#6b7280') : (isDark ? '#e6edf3' : '#1f2328'),
          paddingLeft: `${12 + depth * 16}px`,
          background: item.checked ? (isDark ? '#1a2e1f' : '#dcfce7') : undefined,
        }}
      >
        <span className="flex items-center gap-2">
          {item.checked && <span style={{ color: '#22c55e' }}>✓</span>}
          {item.label}
        </span>
        {item.shortcut && (
          <span style={{ fontSize: '11px', color: isDark ? '#8b949e' : '#6b7280' }}>
            {item.shortcut}
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      className="flex items-center border-b flex-shrink-0"
      style={{
        background: isDark ? '#161b22' : '#ffffff',
        borderColor: isDark ? '#30363d' : '#e5e7eb',
        height: '32px',
      }}
    >
      {menus.map((menu) => (
        <div key={menu.id} className="relative">
          <button
            onClick={() => {
              if (menu.id === 'settings') {
                onSettings();
                setActiveMenu(null);
              } else {
                setActiveMenu(activeMenu === menu.id ? null : menu.id);
              }
            }}
            className="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            style={{
              fontSize: '13px',
              color: isDark ? '#e6edf3' : '#1f2328',
              fontWeight: activeMenu === menu.id ? 500 : 400,
            }}
          >
            {menu.label}
          </button>
          {activeMenu === menu.id && menu.items && (
            <div className="absolute top-full left-0 mt-1 z-50">
              <div
                className="rounded shadow-lg overflow-hidden py-1"
                style={{
                  background: isDark ? '#21262d' : '#ffffff',
                  border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
                  minWidth: '220px',
                }}
              >
                {menu.items.map((item, idx) => (
                  <MenuItem key={idx} item={item} />
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
