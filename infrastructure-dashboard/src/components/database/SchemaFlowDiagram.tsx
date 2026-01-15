import React, {
  useMemo,
  useCallback,
  useState,
  useEffect,
  useRef,
} from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  ConnectionMode,
  MarkerType,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import { Database, Info, Table, Key } from "lucide-react";
import type { SchemaTable, SchemaStats } from "../../types/schema";
import { schemaNodeTypes } from "./SchemaTableNode";

interface SchemaFlowDiagramProps {
  tables: SchemaTable[];
  stats: SchemaStats | null;
  onSelectTable?: (table: SchemaTable) => void;
  appName?: string;
  appTables?: string[];
}

// Color palette for different schemas - matching Flow view style
const SCHEMA_COLORS: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  CarePayment: {
    bg: "rgba(59, 130, 246, 0.2)",
    border: "#3b82f6",
    text: "#60a5fa",
  },
  Epic: { bg: "rgba(168, 85, 247, 0.2)", border: "#a855f7", text: "#c084fc" },
  FiServ: { bg: "rgba(249, 115, 22, 0.2)", border: "#f97316", text: "#fb923c" },
  Accounting: {
    bg: "rgba(34, 197, 94, 0.2)",
    border: "#22c55e",
    text: "#4ade80",
  },
  DataLoad: {
    bg: "rgba(236, 72, 153, 0.2)",
    border: "#ec4899",
    text: "#f472b6",
  },
  ClientData: {
    bg: "rgba(20, 184, 166, 0.2)",
    border: "#14b8a6",
    text: "#2dd4bf",
  },
  Report: { bg: "rgba(234, 179, 8, 0.2)", border: "#eab308", text: "#facc15" },
  dbo: { bg: "rgba(107, 114, 128, 0.2)", border: "#6b7280", text: "#9ca3af" },
  default: {
    bg: "rgba(148, 163, 184, 0.2)",
    border: "#94a3b8",
    text: "#cbd5e1",
  },
};

const getSchemaColor = (schemaName: string) => {
  return SCHEMA_COLORS[schemaName] || SCHEMA_COLORS.default;
};

