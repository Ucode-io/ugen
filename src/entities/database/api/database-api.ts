import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, githubApi } from '@/shared/api';
import { Table, Column, TableRecord, TableDetail, SchemaColumn, SchemaConstraint } from '../model/types';

// Mock DB Tables
const MOCK_SCHEMAS: Record<string, Column[]> = {
  users: [
    { id: '1', label: 'ID', slug: 'id', type: 'uuid', isNullable: false, isPrimaryKey: true },
    { id: '2', label: 'Email', slug: 'email', type: 'varchar', isNullable: false, isPrimaryKey: false },
    { id: '3', label: 'Role', slug: 'role', type: 'varchar', isNullable: false, isPrimaryKey: false, defaultValue: 'user' },
    { id: '4', label: 'Created At', slug: 'created_at', type: 'timestamp', isNullable: false, isPrimaryKey: false },
  ],
  profiles: [
    { id: '1', label: 'ID', slug: 'id', type: 'uuid', isNullable: false, isPrimaryKey: true },
    { id: '2', label: 'User ID', slug: 'user_id', type: 'uuid', isNullable: false, isPrimaryKey: false },
    { id: '3', label: 'Full Name', slug: 'full_name', type: 'varchar', isNullable: true, isPrimaryKey: false },
    { id: '4', label: 'Avatar URL', slug: 'avatar_url', type: 'text', isNullable: true, isPrimaryKey: false },
  ]
};

const MOCK_RECORDS: Record<string, TableRecord[]> = {
  users: Array.from({ length: 10 }).map((_, i) => ({
    id: `u-${i}`,
    email: `user${i}@example.com`,
    role: i === 0 ? 'admin' : 'user',
    created_at: new Date().toISOString(),
  })),
  profiles: Array.from({ length: 5 }).map((_, i) => ({
    id: `p-${i}`,
    user_id: `u-${i}`,
    full_name: `John Doe ${i}`,
    avatar_url: 'https://github.com/shadcn.png',
  }))
};

