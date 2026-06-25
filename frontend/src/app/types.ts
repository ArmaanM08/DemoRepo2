export type Theme = 'dark' | 'light';
export type CellType = 'code' | 'markdown';
export type SidebarSection = 'files' | 'search' | 'knowledge' | 'settings';
export type BottomTab = 'terminal' | 'variables' | 'output';

export interface CellOutput {
  type: 'text' | 'error' | 'html';
  content: string;
}

export interface Cell {
  id: string;
  type: CellType;
  content: string;
  output: CellOutput | null;
  executionCount: number | null;
  isRunning: boolean;
  collapsed: boolean;
  outputCollapsed?: boolean;
  executionTime?: number;
  startTime?: number;
}

export interface Notebook {
  id: string;
  name: string;
  color: string;
  cells: Cell[];
}

export interface FileNode {
  id: string;
  name: string;
  type: 'notebook' | 'folder' | 'file';
  color?: string;
  children?: FileNode[];
  expanded?: boolean;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isTyping?: boolean;
}

export interface Variable {
  name: string;
  type: string;
  value: string;
  shape?: string;
}
