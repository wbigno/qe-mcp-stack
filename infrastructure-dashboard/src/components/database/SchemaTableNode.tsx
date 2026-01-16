import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Table, Key } from "lucide-react";

interface SchemaTableNodeData {
  label: string;
  schema: string;
  columnCount: number;
  primaryKey?: string;
  foreignKeys?: string[];
  color: string;
  bgColor?: string;
  textColor?: string;
  table?: unknown;
  isConnected?: boolean;
  isStandalone?: boolean;
}

const SchemaTableNodeComponent = ({
  data,
  selected,
}: NodeProps<SchemaTableNodeData>) => {
  const hasForeignKeys = data.foreignKeys && data.foreignKeys.length > 0;
  const isStandalone = data.isStandalone;

  // Use schema colors for all tables - make them visible with higher opacity
  // Convert hex color to rgba with appropriate opacity
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Use schema colors for background - more visible opacity
  const bgColor = data.color
    ? hexToRgba(data.color, isStandalone ? 0.3 : 0.4)
    : isStandalone
      ? "rgba(100, 100, 100, 0.3)"
      : "rgba(59, 130, 246, 0.4)";

  // Use schema colors for text
  const textColor = data.textColor || data.color || "#60a5fa";

  // Use schema colors for border - always use the schema color
  const borderColor = data.color || "#6b7280";

  return (
    <div
      className={`schema-table-node ${isStandalone ? "standalone" : "connected"}`}
      style={{
        borderColor: borderColor,
        backgroundColor: bgColor,
        boxShadow: selected ? `0 0 0 2px ${data.color}` : undefined,
        opacity: isStandalone ? 0.85 : 1,
        borderWidth: "2px",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ backgroundColor: data.color }}
      />

      <div className="node-content">
        <div className="node-icon" style={{ color: textColor }}>
          <Table className="w-4 h-4" />
        </div>
        <div className="node-info">
          <div className="node-label">{data.label}</div>
          <div className="node-schema" style={{ color: textColor }}>
            {data.schema}
          </div>
        </div>
      </div>

      <div className="node-meta">
        <span className="column-count">{data.columnCount} cols</span>
        {data.primaryKey && (
          <span
            className="pk-indicator"
            title={`Primary Key: ${data.primaryKey}`}
          >
            <Key className="w-3 h-3" />
          </span>
        )}
        {hasForeignKeys && (
          <span
            className="fk-count"
            title={`Foreign Keys: ${data.foreignKeys?.join(", ")}`}
          >
            {data.foreignKeys?.length} FK
          </span>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ backgroundColor: data.color }}
      />

      <style>{`
        .schema-table-node {
          min-width: 160px;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          border: 2px solid;
          cursor: pointer;
          transition: all 0.2s;
        }

        .schema-table-node:hover {
          transform: scale(1.02);
        }

        .node-content {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.375rem;
        }

        .node-icon {
          flex-shrink: 0;
        }

        .node-info {
          flex: 1;
          min-width: 0;
        }

        .node-label {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #f0f0f0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .node-schema {
          font-size: 0.6875rem;
          opacity: 0.8;
        }

        .node-meta {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.6875rem;
          color: #a1a1a1;
        }

        .column-count {
          background: rgba(255, 255, 255, 0.1);
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
        }

        .pk-indicator {
          display: flex;
          align-items: center;
          color: #eab308;
        }

        .fk-count {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
        }

        .react-flow__handle {
          width: 8px !important;
          height: 8px !important;
          border: 2px solid #0a0a0a !important;
        }
      `}</style>
    </div>
  );
};

export const SchemaTableNode = memo(SchemaTableNodeComponent);

export const schemaNodeTypes = {
  schemaTable: SchemaTableNode,
};

export default SchemaTableNode;
