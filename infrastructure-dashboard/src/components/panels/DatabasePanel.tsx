import React, { useState, useMemo } from "react";
import { Database, Server, Table, Link2, ArrowRight } from "lucide-react";
import type {
  Application,
  InfrastructureData,
} from "../../types/infrastructure";

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

export const DatabasePanel: React.FC<DatabasePanelProps> = ({
  app,
  allApps,
}) => {
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
    databases[0]?.name || "",
  );

  const selectedDatabase = databases.find((db) => db.name === selectedDb);

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
    <div className="p-6">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Database className="w-5 h-5" /> Database Schema
      </h2>

      {/* Database Selector */}
      <div className="flex gap-2 mb-6">
        {databases.map((db) => (
          <button
            key={db.name}
            onClick={() => setSelectedDb(db.name)}
            className={`btn ${selectedDb === db.name ? "btn-primary" : "btn-ghost"}`}
          >
            <Database className="w-4 h-4" />
            {db.name}
          </button>
        ))}
      </div>

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
                  <div key={tableName} className="bg-tertiary rounded-lg p-3">
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
            <p className="text-secondary text-sm">
              No table information available.
            </p>
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

      {/* Connection Diagram */}
      <div className="card mt-6">
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
        <div className="card mt-6">
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
  );
};

export default DatabasePanel;
