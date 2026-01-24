export interface SchemaTable {
  name: string;
  description: string;
  database?: string;
  schema?: string;
  columns: SchemaColumn[];
  common_filters?: CommonFilter[];
  measures?: Measure[];
}

export interface SchemaColumn {
  name: string;
  type: string;
  description: string;
  primary_key?: boolean;
  foreign_key?: ForeignKey;
  enum?: EnumValue[];
  examples?: string[];
}

export interface ForeignKey {
  table: string;
  column: string;
}

export interface EnumValue {
  value: string;
  description: string;
}

export interface CommonFilter {
  name: string;
  sql: string;
  description: string;
}

export interface Measure {
  name: string;
  sql: string;
  description: string;
  filters?: string[];
}

export interface SchemaRelationship {
  name: string;
  from_table: string;
  to_table: string;
  type: 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many';
  join_sql: string;
  description: string;
}

export interface SchemaConfig {
  tables: SchemaTable[];
  relationships?: SchemaRelationship[];
}

export interface QueryResult {
  columns: string[];
  rows: any[][];
  rowCount: number;
  executionTime: number;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}
