import React from "react";
import {
  Database,
  Cloud,
  Server,
  Lock,
  Mail,
  CreditCard,
  FileText,
  Bell,
  Activity,
  Zap,
  Settings,
  ChevronRight,
  Package,
} from "lucide-react";
import type { Application, IntegrationType } from "../../types/infrastructure";
import { getIntegrationColorClass } from "../../utils/integrationHelpers";

interface DetailsViewProps {
  app: Application;
  onSelectIntegration: (key: string) => void;
}

const getIcon = (type: IntegrationType) => {
  const icons: Record<IntegrationType, React.FC<{ className?: string }>> = {
    database: Database,
    cloud: Cloud,
    api: Server,
    auth: Lock,
    email: Mail,
    payment: CreditCard,
    reporting: FileText,
    service: Bell,
    cache: Zap,
    background: Activity,
    external: Server,
  };
  const Icon = icons[type] || Server;
  return <Icon className="w-4 h-4" />;
};

export const DetailsView: React.FC<DetailsViewProps> = ({
  app,
  onSelectIntegration,
}) => {
  return (
    <div className="p-6 space-y-6">
      {/* Configuration Card */}
      <div className="card">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" /> Application Configuration
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Framework:</strong> {app.framework}
          </div>
          <div>
            <strong>Deployment:</strong> {app.deployment}
          </div>
          {app.baseUrl && (
            <div>
              <strong>Base URL:</strong> {app.baseUrl}
            </div>
          )}
          {app.authentication && (
            <div>
              <strong>Auth:</strong> {app.authentication}
            </div>
          )}
        </div>
      </div>

      {/* Integrations List */}
      <div className="card">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Server className="w-5 h-5" /> All Integrations (
          {Object.keys(app.integrations || {}).length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(app.integrations || {}).map(([key, int]) => (
            <button
              key={key}
              onClick={() => onSelectIntegration(key)}
              className="flex items-center justify-between p-3 bg-tertiary rounded-lg hover:bg-elevated transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className={getIntegrationColorClass(int.type)}>
                  {getIcon(int.type)}
                </div>
                <div>
                  <div className="font-medium text-sm">{int.name}</div>
                  <div className="text-xs text-tertiary capitalize">
                    {int.type}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-tertiary" />
            </button>
          ))}
        </div>
      </div>

      {/* Dependencies */}
      {app.dependencies && (
        <div className="space-y-4">
          {Object.entries(app.dependencies).map(([category, deps]) => (
            <div key={category} className="card">
              <h3 className="font-semibold mb-4 capitalize flex items-center gap-2">
                <Package className="w-5 h-5" /> {category} Dependencies
              </h3>
              <div className="space-y-2">
                {deps.map((dep, i) => (
                  <div key={i} className="text-sm p-2 bg-tertiary rounded">
                    {dep}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DetailsView;