export function SchemaFlowDiagram({
  tables,
  stats,
  onSelectTable,
  appName,
  appTables = [],
}: SchemaFlowDiagramProps) {
  const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
  const [showAppTablesOnly, setShowAppTablesOnly] = useState(false);

  // Check if we have tables
  const hasTables = tables && tables.length > 0;

  // Build nodes and edges from schema data - separating connected and standalone tables
  const {
    nodes: initialNodes,
    edges: initialEdges,
    connectedCount,
    standaloneCount,
  } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    if (!hasTables) {
      return { nodes, edges, connectedCount: 0, standaloneCount: 0 };
    }

    // Filter tables based on selection
    let filteredTables = tables;
    if (showAppTablesOnly && appTables.length > 0) {
      const appTableSet = new Set(appTables.map((t) => t.toLowerCase()));
      filteredTables = tables.filter(
        (table) =>
          appTableSet.has(table.name.toLowerCase()) ||
          appTableSet.has(`${table.schema}.${table.name}`.toLowerCase()),
      );
    } else if (selectedSchema) {
      filteredTables = tables.filter((t) => t.schema === selectedSchema);
    } else {
      // Show top tables from top schemas
      const topSchemas = stats?.schemas.slice(0, 6).map((s) => s.name) || [];
      filteredTables = tables
        .filter((t) => topSchemas.includes(t.schema))
        .slice(0, 50);
    }

    // Limit to reasonable number for performance
    const tablesToShow = filteredTables.slice(0, 60);

    // Build a map to find potential FK relationships
    const tableNameLookup = new Map<string, SchemaTable>();
    tablesToShow.forEach((table) => {
      tableNameLookup.set(table.name.toLowerCase(), table);
      tableNameLookup.set(`${table.schema}.${table.name}`.toLowerCase(), table);
    });

    // Identify connected tables (have FK relationship to another visible table)
    const connectedTableIds = new Set<string>();

    tablesToShow.forEach((table) => {
      const foreignKeys =
        table.columns?.filter((col) => {
          const endsWithId = col.name.endsWith("ID") || col.name.endsWith("Id");
          const isPK = col.isIdentity || col.isPrimaryKey;
          return (endsWithId && !isPK) || col.isForeignKey;
        }) || [];

      foreignKeys.forEach((fk) => {
        const baseName = fk.name.replace(/ID$|Id$|_ID$|_Id$/, "");
        const possibleTargets = [
          baseName.toLowerCase(),
          `${table.schema}.${baseName}`.toLowerCase(),
          `carepayment.${baseName}`.toLowerCase(),
        ];

        for (const targetKey of possibleTargets) {
          if (tableNameLookup.has(targetKey)) {
            const targetTable = tableNameLookup.get(targetKey);
            if (targetTable && targetTable.name !== table.name) {
              connectedTableIds.add(`${table.schema}.${table.name}`);
              connectedTableIds.add(
                `${targetTable.schema}.${targetTable.name}`,
              );
              break;
            }
          }
        }
      });
    });

    // Separate tables into connected and standalone
    const connectedTables = tablesToShow.filter((t) =>
      connectedTableIds.has(`${t.schema}.${t.name}`),
    );
    const standaloneTables = tablesToShow.filter(
      (t) => !connectedTableIds.has(`${t.schema}.${t.name}`),
    );

    // Layout settings - increased spacing to prevent overlap
    const NODE_WIDTH = 220;
    const NODE_HEIGHT = 90;
    const CONNECTED_COLS = 3;
    const STANDALONE_COLS = 4;
    const H_GAP = 150;
    const V_GAP = 150;
    const SECTION_GAP = 250;

    // Create nodes for connected tables first (upper section)
    connectedTables.forEach((table, index) => {
      const col = index % CONNECTED_COLS;
      const row = Math.floor(index / CONNECTED_COLS);
      const x = col * (NODE_WIDTH + H_GAP) + 50;
      const y = row * (NODE_HEIGHT + V_GAP) + 50;

      const tableId = `${table.schema}.${table.name}`;
      const colors = getSchemaColor(table.schema);

      const foreignKeys =
        table.columns?.filter((col) => {
          const endsWithId = col.name.endsWith("ID") || col.name.endsWith("Id");
          const isPK = col.isIdentity || col.isPrimaryKey;
          return (endsWithId && !isPK) || col.isForeignKey;
        }) || [];

      nodes.push({
        id: tableId,
        type: "schemaTable",
        position: { x, y },
        data: {
          label: table.name,
          schema: table.schema,
          columnCount: table.columns?.length || 0,
          primaryKey: table.columns?.find((c) => c.isIdentity || c.isPrimaryKey)
            ?.name,
          foreignKeys: foreignKeys.map((fk) => fk.name),
          color: colors.border,
          bgColor: colors.bg,
          textColor: colors.text,
          table,
          isConnected: true,
        },
      });
    });

    // Calculate where standalone section starts
    const connectedRows = Math.ceil(connectedTables.length / CONNECTED_COLS);
    const standaloneStartY =
      connectedRows * (NODE_HEIGHT + V_GAP) + SECTION_GAP;

    // Add a separator label node if we have both sections
    if (connectedTables.length > 0 && standaloneTables.length > 0) {
      nodes.push({
        id: "__separator__",
        type: "default",
        position: { x: 50, y: standaloneStartY - 60 },
        data: {
          label: `━━━ Standalone Tables (${standaloneTables.length}) ━━━ No FK relationships to other visible tables ━━━`,
        },
        style: {
          background: "transparent",
          border: "none",
          color: "#666",
          fontSize: "12px",
          width: 600,
          textAlign: "center",
        },
        selectable: false,
        draggable: false,
      });
    }

    // Create nodes for standalone tables (lower section, with proper spacing)
    standaloneTables.forEach((table, index) => {
      const col = index % STANDALONE_COLS;
      const row = Math.floor(index / STANDALONE_COLS);
      const x = col * (NODE_WIDTH + 80) + 50;
      const y = standaloneStartY + row * (NODE_HEIGHT + 80);

      const tableId = `${table.schema}.${table.name}`;
      const colors = getSchemaColor(table.schema);

      nodes.push({
        id: tableId,
        type: "schemaTable",
        position: { x, y },
        data: {
          label: table.name,
          schema: table.schema,
          columnCount: table.columns?.length || 0,
          primaryKey: table.columns?.find((c) => c.isIdentity || c.isPrimaryKey)
            ?.name,
          foreignKeys: [],
          color: colors.border,
          bgColor: colors.bg,
          textColor: colors.text,
          table,
          isConnected: false,
          isStandalone: true,
        },
      });
    });

    // Build edge map for FK relationships (only for connected tables)
    const tableNameMap = new Map<string, string>();
    nodes.forEach((node) => {
      if (node.id === "__separator__") return;
      const tableName = node.data?.label;
      if (tableName) {
        tableNameMap.set(tableName.toLowerCase(), node.id);
        tableNameMap.set(
          `${node.data.schema}.${tableName}`.toLowerCase(),
          node.id,
        );
      }
    });

    const processedEdges = new Set<string>();

    // Create edges for foreign key relationships
    nodes.forEach((node) => {
      if (node.id === "__separator__") return;
      const foreignKeys = node.data?.foreignKeys || [];

      foreignKeys.forEach((fkName: string) => {
        const baseName = fkName.replace(/ID$|Id$|_ID$|_Id$/, "");

        const possibleTargets = [
          baseName.toLowerCase(),
          `${node.data.schema}.${baseName}`.toLowerCase(),
          `carepayment.${baseName}`.toLowerCase(),
        ];

        for (const targetKey of possibleTargets) {
          const targetId = tableNameMap.get(targetKey);
          if (targetId && targetId !== node.id) {
            const edgeId = `${node.id}->${targetId}`;
            const reverseEdgeId = `${targetId}->${node.id}`;

            if (
              !processedEdges.has(edgeId) &&
              !processedEdges.has(reverseEdgeId)
            ) {
              processedEdges.add(edgeId);
              const targetColors = getSchemaColor(node.data.schema);

              edges.push({
                id: edgeId,
                source: node.id,
                target: targetId,
                type: "smoothstep",
                animated: true,
                style: {
                  stroke: targetColors.border,
                  strokeWidth: 2,
                  strokeDasharray: "5,5",
                },
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  color: targetColors.border,
                  width: 15,
                  height: 15,
                },
              });
            }
            break;
          }
        }
      });
    });

    return {
      nodes,
      edges,
      connectedCount: connectedTables.length,
      standaloneCount: standaloneTables.length,
    };
  }, [tables, stats, selectedSchema, showAppTablesOnly, appTables, hasTables]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Track previous filter state to only reset nodes when filters actually change
  const prevFilterRef = useRef({
    selectedSchema,
    showAppTablesOnly,
    tablesLength: tables.length,
  });

  useEffect(() => {
    const prevFilter = prevFilterRef.current;
    const filterChanged =
      prevFilter.selectedSchema !== selectedSchema ||
      prevFilter.showAppTablesOnly !== showAppTablesOnly ||
      prevFilter.tablesLength !== tables.length;

    // Only reset nodes when filter changes, not on every render
    if (filterChanged) {
      setNodes(initialNodes);
      setEdges(initialEdges);
      prevFilterRef.current = {
        selectedSchema,
        showAppTablesOnly,
        tablesLength: tables.length,
      };
    }
  }, [
    initialNodes,
    initialEdges,
    setNodes,
    setEdges,
    selectedSchema,
    showAppTablesOnly,
    tables.length,
  ]);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type === "schemaTable" && node.data?.table && onSelectTable) {
        onSelectTable(node.data.table);
      }
    },
    [onSelectTable],
  );

  const minimapNodeColor = useCallback((node: Node) => {
    // Use the schema color from the legend
    if (node.data?.color) {
      return node.data.color;
    }
    // Fallback to schema-based color lookup
    if (node.data?.schema) {
      const colors = getSchemaColor(node.data.schema);
      return colors.border;
    }
    return "#6b7280";
  }, []);

  const topSchemas = useMemo(() => {
    return stats?.schemas.slice(0, 8) || [];
  }, [stats]);

  // Empty state
  if (!hasTables) {
    return (
      <div
        className="schema-flow-diagram"
        style={{
          height: "100%",
          minHeight: "400px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📊</div>
          <h3 style={{ color: "#f0f0f0", marginBottom: "0.5rem" }}>
            No Schema Data Available
          </h3>
          <p style={{ color: "#a1a1a1", fontSize: "0.875rem" }}>
            Schema data has not been extracted for this database yet.
            <br />
            Only CarePayment schema is currently available.
          </p>
        </div>
        <style>{`
          .schema-flow-diagram {
            background: #0a0a0a;
            border-radius: 0.75rem;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="schema-flow-diagram">
      {/* Schema Filter */}
      <div className="schema-filter">
        {appTables.length > 0 && (
          <button
            className={`filter-btn app-tables-btn ${showAppTablesOnly ? "active" : ""}`}
            onClick={() => {
              setShowAppTablesOnly(!showAppTablesOnly);
              if (!showAppTablesOnly) setSelectedSchema(null);
            }}
          >
            📱 {appName} Tables ({appTables.length})
          </button>
        )}
        <span className="filter-divider">|</span>
        <button
          className={`filter-btn ${!showAppTablesOnly && selectedSchema === null ? "active" : ""}`}
          onClick={() => {
            setSelectedSchema(null);
            setShowAppTablesOnly(false);
          }}
        >
          Top Tables
        </button>
        {topSchemas.map((schema) => (
          <button
            key={schema.name}
            className={`filter-btn ${!showAppTablesOnly && selectedSchema === schema.name ? "active" : ""}`}
            onClick={() => {
              setSelectedSchema(
                selectedSchema === schema.name ? null : schema.name,
              );
              setShowAppTablesOnly(false);
            }}
            style={{
              borderColor:
                !showAppTablesOnly && selectedSchema === schema.name
                  ? getSchemaColor(schema.name).border
                  : undefined,
            }}
          >
            {schema.name} ({schema.tableCount})
          </button>
        ))}
      </div>

      {/* Flow Diagram */}
      <div className="flow-container">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={schemaNodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
          minZoom={0.2}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#333" gap={20} />
          <Controls
            className="flow-controls"
            showZoom={true}
            showFitView={true}
            showInteractive={false}
          />
          <MiniMap
            nodeColor={minimapNodeColor}
            nodeStrokeColor={minimapNodeColor}
            nodeStrokeWidth={2}
            nodeBorderRadius={4}
            maskColor="rgba(0, 0, 0, 0.8)"
            className="flow-minimap"
            style={{ height: 120 }}
          />

          {/* Legend Panel */}
          <Panel position="bottom-left" className="legend-panel">
            <div className="legend-header">
              <Info className="w-3 h-3" /> Legend
            </div>
            <div className="legend-items">
              {Object.entries(SCHEMA_COLORS)
                .slice(0, 6)
                .map(
                  ([name, colors]) =>
                    name !== "default" && (
                      <div key={name} className="legend-item">
                        <div
                          className="legend-color"
                          style={{ backgroundColor: colors.border }}
                        />
                        <span>{name}</span>
                      </div>
                    ),
                )}
            </div>
            <div className="legend-footer">
              <div className="legend-item">
                <Key className="w-3 h-3 text-yellow-500" />
                <span>Primary Key</span>
              </div>
              <div className="legend-item">
                <Table className="w-3 h-3 text-blue-400" />
                <span>Table</span>
              </div>
            </div>
          </Panel>

          {/* Help Tip */}
          <Panel position="top-right" className="help-panel">
            <strong>Tip:</strong> Use scroll to zoom, drag to pan. Click tables
            to view details.
          </Panel>
        </ReactFlow>
      </div>

      {/* Stats Footer */}
      {stats && (
        <div className="stats-footer">
          <div className="stat">
            <Database className="w-4 h-4" />
            {stats.totalSchemas} schemas total
          </div>
          <div className="stat">
            <Table className="w-4 h-4" />
            {stats.totalTables.toLocaleString()} tables total
          </div>
          <div className="stat connected">🔗 {connectedCount} connected</div>
          <div className="stat standalone">📦 {standaloneCount} standalone</div>
          <div className="stat highlight">
            {showAppTablesOnly
              ? `Viewing: ${appName} tables`
              : selectedSchema
                ? `Viewing: ${selectedSchema}`
                : "Viewing: Top tables"}
          </div>
        </div>
      )}

      <style>{`
        .schema-flow-diagram {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 500px;
          background: #0a0a0a;
          border-radius: 0.75rem;
          overflow: hidden;
        }

        .schema-filter {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          padding: 1rem;
          border-bottom: 1px solid #2a2a2a;
          background: #141414;
        }

        .filter-btn {
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          border-radius: 0.375rem;
          padding: 0.375rem 0.75rem;
          color: #a1a1a1;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-btn:hover {
          border-color: #3b82f6;
          color: #f0f0f0;
        }

        .filter-btn.active {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }

        .filter-btn.app-tables-btn {
          background: #065f46;
          border-color: #10b981;
          color: #a7f3d0;
        }

        .filter-btn.app-tables-btn.active {
          background: #10b981;
          border-color: #10b981;
          color: white;
        }

        .filter-divider {
          color: #3a3a3a;
          align-self: center;
          padding: 0 0.25rem;
        }

        .flow-container {
          flex: 1;
          position: relative;
        }

        .flow-controls {
          background: #1a1a1a !important;
          border: 1px solid #2a2a2a !important;
          border-radius: 0.5rem !important;
        }

        .flow-controls button {
          background: #1a1a1a !important;
          border-bottom: 1px solid #2a2a2a !important;
          color: #a1a1a1 !important;
        }

        .flow-controls button:hover {
          background: #2a2a2a !important;
        }

        .flow-minimap {
          background: #1a1a1a !important;
          border: 1px solid #2a2a2a !important;
          border-radius: 0.5rem !important;
        }

        .legend-panel {
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          border-radius: 0.5rem;
          padding: 0.75rem;
          font-size: 0.75rem;
        }

        .legend-header {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #f0f0f0;
        }

        .legend-items {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.25rem 1rem;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #a1a1a1;
        }

        .legend-color {
          width: 0.75rem;
          height: 0.75rem;
          border-radius: 0.25rem;
        }

        .legend-footer {
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid #2a2a2a;
          display: flex;
          gap: 1rem;
        }

        .help-panel {
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          border-radius: 0.5rem;
          padding: 0.75rem;
          font-size: 0.75rem;
          color: #a1a1a1;
          max-width: 250px;
        }

        .help-panel strong {
          color: #f0f0f0;
        }

        .stats-footer {
          display: flex;
          justify-content: center;
          gap: 2rem;
          padding: 0.75rem;
          border-top: 1px solid #2a2a2a;
          background: #141414;
        }

        .stat {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: #a1a1a1;
        }

        .stat.highlight {
          color: #60a5fa;
          font-weight: 500;
        }

        .stat.connected {
          color: #4ade80;
          font-weight: 500;
        }

        .stat.standalone {
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
}
