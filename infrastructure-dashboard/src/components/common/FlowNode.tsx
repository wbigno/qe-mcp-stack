import React, { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import {
  Database,
  Cloud,
  Server,
  Lock,
  Mail,
  CreditCard,
  FileText,
  Cog,
  Zap,
  Clock,
  Globe,
} from "lucide-react";
import type { ServiceNodeData } from "../../types/flow";
import type { IntegrationType } from "../../types/infrastructure";

const NODE_COLORS: Record<
  IntegrationType | "application",
  { bg: string; border: string; text: string }
> = {
  application: {
    bg: "bg-blue-500/20",
    border: "border-blue-500",
    text: "text-blue-400",
  },
  payment: {
    bg: "bg-green-500/20",
    border: "border-green-500",
    text: "text-green-400",
  },
  api: {
    bg: "bg-purple-500/20",
    border: "border-purple-500",
    text: "text-purple-400",
  },
  external: {
    bg: "bg-orange-500/20",
    border: "border-orange-500",
    text: "text-orange-400",
  },
  auth: {
    bg: "bg-indigo-500/20",
    border: "border-indigo-500",
    text: "text-indigo-400",
  },
  email: {
    bg: "bg-teal-500/20",
    border: "border-teal-500",
    text: "text-teal-400",
  },
  reporting: {
    bg: "bg-pink-500/20",
    border: "border-pink-500",
    text: "text-pink-400",
  },
  service: {
    bg: "bg-green-500/20",
    border: "border-green-500",
    text: "text-green-400",
  },
  cache: {
    bg: "bg-red-500/20",
    border: "border-red-500",
    text: "text-red-400",
  },
  background: {
    bg: "bg-yellow-500/20",
    border: "border-yellow-500",
    text: "text-yellow-400",
  },
  database: {
    bg: "bg-gray-500/20",
    border: "border-gray-500",
    text: "text-gray-400",
  },
  cloud: {
    bg: "bg-blue-500/20",
    border: "border-blue-500",
    text: "text-blue-400",
  },
};

const getIcon = (type: IntegrationType | "application") => {
  const icons: Record<string, React.FC<{ className?: string }>> = {
    application: Server,
    payment: CreditCard,
    api: Server,
    external: Globe,
    auth: Lock,
    email: Mail,
    reporting: FileText,
    service: Cog,
    cache: Zap,
    background: Clock,
    database: Database,
    cloud: Cloud,
  };
  const Icon = icons[type] || Server;
  return <Icon className="w-5 h-5" />;
};

const ApplicationNodeComponent = ({
  data,
  selected,
}: NodeProps<ServiceNodeData>) => {
  const colors = NODE_COLORS.application;

  return (
    <div
      className={`px-6 py-4 rounded-xl border-2 ${colors.bg} ${colors.border} ${
        selected ? "ring-2 ring-blue-400 ring-offset-2 ring-offset-black" : ""
      } transition-all`}
    >
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-blue-500"
      />
      <div className="flex items-center gap-3">
        <div className={colors.text}>{getIcon("application")}</div>
        <div>
          <div className="font-bold text-sm">{data.label}</div>
          {data.description && (
            <div className="text-xs text-secondary">{data.description}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ApplicationNode = memo(ApplicationNodeComponent);

const IntegrationNodeComponent = ({
  data,
  selected,
}: NodeProps<ServiceNodeData>) => {
  const nodeType = data.type as IntegrationType;
  const colors = NODE_COLORS[nodeType] || NODE_COLORS.api;

  return (
    <div
      className={`px-4 py-3 rounded-lg border ${colors.bg} ${colors.border} ${
        selected ? "ring-2 ring-offset-2 ring-offset-black" : ""
      } transition-all cursor-pointer hover:scale-105`}
      style={{ minWidth: 140 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-500" />
      <div className="flex items-center gap-2">
        <div className={colors.text}>{getIcon(nodeType)}</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-xs truncate">{data.label}</div>
          <div className="text-xs text-tertiary capitalize">{data.type}</div>
        </div>
      </div>
      {data.status && (
        <div
          className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
            data.status === "active"
              ? "bg-green-500"
              : data.status === "error"
                ? "bg-red-500"
                : "bg-gray-500"
          }`}
        />
      )}
    </div>
  );
};

export const IntegrationNode = memo(IntegrationNodeComponent);

export const nodeTypes = {
  application: ApplicationNode,
  integration: IntegrationNode,
};

export default nodeTypes;