// API Service
export const databaseApi = {
  fetchTables: async (search: string = '', limit: number = 20, offset: number = 0): Promise<Table[]> => {
    const { data } = await api.get<{ data: { tables: Table[] } }>('/v1/table', {
      params: { search, limit, offset }
    });
    return data?.data?.tables || [];
  },

  fetchTableRecords: async (tableSlug: string, projectId: string, clientTypeId?: string, limit: number = 20, offset: number = 0, filters?: any[], columns?: string[]): Promise<{ items: TableRecord[]; types: Record<string, string>; duration: number }> => {
    const start = performance.now();
    const page = Math.floor(offset / limit);
    const params: any = {
      "project-id": projectId,
      with_types: true,
      data: JSON.stringify({
        limit,
        offset: page
      })
    };

    if (clientTypeId) {
      params["client-type-id"] = clientTypeId;
    }

    try {
      let data: any;

      if (filters && filters.length > 0) {
        const payload = {
          filters: filters || [],
          logic: 'AND',
          columns: columns || [],
          data: JSON.stringify({
            limit,
            offset: page
          })
        };
        const response = await api.post(`/v2/items/${tableSlug}/filter`, payload, { params });
        data = response.data;
      } else {
        const response = await api.get(`/v2/items/${tableSlug}`, { params });
        data = response.data;
      }
      console.log({ data })
      // Handle various response wrappers typical in this API
      const items = data?.data?.data?.response || [];
      const types = data?.data?.data?.types || {};
      const duration = Math.round(performance.now() - start);
      return {
        items: Array.isArray(items) ? items : [],
        types,
        duration
      };
    } catch (error) {
      console.error(`Error fetching records for table ${tableSlug}:`, error);
      return { items: [], types: {}, duration: 0 };
    }
  },

  fetchTableSchema: async (tableName: string): Promise<Column[]> => {
    await new Promise(r => setTimeout(r, 400));
    return MOCK_SCHEMAS[tableName] || [
      { name: 'id', type: 'uuid', isNullable: false, isPrimaryKey: true },
      { name: 'name', type: 'varchar', isNullable: true, isPrimaryKey: false }
    ];
  },

  fetchDiagramSchema: async (
    tableSlug: string,
    projectId: string
  ): Promise<{
    table_name: string;
    columns: SchemaColumn[];
    constraints: SchemaConstraint[];
  } | null> => {
    const { data } = await api.get<any>(`/v2/items/${tableSlug}/schema`, {
      params: { 'project-id': projectId },
    });
    const payload = data?.data?.data ?? data?.data ?? null;
    if (!payload) return null;
    return {
      table_name: payload.table_name ?? tableSlug,
      columns: Array.isArray(payload.columns) ? payload.columns : [],
      constraints: Array.isArray(payload.constraints) ? payload.constraints : [],
    };
  },

  fetchTableSchemaV2: async (tableSlug: string, projectId: string): Promise<SchemaColumn[]> => {
    const { data } = await api.get<any>(`/v2/items/${tableSlug}/schema`, {
      params: { 'project-id': projectId }
    });
    // Real response shape: { data: { data: { columns: [...], constraints: [...] } } }
    const columns: SchemaColumn[] =
      data?.data?.data?.columns ??
      data?.data?.columns ??
      data?.columns ??
      [];
    return Array.isArray(columns) ? columns : [];
  },

  fetchTableDetail: async (tableSlug: string, projectId: string): Promise<TableDetail> => {
    const { data } = await api.post<any>(`/v1/table-details/${tableSlug}?projectId=${projectId}`, { data: {} });
    return data?.data?.data || data?.data;
  },

  executeQuery: async (sql: string): Promise<{ items: any[]; types: Record<string, string> }> => {
    const { data } = await api.post('/v1/custom-endpoints/exec-query', { sql });
    const items = data?.data?.rows || data?.data?.response || data?.response || data?.data || data || [];
    const types = data?.data?.types || {};
    return { items: Array.isArray(items) ? items : (typeof items === 'object' && items !== null ? [items] : []), types };
  },

  addRecord: async (tableName: string, data: any): Promise<any> => {
    return api.post(`/v2/items/${tableName}`, { data });
  },

  updateRecord: async (tableName: string, data: any): Promise<any> => {
    return api.put(`/v2/items/${tableName}`, { data });
  },

  deleteRecord: async (tableName: string, guid: string): Promise<any> => {
    return api.delete(`/v2/items/${tableName}/${guid}`, { data: { data: {} } });
  },

  addSchemaField: async (
    tableSlug: string,
    projectId: string,
    payload: {
      id: string;
      slug: string;
      label: string;
      type: string;
      table_id: string;
      index: string;
      required: boolean;
      show_label: boolean;
      is_visible: boolean;
      attributes: Record<string, unknown>;
    }
  ): Promise<any> => {
    const { data } = await api.post<any>(`/v2/items/${tableSlug}/schema`, payload, {
      params: { 'project-id': projectId }
    });
    return data;
  },

  addRelationField: async (
    tableFrom: string,
    projectId: string,
    payload: {
      id: string;
      label: string;
      slug: string;
      tableTo: string;
      required: boolean;
    }
  ): Promise<any> => {
    const body = {
      attributes: {
        format: "RELATION",
        options: [],
        formula_filters: [],
        todo: { options: [] },
        progress: { options: [] },
        complete: { options: [] },
        type: null,
        table_from: null,
        sum_field: null,
        number_of_rounds: null,
        label: payload.label,
      },
      type: "Many2One",
      table_to: payload.tableTo,
      view_fields: [],
      table_from: tableFrom,
      relation_table_slug: tableFrom,
      label: payload.slug,
      required: payload.required,
      multiple_insert: false,
      show_label: true,
      id: payload.id,
    };
    const { data } = await api.post<any>(`/v2/relations/${tableFrom}`, body, {
      params: { 'project-id': projectId }
    });
    return data;
  },

  fetchTableRelations: async (
    tableSlug: string,
    projectId: string
  ): Promise<Array<{
    id?: string;
    label?: string;
    slug?: string;
    table_to?: string;
    table_from?: string;
    type?: string;
    required?: boolean;
    attributes?: Record<string, unknown>;
  }>> => {
    try {
      const { data } = await api.get<any>(`/v2/relations/${tableSlug}`, {
        params: { 'project-id': projectId },
      });
      const list =
        data?.data?.data?.relations ??
        data?.data?.relations ??
        data?.relations ??
        data?.data?.data ??
        data?.data ??
        data ??
        [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  },

  updateSchemaField: async (
    tableSlug: string,
    projectId: string,
    payload: {
      id: string;
      slug: string;
      label: string;
      type: string;
      table_id: string;
      index: string;
      required: boolean;
      show_label: boolean;
      is_visible: boolean;
      attributes: Record<string, unknown>;
    }
  ): Promise<any> => {
    const { data } = await api.put<any>(`/v2/items/${tableSlug}/schema`, payload, {
      params: { 'project-id': projectId }
    });
    return data;
  },

  deleteSchemaField: async (
    tableSlug: string,
    fieldId: string,
    projectId: string
  ): Promise<any> => {
    const { data } = await api.delete<any>(`/v2/fields/${tableSlug}/${fieldId}`, {
      params: { 'project-id': projectId }
    });
    return data;
  },

  fetchLogs: async (): Promise<any[]> => {
    await new Promise(r => setTimeout(r, 300));
    return [
      { timestamp: new Date().toISOString(), event: 'UPDATE_RECORD', user: 'admin@ucode.io', status: 'SUCCESS' },
      { timestamp: new Date(Date.now() - 5000).toISOString(), event: 'DELETE_TABLE', user: 'system', status: 'FAILURE' },
      { timestamp: new Date(Date.now() - 10000).toISOString(), event: 'CREATE_TABLE', user: 'dev@ucode.io', status: 'SUCCESS' },
    ];
  },

  deleteTable: async (tableId: string, projectId: string): Promise<any> => {
    return githubApi.delete(`/v1/table/${tableId}`, {
      params: { 'project-id': projectId }
    });
  },

  createTable: async (
    projectId: string,
    payload: {
      label: string;
      slug: string;
      description?: string;
      menu_id?: string;
      icon?: string;
    }
  ): Promise<any> => {
    const body = {
      show_in_menu: true,
      fields: [],
      menu_id: payload.menu_id ?? '',
      summary_section: {
        id: crypto.randomUUID(),
        label: 'Summary',
        fields: [],
        icon: '',
        order: 1,
        column: 'SINGLE',
        is_summary_section: true,
      },
      label: payload.label,
      description: payload.description ?? '',
      slug: payload.slug,
      icon: payload.icon ?? '',
      attributes: {
        label_undefined: payload.label,
      },
    };
    const { data } = await api.post('/v1/table', body, {
      params: { 'project-id': projectId },
    });
    return data;
  }
};

// Hooks
export const useTables = (search?: string, limit?: number, offset?: number) =>
  useQuery({
    queryKey: ['db-tables', search, limit, offset],
    queryFn: () => databaseApi.fetchTables(search, limit, offset)
  });

export const useTableRecords = (tableSlug: string | null, projectId: string, clientTypeId?: string, limit: number = 50, offset: number = 0, filters?: any[], columns?: string[]) =>
  useQuery({
    queryKey: ['db-records', tableSlug, projectId, clientTypeId, limit, offset, filters, columns],
    queryFn: () => databaseApi.fetchTableRecords(tableSlug!, projectId, clientTypeId, limit, offset, filters, columns),
    enabled: !!tableSlug && !!projectId,
    placeholderData: (previousData) => previousData
  });

export const useTableSchema = (tableName: string | null) =>
  useQuery({
    queryKey: ['db-schema', tableName],
    queryFn: () => databaseApi.fetchTableSchema(tableName!),
    enabled: !!tableName
  });

/** Real schema endpoint: GET /v2/items/{tableSlug}/schema
 *  Re-fetches automatically whenever tableSlug or projectId changes.
 */
export const useTableSchemaV2 = (tableSlug: string | null, projectId: string) =>
  useQuery({
    queryKey: ['db-schema-v2', tableSlug, projectId],
    queryFn: () => databaseApi.fetchTableSchemaV2(tableSlug!, projectId),
    enabled: !!tableSlug && !!projectId,
    // staleTime: 0 ensures switching tables always triggers a real network fetch
    // instead of serving a stale snapshot from a previous table's cache entry.
    staleTime: 0,
  });

export const useExecuteQuery = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sql: string) => databaseApi.executeQuery(sql),
    onSuccess: () => {
      // Invalidate queries if relevant
    }
  });
};

