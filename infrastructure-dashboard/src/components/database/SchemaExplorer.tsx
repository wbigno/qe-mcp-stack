import { useState, useMemo } from "react";
import type { SchemaTable, SchemaStats } from "../../types/schema";

interface SchemaExplorerProps {
  tables: SchemaTable[];
  stats: SchemaStats | null;
  loading: boolean;
  error: string | null;
  searchTables: (query: string) => SchemaTable[];
  searchColumns: (query: string) => { table: SchemaTable; column: string }[];
}

export function SchemaExplorer({
  tables,
  stats,
  loading,
  error,
  searchTables,
  searchColumns,
}: SchemaExplorerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"tables" | "columns">("tables");
  const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [selectedTableFromSearch, setSelectedTableFromSearch] =
    useState<SchemaTable | null>(null);
  const [highlightedColumn, setHighlightedColumn] = useState<string | null>(
    null,
  );

  // Group tables by schema
  const schemaGroups = useMemo(() => {
    const groups = new Map<string, SchemaTable[]>();
    tables.forEach((table) => {
      const existing = groups.get(table.schema) || [];
      existing.push(table);
      groups.set(table.schema, existing);
    });
    return groups;
  }, [tables]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;

    if (searchType === "tables") {
      return {
        type: "tables" as const,
        results: searchTables(searchQuery),
      };
    } else {
      return {
        type: "columns" as const,
        results: searchColumns(searchQuery),
      };
    }
  }, [searchQuery, searchType, searchTables, searchColumns]);

  // Filter tables for display
  const displayTables = useMemo(() => {
    if (searchResults?.type === "tables") {
      return searchResults.results;
    }
    if (selectedSchema) {
      return schemaGroups.get(selectedSchema) || [];
    }
    return tables.slice(0, 50); // Limit initial display
  }, [tables, selectedSchema, searchResults, schemaGroups]);

  const toggleTable = (tableKey: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableKey)) {
      newExpanded.delete(tableKey);
    } else {
      newExpanded.add(tableKey);
    }
    setExpandedTables(newExpanded);
  };

  // Handle clicking on a column search result
  const handleColumnResultClick = (table: SchemaTable, columnName: string) => {
    setSelectedTableFromSearch(table);
    setHighlightedColumn(columnName);
  };

  // Close the selected table detail view
  const closeSelectedTable = () => {
    setSelectedTableFromSearch(null);
    setHighlightedColumn(null);
  };

  const getDataTypeColor = (dataType: string): string => {
    const type = dataType.toLowerCase();
    if (
      type.includes("int") ||
      type.includes("decimal") ||
      type.includes("money")
    ) {
      return "#3b82f6"; // blue
    }
    if (
      type.includes("varchar") ||
      type.includes("char") ||
      type.includes("text")
    ) {
      return "#22c55e"; // green
    }
    if (type.includes("date") || type.includes("time")) {
      return "#f97316"; // orange
    }
    if (type.includes("bit") || type.includes("bool")) {
      return "#a855f7"; // purple
    }
    if (type.includes("binary") || type.includes("image")) {
      return "#ec4899"; // pink
    }
    return "#a1a1a1"; // gray
  };

  if (loading) {
    return (
      <div className="schema-explorer-loading">
        <div className="loading-spinner"></div>
        <p>Loading schema...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="schema-explorer-error">
        <div className="error-icon">⚠️</div>
        <strong>Schema Not Available</strong>
        <p className="error-message">{error}</p>
        <p className="error-help">
          To add schema data for other databases, run the schema extraction
          script:
          <code>
            node scripts/extract-schema.js --database=DatabaseName --env=PROD
          </code>
        </p>
      </div>
    );
  }

  return (
    <div className="schema-explorer">
      {/* Stats Header */}
      {stats && (
        <div className="schema-stats">
          <div className="stat-item">
            <span className="stat-value">{stats.totalSchemas}</span>
            <span className="stat-label">Schemas</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">
              {stats.totalTables.toLocaleString()}
            </span>
            <span className="stat-label">Tables</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">
              {stats.totalColumns.toLocaleString()}
            </span>
            <span className="stat-label">Columns</span>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="search-section">
        <div className="search-input-wrapper">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              searchType === "tables" ? "Search tables..." : "Search columns..."
            }
            className="search-input"
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery("")}>
              &times;
            </button>
          )}
        </div>
        <div className="search-type-toggle">
          <button
            className={searchType === "tables" ? "active" : ""}
            onClick={() => setSearchType("tables")}
          >
            Tables
          </button>
          <button
            className={searchType === "columns" ? "active" : ""}
            onClick={() => setSearchType("columns")}
          >
            Columns
          </button>
        </div>
      </div>

      {/* Schema Selector */}
      {!searchQuery && (
        <div className="schema-selector">
          <button
            className={`schema-btn ${selectedSchema === null ? "active" : ""}`}
            onClick={() => setSelectedSchema(null)}
          >
            All ({tables.length})
          </button>
          {stats?.schemas.slice(0, 10).map((schema) => (
            <button
              key={schema.name}
              className={`schema-btn ${selectedSchema === schema.name ? "active" : ""}`}
              onClick={() => setSelectedSchema(schema.name)}
            >
              {schema.name} ({schema.tableCount})
            </button>
          ))}
          {stats && stats.schemas.length > 10 && (
            <span className="more-schemas">
              +{stats.schemas.length - 10} more
            </span>
          )}
        </div>
      )}

      {/* Column Search Results */}
      {searchResults?.type === "columns" && !selectedTableFromSearch && (
        <div className="column-search-results">
          <h4>
            Found {searchResults.results.length} columns matching "{searchQuery}
            "
          </h4>
          <p className="click-hint">Click a result to view the full table</p>
          <div className="column-results-list">
            {searchResults.results.slice(0, 100).map((result, idx) => (
              <div
                key={idx}
                className="column-result-item clickable"
                onClick={() =>
                  handleColumnResultClick(result.table, result.column)
                }
              >
                <span className="table-ref">
                  {result.table.schema}.{result.table.name}
                </span>
                <span className="column-name">{result.column}</span>
              </div>
            ))}
            {searchResults.results.length > 100 && (
              <div className="more-results">
                Showing 100 of {searchResults.results.length} results
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Table Detail View */}
      {selectedTableFromSearch && (
        <div className="selected-table-detail">
          <div className="detail-header">
            <button className="back-btn" onClick={closeSelectedTable}>
              ← Back to results
            </button>
            <div className="table-info">
              <span className="schema-name">
                {selectedTableFromSearch.schema}
              </span>
              <span className="table-name-large">
                {selectedTableFromSearch.name}
              </span>
              <span className="col-count">
                {selectedTableFromSearch.columns?.length || 0} columns
              </span>
            </div>
          </div>
          <div className="detail-columns">
            <table>
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Type</th>
                  <th>Nullable</th>
                  <th>Key</th>
                </tr>
              </thead>
              <tbody>
                {selectedTableFromSearch.columns?.map((col) => (
                  <tr
                    key={col.name}
                    className={
                      col.name === highlightedColumn ? "highlighted" : ""
                    }
                  >
                    <td className="col-name">
                      {col.name}
                      {col.name === highlightedColumn && (
                        <span className="match-badge">Match</span>
                      )}
                    </td>
                    <td>
                      <span
                        className="data-type"
                        style={{ color: getDataTypeColor(col.dataType) }}
                      >
                        {col.dataType}
                        {col.maxLength > 0 && col.maxLength !== -1 && (
                          <span className="type-size">({col.maxLength})</span>
                        )}
                        {col.maxLength === -1 && (
                          <span className="type-size">(max)</span>
                        )}
                      </span>
                    </td>
                    <td>
                      {col.nullable ? (
                        <span className="nullable-yes">Yes</span>
                      ) : (
                        <span className="nullable-no">No</span>
                      )}
                    </td>
                    <td>
                      {col.isIdentity && (
                        <span className="key-badge pk">PK</span>
                      )}
                      {col.isPrimaryKey && !col.isIdentity && (
                        <span className="key-badge pk">PK</span>
                      )}
                      {col.isForeignKey && (
                        <span className="key-badge fk">FK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Table List */}
      {searchResults?.type !== "columns" && !selectedTableFromSearch && (
        <div className="tables-list">
          {displayTables.length === 0 ? (
            <div className="no-results">
              No tables found matching your criteria
            </div>
          ) : (
            <>
              <div className="tables-header">
                Showing {displayTables.length} of{" "}
                {selectedSchema
                  ? schemaGroups.get(selectedSchema)?.length
                  : tables.length}{" "}
                tables
              </div>
              {displayTables.map((table) => {
                const tableKey = `${table.schema}.${table.name}`;
                const isExpanded = expandedTables.has(tableKey);

                return (
                  <div key={tableKey} className="table-item">
                    <div
                      className="table-header"
                      onClick={() => toggleTable(tableKey)}
                    >
                      <span
                        className={`expand-icon ${isExpanded ? "expanded" : ""}`}
                      >
                        &#9656;
                      </span>
                      <span className="table-schema">{table.schema}</span>
                      <span className="table-name">{table.name}</span>
                      <span className="column-count">
                        {table.columns?.length || 0} columns
                      </span>
                    </div>

                    {isExpanded && table.columns && (
                      <div className="columns-list">
                        <table>
                          <thead>
                            <tr>
                              <th>Column</th>
                              <th>Type</th>
                              <th>Nullable</th>
                              <th>Key</th>
                            </tr>
                          </thead>
                          <tbody>
                            {table.columns.map((col) => (
                              <tr key={col.name}>
                                <td className="col-name">{col.name}</td>
                                <td>
                                  <span
                                    className="data-type"
                                    style={{
                                      color: getDataTypeColor(col.dataType),
                                    }}
                                  >
                                    {col.dataType}
                                    {col.maxLength > 0 &&
                                      col.maxLength !== -1 && (
                                        <span className="type-size">
                                          ({col.maxLength})
                                        </span>
                                      )}
                                    {col.maxLength === -1 && (
                                      <span className="type-size">(max)</span>
                                    )}
                                  </span>
                                </td>
                                <td>
                                  {col.nullable ? (
                                    <span className="nullable-yes">Yes</span>
                                  ) : (
                                    <span className="nullable-no">No</span>
                                  )}
                                </td>
                                <td>
                                  {col.isIdentity && (
                                    <span className="key-badge pk">PK</span>
                                  )}
                                  {col.isPrimaryKey && !col.isIdentity && (
                                    <span className="key-badge pk">PK</span>
                                  )}
                                  {col.isForeignKey && (
                                    <span className="key-badge fk">FK</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      <style>{`
        .schema-explorer {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          height: 100%;
          min-height: 0;
        }

        .schema-explorer-loading,
        .schema-explorer-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          text-align: center;
        }

        .loading-spinner {
          width: 2rem;
          height: 2rem;
          border: 3px solid #2a2a2a;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .schema-explorer-error {
          background: rgba(251, 191, 36, 0.1);
          border: 1px solid #fbbf24;
          border-radius: 0.75rem;
          color: #fbbf24;
          padding: 2rem;
        }

        .schema-explorer-error .error-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .schema-explorer-error strong {
          display: block;
          font-size: 1.125rem;
          margin-bottom: 0.75rem;
        }

        .schema-explorer-error .error-message {
          color: #a1a1a1;
          margin: 0 0 1rem 0;
          font-size: 0.875rem;
        }

        .schema-explorer-error .error-help {
          color: #666;
          font-size: 0.75rem;
          margin: 0;
        }

        .schema-explorer-error code {
          display: block;
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 0.375rem;
          font-family: 'SF Mono', monospace;
          font-size: 0.75rem;
          color: #60a5fa;
        }

        .schema-stats {
          display: flex;
          gap: 1.5rem;
          padding: 1rem;
          background: #141414;
          border: 1px solid #2a2a2a;
          border-radius: 0.75rem;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #3b82f6;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #a1a1a1;
        }

        .search-section {
          display: flex;
          gap: 0.75rem;
        }

        .search-input-wrapper {
          flex: 1;
          position: relative;
        }

        .search-input {
          width: 100%;
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          border-radius: 0.5rem;
          padding: 0.625rem 2rem 0.625rem 0.75rem;
          color: #f0f0f0;
          font-size: 0.875rem;
        }

        .search-input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .clear-search {
          position: absolute;
          right: 0.5rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #666;
          font-size: 1.25rem;
          cursor: pointer;
          padding: 0.25rem;
        }

        .clear-search:hover {
          color: #f0f0f0;
        }

        .search-type-toggle {
          display: flex;
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          border-radius: 0.5rem;
          overflow: hidden;
        }

        .search-type-toggle button {
          background: none;
          border: none;
          padding: 0.625rem 1rem;
          color: #a1a1a1;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .search-type-toggle button:hover {
          color: #f0f0f0;
        }

        .search-type-toggle button.active {
          background: #3b82f6;
          color: white;
        }

        .schema-selector {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .schema-btn {
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          border-radius: 0.375rem;
          padding: 0.375rem 0.75rem;
          color: #a1a1a1;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .schema-btn:hover {
          border-color: #3b82f6;
          color: #f0f0f0;
        }

        .schema-btn.active {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }

        .more-schemas {
          color: #666;
          font-size: 0.75rem;
          align-self: center;
        }

        .column-search-results {
          background: #141414;
          border: 1px solid #2a2a2a;
          border-radius: 0.75rem;
          padding: 1rem;
        }

        .column-search-results h4 {
          margin: 0 0 0.25rem 0;
          font-size: 0.875rem;
          color: #f0f0f0;
        }

        .click-hint {
          margin: 0 0 1rem 0;
          font-size: 0.75rem;
          color: #666;
        }

        .column-results-list {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
          max-height: 400px;
          overflow-y: auto;
        }

        .column-result-item {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0.75rem;
          background: #1a1a1a;
          border-radius: 0.375rem;
          transition: all 0.2s;
        }

        .column-result-item.clickable {
          cursor: pointer;
          border: 1px solid transparent;
        }

        .column-result-item.clickable:hover {
          background: #252525;
          border-color: #3b82f6;
        }

        .table-ref {
          color: #666;
          font-size: 0.75rem;
          font-family: 'SF Mono', monospace;
        }

        .column-name {
          color: #3b82f6;
          font-weight: 500;
          font-size: 0.8125rem;
        }

        .more-results {
          text-align: center;
          padding: 0.75rem;
          color: #666;
          font-size: 0.75rem;
        }

        /* Selected Table Detail View */
        .selected-table-detail {
          background: #141414;
          border: 1px solid #2a2a2a;
          border-radius: 0.75rem;
          overflow: hidden;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .detail-header {
          padding: 1rem;
          border-bottom: 1px solid #2a2a2a;
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .back-btn {
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          border-radius: 0.375rem;
          padding: 0.5rem 1rem;
          color: #a1a1a1;
          font-size: 0.8125rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .back-btn:hover {
          border-color: #3b82f6;
          color: #f0f0f0;
        }

        .table-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .schema-name {
          color: #666;
          font-size: 0.875rem;
        }

        .table-name-large {
          color: #f0f0f0;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .col-count {
          color: #666;
          font-size: 0.75rem;
          background: #1a1a1a;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
        }

        .detail-columns {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem;
        }

        .detail-columns table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8125rem;
        }

        .detail-columns th {
          text-align: left;
          padding: 0.75rem;
          color: #666;
          font-weight: 500;
          font-size: 0.75rem;
          border-bottom: 1px solid #2a2a2a;
          background: #1a1a1a;
          position: sticky;
          top: 0;
        }

        .detail-columns td {
          padding: 0.5rem 0.75rem;
          border-bottom: 1px solid #1a1a1a;
        }

        .detail-columns tr.highlighted {
          background: rgba(59, 130, 246, 0.15);
        }

        .detail-columns tr.highlighted td {
          border-bottom-color: rgba(59, 130, 246, 0.3);
        }

        .match-badge {
          display: inline-block;
          margin-left: 0.5rem;
          padding: 0.125rem 0.375rem;
          background: #3b82f6;
          color: white;
          border-radius: 0.25rem;
          font-size: 0.625rem;
          font-weight: 600;
        }

        .tables-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
          overflow-y: auto;
          min-height: 0;
        }

        .tables-header {
          font-size: 0.75rem;
          color: #666;
          padding: 0.5rem 0;
        }

        .no-results {
          text-align: center;
          padding: 2rem;
          color: #666;
        }

        .table-item {
          background: #141414;
          border: 1px solid #2a2a2a;
          border-radius: 0.5rem;
          overflow: hidden;
          flex-shrink: 0;
        }

        .table-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .table-header:hover {
          background: #1a1a1a;
        }

        .expand-icon {
          color: #666;
          font-size: 0.75rem;
          transition: transform 0.2s;
        }

        .expand-icon.expanded {
          transform: rotate(90deg);
        }

        .table-schema {
          color: #666;
          font-size: 0.75rem;
        }

        .table-name {
          color: #f0f0f0;
          font-weight: 500;
          font-size: 0.875rem;
          flex: 1;
        }

        .column-count {
          color: #666;
          font-size: 0.75rem;
        }

        .columns-list {
          border-top: 1px solid #2a2a2a;
          padding: 0.5rem;
          max-height: 400px;
          overflow-y: auto;
        }

        .columns-list table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8125rem;
        }

        .columns-list th {
          text-align: left;
          padding: 0.5rem;
          color: #666;
          font-weight: 500;
          font-size: 0.75rem;
          border-bottom: 1px solid #2a2a2a;
        }

        .columns-list td {
          padding: 0.375rem 0.5rem;
          border-bottom: 1px solid #1a1a1a;
        }

        .col-name {
          color: #f0f0f0;
          font-family: 'SF Mono', monospace;
        }

        .data-type {
          font-family: 'SF Mono', monospace;
          font-size: 0.75rem;
        }

        .type-size {
          color: #666;
        }

        .nullable-yes {
          color: #666;
        }

        .nullable-no {
          color: #ef4444;
          font-weight: 500;
        }

        .key-badge {
          display: inline-block;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-size: 0.625rem;
          font-weight: 600;
          margin-right: 0.25rem;
        }

        .key-badge.pk {
          background: rgba(234, 179, 8, 0.2);
          color: #eab308;
        }

        .key-badge.fk {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }
      `}</style>
    </div>
  );
}
