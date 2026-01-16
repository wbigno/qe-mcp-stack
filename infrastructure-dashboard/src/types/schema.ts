// Database Schema Types

export interface SchemaColumn {
  name: string;
  dataType: string;
  maxLength: number;
  nullable: boolean;
  isIdentity: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  foreignKeyRef?: string;
  description?: string;
}

export interface SchemaTable {
  schema: string;
  name: string;
  columns: SchemaColumn[];
  description?: string;
}

export interface DatabaseSchema {
  database_name: string;
  extracted_at: string;
  environment: string;
  tables: SchemaTable[];
}

export interface SchemaStats {
  totalTables: number;
  totalColumns: number;
  totalSchemas: number;
  schemas: {
    name: string;
    tableCount: number;
    columnCount: number;
  }[];
}

export interface SchemaComparison {
  match: number;
  tablesOnlyInSource: string[];
  tablesOnlyInTarget: string[];
  columnDifferences: {
    table: string;
    sourceOnly: string[];
    targetOnly: string[];
  }[];
  typeDifferences: {
    table: string;
    column: string;
    sourceType: string;
    targetType: string;
  }[];
}

export interface QueryGenerationRequest {
  database: string;
  environment: string;
  prompt: string;
  options?: {
    includeExplanation?: boolean;
    includeWarnings?: boolean;
  };
}

export interface QueryGenerationResponse {
  success: boolean;
  query: {
    sql: string;
    formatted: boolean;
  };
  explanation?: {
    summary: string;
    steps: string[];
    tablesUsed: {
      schema: string;
      table: string;
      purpose: string;
    }[];
  };
  warnings?: {
    type: "performance" | "logic" | "safety";
    message: string;
  }[];
  error?: string;
}

export interface CommonQuery {
  id: string;
  name: string;
  description: string;
  category:
    | "patient"
    | "settlement"
    | "epic"
    | "fiserv"
    | "accounting"
    | "reporting";
  sql: string;
  parameters?: {
    name: string;
    type: string;
    description: string;
  }[];
}
