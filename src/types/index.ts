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

// ========== Cube Layer Types ==========

export interface Cube {
  name: string;
  description: string;
  dimensions: CubeDimension[];
  metrics: CubeMetric[];
  filters?: CubeFilter[];
  joins?: CubeJoin[];
}

export interface CubeDimension {
  name: string;
  description: string;
  column?: string;
  columns?: string[];
  enum?: string[];
  granularity?: DimensionGranularity[];
  hierarchy?: DimensionHierarchy[];
}

export interface DimensionGranularity {
  name: string;
  sql?: string;
  description: string;
}

export interface DimensionHierarchy {
  [key: string]: string;
}

export interface CubeMetric {
  name: string;
  description: string;
  sql: string;
  type: MetricType;
  category?: MetricCategory;
  unit?: string;
}

export type MetricType = 'sum' | 'count' | 'avg' | 'percentage' | 'ratio' | 'min' | 'max';

export type MetricCategory = 'financial' | 'operational' | 'growth' | 'customer' | 'product';

export interface CubeFilter {
  name: string;
  sql: string;
  description: string;
  dimension?: FilterDimension;
}

export type FilterDimension = 'time' | 'geography' | 'user' | 'product';

export interface CubeJoin {
  from: string;
  to: string;
  type: JoinType;
  condition: string;
  description?: string;
}

export type JoinType = 'inner' | 'left' | 'right' | 'full';

// ========== Unified Schema Types ==========

export interface SchemaConfig {
  tables: SchemaTable[];
  relationships?: SchemaRelationship[];
  cubes?: Cube[];
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
