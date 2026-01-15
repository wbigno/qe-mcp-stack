import React, { useMemo, useCallback } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  ConnectionMode,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { GitBranch, Info } from "lucide-react";
import type { Application } from "../../types/infrastructure";
import { buildFlowData, getNodeColor } from "../../utils/flowHelpers";
import { nodeTypes } from "../common/FlowNode";

interface EventFlowPanelProps {
  app: Application;
  onSelectIntegration: (key: string) => void;
}

export const EventFlowPanel: React.FC<EventFlowPanelProps> = ({
  app,
  onSelectIntegration,
}) => {
  // Build flow data from app integrations
  const flowData = useMemo(() => buildFlowData(app), [app]);

  const [nodes, , onNodesChange] = useNodesState(flowData.nodes);
  const [edges, , onEdgesChange] = useEdgesState(flowData.edges);

  // Handle node click
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // If it's an integration node, notify parent
      if (node.data?.integrationKey) {
        onSelectIntegration(node.data.integrationKey);
      }
    },
    [onSelectIntegration],
  );

  // Custom minimap node color
  const minimapNodeColor = useCallback((node: Node) => {
    if (node.type === "application") return "#3b82f6";
    const type = node.data?.type;
    return getNodeColor(type) || "#6b7280";
  }, []);

  // Get statistics
  const stats = useMemo(() => {
    const integrations = Object.values(app.integrations || {});
    return {
      total: integrations.length,
      apis: integrations.filter((i) => i.type === "api").length,
      external: integrations.filter((i) => i.type === "external").length,
      databases: integrations.filter((i) => i.type === "database").length,
      payments: integrations.filter((i) => i.type === "payment").length,
    };
  }, [app]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-primary flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <GitBranch className="w-5 h-5" /> Integration Flow
          </h2>
          <p className="text-sm text-secondary">
            Click on a node to view integration details
          </p>
        </div>
        <div className="flex gap-2">
          <span className="badge">{stats.total} integrations</span>
          <span className="badge">{stats.apis} APIs</span>
          <span className="badge">{stats.external} external</span>
        </div>
      </div>

      {/* Flow Diagram */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          defaultEdgeOptions={{
            type: "smoothstep",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#333" gap={20} />
          <Controls
            className="!bg-secondary !border-primary !rounded-lg"
            showZoom={true}
            showFitView={true}
            showInteractive={false}
          />
          <MiniMap
            nodeColor={minimapNodeColor}
            maskColor="rgba(0, 0, 0, 0.8)"
            className="!bg-secondary !border-primary !rounded-lg"
            style={{ height: 100 }}
          />
        </ReactFlow>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-secondary rounded-lg p-3 border border-primary">
          <div className="text-xs font-semibold mb-2 flex items-center gap-1">
            <Info className="w-3 h-3" /> Legend
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-purple-500" />
              <span className="text-secondary">API</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-secondary">Payment</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-orange-500" />
              <span className="text-secondary">External</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span className="text-secondary">Cloud</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-secondary">Cache</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-gray-500" />
              <span className="text-secondary">Database</span>
            </div>
          </div>
        </div>

        {/* Help Tip */}
        <div className="absolute top-4 right-4 bg-secondary rounded-lg p-3 border border-primary max-w-xs">
          <div className="text-xs text-secondary">
            <strong className="text-primary">Tip:</strong> Use scroll to zoom,
            drag to pan. Click on integration nodes to view details.
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="p-3 border-t border-primary">
        <div className="flex items-center justify-center gap-6 text-xs text-secondary">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            All connections active
          </div>
          <div>Animated edges show data flow direction</div>
        </div>
      </div>
    </div>
  );
};

export default EventFlowPanel;
