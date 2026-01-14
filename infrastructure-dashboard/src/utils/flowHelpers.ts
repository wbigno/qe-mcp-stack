import type { Application, IntegrationType } from "../types/infrastructure";
import type {
  ServiceNode,
  ConnectionEdge,
  FlowData,
  FlowNodeType,
} from "../types/flow";

const NODE_COLORS: Record<IntegrationType, string> = {
  payment: "#22c55e", // green
  api: "#a855f7", // purple
  external: "#f97316", // orange
  auth: "#6366f1", // indigo
  email: "#14b8a6", // teal
  reporting: "#ec4899", // pink
  service: "#22c55e", // green
  cache: "#ef4444", // red
  background: "#eab308", // yellow
  database: "#6b7280", // gray
  cloud: "#3b82f6", // blue
};

/**
 * Build React Flow data from application integrations
 */
export function buildFlowData(app: Application): FlowData {
  const nodes: ServiceNode[] = [];
  const edges: ConnectionEdge[] = [];

  // Central application node
  const appNode: ServiceNode = {
    id: "app-main",
    type: "application",
    position: { x: 400, y: 50 },
    data: {
      label: app.name,
      type: "application" as FlowNodeType,
      description: app.tech,
      status: "active",
    },
  };
  nodes.push(appNode);

  // Group integrations by type for layout
  const integrationsByType = new Map<
    IntegrationType,
    Array<{ key: string; integration: (typeof app.integrations)[string] }>
  >();

  Object.entries(app.integrations || {}).forEach(([key, integration]) => {
    const intType = integration.type;
    if (!integrationsByType.has(intType)) {
      integrationsByType.set(intType, []);
    }
    integrationsByType.get(intType)!.push({ key, integration });
  });

  // Position nodes in a radial layout around the app
  const typeArray = Array.from(integrationsByType.entries());
  const angleStep = (2 * Math.PI) / Math.max(typeArray.length, 1);
  const radius = 250;

  typeArray.forEach(([_integrationType, integrations], typeIndex) => {
    const baseAngle = -Math.PI / 2 + typeIndex * angleStep; // Start from top

    integrations.forEach((item, idx) => {
      const { key, integration } = item;
      // Spread nodes within each type group
      const angleOffset =
        integrations.length > 1
          ? (idx - (integrations.length - 1) / 2) * 0.3
          : 0;
      const angle = baseAngle + angleOffset;

      const x = 400 + Math.cos(angle) * radius;
      const y = 250 + Math.sin(angle) * radius;

      const node: ServiceNode = {
        id: `integration-${key}`,
        type: "integration",
        position: { x, y },
        data: {
          label: integration.name,
          type: integration.type as FlowNodeType,
          integrationKey: key,
          description: integration.purpose,
          status: "active",
        },
      };
      nodes.push(node);

      // Create edge from app to integration
      const edge: ConnectionEdge = {
        id: `edge-app-${key}`,
        source: "app-main",
        target: `integration-${key}`,
        type: "smoothstep",
        animated: true,
        style: {
          stroke: NODE_COLORS[integration.type] || "#6b7280",
          strokeWidth: 2,
        },
        data: {
          dataFlow: integration.dataFlow?.outbound
            ? "outbound"
            : "bidirectional",
          authMethod: integration.authentication?.method,
        },
      };
      edges.push(edge);
    });
  });

  return { nodes, edges };
}

/**
 * Get color for node type
 */
export function getNodeColor(type: IntegrationType | "application"): string {
  if (type === "application") return "#3b82f6";
  return NODE_COLORS[type] || "#6b7280";
}

/**
 * Get icon name for integration type
 */
export function getIconName(type: IntegrationType): string {
  const icons: Record<IntegrationType, string> = {
    payment: "CreditCard",
    api: "Server",
    external: "Globe",
    auth: "Lock",
    email: "Mail",
    reporting: "FileText",
    service: "Cog",
    cache: "Zap",
    background: "Clock",
    database: "Database",
    cloud: "Cloud",
  };
  return icons[type] || "Server";
}