export const useAddRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tableName, data }: { tableName: string, data: any }) => databaseApi.addRecord(tableName, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['db-records', variables.tableName] });
    }
  });
};

export const useUpdateRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tableName, data }: { tableName: string; data: any }) =>
      databaseApi.updateRecord(tableName, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["table-records"] });
    },
  });
};

export const useDeleteRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tableName, guid }: { tableName: string; guid: string }) =>
      databaseApi.deleteRecord(tableName, guid),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["db-records", variables.tableName] });
    },
  });
};

export const useLogs = () =>
  useQuery({ queryKey: ['db-logs'], queryFn: () => databaseApi.fetchLogs() });

export const useTableDetail = (tableSlug: string | null, projectId: string) =>
  useQuery({
    queryKey: ['db-table-detail', tableSlug],
    queryFn: () => databaseApi.fetchTableDetail(tableSlug!, projectId),
    enabled: !!tableSlug
  });

export const useDeleteTable = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tableId, projectId }: { tableId: string; projectId: string }) =>
      databaseApi.deleteTable(tableId, projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['db-tables'] });
    }
  });
};

export const useCreateTable = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      payload,
    }: {
      projectId: string;
      payload: {
        label: string;
        slug: string;
        description?: string;
        menu_id?: string;
        icon?: string;
      };
    }) => databaseApi.createTable(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['db-tables'] });
    },
  });
};

