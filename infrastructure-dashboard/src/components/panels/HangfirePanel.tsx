import React from "react";
import { ExternalLink, Server, Activity, RefreshCw } from "lucide-react";
import type {
  Application,
  InfrastructureData,
  Environment,
} from "../../types/infrastructure";

interface HangfirePanelProps {
  app: Application;
  allApps: InfrastructureData;
  environment: Environment;
}

const environmentLabels: Record<Environment, string> = {
  local: "Local",
  dev: "DEV",
  qa: "QA",
  qa2: "QA2",
  staging: "Staging",
  preprod: "PreProd",
  prod: "Prod",
};

export const HangfirePanel: React.FC<HangfirePanelProps> = ({
  app,
  allApps,
  environment,
}) => {
  // Get all applications that have hangfire configured
  const hangfireApps = Object.entries(allApps.applications).filter(
    ([_, appData]) => appData.hangfire?.enabled,
  );

  // Get hangfire URL for the selected app and environment
  const getHangfireUrl = (
    appData: Application,
    env: Environment,
  ): string | null => {
    return appData.hangfire?.urls?.[env] || null;
  };

  // Get jobs from integrations
  const hangfireIntegration = app.integrations?.hangfire;
  const jobs = hangfireIntegration?.jobs || [];

  return (
    <div className="p-6">
      {/* Background Jobs */}
      {jobs.length > 0 && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" /> Background Jobs
          </h3>
          <div className="space-y-3">
            {jobs.map((job, idx) => (
              <div
                key={idx}
                className="p-4 bg-tertiary rounded-lg border border-primary"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{job.name}</span>
                  <span className="badge badge-accent">{job.schedule}</span>
                </div>
                <p className="text-sm text-secondary">{job.description}</p>
                {job.code && (
                  <pre className="mt-2 text-xs bg-secondary p-2 rounded overflow-x-auto">
                    {job.code}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Applications with Hangfire */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Server className="w-5 h-5" /> All Hangfire Dashboards
        </h3>

        {hangfireApps.length > 0 ? (
          <div className="space-y-4">
            {hangfireApps.map(([appKey, appData]) => {
              const hangfireUrl = getHangfireUrl(appData, environment);
              const isCurrentApp =
                appKey ===
                Object.keys(allApps.applications).find(
                  (k) => allApps.applications[k] === app,
                );

              return (
                <div
                  key={appKey}
                  className={`p-4 rounded-lg border ${
                    isCurrentApp
                      ? "border-accent bg-tertiary"
                      : "border-primary"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${appData.color}`}
                      />
                      <span className="font-medium">{appData.name}</span>
                      <span className="badge text-xs">{appData.tech}</span>
                    </div>
                    {hangfireUrl ? (
                      <a
                        href={hangfireUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-ghost flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open ({environmentLabels[environment]})
                      </a>
                    ) : (
                      <span className="text-xs text-tertiary">
                        Not available in {environmentLabels[environment]}
                      </span>
                    )}
                  </div>

                  {/* Show all environment URLs for this app */}
                  {appData.hangfire?.urls && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Object.entries(appData.hangfire.urls).map(
                        ([env, url]) => {
                          if (!url) return null;
                          const envKey = env as Environment;
                          return (
                            <a
                              key={env}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                                env === environment
                                  ? "bg-accent text-white"
                                  : "bg-tertiary hover:bg-secondary text-secondary hover:text-primary"
                              }`}
                              title={url}
                            >
                              {environmentLabels[envKey] || env.toUpperCase()}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          );
                        },
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-3 text-secondary">
            <RefreshCw className="w-5 h-5" />
            <span>No applications have Hangfire configured</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default HangfirePanel;
