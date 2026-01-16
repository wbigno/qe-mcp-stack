import type { IntegrationType } from "../types/infrastructure";

/**
 * Get CSS class for integration type color
 */
export function getIntegrationColorClass(type: IntegrationType): string {
  const colors: Record<IntegrationType, string> = {
    payment: "text-green-500",
    api: "text-purple-500",
    external: "text-orange-500",
    auth: "text-indigo-500",
    email: "text-teal-500",
    reporting: "text-pink-500",
    service: "text-green-500",
    cache: "text-red-500",
    background: "text-yellow-500",
    database: "text-gray-400",
    cloud: "text-blue-500",
  };
  return colors[type] || "text-gray-400";
}

/**
 * Get background class for integration type
 */
export function getIntegrationBgClass(type: IntegrationType): string {
  const colors: Record<IntegrationType, string> = {
    payment: "bg-green-500/10 border-green-500/30",
    api: "bg-purple-500/10 border-purple-500/30",
    external: "bg-orange-500/10 border-orange-500/30",
    auth: "bg-indigo-500/10 border-indigo-500/30",
    email: "bg-teal-500/10 border-teal-500/30",
    reporting: "bg-pink-500/10 border-pink-500/30",
    service: "bg-green-500/10 border-green-500/30",
    cache: "bg-red-500/10 border-red-500/30",
    background: "bg-yellow-500/10 border-yellow-500/30",
    database: "bg-gray-500/10 border-gray-500/30",
    cloud: "bg-blue-500/10 border-blue-500/30",
  };
  return colors[type] || "bg-gray-500/10 border-gray-500/30";
}
