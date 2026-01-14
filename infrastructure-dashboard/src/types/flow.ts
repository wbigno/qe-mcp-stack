/**
 * React Flow types for Event Flow visualization
 */
import type { Node, Edge } from "reactflow";

export type FlowNodeType =
  | "application"
  | "integration"
  | "external"
  | "database"
  | "cloud"
  | "payment"
  | "cache"
  | "auth";

export interface ServiceNodeData {
  label: string;
  type: FlowNodeType;
  appKey?: string;
  integrationKey?: string;
  status?: "active" | "inactive" | "error";
  description?: string;
  icon?: string;
}

export type ServiceNode = Node<ServiceNodeData>;

export interface ConnectionEdgeData {
  label?: string;
  dataFlow?: "inbound" | "outbound" | "bidirectional";
  authMethod?: string;
  protocol?: "HTTP" | "HTTPS" | "TCP" | "WebSocket";
}

export type ConnectionEdge = Edge<ConnectionEdgeData>;

export interface FlowData {
  nodes: ServiceNode[];
  edges: ConnectionEdge[];
}

export interface FlowLayoutOptions {
  direction: "TB" | "LR" | "BT" | "RL";
  nodeSpacing: number;
  rankSpacing: number;
}
