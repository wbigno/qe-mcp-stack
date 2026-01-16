import React, { useState } from "react";
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
  ExternalLink,
  Code,
  Key,
  X,
} from "lucide-react";
import type {
  Integration,
  IntegrationType,
  Environment,
} from "../../types/infrastructure";
import { getIntegrationColorClass } from "../../utils/integrationHelpers";
import AuthTestSection from "../panels/AuthTestSection";
import EndpointTester from "../panels/EndpointTester";

interface IntegrationViewProps {
  integration: Integration;
  appKey: string;
  integrationKey: string;
  environment: Environment;
  baseUrl: string;
  onBack: () => void;
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
  return <Icon className="w-5 h-5" />;
};

export const IntegrationView: React.FC<IntegrationViewProps> = ({
  integration,
  appKey,
  integrationKey,
  environment,
  baseUrl,
  onBack,
}) => {
  const [obtainedToken, setObtainedToken] = useState<string | null>(null);
  // Token expiry stored for future use (e.g., auto-refresh, display)
  const [_tokenExpiresAt, setTokenExpiresAt] = useState<string | undefined>();

  const handleTokenObtained = (token: string, expiresAt?: string) => {
    setObtainedToken(token);
    setTokenExpiresAt(expiresAt);
  };

  // Get the effective base URL for API calls
  const effectiveBaseUrl = integration.baseUrl || baseUrl;

  return (
    <div className="p-6">
      <button onClick={onBack} className="mb-4 btn btn-ghost">
        ← Back to architecture
      </button>

      <div className="card">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={getIntegrationColorClass(integration.type)}>
              {getIcon(integration.type)}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{integration.name}</h2>
              <p className="text-secondary">{integration.purpose}</p>
            </div>
          </div>
          <button onClick={onBack} className="btn btn-ghost">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Connection Details */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {integration.baseUrl && (
            <div className="bg-tertiary rounded-lg p-4">
              <div className="text-sm font-semibold text-secondary mb-2 flex items-center gap-2">
                <ExternalLink className="w-4 h-4" /> Base URL
              </div>
              <code className="text-xs bg-primary px-2 py-1 rounded block break-all">
                {integration.baseUrl}
              </code>
            </div>
          )}
          {integration.authentication && (
            <div className="bg-tertiary rounded-lg p-4">
              <div className="text-sm font-semibold text-secondary mb-2 flex items-center gap-2">
                <Lock className="w-4 h-4" /> Authentication
              </div>
              <div className="text-xs">
                <div>
                  <strong>Method:</strong> {integration.authentication.method}
                </div>
                <div className="text-tertiary mt-1">
                  {integration.authentication.config}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Auth Testing Section */}
        <AuthTestSection
          integration={integration}
          appKey={appKey}
          integrationKey={integrationKey}
          environment={environment}
          baseUrl={effectiveBaseUrl}
          onTokenObtained={handleTokenObtained}
        />

        {/* Features */}
        {integration.features && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Capabilities</h3>
            <div className="flex flex-wrap gap-2">
              {integration.features.map((f, i) => (
                <span key={i} className="badge badge-primary">
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Interactive Endpoint Tester */}
        {integration.endpoints && integration.endpoints.length > 0 && (
          <EndpointTester
            integration={integration}
            environment={environment}
            baseUrl={effectiveBaseUrl}
            token={obtainedToken}
            authMethod={integration.authentication?.method || "API Key"}
          />
        )}

        {/* Code Implementation */}
        {integration.codeImplementation && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Code className="w-5 h-5" /> Code Example
            </h3>
            <pre className="code-block overflow-x-auto">
              {integration.codeImplementation.trim()}
            </pre>
          </div>
        )}

        {/* Configuration */}
        {integration.configuration && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Key className="w-5 h-5" /> Configuration
            </h3>
            <div className="space-y-2">
              {Object.entries(integration.configuration).map(([key, value]) => (
                <div key={key} className="bg-tertiary rounded-lg p-3">
                  <code className="text-sm font-semibold text-primary">
                    {key}
                  </code>
                  <div className="text-xs text-tertiary mt-1">{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Request Structure */}
        {integration.requestStructure && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5" /> Request Structure
            </h3>
            <pre className="code-block overflow-x-auto">
              {JSON.stringify(integration.requestStructure, null, 2)}
            </pre>
          </div>
        )}

        {/* Response Structure */}
        {integration.responseStructure && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5" /> Response Structure
            </h3>
            <pre className="code-block overflow-x-auto">
              {JSON.stringify(integration.responseStructure, null, 2)}
            </pre>
          </div>
        )}

        {/* Error Handling */}
        {integration.errorHandling && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Bell className="w-5 h-5" /> Error Handling
            </h3>
            <div className="bg-tertiary rounded-lg p-4">
              <p className="text-sm">{integration.errorHandling}</p>
            </div>
          </div>
        )}

        {/* Failover Strategy */}
        {integration.failover && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Activity className="w-5 h-5" /> Failover Strategy
            </h3>
            <div className="bg-tertiary rounded-lg p-4">
              <p className="text-sm">{integration.failover}</p>
            </div>
          </div>
        )}

        {/* Data Flow */}
        {integration.dataFlow && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Activity className="w-5 h-5" /> Data Flow
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {integration.dataFlow.inbound && (
                <div className="bg-tertiary rounded-lg p-4">
                  <div className="text-sm font-semibold mb-2 text-green-400">
                    Inbound
                  </div>
                  <ul className="text-xs space-y-1">
                    {integration.dataFlow.inbound.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {integration.dataFlow.outbound && (
                <div className="bg-tertiary rounded-lg p-4">
                  <div className="text-sm font-semibold mb-2 text-blue-400">
                    Outbound
                  </div>
                  <ul className="text-xs space-y-1">
                    {integration.dataFlow.outbound.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Cache Strategy */}
        {integration.cacheStrategy && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Zap className="w-5 h-5" /> Cache Strategy
            </h3>
            <div className="space-y-3">
              {Object.entries(integration.cacheStrategy).map(
                ([key, strategy]) => (
                  <div key={key} className="bg-tertiary rounded-lg p-4">
                    <div className="font-semibold text-sm mb-2 capitalize">
                      {key}
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <div className="text-tertiary">TTL</div>
                        <div>{strategy.ttl}</div>
                      </div>
                      <div>
                        <div className="text-tertiary">Keys</div>
                        <div>
                          <code className="text-xs">{strategy.keys}</code>
                        </div>
                      </div>
                      <div>
                        <div className="text-tertiary">Usage</div>
                        <div>{strategy.usage}</div>
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        {/* Background Jobs */}
        {integration.jobs && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Activity className="w-5 h-5" /> Background Jobs
            </h3>
            <div className="space-y-3">
              {integration.jobs.map((job, i) => (
                <div key={i} className="bg-tertiary rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm">{job.name}</div>
                    <span className="badge badge-primary text-xs">
                      {job.schedule}
                    </span>
                  </div>
                  <p className="text-xs text-tertiary mb-2">
                    {job.description}
                  </p>
                  {job.code && (
                    <code className="text-xs bg-primary px-2 py-1 rounded block">
                      {job.code}
                    </code>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Azure/Cloud Services */}
        {integration.services && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Cloud className="w-5 h-5" /> Cloud Services
            </h3>
            <div className="space-y-3">
              {Object.entries(integration.services).map(([key, service]) => (
                <div key={key} className="bg-tertiary rounded-lg p-4">
                  <div className="font-semibold text-sm mb-1">
                    {service.name}
                  </div>
                  <p className="text-xs text-tertiary mb-2">
                    {service.purpose}
                  </p>
                  {service.config && (
                    <div className="text-xs">
                      <strong>Config:</strong> {service.config}
                    </div>
                  )}
                  {service.uri && (
                    <div className="text-xs">
                      <strong>URI:</strong> <code>{service.uri}</code>
                    </div>
                  )}
                  {service.tracks && (
                    <div className="text-xs mt-2">
                      <strong>Tracks:</strong> {service.tracks.join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Database Tables */}
        {integration.tables && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Database className="w-5 h-5" /> Database Tables
            </h3>
            <div className="space-y-2">
              {Object.entries(integration.tables).map(([table, desc]) => (
                <div key={table} className="bg-tertiary rounded-lg p-3">
                  <code className="text-sm font-semibold text-primary">
                    {table}
                  </code>
                  <div className="text-xs text-tertiary mt-1">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Databases */}
        {integration.databases && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Database className="w-5 h-5" /> Databases
            </h3>
            <div className="flex flex-wrap gap-2">
              {integration.databases.map((db, i) => (
                <span key={i} className="badge badge-primary">
                  {db}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntegrationView;