export const useAddSchemaField = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tableSlug,
      projectId,
      payload,
    }: {
      tableSlug: string;
      projectId: string;
      payload: {
        id: string;
        slug: string;
        label: string;
        type: string;
        table_id: string;
        index: string;
        required: boolean;
        show_label: boolean;
        is_visible: boolean;
        attributes: Record<string, unknown>;
      };
    }) => databaseApi.addSchemaField(tableSlug, projectId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['db-schema-v2', variables.tableSlug, variables.projectId] });
      // tableDetail powers the column headers in the records tab — bust it too.
      queryClient.invalidateQueries({ queryKey: ['db-table-detail', variables.tableSlug] });
    },
  });
};

export const useTableRelations = (tableSlug: string | null, projectId: string) =>
  useQuery({
    queryKey: ['db-relations', tableSlug, projectId],
    queryFn: () => databaseApi.fetchTableRelations(tableSlug!, projectId),
    enabled: !!tableSlug && !!projectId,
    staleTime: 0,
  });

export const useAddRelationField = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tableFrom,
      projectId,
      payload,
    }: {
      tableFrom: string;
      projectId: string;
      payload: {
        id: string;
        label: string;
        slug: string;
        tableTo: string;
        required: boolean;
      };
    }) => databaseApi.addRelationField(tableFrom, projectId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['db-schema-v2', variables.tableFrom, variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['db-relations', variables.tableFrom, variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['db-table-detail', variables.tableFrom] });
    },
  });
};

export const useDeleteSchemaField = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tableSlug,
      fieldId,
      projectId,
    }: {
      tableSlug: string;
      fieldId: string;
      projectId: string;
    }) => databaseApi.deleteSchemaField(tableSlug, fieldId, projectId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['db-schema-v2', variables.tableSlug, variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['db-table-detail', variables.tableSlug] });
    },
  });
};

