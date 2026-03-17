import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, Column, TableRecord } from '../model/types';

// Mock DB Tables
const MOCK_TABLES: Table[] = [
  { name: 'users', rowsCount: 1240, description: 'Store user information' },
  { name: 'profiles', rowsCount: 1240, description: 'User profile details' },
  { name: 'properties', rowsCount: 54, description: 'Property assets' },
  { name: 'sessions', rowsCount: 8900, description: 'Active user sessions' },
  { name: 'contacts', rowsCount: 345, description: 'Contact list data' },
];

const MOCK_SCHEMAS: Record<string, Column[]> = {
  users: [
    { name: 'id', type: 'uuid', isNullable: false, isPrimaryKey: true },
    { name: 'email', type: 'varchar', isNullable: false, isPrimaryKey: false },
    { name: 'role', type: 'varchar', isNullable: false, isPrimaryKey: false, defaultValue: 'user' },
    { name: 'created_at', type: 'timestamp', isNullable: false, isPrimaryKey: false },
  ],
  profiles: [
    { name: 'id', type: 'uuid', isNullable: false, isPrimaryKey: true },
    { name: 'user_id', type: 'uuid', isNullable: false, isPrimaryKey: false },
    { name: 'full_name', type: 'varchar', isNullable: true, isPrimaryKey: false },
    { name: 'avatar_url', type: 'text', isNullable: true, isPrimaryKey: false },
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
  fetchTables: async (databaseId?: string): Promise<Table[]> => {
    await new Promise(r => setTimeout(r, 600));
    return MOCK_TABLES;
  },

  fetchTableRecords: async (tableName: string, filters?: any, pagination?: any): Promise<TableRecord[]> => {
    await new Promise(r => setTimeout(r, 800));
    return MOCK_RECORDS[tableName] || [];
  },

  fetchTableSchema: async (tableName: string): Promise<Column[]> => {
    await new Promise(r => setTimeout(r, 400));
    return MOCK_SCHEMAS[tableName] || [
      { name: 'id', type: 'uuid', isNullable: false, isPrimaryKey: true },
      { name: 'name', type: 'varchar', isNullable: true, isPrimaryKey: false }
    ];
  },

  executeQuery: async (sql: string): Promise<any[]> => {
    await new Promise(r => setTimeout(r, 1000));
    console.log('Execute SQL:', sql);
    return MOCK_RECORDS.users; // Generic mock response
  },

  addRecord: async (tableName: string, data: any): Promise<any> => {
    await new Promise(r => setTimeout(r, 500));
    console.log('Add Record to:', tableName, data);
    return { success: true };
  },

  fetchLogs: async (): Promise<any[]> => {
    await new Promise(r => setTimeout(r, 300));
    return [
      { timestamp: new Date().toISOString(), event: 'UPDATE_RECORD', user: 'admin@ucode.io', status: 'SUCCESS' },
      { timestamp: new Date(Date.now() - 5000).toISOString(), event: 'DELETE_TABLE', user: 'system', status: 'FAILURE' },
      { timestamp: new Date(Date.now() - 10000).toISOString(), event: 'CREATE_TABLE', user: 'dev@ucode.io', status: 'SUCCESS' },
    ];
  }
};

// Hooks
export const useTables = (databaseId?: string) => 
  useQuery({ queryKey: ['db-tables', databaseId], queryFn: () => databaseApi.fetchTables(databaseId) });

export const useTableRecords = (tableName: string | null) => 
  useQuery({ 
    queryKey: ['db-records', tableName], 
    queryFn: () => databaseApi.fetchTableRecords(tableName!),
    enabled: !!tableName 
  });

export const useTableSchema = (tableName: string | null) => 
  useQuery({ 
    queryKey: ['db-schema', tableName], 
    queryFn: () => databaseApi.fetchTableSchema(tableName!),
    enabled: !!tableName 
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

export const useLogs = () => 
  useQuery({ queryKey: ['db-logs'], queryFn: () => databaseApi.fetchLogs() });
