import { useState, useEffect, useMemo } from "react";
import type {
  DatabaseSchema,
  SchemaStats,
  SchemaComparison,
  SchemaTable,
} from "../types/schema";

interface UseSchemaDataReturn {
  schema: DatabaseSchema | null;
  stats: SchemaStats | null;
  loading: boolean;
  error: string | null;
  schemasByName: Map<string, SchemaTable[]>;
  searchTables: (query: string) => SchemaTable[];
  searchColumns: (query: string) => { table: SchemaTable; column: string }[];
  getTablesBySchema: (schemaName: string) => SchemaTable[];
  compareSchemas: (otherSchema: DatabaseSchema) => SchemaComparison;
}

export function useSchemaData(
  database: string,
  environment: string = "PROD",
): UseSchemaDataReturn {
  const [schema, setSchema] = useState<DatabaseSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSchema = async () => {
      setLoading(true);
      setError(null);

      try {
        // Try to load from the schemas directory
        const response = await fetch(
          `/schemas/${database}_${environment}.json`,
        );

        // Check content type to ensure we're getting JSON, not HTML 404 page
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error(
            `Schema data not available for ${database} (${environment}). Only CarePayment schema has been extracted.`,
          );
        }

        if (!response.ok) {
          throw new Error(`Failed to load schema: ${response.statusText}`);
        }
        const data = await response.json();
        data.environment = environment;
        setSchema(data);
      } catch (err) {
        // Provide a more user-friendly error message
        const errorMsg =
          err instanceof Error ? err.message : "Failed to load schema";
        if (errorMsg.includes("Unexpected token")) {
          setError(
            `Schema data not available for ${database} (${environment}). Only CarePayment schema has been extracted.`,
          );
        } else {
          setError(errorMsg);
        }
        setSchema(null);
      } finally {
        setLoading(false);
      }
    };

    if (database) {
      loadSchema();
    }
  }, [database, environment]);

  // Group tables by schema name
  const schemasByName = useMemo(() => {
    const map = new Map<string, SchemaTable[]>();
    if (schema?.tables) {
      schema.tables.forEach((table) => {
        const existing = map.get(table.schema) || [];
        existing.push(table);
        map.set(table.schema, existing);
      });
    }
    return map;
  }, [schema]);

  // Calculate statistics
  const stats = useMemo((): SchemaStats | null => {
    if (!schema?.tables) return null;

    const schemaStats = new Map<string, { tables: number; columns: number }>();

    schema.tables.forEach((table) => {
      const existing = schemaStats.get(table.schema) || {
        tables: 0,
        columns: 0,
      };
      existing.tables += 1;
      existing.columns += table.columns?.length || 0;
      schemaStats.set(table.schema, existing);
    });

    return {
      totalTables: schema.tables.length,
      totalColumns: schema.tables.reduce(
        (sum, t) => sum + (t.columns?.length || 0),
        0,
      ),
      totalSchemas: schemaStats.size,
      schemas: Array.from(schemaStats.entries())
        .map(([name, stats]) => ({
          name,
          tableCount: stats.tables,
          columnCount: stats.columns,
        }))
        .sort((a, b) => b.tableCount - a.tableCount),
    };
  }, [schema]);

  // Search tables by name
  const searchTables = (query: string): SchemaTable[] => {
    if (!schema?.tables || !query) return [];
    const lowerQuery = query.toLowerCase();
    return schema.tables.filter(
      (table) =>
        table.name.toLowerCase().includes(lowerQuery) ||
        table.schema.toLowerCase().includes(lowerQuery),
    );
  };

  // Search columns across all tables
  const searchColumns = (
    query: string,
  ): { table: SchemaTable; column: string }[] => {
    if (!schema?.tables || !query) return [];
    const lowerQuery = query.toLowerCase();
    const results: { table: SchemaTable; column: string }[] = [];

    schema.tables.forEach((table) => {
      table.columns?.forEach((col) => {
        if (col.name.toLowerCase().includes(lowerQuery)) {
          results.push({ table, column: col.name });
        }
      });
    });

    return results;
  };

  // Get tables for a specific schema
  const getTablesBySchema = (schemaName: string): SchemaTable[] => {
    return schemasByName.get(schemaName) || [];
  };

  // Compare with another schema
  const compareSchemas = (otherSchema: DatabaseSchema): SchemaComparison => {
    if (!schema?.tables) {
      return {
        match: 0,
        tablesOnlyInSource: [],
        tablesOnlyInTarget: [],
        columnDifferences: [],
        typeDifferences: [],
      };
    }

    const sourceTables = new Map(
      schema.tables.map((t) => [`${t.schema}.${t.name}`, t]),
    );
    const targetTables = new Map(
      otherSchema.tables.map((t) => [`${t.schema}.${t.name}`, t]),
    );

    const tablesOnlyInSource = [...sourceTables.keys()].filter(
      (k) => !targetTables.has(k),
    );
    const tablesOnlyInTarget = [...targetTables.keys()].filter(
      (k) => !sourceTables.has(k),
    );

    const columnDifferences: SchemaComparison["columnDifferences"] = [];
    const typeDifferences: SchemaComparison["typeDifferences"] = [];

    // Check tables that exist in both
    sourceTables.forEach((sourceTable, tableName) => {
      const targetTable = targetTables.get(tableName);
      if (!targetTable) return;

      const sourceCols = new Set(sourceTable.columns?.map((c) => c.name) || []);
      const targetCols = new Set(targetTable.columns?.map((c) => c.name) || []);

      const sourceOnly = [...sourceCols].filter((c) => !targetCols.has(c));
      const targetOnly = [...targetCols].filter((c) => !sourceCols.has(c));

      if (sourceOnly.length > 0 || targetOnly.length > 0) {
        columnDifferences.push({ table: tableName, sourceOnly, targetOnly });
      }

      // Check type differences for shared columns
      sourceTable.columns?.forEach((sourceCol) => {
        const targetCol = targetTable.columns?.find(
          (c) => c.name === sourceCol.name,
        );
        if (
          targetCol &&
          (sourceCol.dataType !== targetCol.dataType ||
            sourceCol.maxLength !== targetCol.maxLength)
        ) {
          typeDifferences.push({
            table: tableName,
            column: sourceCol.name,
            sourceType: `${sourceCol.dataType}(${sourceCol.maxLength})`,
            targetType: `${targetCol.dataType}(${targetCol.maxLength})`,
          });
        }
      });
    });

    const totalTables = new Set([
      ...sourceTables.keys(),
      ...targetTables.keys(),
    ]).size;
    const sharedTables =
      totalTables - tablesOnlyInSource.length - tablesOnlyInTarget.length;
    const match =
      totalTables > 0
        ? Math.round((sharedTables / totalTables) * 100 * 10) / 10
        : 0;

    return {
      match,
      tablesOnlyInSource,
      tablesOnlyInTarget,
      columnDifferences,
      typeDifferences,
    };
  };

  return {
    schema,
    stats,
    loading,
    error,
    schemasByName,
    searchTables,
    searchColumns,
    getTablesBySchema,
    compareSchemas,
  };
}
