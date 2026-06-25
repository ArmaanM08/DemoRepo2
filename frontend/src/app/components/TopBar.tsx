import { Play, Save, StopCircle, Globe } from 'lucide-react';
import type { Theme, Notebook } from '../types';

interface TopBarProps {
  theme: Theme;
  setTheme: (t: Theme) => void;
  activeNotebook: Notebook | null;
  onRunAll: () => void;
  onStop: () => void;
  onSave: () => void;
  onNewNotebook: () => void;
  isRunning: boolean;
  aiModel: string;
  language: 'en' | 'mr';
  setLanguage: (lang: 'en' | 'mr') => void;
  t: (key: string) => string;
}

export function TopBar({
  theme, activeNotebook, onRunAll, onStop, onSave, isRunning,
  language, setLanguage, t,
}: TopBarProps) {
  const isDark = theme === 'dark';

  return (
    <header
      className="h-12 flex items-center px-4 gap-4 flex-shrink-0 border-b"
      style={{
        background: isDark ? '#161b22' : '#ffffff',
        borderColor: isDark ? '#30363d' : '#e5e7eb',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
        >
          NP
        </div>
        <div className="leading-none">
          <div className="font-semibold" style={{ fontSize: '13px', color: isDark ? '#e6edf3' : '#1f2328' }}>Navrang</div>
          <div style={{ fontSize: '10px', color: isDark ? '#8b949e' : '#9ca3af' }}>Pustika</div>
        </div>
      </div>

      <div className="flex-1" />

      {/* Language Toggle */}
      <button
        onClick={() => setLanguage(language === 'en' ? 'mr' : 'en')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
        style={{ fontSize: '13px', color: isDark ? '#8b949e' : '#6b7280' }}
        title={t('topBar.switchLanguage')}
      >
        <Globe size={14} />
        <span className="hidden sm:inline">{language === 'en' ? 'English' : 'मराठी'}</span>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
          style={{ fontSize: '13px', color: isDark ? '#8b949e' : '#6b7280' }}
          title={t('topBar.saveShortcut')}
        >
          <Save size={14} />
          <span className="hidden sm:inline">{t('file.saveNotebook')}</span>
        </button>

        {isRunning ? (
          <button
            onClick={onStop}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
            style={{ background: '#dc2626', color: 'white', fontSize: '13px' }}
          >
            <StopCircle size={14} />
            <span className="hidden sm:inline">{t('cell.stop')}</span>
          </button>
        ) : (
          <button
            onClick={onRunAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
            style={{ background: '#22c55e', color: '#ffffff', fontSize: '13px' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#16a34a'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#22c55e'; }}
          >
            <Play size={12} fill="currentColor" />
            <span className="hidden sm:inline">{t('notebook.runAll')}</span>
          </button>
        )}
      </div>
    </header>
  );
}
