import { X, Settings, Keyboard, BookOpen, Info } from 'lucide-react';
import type { Theme } from '../types';

interface SettingsModalProps {
  theme: Theme;
  showExplorer: boolean;
  showLineNumbers: boolean;
  wrapText: boolean;
  showOutput: boolean;
  showTerminal: boolean;
  fontSize: number;
  fontFamily: string;
  autoSaveInterval: number;
  onToggleExplorer: () => void;
  onToggleTheme: () => void;
  onToggleLineNumbers: () => void;
  onToggleWrapText: () => void;
  onToggleOutput: () => void;
  onToggleTerminal: () => void;
  onFontSizeChange: (sz: number) => void;
  onFontFamilyChange: (family: string) => void;
  onAutoSaveIntervalChange: (interval: number) => void;
  activeTab: 'settings' | 'shortcuts' | 'documentation' | 'about';
  setActiveTab: (tab: 'settings' | 'shortcuts' | 'documentation' | 'about') => void;
  onClose: () => void;
  t: (key: string) => string;
}

export function SettingsModal({
  theme,
  showExplorer,
  showLineNumbers,
  wrapText,
  showOutput,
  showTerminal,
  fontSize,
  fontFamily,
  autoSaveInterval,
  onToggleExplorer,
  onToggleTheme,
  onToggleLineNumbers,
  onToggleWrapText,
  onToggleOutput,
  onToggleTerminal,
  onFontSizeChange,
  onFontFamilyChange,
  onAutoSaveIntervalChange,
  activeTab,
  setActiveTab,
  onClose,
  t,
}: SettingsModalProps) {
  const isDark = theme === 'dark';

  const tabs = [
    { id: 'settings' as const, label: t('menu.settings') || 'Settings', icon: Settings },
    { id: 'shortcuts' as const, label: t('help.keyboardShortcuts') || 'Keyboard Shortcuts', icon: Keyboard },
    { id: 'documentation' as const, label: t('help.documentation') || 'Documentation', icon: BookOpen },
    { id: 'about' as const, label: t('help.aboutNavrangPustika') || 'About', icon: Info },
  ];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl shadow-2xl flex overflow-hidden w-full max-w-3xl"
        style={{
          background: isDark ? '#161b22' : '#ffffff',
          border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
          height: '520px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Tab Bar */}
        <div
          className="w-48 flex-shrink-0 flex flex-col p-4 border-r"
          style={{
            background: isDark ? '#0d1117' : '#f8f9fa',
            borderColor: isDark ? '#30363d' : '#e5e7eb',
          }}
        >
          <div className="flex items-center gap-2 mb-6 px-2">
            <span style={{ fontSize: '18px' }}>🌿</span>
            <span className="font-semibold" style={{ fontSize: '14px', color: isDark ? '#e6edf3' : '#1f2328' }}>
              {t('settings.preferences')}
            </span>
          </div>

          <nav className="space-y-1 flex-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer"
                  style={{
                    fontSize: '13px',
                    fontWeight: isSelected ? 500 : 400,
                    background: isSelected ? (isDark ? '#21262d' : '#e5e7eb') : 'transparent',
                    color: isSelected ? '#22c55e' : (isDark ? '#8b949e' : '#656d76'),
                  }}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
            style={{ borderColor: isDark ? '#30363d' : '#e5e7eb' }}
          >
            <h3 className="font-semibold text-base" style={{ color: isDark ? '#e6edf3' : '#1f2328' }}>
              {tabs.find((t) => t.id === activeTab)?.label}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              style={{ color: isDark ? '#8b949e' : '#6b7280' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6 min-w-0">
            {activeTab === 'settings' && (
              <div className="space-y-5">
                {/* Theme / Dark Mode toggle */}
                <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: isDark ? '#21262d' : '#f3f4f6' }}>
                  <div>
                    <div className="font-medium text-sm" style={{ color: isDark ? '#e6edf3' : '#1f2328' }}>
                      {t('settings.darkMode')}
                    </div>
                    <div className="text-xs" style={{ color: isDark ? '#8b949e' : '#656d76', marginTop: '2px' }}>
                      {t('settings.darkModeDesc')}
                    </div>
                  </div>
                  <button
                    onClick={onToggleTheme}
                    className="w-11 h-6 rounded-full transition-colors relative cursor-pointer"
                    style={{ background: isDark ? '#22c55e' : '#e5e7eb' }}
                  >
                    <div
                      className="w-5 h-5 rounded-full bg-white shadow transition-transform absolute top-0.5"
                      style={{ transform: isDark ? 'translateX(22px)' : 'translateX(2px)' }}
                    />
                  </button>
                </div>

                {/* Show Project Explorer */}
                <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: isDark ? '#21262d' : '#f3f4f6' }}>
                  <div>
                    <div className="font-medium text-sm" style={{ color: isDark ? '#e6edf3' : '#1f2328' }}>
                      {t('settings.showSidebar')}
                    </div>
                    <div className="text-xs" style={{ color: isDark ? '#8b949e' : '#656d76', marginTop: '2px' }}>
                      {t('settings.showSidebarDesc')}
                    </div>
                  </div>
                  <button
                    onClick={onToggleExplorer}
                    className="w-11 h-6 rounded-full transition-colors relative cursor-pointer"
                    style={{ background: showExplorer ? '#22c55e' : '#e5e7eb' }}
                  >
                    <div
                      className="w-5 h-5 rounded-full bg-white shadow transition-transform absolute top-0.5"
                      style={{ transform: showExplorer ? 'translateX(22px)' : 'translateX(2px)' }}
                    />
                  </button>
                </div>

                {/* Show Line Numbers */}
                <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: isDark ? '#21262d' : '#f3f4f6' }}>
                  <div>
                    <div className="font-medium text-sm" style={{ color: isDark ? '#e6edf3' : '#1f2328' }}>
                      {t('settings.showLineNumbers')}
                    </div>
                    <div className="text-xs" style={{ color: isDark ? '#8b949e' : '#656d76', marginTop: '2px' }}>
                      {t('settings.showLineNumbersDesc')}
                    </div>
                  </div>
                  <button
                    onClick={onToggleLineNumbers}
                    className="w-11 h-6 rounded-full transition-colors relative cursor-pointer"
                    style={{ background: showLineNumbers ? '#22c55e' : '#e5e7eb' }}
                  >
                    <div
                      className="w-5 h-5 rounded-full bg-white shadow transition-transform absolute top-0.5"
                      style={{ transform: showLineNumbers ? 'translateX(22px)' : 'translateX(2px)' }}
                    />
                  </button>
                </div>

                {/* Wrap text */}
                <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: isDark ? '#21262d' : '#f3f4f6' }}>
                  <div>
                    <div className="font-medium text-sm" style={{ color: isDark ? '#e6edf3' : '#1f2328' }}>
                      {t('settings.softWrap')}
                    </div>
                    <div className="text-xs" style={{ color: isDark ? '#8b949e' : '#656d76', marginTop: '2px' }}>
                      {t('settings.softWrapDesc')}
                    </div>
                  </div>
                  <button
                    onClick={onToggleWrapText}
                    className="w-11 h-6 rounded-full transition-colors relative cursor-pointer"
                    style={{ background: wrapText ? '#22c55e' : '#e5e7eb' }}
                  >
                    <div
                      className="w-5 h-5 rounded-full bg-white shadow transition-transform absolute top-0.5"
                      style={{ transform: wrapText ? 'translateX(22px)' : 'translateX(2px)' }}
                    />
                  </button>
                </div>

                {/* Font Size select */}
                <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: isDark ? '#21262d' : '#f3f4f6' }}>
                  <div>
                    <div className="font-medium text-sm" style={{ color: isDark ? '#e6edf3' : '#1f2328' }}>
                      {t('settings.fontSize')}
                    </div>
                    <div className="text-xs" style={{ color: isDark ? '#8b949e' : '#656d76', marginTop: '2px' }}>
                      {t('settings.fontSizeDesc')}
                    </div>
                  </div>
                  <select
                    value={fontSize}
                    onChange={(e) => onFontSizeChange(Number(e.target.value))}
                    className="px-2 py-1 rounded border outline-none text-sm cursor-pointer"
                    style={{
                      background: isDark ? '#21262d' : '#ffffff',
                      borderColor: isDark ? '#30363d' : '#d0d7de',
                      color: isDark ? '#e6edf3' : '#1f2328',
                    }}
                  >
                    <option value={12}>12px</option>
                    <option value={14}>14px</option>
                    <option value={16}>16px</option>
                    <option value={18}>18px</option>
                  </select>
                </div>

                {/* Font Family select */}
                <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: isDark ? '#21262d' : '#f3f4f6' }}>
                  <div>
                    <div className="font-medium text-sm" style={{ color: isDark ? '#e6edf3' : '#1f2328' }}>
                      {t('settings.fontFamily')}
                    </div>
                    <div className="text-xs" style={{ color: isDark ? '#8b949e' : '#656d76', marginTop: '2px' }}>
                      {t('settings.fontFamilyDesc')}
                    </div>
                  </div>
                  <select
                    value={fontFamily}
                    onChange={(e) => onFontFamilyChange(e.target.value)}
                    className="px-2 py-1 rounded border outline-none text-sm cursor-pointer"
                    style={{
                      background: isDark ? '#21262d' : '#ffffff',
                      borderColor: isDark ? '#30363d' : '#d0d7de',
                      color: isDark ? '#e6edf3' : '#1f2328',
                    }}
                  >
                    <option value="monospace">Monospace</option>
                    <option value="'Fira Code', monospace">Fira Code</option>
                    <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                    <option value="'Courier New', Courier, monospace">Courier New</option>
                  </select>
                </div>

                {/* Auto Save Interval select */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm" style={{ color: isDark ? '#e6edf3' : '#1f2328' }}>
                      {t('settings.autoSaveInterval')}
                    </div>
                    <div className="text-xs" style={{ color: isDark ? '#8b949e' : '#656d76', marginTop: '2px' }}>
                      {t('settings.autoSaveIntervalDesc')}
                    </div>
                  </div>
                  <select
                    value={autoSaveInterval}
                    onChange={(e) => onAutoSaveIntervalChange(Number(e.target.value))}
                    className="px-2 py-1 rounded border outline-none text-sm cursor-pointer"
                    style={{
                      background: isDark ? '#21262d' : '#ffffff',
                      borderColor: isDark ? '#30363d' : '#d0d7de',
                      color: isDark ? '#e6edf3' : '#1f2328',
                    }}
                  >
                    <option value={15000}>{t('settings.interval15s')}</option>
                    <option value={30000}>{t('settings.interval30s')}</option>
                    <option value={60000}>{t('settings.interval60s')}</option>
                    <option value={0}>{t('settings.intervalOff')}</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'shortcuts' && (
              <div className="space-y-4">
                <p className="text-xs mb-4" style={{ color: isDark ? '#8b949e' : '#656d76' }}>
                  {t('help.shortcutsDesc')}
                </p>
                <div
                  className="rounded-xl border divide-y overflow-hidden"
                  style={{ borderColor: isDark ? '#30363d' : '#e5e7eb', background: isDark ? '#0d1117' : '#f9fafb' }}
                >
                  {[
                    { keys: ['Shift', 'Enter'], desc: t('shortcuts.runAndAdvance') },
                    { keys: ['Ctrl', 'Enter'], desc: t('shortcuts.runAndStay') },
                    { keys: ['Alt', 'Enter'], desc: t('shortcuts.runAndInsert') },
                    { keys: ['D', 'D'], desc: t('shortcuts.deleteCell') },
                    { keys: ['A', 'A'], desc: t('shortcuts.insertCellAbove') },
                    { keys: ['B', 'B'], desc: t('shortcuts.insertCellBelow') },
                    { keys: ['M', 'M'], desc: t('shortcuts.convertToMarkdown') },
                    { keys: ['Y', 'Y'], desc: t('shortcuts.convertToCode') },
                    { keys: ['Ctrl', 'Z'], desc: t('shortcuts.undo') },
                    { keys: ['Ctrl', 'Y'], desc: t('shortcuts.redo') },
                  ].map((s, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 text-xs">
                      <span className="font-medium" style={{ color: isDark ? '#e6edf3' : '#1f2328' }}>
                        {s.desc}
                      </span>
                      <div className="flex items-center gap-1">
                        {s.keys.map((k, kIdx) => (
                          <kbd
                            key={kIdx}
                            className="px-1.5 py-0.5 rounded border text-[10px] font-mono shadow-sm"
                            style={{
                              background: isDark ? '#21262d' : '#ffffff',
                              borderColor: isDark ? '#484f58' : '#d0d7de',
                              color: isDark ? '#c9d1d9' : '#1f2328',
                            }}
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'documentation' && (
              <div className="space-y-4 text-xs font-sans leading-relaxed" style={{ color: isDark ? '#c9d1d9' : '#24292f' }}>
                <h4 className="font-semibold text-sm" style={{ color: isDark ? '#e6edf3' : '#1f2328' }}>
                  {t('help.docWelcome')}
                </h4>
                <p>
                  {t('help.docWelcomeDesc')}
                </p>

                <h5 className="font-medium text-xs mt-3 mb-1" style={{ color: isDark ? '#e6edf3' : '#1f2328' }}>
                  {t('help.docRunningCode')}
                </h5>
                <p>
                  {t('help.docRunningCodeDesc')}
                </p>

                <h5 className="font-medium text-xs mt-3 mb-1" style={{ color: isDark ? '#e6edf3' : '#1f2328' }}>
                  {t('help.docManagingFiles')}
                </h5>
                <p>
                  {t('help.docManagingFilesDesc')}
                </p>

                <h5 className="font-medium text-xs mt-3 mb-1" style={{ color: isDark ? '#e6edf3' : '#1f2328' }}>
                  {t('help.docOffline')}
                </h5>
                <p>
                  {t('help.docOfflineDesc')}
                </p>

                <h5 className="font-medium text-xs mt-3 mb-1" style={{ color: isDark ? '#e6edf3' : '#1f2328' }}>
                  {t('help.docVariables')}
                </h5>
                <p>
                  {t('help.docVariablesDesc')}
                </p>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
                >
                  <span style={{ fontSize: '32px', color: 'white' }}>📓</span>
                </div>
                <div>
                  <h4 className="font-semibold text-lg" style={{ color: isDark ? '#e6edf3' : '#1f2328' }}>
                    Navrang Pustika
                  </h4>
                  <p className="text-xs mt-1" style={{ color: isDark ? '#8b949e' : '#656d76' }}>
                    {t('about.desc')}
                  </p>
                </div>

                <div
                  className="px-4 py-3 rounded-xl border text-xs max-w-sm"
                  style={{
                    borderColor: isDark ? '#30363d' : '#e5e7eb',
                    background: isDark ? '#0d1117' : '#f9fafb',
                    color: isDark ? '#8b949e' : '#656d76',
                  }}
                >
                  <div className="flex justify-between py-1 border-b" style={{ borderColor: isDark ? '#21262d' : '#f0f2f4' }}>
                    <span>{t('about.version')}</span>
                    <span className="font-mono text-green-500">v0.1.0 (Beta)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b" style={{ borderColor: isDark ? '#21262d' : '#f0f2f4' }}>
                    <span>{t('about.env')}</span>
                    <span className="font-mono" style={{ color: isDark ? '#e6edf3' : '#1f2328' }}>Python 3.11 / Local</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>{t('about.privacy')}</span>
                    <span className="font-mono text-green-500">100% Offline</span>
                  </div>
                </div>

                <p className="text-[10px]" style={{ color: isDark ? '#8b949e' : '#9ca3af' }}>
                  {t('about.rights')}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="px-6 py-4 border-t flex justify-end flex-shrink-0"
            style={{ borderColor: isDark ? '#30363d' : '#e5e7eb' }}
          >
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
              style={{
                background: '#22c55e',
                color: '#ffffff',
                fontSize: '13px',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#16a34a'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#22c55e'; }}
            >
              {t('settings.done') || 'Done'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
