import React, { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import type {
  InfrastructureData,
  ViewMode,
  Environment,
} from "./types/infrastructure";
import { InfrastructureAPI } from "./services/api";

// Layout Components
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";

// View Components
import VisualView from "./components/views/VisualView";
import DetailsView from "./components/views/DetailsView";
import IntegrationView from "./components/views/IntegrationView";

// Panel Components
import EventFlowPanel from "./components/panels/EventFlowPanel";
import SwaggerPanel from "./components/panels/SwaggerPanel";
import DatabasePanel from "./components/panels/DatabasePanel";
import HangfirePanel from "./components/panels/HangfirePanel";

import "./App.css";

// Valid environments list
const VALID_ENVIRONMENTS = [
  "local",
  "dev",
  "qa",
  "qa2",
  "staging",
  "preprod",
  "prod",
];

// Load environment from localStorage or default to 'local'
const getInitialEnvironment = (): Environment => {
  const saved = localStorage.getItem("carepayment_environment");
  if (saved && VALID_ENVIRONMENTS.includes(saved)) {
    return saved as Environment;
  }
  return "local";
};

const App: React.FC = () => {
  const [data, setData] = useState<InfrastructureData | null>(null);
  const [selectedApp, setSelectedApp] = useState<string>("servicelayer");
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<ViewMode>("visual");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [environment, setEnvironment] = useState<Environment>(
    getInitialEnvironment,
  );

  // Save environment to localStorage when it changes
  const handleEnvironmentChange = (env: Environment) => {
    setEnvironment(env);
    localStorage.setItem("carepayment_environment", env);
  };

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
      const infrastructureData =
        await InfrastructureAPI.getInfrastructureData();
      setData(infrastructureData);
      setLastUpdated(new Date().toLocaleString());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const checkForChanges = async () => {
    try {
      const changes = await InfrastructureAPI.checkChanges();
      if (changes.length > 0) {
        // Silently refresh data if changes detected
        const infrastructureData =
          await InfrastructureAPI.getInfrastructureData();
        setData(infrastructureData);
        setLastUpdated(new Date().toLocaleString());
      }
    } catch (err) {
      console.error("Failed to check for changes:", err);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await InfrastructureAPI.triggerScan();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSelectApp = (appKey: string) => {
    setSelectedApp(appKey);
    setSelectedIntegration(null);
    setViewMode("visual");
  };

  const handleSelectIntegration = (key: string) => {
    setSelectedIntegration(key);
    setViewMode("visual"); // Show integration detail in visual mode
  };

  const handleBackFromIntegration = () => {
    setSelectedIntegration(null);
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
          <p className="text-error mb-4">{error || "No data available"}</p>
          <button className="btn btn-primary" onClick={loadData}>
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const app = data.applications[selectedApp];
  const integration = selectedIntegration
    ? app?.integrations[selectedIntegration]
    : null;

  if (!app) {
    return <div>Application not found</div>;
  }

  // Render the appropriate content based on view mode and selected integration
  const renderContent = () => {
    // If an integration is selected, show integration detail
    if (selectedIntegration && integration) {
      // Get the base URL for the current environment
      const currentBaseUrl = app.baseUrls?.[environment] || app.baseUrl;

      return (
        <IntegrationView
          integration={integration}
          appKey={selectedApp}
          integrationKey={selectedIntegration}
          environment={environment}
          baseUrl={currentBaseUrl}
          onBack={handleBackFromIntegration}
        />
      );
    }

    // Otherwise render based on view mode
    switch (viewMode) {
      case "visual":
        return (
          <VisualView app={app} onSelectIntegration={handleSelectIntegration} />
        );

      case "details":
        return (
          <DetailsView
            app={app}
            onSelectIntegration={handleSelectIntegration}
          />
        );

      case "flow":
        return (
          <EventFlowPanel
            app={app}
            onSelectIntegration={handleSelectIntegration}
          />
        );

      case "swagger":
        return (
          <SwaggerPanel
            apps={data.applications}
            selectedAppKey={selectedApp}
            environment={environment}
          />
        );

      case "database":
        return <DatabasePanel app={app} allApps={data} />;

      case "hangfire":
        return (
          <HangfirePanel app={app} allApps={data} environment={environment} />
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full h-screen flex">
      {/* Sidebar */}
      <Sidebar
        data={data}
        selectedApp={selectedApp}
        lastUpdated={lastUpdated}
        onSelectApp={handleSelectApp}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header
          app={app}
          viewMode={viewMode}
          isRefreshing={isRefreshing}
          environment={environment}
          isViewingIntegration={selectedIntegration !== null}
          onViewModeChange={setViewMode}
          onRefresh={handleRefresh}
          onEnvironmentChange={handleEnvironmentChange}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-auto">{renderContent()}</div>
      </div>
    </div>
  );
};

export default App;
