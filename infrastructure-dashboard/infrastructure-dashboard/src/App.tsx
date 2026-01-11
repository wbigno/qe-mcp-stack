import React, { useState, useEffect } from 'react';
import {
  Database, Cloud, Server, Lock, Mail, CreditCard, FileText, Bell, Activity,
  Zap, ChevronRight, Code, Settings, Package, ExternalLink, Key, X, Layers,
  RefreshCw
} from 'lucide-react';
import type { Application, Integration, InfrastructureData, ViewMode, IntegrationType } from './types/infrastructure';
import { InfrastructureAPI } from './services/api';
import './App.css';

const App: React.FC = () => {
  const [data, setData] = useState<InfrastructureData | null>(null);
  const [selectedApp, setSelectedApp] = useState<string>('servicelayer');
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('visual');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load infrastructure data on mount
  useEffect(() => {
    loadData();

    // Auto-refresh every 30 seconds to check for changes
    const interval = setInterval(() => {
      checkForChanges();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const infrastructureData = await InfrastructureAPI.getInfrastructureData();
      setData(infrastructureData);
      setLastUpdated(new Date().toLocaleString());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const checkForChanges = async () => {
    try {
      const changes = await InfrastructureAPI.checkChanges();
      if (changes.length > 0) {
        // Silently refresh data if changes detected
        const infrastructureData = await InfrastructureAPI.getInfrastructureData();
        setData(infrastructureData);
        setLastUpdated(new Date().toLocaleString());
      }
    } catch (err) {
      console.error('Failed to check for changes:', err);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await InfrastructureAPI.triggerScan();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getIcon = (type: IntegrationType) => {
    const icons = {
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

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-secondary">Loading infrastructure data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="card max-w-md text-center">
          <p className="text-error mb-4">{error || 'No data available'}</p>
          <button className="btn btn-primary" onClick={loadData}>
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const app = data.applications[selectedApp];
  const integration = selectedIntegration ? app?.integrations[selectedIntegration] : null;

  if (!app) {
    return <div>Application not found</div>;
  }

  return (
    <div className="w-full h-screen flex">
      {/* Sidebar */}
      <div className="sidebar w-64">
        <div className="p-4">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-1">Infrastructure</h2>
            <p className="text-xs text-secondary">8 Applications, 5 Repositories</p>
          </div>

          {/* Applications List */}
          <div className="space-y-2 mb-6">
            {Object.entries(data.applications).map(([key, value]) => (
              <button
                key={key}
                onClick={() => {
                  setSelectedApp(key);
                  setSelectedIntegration(null);
                  setViewMode('visual');
                }}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  selectedApp === key
                    ? 'bg-tertiary border border-secondary shadow'
                    : 'hover:bg-tertiary border border-transparent'
                }`}
              >
                <div className="font-semibold text-sm">{value.name}</div>
                <div className="text-xs text-secondary mt-1">{value.tech}</div>
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
                <CreditCard className="w-3 h-3 mr-2 text-green-500" /> Payment Provider
              </div>
              <div className="flex items-center text-secondary">
                <Server className="w-3 h-3 mr-2 text-orange-500" /> External Service
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="header flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="badge badge-primary px-4 py-2 font-bold">
              {app.name}
            </div>
            <span className="badge">
              {app.tech}
            </span>
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="btn btn-ghost"
              title="Scan repositories for changes"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setViewMode('visual')}
              className={`btn ${viewMode === 'visual' ? 'btn-primary' : 'btn-ghost'}`}
            >
              <Layers className="w-4 h-4" /> Visual
            </button>
            <button
              onClick={() => setViewMode('details')}
              className={`btn ${viewMode === 'details' ? 'btn-primary' : 'btn-ghost'}`}
            >
              <Settings className="w-4 h-4" /> Details
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {viewMode === 'visual' && !selectedIntegration && (
            <VisualView
              app={app}
              onSelectIntegration={setSelectedIntegration}
              getIcon={getIcon}
            />
          )}

          {viewMode === 'visual' && selectedIntegration && integration && (
            <IntegrationView
              integration={integration}
              onBack={() => setSelectedIntegration(null)}
              getIcon={getIcon}
            />
          )}

          {viewMode === 'details' && (
            <DetailsView
              app={app}
              onSelectIntegration={(key) => {
                setViewMode('visual');
                setSelectedIntegration(key);
              }}
              getIcon={getIcon}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Visual View Component
const VisualView: React.FC<{
  app: Application;
  onSelectIntegration: (key: string) => void;
  getIcon: (type: IntegrationType) => JSX.Element;
}> = ({ app, onSelectIntegration, getIcon }) => {
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
            {Object.values(app.integrations || {}).filter(i => i.type === 'api').length}
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
                <div className="text-xs font-medium text-center">{int.name}</div>
                <div className="text-xs text-tertiary capitalize">{int.type}</div>
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
            <div key={idx} className="p-3 bg-tertiary rounded-lg border border-primary">
              <div className="font-medium text-sm">{feature}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Integration Detail View Component
const IntegrationView: React.FC<{
  integration: Integration;
  onBack: () => void;
  getIcon: (type: IntegrationType) => JSX.Element;
}> = ({ integration, onBack, getIcon }) => {
  return (
    <div className="p-6">
      <button
        onClick={onBack}
        className="mb-4 btn btn-ghost"
      >
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
          <button
            onClick={onBack}
            className="btn btn-ghost"
          >
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
                <div><strong>Method:</strong> {integration.authentication.method}</div>
                <div className="text-tertiary mt-1">{integration.authentication.config}</div>
              </div>
            </div>
          )}
        </div>

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

        {/* Endpoints */}
        {integration.endpoints && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3">API Endpoints</h3>
            <div className="space-y-2">
              {integration.endpoints.map((ep, i) => (
                <div key={i} className="bg-tertiary rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      ep.method === 'GET' ? 'bg-green-500/20 text-green-400' :
                      ep.method === 'POST' ? 'bg-blue-500/20 text-blue-400' :
                      ep.method === 'PUT' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {ep.method}
                    </span>
                    <code className="text-sm">{ep.path}</code>
                  </div>
                  <div className="text-xs text-tertiary ml-14">{ep.purpose}</div>
                </div>
              ))}
            </div>
          </div>
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
                  <code className="text-sm font-semibold text-primary">{key}</code>
                  <div className="text-xs text-tertiary mt-1">{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Details View Component
const DetailsView: React.FC<{
  app: Application;
  onSelectIntegration: (key: string) => void;
  getIcon: (type: IntegrationType) => JSX.Element;
}> = ({ app, onSelectIntegration, getIcon }) => {
  return (
    <div className="p-6 space-y-6">
      {/* Configuration Card */}
      <div className="card">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" /> Application Configuration
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><strong>Framework:</strong> {app.framework}</div>
          <div><strong>Deployment:</strong> {app.deployment}</div>
          {app.baseUrl && <div><strong>Base URL:</strong> {app.baseUrl}</div>}
          {app.authentication && <div><strong>Auth:</strong> {app.authentication}</div>}
        </div>
      </div>

      {/* Integrations List */}
      <div className="card">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Server className="w-5 h-5" /> All Integrations ({Object.keys(app.integrations || {}).length})
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
                  <div className="text-xs text-tertiary capitalize">{int.type}</div>
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

// Helper function for integration color classes
function getIntegrationColorClass(type: IntegrationType): string {
  const colors = {
    payment: 'text-green-500',
    api: 'text-purple-500',
    external: 'text-orange-500',
    auth: 'text-indigo-500',
    email: 'text-teal-500',
    reporting: 'text-pink-500',
    service: 'text-green-500',
    cache: 'text-red-500',
    background: 'text-yellow-500',
    database: 'text-gray-400',
    cloud: 'text-blue-500',
  };
  return colors[type] || 'text-gray-400';
}

export default App;
