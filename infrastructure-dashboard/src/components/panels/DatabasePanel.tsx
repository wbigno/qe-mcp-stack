import React, { useState, useMemo } from "react";
import {
  Database,
  Server,
  Table,
  Link2,
  ArrowRight,
  Search,
  Sparkles,
  LayoutDashboard,
  GitBranch,
  X,
  Key,
} from "lucide-react";
import type {
  Application,
  InfrastructureData,
} from "../../types/infrastructure";
import type { SchemaTable } from "../../types/schema";
import { useSchemaData } from "../../hooks/useSchemaData";
import { SchemaExplorer } from "../database/SchemaExplorer";
import { QueryAssistant } from "../database/QueryAssistant";
import { SchemaFlowDiagram } from "../database/SchemaFlowDiagram";

interface DatabasePanelProps {
  app: Application;
  allApps: InfrastructureData;
}

interface DatabaseEntry {
  name: string;
  tables: Record<string, string>;
  connectedApps: string[];
  connectionInfo?: string;
}

type SubTab = "overview" | "diagram" | "schema" | "query";

export const DatabasePanel: React.FC<DatabasePanelProps> = ({
  app,
  allApps,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("overview");
  const [environment, setEnvironment] = useState<"PROD" | "QA">("PROD");
  const [selectedTableDetail, setSelectedTableDetail] =
    useState<SchemaTable | null>(null);

  // Extract database information from the application's integrations
  const databases = useMemo(() => {
    const dbMap = new Map<string, DatabaseEntry>();

    // Get SQL Server integration from current app
    const sqlIntegration = app.integrations?.sqlserver;
    if (sqlIntegration) {
      const dbNames = sqlIntegration.databases || ["CarePayment"];
      dbNames.forEach((dbName) => {
        dbMap.set(dbName, {
          name: dbName,
          tables: sqlIntegration.tables || {},
          connectedApps: [app.name],
          connectionInfo: sqlIntegration.connectionStrings?.primary,
        });
      });
    }

    // Check which other apps connect to these databases
    Object.entries(allApps.applications).forEach(([_appKey, otherApp]) => {
      if (otherApp.name === app.name) return;

      const otherSql = otherApp.integrations?.sqlserver;
      if (otherSql?.databases) {
        otherSql.databases.forEach((dbName) => {
          const existing = dbMap.get(dbName);
          if (existing && !existing.connectedApps.includes(otherApp.name)) {
            existing.connectedApps.push(otherApp.name);
          }
        });
      }
    });

    return Array.from(dbMap.values());
  }, [app, allApps]);

  const [selectedDb, setSelectedDb] = useState<string>(
    databases[0]?.name || "CarePayment",
  );

  // Handler for changing database - resets to overview if no schema data
  const handleSelectDb = (dbName: string) => {
    setSelectedDb(dbName);
    // Reset to overview tab if selecting a database without schema
    if (dbName !== "CarePayment") {
      setActiveSubTab("overview");
    }
    setSelectedTableDetail(null);
  };

  const selectedDatabase = databases.find((db) => db.name === selectedDb);

  // Load schema data for the selected database
  const {
    schema,
    stats,
    loading: schemaLoading,
    error: schemaError,
    searchTables,
    searchColumns,
  } = useSchemaData(selectedDb, environment);

  // Get all apps that use databases for the connection diagram
  const appsWithDatabases = useMemo(() => {
    const apps: { name: string; databases: string[] }[] = [];
    Object.values(allApps.applications).forEach((application) => {
      const sqlInt = application.integrations?.sqlserver;
      if (sqlInt?.databases) {
        apps.push({
          name: application.name,
          databases: sqlInt.databases,
        });
      }
    });
    return apps;
  }, [allApps]);

  // Check if selected database has schema data
  const hasSchemaData = selectedDb === "CarePayment";

  // Only show relevant tabs based on schema availability
  const subTabs = useMemo(() => {
    const baseTabs = [
      { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
    ];

    if (hasSchemaData) {
      return [
        ...baseTabs,
        { id: "diagram" as const, label: "Schema Diagram", icon: GitBranch },
        { id: "schema" as const, label: "Schema Explorer", icon: Search },
        { id: "query" as const, label: "Query Assistant", icon: Sparkles },
      ];
    }

    return baseTabs;
  }, [hasSchemaData]);

  if (databases.length === 0) {
    return (
      <div className="p-6">
        <div className="card text-center py-12">
          <Database className="w-12 h-12 mx-auto text-tertiary mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            No Database Information
          </h3>
          <p className="text-secondary text-sm">
            This application doesn't have database integration data configured.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Database className="w-5 h-5" /> Database Schema
      </h2>

      {/* Database & Environment Selector */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex gap-2">
          {databases.map((db) => {
            const dbHasSchema = db.name === "CarePayment";
            const isSelected = selectedDb === db.name;
            return (
              <button
                key={db.name}
                onClick={() => handleSelectDb(db.name)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors"
                style={{
                  backgroundColor: isSelected ? "#1a1a1a" : "#ffffff",
                  border: `1px solid ${isSelected ? "#1a1a1a" : "#e5e7eb"}`,
                  color: isSelected ? "#ffffff" : "#1a1a1a",
                  opacity: dbHasSchema ? 1 : 0.7,
                }}
                title={
                  dbHasSchema
                    ? `${db.name} - Full schema available`
                    : `${db.name} - Schema not yet extracted`
                }
              >
                <Database className="w-4 h-4" />
                {db.name}
                {dbHasSchema && (
                  <span className="ml-1 text-xs text-green-400">*</span>
                )}
              </button>
            );
          })}
        </div>
        <span className="text-xs text-secondary">* Full schema available</span>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-secondary">Environment:</span>
          <div className="flex bg-tertiary rounded-lg overflow-hidden">
            <button
              onClick={() => setEnvironment("PROD")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                environment === "PROD"
                  ? "bg-blue-500 text-white"
                  : "text-secondary hover:text-primary"
              }`}
            >
              PROD
            </button>
            <button
              onClick={() => setEnvironment("QA")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                environment === "QA"
                  ? "bg-green-500 text-white"
                  : "text-secondary hover:text-primary"
              }`}
            >
              QA
            </button>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex gap-2 mb-6">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveSubTab(tab.id);
              setSelectedTableDetail(null);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{
              backgroundColor: activeSubTab === tab.id ? "#1a1a1a" : "#ffffff",
              border: `1px solid ${activeSubTab === tab.id ? "#1a1a1a" : "#e5e7eb"}`,
              color: activeSubTab === tab.id ? "#ffffff" : "#1a1a1a",
            }}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-tab Content */}
      <div className="flex-1 overflow-auto">
        {activeSubTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tables Section */}
              <div className="card">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Table className="w-5 h-5" /> Tables
                </h3>
                {selectedDatabase &&
                Object.keys(selectedDatabase.tables).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(selectedDatabase.tables).map(
                      ([tableName, description]) => (
                        <div
                          key={tableName}
                          className="bg-tertiary rounded-lg p-3"
                        >
                          <div className="flex items-center gap-2">
                            <Table className="w-4 h-4 text-blue-400" />
                            <code className="text-sm font-semibold text-primary">
                              {tableName}
                            </code>
                          </div>
                          <p className="text-xs text-tertiary mt-1 ml-6">
                            {description}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-secondary text-sm mb-3">
                      No table information in app config.
                    </p>
                    <button
                      onClick={() => setActiveSubTab("schema")}
                      className="btn btn-primary text-sm"
                    >
                      <Search className="w-4 h-4" />
                      Explore Full Schema
                    </button>
                  </div>
                )}
              </div>

              {/* Connected Apps Section */}
              <div className="card">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Server className="w-5 h-5" /> Connected Applications
                </h3>
                {selectedDatabase && (
                  <div className="space-y-2">
                    {selectedDatabase.connectedApps.map((appName) => (
                      <div
                        key={appName}
                        className={`bg-tertiary rounded-lg p-3 flex items-center gap-2 ${
                          appName === app.name ? "border border-primary" : ""
                        }`}
                      >
                        <Server className="w-4 h-4 text-purple-400" />
                        <span className="text-sm">{appName}</span>
                        {appName === app.name && (
                          <span className="badge text-xs ml-auto">Current</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Schema Stats Summary */}
            {stats && (
              <div className="card">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5" /> Schema Summary ({environment}
                  )
                </h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-tertiary rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {stats.totalSchemas}
                    </div>
                    <div className="text-xs text-secondary">Schemas</div>
                  </div>
                  <div className="bg-tertiary rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {stats.totalTables.toLocaleString()}
                    </div>
                    <div className="text-xs text-secondary">Tables</div>
                  </div>
                  <div className="bg-tertiary rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-400">
                      {stats.totalColumns.toLocaleString()}
                    </div>
                    <div className="text-xs text-secondary">Columns</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {stats.schemas.slice(0, 8).map((s) => (
                    <div
                      key={s.name}
                      className="bg-tertiary rounded px-2 py-1 text-xs"
                    >
                      <span className="text-primary">{s.name}</span>
                      <span className="text-secondary ml-1">
                        ({s.tableCount})
                      </span>
                    </div>
                  ))}
                  {stats.schemas.length > 8 && (
                    <button
                      onClick={() => setActiveSubTab("schema")}
                      className="bg-tertiary rounded px-2 py-1 text-xs text-blue-400 hover:text-blue-300"
                    >
                      +{stats.schemas.length - 8} more...
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Connection Diagram */}
            <div className="card">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Link2 className="w-5 h-5" /> Application-Database Connections
              </h3>
              <div className="bg-tertiary rounded-lg p-6">
                <div className="flex justify-center items-start gap-8">
                  {/* Applications Column */}
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-secondary text-center mb-2">
                      Applications
                    </div>
                    {appsWithDatabases.map((appInfo) => (
                      <div
                        key={appInfo.name}
                        className={`px-4 py-2 rounded-lg text-sm ${
                          appInfo.name === app.name
                            ? "bg-purple-500/20 border border-purple-500/50 text-purple-300"
                            : "bg-primary border border-secondary"
                        }`}
                      >
                        {appInfo.name}
                      </div>
                    ))}
                  </div>

                  {/* Arrows */}
                  <div className="flex items-center h-full pt-8">
                    <ArrowRight className="w-8 h-8 text-tertiary" />
                  </div>

                  {/* Databases Column */}
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-secondary text-center mb-2">
                      Databases
                    </div>
                    {databases.map((db) => (
                      <div
                        key={db.name}
                        className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${
                          db.name === selectedDb
                            ? "bg-blue-500/20 border border-blue-500/50 text-blue-300"
                            : "bg-primary border border-secondary"
                        }`}
                      >
                        <Database className="w-4 h-4" />
                        {db.name}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Connection Lines Legend */}
                <div className="mt-6 pt-4 border-t border-primary">
                  <div className="flex justify-center gap-6 text-xs text-secondary">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-purple-500/50" />
                      Current Application
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-blue-500/50" />
                      Selected Database
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Connection String (masked) */}
            {selectedDatabase?.connectionInfo && (
              <div className="card">
                <h3 className="font-semibold mb-3">Connection Configuration</h3>
                <div className="bg-tertiary rounded-lg p-3">
                  <code className="text-xs text-tertiary break-all">
                    {selectedDatabase.connectionInfo
                      .replace(/Password=[^;]+/gi, "Password=***")
                      .replace(/User Id=[^;]+/gi, "User Id=***")}
                  </code>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === "diagram" && (
          <div className="flex gap-4 h-full">
            <div
              className={
                selectedTableDetail ? "flex-1 h-full" : "w-full h-full"
              }
            >
              <SchemaFlowDiagram
                tables={schema?.tables || []}
                stats={stats}
                appName={app.name}
                appTables={
                  selectedDatabase?.tables
                    ? Object.keys(selectedDatabase.tables)
                    : []
                }
                onSelectTable={(table) => setSelectedTableDetail(table)}
              />
            </div>
            {selectedTableDetail && (
              <div className="w-80 bg-secondary rounded-lg border border-primary overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-3 border-b border-primary bg-tertiary">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Table className="w-4 h-4 text-blue-400" />
                    Table Details
                  </h4>
                  <button
                    onClick={() => setSelectedTableDetail(null)}
                    className="p-1 hover:bg-primary rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-3">
                  <div className="mb-3">
                    <div className="text-xs text-secondary">Schema</div>
                    <div className="font-medium">
                      {selectedTableDetail.schema}
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="text-xs text-secondary">Table Name</div>
                    <div className="font-medium text-blue-400">
                      {selectedTableDetail.name}
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="text-xs text-secondary">
                      Columns ({selectedTableDetail.columns?.length || 0})
                    </div>
                  </div>
                  <div className="space-y-1">
                    {selectedTableDetail.columns?.map((col) => (
                      <div
                        key={col.name}
                        className="bg-tertiary rounded p-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          {(col.isIdentity || col.isPrimaryKey) && (
                            <Key className="w-3 h-3 text-yellow-500" />
                          )}
                          <span className="font-medium text-primary">
                            {col.name}
                          </span>
                        </div>
                        <div className="flex gap-2 mt-1 text-secondary">
                          <span className="text-green-400">{col.dataType}</span>
                          {col.maxLength > 0 && col.maxLength !== -1 && (
                            <span>({col.maxLength})</span>
                          )}
                          {!col.nullable && (
                            <span className="text-red-400">NOT NULL</span>
                          )}
                          {col.isForeignKey && (
                            <span className="text-blue-400">FK</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === "schema" && (
          <SchemaExplorer
            tables={schema?.tables || []}
            stats={stats}
            loading={schemaLoading}
            error={schemaError}
            searchTables={searchTables}
            searchColumns={searchColumns}
          />
        )}

        {activeSubTab === "query" && (
          <QueryAssistant database={selectedDb} environment={environment} />
        )}
      </div>
    </div>
  );
};

export default DatabasePanel;
