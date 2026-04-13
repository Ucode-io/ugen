import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api';
import { Table, Column, TableRecord, TableDetail, SchemaColumn } from '../model/types';

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

  fetchLogs: async (): Promise<any[]> => {
    await new Promise(r => setTimeout(r, 300));
    return [
      { timestamp: new Date().toISOString(), event: 'UPDATE_RECORD', user: 'admin@ucode.io', status: 'SUCCESS' },
      { timestamp: new Date(Date.now() - 5000).toISOString(), event: 'DELETE_TABLE', user: 'system', status: 'FAILURE' },
      { timestamp: new Date(Date.now() - 10000).toISOString(), event: 'CREATE_TABLE', user: 'dev@ucode.io', status: 'SUCCESS' },
    ];
  },

  deleteTable: async (tableId: string, projectId: string): Promise<any> => {
    return api.delete(`/v1/table/${tableId}`, {
      params: {
        project_id: projectId,
        'project-id': projectId
      }
    });
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
    placeholderData: (previousData) => previousData,
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
      queryClient.invalidateQueries({ queryKey: ['db-schema-v2', variables.tableSlug] });
    },
  });
};

