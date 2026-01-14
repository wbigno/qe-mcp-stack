import React from "react";
import {
  Layers,
  Settings,
  RefreshCw,
  GitBranch,
  FileJson,
  Database,
  Clock,
  Sun,
  Moon,
} from "lucide-react";
import type {
  Application,
  ViewMode,
  Environment,
} from "../../types/infrastructure";
import EnvironmentSelector from "../common/EnvironmentSelector";

interface HeaderProps {
  app: Application;
  viewMode: ViewMode;
  isRefreshing: boolean;
  environment: Environment;
  isDarkMode: boolean;
  onViewModeChange: (mode: ViewMode) => void;
  onRefresh: () => void;
  onEnvironmentChange: (env: Environment) => void;
  onThemeToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  app,
  viewMode,
  isRefreshing,
  environment,
  isDarkMode,
  onViewModeChange,
  onRefresh,
  onEnvironmentChange,
  onThemeToggle,
}) => {
  // Get the base URL for the current environment
  const currentBaseUrl = app.baseUrls?.[environment] || app.baseUrl;

  return (
    <div className="header">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${app.color}`} />
          <div className="font-bold text-lg">{app.name}</div>
          <span className="badge">{app.tech}</span>
          {app.repository && (
            <span className="text-xs text-tertiary">({app.repository})</span>
          )}
        </div>
        <EnvironmentSelector
          selected={environment}
          onChange={onEnvironmentChange}
        />
      </div>

      <div className="flex items-center justify-between">
        {/* Base URL Display */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-secondary">Base URL:</span>
          <code className="text-xs bg-tertiary px-2 py-1 rounded">
            {currentBaseUrl}
          </code>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="btn btn-ghost btn-sm"
            title="Scan repositories for changes"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
          <button
            onClick={onThemeToggle}
            className="btn btn-ghost btn-sm"
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => onViewModeChange("visual")}
            className={`btn btn-sm ${viewMode === "visual" ? "btn-primary" : "btn-ghost"}`}
          >
            <Layers className="w-4 h-4" /> Visual
          </button>
          <button
            onClick={() => onViewModeChange("details")}
            className={`btn btn-sm ${viewMode === "details" ? "btn-primary" : "btn-ghost"}`}
          >
            <Settings className="w-4 h-4" /> Details
          </button>
          <button
            onClick={() => onViewModeChange("flow")}
            className={`btn btn-sm ${viewMode === "flow" ? "btn-primary" : "btn-ghost"}`}
          >
            <GitBranch className="w-4 h-4" /> Flow
          </button>
          <button
            onClick={() => onViewModeChange("swagger")}
            className={`btn btn-sm ${viewMode === "swagger" ? "btn-primary" : "btn-ghost"}`}
          >
            <FileJson className="w-4 h-4" /> API
          </button>
          <button
            onClick={() => onViewModeChange("database")}
            className={`btn btn-sm ${viewMode === "database" ? "btn-primary" : "btn-ghost"}`}
          >
            <Database className="w-4 h-4" /> Database
          </button>
          <button
            onClick={() => onViewModeChange("hangfire")}
            className={`btn btn-sm ${viewMode === "hangfire" ? "btn-primary" : "btn-ghost"}`}
          >
            <Clock className="w-4 h-4" /> Hangfire
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header;