export const useUpdateSchemaField = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tableSlug,
      projectId,
      payload,
    }: {
      tableSlug: string;
      projectId: string;
      payload: {
        id: string;
        slug: string;
        label: string;
        type: string;
        table_id: string;
        index: string;
        required: boolean;
        show_label: boolean;
        is_visible: boolean;
        attributes: Record<string, unknown>;
      };
    }) => databaseApi.updateSchemaField(tableSlug, projectId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['db-schema-v2', variables.tableSlug, variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['db-table-detail', variables.tableSlug] });
    },
  });
};

/* ---------------------------------------------------------------- *
 * DB Diagram                                                       *
 * ---------------------------------------------------------------- */

export interface DiagramSchema {
  label: string;
  slug: string;
  data: {
    table_name: string;
    columns: SchemaColumn[];
    constraints: SchemaConstraint[];
  };
}

export interface DiagramRelation {
  from: string;
  fromColumn: string;
  to: string;
  toColumn: string;
}

const FIVE_MINUTES = 5 * 60 * 1000;

const inferRelations = (
  tables: Pick<Table, 'slug'>[],
  schemas: DiagramSchema[]
): DiagramRelation[] => {
  const slugSet = new Set(tables.map((t) => t.slug));
  const relations: DiagramRelation[] = [];
  const seen = new Set<string>();

  for (const { slug, data } of schemas) {
    for (const col of data.columns) {
      // Already-marked FK constraint (target unknown — fall through to slug match)
      const explicitFk = col.constraints?.some((c) => c.label === 'FK');

      // Pattern: <slug>_id, <slug>_guid, or column equals "<slug>_id" / "<slug>_guid"
      const target = tables.find(
        (t) =>
          t.slug !== slug &&
          (col.name === `${t.slug}_id` ||
            col.name === `${t.slug}_guid` ||
            (col.name.endsWith('_id') && col.name.replace(/_id$/, '') === t.slug) ||
            (col.name.endsWith('_guid') && col.name.replace(/_guid$/, '') === t.slug))
      );

      if (!target) continue;
      if (!slugSet.has(target.slug)) continue;

      const key = `${slug}.${col.name}->${target.slug}`;
      if (seen.has(key)) continue;
      seen.add(key);

      relations.push({
        from: slug,
        fromColumn: col.name,
        to: target.slug,
        toColumn: 'guid',
      });

      // Suppress unused-var warning; explicitFk is reserved for future use when
      // backend exposes target table on FK constraints.
      void explicitFk;
    }
  }
  return relations;
};

export const useDbDiagram = (projectId: string) => {
  const tablesQuery = useQuery({
    queryKey: ['db-diagram', 'tables', projectId],
    queryFn: () => databaseApi.fetchTables('', 200, 0),
    staleTime: FIVE_MINUTES,
    enabled: !!projectId,
  });

  const tables = tablesQuery.data ?? [];

  const schemaQueries = useQueries({
    queries: tables.map((table) => ({
      queryKey: ['db-diagram', 'schema', table.slug, projectId],
      queryFn: () => databaseApi.fetchDiagramSchema(table.slug, projectId),
      enabled: !!projectId && tables.length > 0,
      staleTime: FIVE_MINUTES,
    })),
  });

  const isLoading =
    tablesQuery.isLoading || (tables.length > 0 && schemaQueries.some((q) => q.isLoading));

  const isError =
    tablesQuery.isError || schemaQueries.some((q) => q.isError);

  const schemas: DiagramSchema[] = schemaQueries
    .map((q, i) => {
      const t = tables[i];
      if (!q.data || !t) return null;
      return { label: t.label, slug: t.slug, data: q.data };
    })
    .filter((s): s is DiagramSchema => s !== null);

  const relations = inferRelations(tables, schemas);

  return { tables, schemas, relations, isLoading, isError };
};

