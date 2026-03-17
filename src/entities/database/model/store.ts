import { create } from 'zustand';
import { DatabaseState, DatabaseView, SqlScript } from './types';

export const useDatabaseStore = create<DatabaseState>((set) => ({
  selectedTable: null,
  currentView: 'tables',
  sqlScripts: [
    { id: 'playground', name: 'Playground', content: 'SELECT * FROM users LIMIT 10;', createdAt: Date.now() },
    { id: 'sql-scratch', name: 'SQL Scratches', content: 'SELECT * FROM contacts WHERE status = \'active\';', createdAt: Date.now() },
  ],
  activeScriptId: 'playground',
  filters: {},
  breadcrumbs: [{ label: 'breadcrumbs.tables', view: 'tables' }],

  setSelectedTable: (tableName) => set((state) => ({ 
    selectedTable: tableName,
    breadcrumbs: tableName 
      ? [{ label: 'breadcrumbs.tables', view: 'tables' }, { label: tableName, view: 'records', tableName }] 
      : [{ label: 'breadcrumbs.tables', view: 'tables' }]
  })),

  setCurrentView: (view) => set((state) => {
    const tablePart = state.selectedTable ? [{ label: state.selectedTable, view: 'records' as DatabaseView, tableName: state.selectedTable }] : [];
    const queryPart = view === 'query' ? [{ label: 'breadcrumbs.query', view: 'query' as DatabaseView, tableName: state.selectedTable || undefined }] : [];

    let newBreadcrumbs = [{ label: 'breadcrumbs.tables', view: 'tables' as DatabaseView }];
    if (view === 'records' || view === 'query') {
      newBreadcrumbs = [...newBreadcrumbs, ...tablePart, ...queryPart];
    } else if (view === 'sql-console') {
       newBreadcrumbs = [{ label: 'sqlConsole.header', view: 'sql-console' as DatabaseView }];
    }

    return { 
      currentView: view,
      breadcrumbs: newBreadcrumbs
    };
  }),

  addScript: (name, content) => set((state) => {
    const newScript: SqlScript = {
      id: Math.random().toString(36).substring(7),
      name,
      content,
      createdAt: Date.now()
    };
    return {
      sqlScripts: [...state.sqlScripts, newScript],
      activeScriptId: newScript.id
    };
  }),

  updateActiveScript: (content) => set((state) => ({
    sqlScripts: state.sqlScripts.map(s => s.id === state.activeScriptId ? { ...s, content } : s)
  })),

  setActiveScriptId: (id) => set({ activeScriptId: id }),

  setFilters: (filters) => set({ filters }),

  setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),

  resetToTables: () => set({ 
    selectedTable: null, 
    currentView: 'tables', 
    breadcrumbs: [{ label: 'Tables', view: 'tables' }] 
  }),
}));
