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
  ChevronRight,
} from "lucide-react";
import type { Application, IntegrationType } from "../../types/infrastructure";
import { getIntegrationColorClass } from "../../utils/integrationHelpers";

interface VisualViewProps {
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

export const VisualView: React.FC<VisualViewProps> = ({
  app,
  onSelectIntegration,
}) => {
  return (
    <div className="p-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card text-center">
          <div className="text-3xl font-bold">
            {Object.keys(app.integrations || {}).length}
          </div>
          <div className="text-sm text-secondary mt-1">Total Integrations</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold">{app.features?.length || 0}</div>
          <div className="text-sm text-secondary mt-1">Key Features</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold">
            {
              Object.values(app.integrations || {}).filter(
                (i) => i.type === "api",
              ).length
            }
          </div>
          <div className="text-sm text-secondary mt-1">Internal APIs</div>
        </div>
      </div>

      {/* Visual Architecture */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">Architecture Overview</h3>
        <div className="bg-tertiary rounded-lg p-8">
          {/* Central App */}
          <div className="flex justify-center mb-8">
            <div className="badge badge-primary px-8 py-4 text-lg font-bold shadow-lg">
              {app.name}
            </div>
          </div>

          {/* Integration Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(app.integrations || {}).map(([key, int]) => (
              <button
                key={key}
                onClick={() => onSelectIntegration(key)}
                className="flex flex-col items-center gap-2 p-4 card hover:scale-105 transition-transform cursor-pointer"
              >
                <div className={getIntegrationColorClass(int.type)}>
                  {getIcon(int.type)}
                </div>
                <div className="text-xs font-medium text-center">
                  {int.name}
                </div>
                <div className="text-xs text-tertiary capitalize">
                  {int.type}
                </div>
                <ChevronRight className="w-4 h-4 text-tertiary mt-1" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Features Card */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" /> Key Features
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {app.features?.map((feature, idx) => (
            <div
              key={idx}
              className="p-3 bg-tertiary rounded-lg border border-primary"
            >
              <div className="font-medium text-sm">{feature}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VisualView;
