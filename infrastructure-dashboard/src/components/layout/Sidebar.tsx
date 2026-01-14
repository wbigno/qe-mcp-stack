import React from "react";
import { Server, Cloud, CreditCard, Zap } from "lucide-react";
import type { InfrastructureData } from "../../types/infrastructure";

interface SidebarProps {
  data: InfrastructureData;
  selectedApp: string;
  lastUpdated: string;
  onSelectApp: (appKey: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  data,
  selectedApp,
  lastUpdated,
  onSelectApp,
}) => {
  return (
    <div className="sidebar w-64">
      <div className="p-4">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-1">Infrastructure</h2>
          <p className="text-xs text-secondary">
            {Object.keys(data.applications).length} Applications
          </p>
        </div>

        {/* Applications List */}
        <div className="space-y-2 mb-6">
          {Object.entries(data.applications).map(([key, value]) => (
            <button
              key={key}
              onClick={() => onSelectApp(key)}
              className={`w-full text-left p-3 rounded-lg transition-all ${
                selectedApp === key
                  ? "bg-tertiary border border-secondary shadow"
                  : "hover:bg-tertiary border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${value.color}`} />
                <div className="font-semibold text-sm">{value.name}</div>
              </div>
              <div className="text-xs text-secondary mt-1 flex items-center justify-between">
                <span>{value.tech}</span>
                {value.repository && (
                  <span className="text-tertiary">{value.repository}</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="pt-6 border-t border-primary">
          <h3 className="text-sm font-semibold mb-3">Legend</h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center text-secondary">
              <Server className="w-3 h-3 mr-2 text-purple-500" /> Internal API
            </div>
            <div className="flex items-center text-secondary">
              <Cloud className="w-3 h-3 mr-2 text-blue-500" /> Azure Services
            </div>
            <div className="flex items-center text-secondary">
              <CreditCard className="w-3 h-3 mr-2 text-green-500" /> Payment
              Provider
            </div>
            <div className="flex items-center text-secondary">
              <Server className="w-3 h-3 mr-2 text-orange-500" /> External
              Service
            </div>
            <div className="flex items-center text-secondary">
              <Zap className="w-3 h-3 mr-2 text-red-500" /> Cache
            </div>
          </div>
        </div>

        {/* Last Updated */}
        {lastUpdated && (
          <div className="mt-6 pt-6 border-t border-primary">
            <p className="text-xs text-tertiary">Last updated:</p>
            <p className="text-xs text-secondary">{lastUpdated}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
