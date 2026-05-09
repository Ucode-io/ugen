export interface Table {
  id: string;
  label: string;
  name: string;
  slug: string;
  show_in_menu?: boolean;
  increment_id?: any;
  is_cached?: boolean;
  attributes?: {
    label?: string;
    label_en?: string;
    label_ru?: string;
    label_uz?: string;
  };
}

export interface Column {
  id: string;
  label: string;
  slug: string;
  type: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  defaultValue?: any;
  required?: boolean;
  default?: any;
  index?: "true" | "false";
}

/** A single constraint returned by GET /v2/items/{table}/schema */
export interface SchemaConstraint {
  label: string;  // e.g. "PK", "FK", "UNIQUE"
  name: string;   // e.g. "shipments_pkey"
}

/** A column entry returned by GET /v2/items/{table}/schema */
export interface SchemaColumn {
  id?: string;
  name: string;
  label?: string;
  type: string;
  nullable: 'YES' | 'NO' | string;
  default: string | null;
  constraints: SchemaConstraint[] | null;
  attributes?: Record<string, unknown> | null;
}

export interface TableDetail extends Table {
  fields: Column[];
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

export type DatabaseView = 'tables' | 'records' | 'query' | 'sql-console' | 'db-diagram';

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
