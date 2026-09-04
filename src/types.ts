export interface ConnectionConfig {
  url: string;
  anonKey: string;
}

export interface TableColumn {
  name: string;
  type: string;
  isNullable: boolean;
  defaultValue?: string | null;
  isPrimaryKey?: boolean;
}

export interface TableInfo {
  name: string;
  columns: TableColumn[];
  rowCount?: number;
}

export interface DatabaseSchema {
  tables: TableInfo[];
}

export interface AppState {
  config: ConnectionConfig | null;
  isConnected: boolean;
  selectedTable: string | null;
  tables: TableInfo[];
  isLoading: boolean;
  error: string | null;
}
