export interface Table {
  name: string;
  rowsCount: number;
  description?: string;
}

export interface Column {
  name: string;
  type: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  defaultValue?: any;
}

export interface TableRecord {
  [key: string]: any;
}

export interface SqlScript {
  id: string;
  name: string;
  content: string;
  createdAt: number;
}

export type DatabaseView = 'tables' | 'records' | 'query' | 'sql-console';

export interface DatabaseState {
  selectedTable: string | null;
  currentView: DatabaseView;
  sqlScripts: SqlScript[];
  activeScriptId: string | null;
  filters: Record<string, any>;
  breadcrumbs: { label: string; view: DatabaseView; tableName?: string }[];
  
  // Actions
  setSelectedTable: (tableName: string | null) => void;
  setCurrentView: (view: DatabaseView) => void;
  addScript: (name: string, content: string) => void;
  updateActiveScript: (content: string) => void;
  setActiveScriptId: (id: string | null) => void;
  setFilters: (filters: Record<string, any>) => void;
  setBreadcrumbs: (breadcrumbs: { label: string; view: DatabaseView; tableName?: string }[]) => void;
  resetToTables: () => void;
}
