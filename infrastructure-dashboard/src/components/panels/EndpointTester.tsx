import React, { useState } from "react";
import {
  Play,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import type {
  Integration,
  Environment,
  EndpointExecuteResult,
} from "../../types/infrastructure";
import { MethodBadge } from "../common/MethodBadge";
import { InfrastructureAPI } from "../../services/api";

interface EndpointTesterProps {
  integration: Integration;
  environment: Environment;
  baseUrl: string;
  token: string | null;
  authMethod: string;
}

// Extended endpoint type to include optional fields from carePaymentApps.js
interface ExtendedEndpoint {
  method: string;
  path: string;
  purpose: string;
  pathParams?: string[];
  queryParams?: string[];
  requestBody?: Record<string, unknown>;
}

interface EndpointState {
  expanded: boolean;
  pathParams: Record<string, string>;
  queryParams: Record<string, string>;
  requestBody: string;
  result: EndpointExecuteResult | null;
  loading: boolean;
}

const ALLOWED_ENVIRONMENTS: Environment[] = [
  "local",
  "dev",
  "qa",
  "qa2",
  "staging",
];

export const EndpointTester: React.FC<EndpointTesterProps> = ({
  integration,
  environment,
  baseUrl,
  token,
  authMethod,
}) => {
  const [endpointStates, setEndpointStates] = useState<
    Record<number, EndpointState>
  >({});
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const isEnvironmentAllowed = ALLOWED_ENVIRONMENTS.includes(environment);

  // Extract path parameters from endpoint path (e.g., {agentId})
  const extractPathParams = (path: string): string[] => {
    const matches = path.match(/\{([^}]+)\}/g);
    return matches ? matches.map((m) => m.slice(1, -1)) : [];
  };

  // Get or initialize endpoint state
  const getEndpointState = (index: number): EndpointState => {
    if (!endpointStates[index]) {
      const endpoint = integration.endpoints?.[index] as
        | ExtendedEndpoint
        | undefined;
      const pathParams = extractPathParams(endpoint?.path || "");
      return {
        expanded: false,
        pathParams: pathParams.reduce((acc, p) => ({ ...acc, [p]: "" }), {}),
        queryParams: {},
        requestBody: endpoint?.requestBody
          ? JSON.stringify(endpoint.requestBody, null, 2)
          : "",
        result: null,
        loading: false,
      };
    }
    return endpointStates[index];
  };

  // Update endpoint state
  const updateEndpointState = (
    index: number,
    updates: Partial<EndpointState>,
  ) => {
    setEndpointStates((prev) => ({
      ...prev,
      [index]: { ...getEndpointState(index), ...updates },
    }));
  };

  // Build full URL with path params replaced
  const buildUrl = (
    path: string,
    pathParams: Record<string, string>,
  ): string => {
    let fullPath = path;
    Object.entries(pathParams).forEach(([key, value]) => {
      fullPath = fullPath.replace(
        `{${key}}`,
        encodeURIComponent(value || `{${key}}`),
      );
    });
    return `${baseUrl}${fullPath}`;
  };

  // Build authorization header based on auth method
  const buildAuthHeader = (): Record<string, string> => {
    if (!token) return {};

    if (authMethod.includes("Bearer") || authMethod.includes("OAuth")) {
      return { Authorization: `Bearer ${token}` };
    }
    if (authMethod.includes("API Key")) {
      return { "X-API-Key": token };
    }
    if (authMethod.includes("Basic")) {
      return { Authorization: `Basic ${token}` };
    }
    return { Authorization: token };
  };

  // Execute endpoint
  const handleExecute = async (index: number) => {
    const endpoint = integration.endpoints?.[index];
    if (!endpoint) return;

    const state = getEndpointState(index);
    updateEndpointState(index, { loading: true, result: null });

    try {
      const url = buildUrl(endpoint.path, state.pathParams);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...buildAuthHeader(),
      };

      let body: unknown = undefined;
      if (
        ["POST", "PUT", "PATCH"].includes(endpoint.method.toUpperCase()) &&
        state.requestBody
      ) {
        try {
          body = JSON.parse(state.requestBody);
        } catch {
          updateEndpointState(index, {
            loading: false,
            result: {
              success: false,
              status: 0,
              statusText: "Invalid JSON",
              headers: {},
              data: null,
              latencyMs: 0,
              error: "Request body is not valid JSON",
            },
          });
          return;
        }
      }

      const result = await InfrastructureAPI.executeEndpoint({
        url,
        method: endpoint.method.toUpperCase(),
        headers,
        body,
        environment,
      });

      updateEndpointState(index, { loading: false, result });
    } catch (error) {
      updateEndpointState(index, {
        loading: false,
        result: {
          success: false,
          status: 0,
          statusText: "Network Error",
          headers: {},
          data: null,
          latencyMs: 0,
          error: error instanceof Error ? error.message : "Request failed",
        },
      });
    }
  };

  const handleCopyResponse = async (index: number, data: unknown) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (!integration.endpoints || integration.endpoints.length === 0) {
    return null;
  }

  // Show disabled state for production environments
  if (!isEnvironmentAllowed) {
    return (
      <div className="mb-6">
        <h3 className="font-semibold mb-3">API Endpoints</h3>
        <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-400 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-semibold">
              Endpoint testing is disabled in {environment}
            </span>
          </div>
          <p className="text-sm text-tertiary">
            Switch to Local, Dev, QA, QA2, or Staging to test endpoints
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h3 className="font-semibold mb-3 flex items-center justify-between">
        <span>API Endpoints</span>
        <span className="text-xs font-normal text-green-400 bg-green-500/10 px-2 py-1 rounded">
          {environment.toUpperCase()} - Testing Enabled
        </span>
      </h3>

      {!token && (
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-300">
            Run the authentication test above to obtain a token for endpoint
            testing.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {integration.endpoints.map((endpoint, idx) => {
          const state = getEndpointState(idx);
          const pathParams = extractPathParams(endpoint.path);
          const hasPathParams = pathParams.length > 0;
          const needsBody = ["POST", "PUT", "PATCH"].includes(
            endpoint.method.toUpperCase(),
          );

          return (
            <div
              key={idx}
              className="bg-tertiary rounded-lg border border-secondary/30 overflow-hidden"
            >
              {/* Endpoint Header */}
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-primary/30"
                onClick={() =>
                  updateEndpointState(idx, { expanded: !state.expanded })
                }
              >
                <div className="flex items-center gap-3">
                  {state.expanded ? (
                    <ChevronDown className="w-4 h-4 text-secondary" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-secondary" />
                  )}
                  <MethodBadge method={endpoint.method} />
                  <code className="text-sm">{endpoint.path}</code>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExecute(idx);
                  }}
                  disabled={state.loading || !token}
                  className={`btn btn-sm ${
                    token ? "btn-primary" : "btn-ghost opacity-50"
                  }`}
                  title={token ? "Execute request" : "Authenticate first"}
                >
                  {state.loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Endpoint Description */}
              <div className="px-3 pb-2 text-xs text-tertiary ml-7">
                {endpoint.purpose}
              </div>

              {/* Expanded Content */}
              {state.expanded && (
                <div className="border-t border-secondary/30 p-3 space-y-3">
                  {/* Path Parameters */}
                  {hasPathParams && (
                    <div>
                      <label className="text-xs font-semibold text-secondary block mb-2">
                        Path Parameters
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {pathParams.map((param) => (
                          <div key={param}>
                            <label className="text-xs text-tertiary block mb-1">
                              {param}
                            </label>
                            <input
                              type="text"
                              value={state.pathParams[param] || ""}
                              onChange={(e) =>
                                updateEndpointState(idx, {
                                  pathParams: {
                                    ...state.pathParams,
                                    [param]: e.target.value,
                                  },
                                })
                              }
                              placeholder={`Enter ${param}...`}
                              className="w-full bg-primary border border-secondary rounded px-2 py-1 text-sm focus:border-accent-primary focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Request Body */}
                  {needsBody && (
                    <div>
                      <label className="text-xs font-semibold text-secondary block mb-2">
                        Request Body (JSON)
                      </label>
                      <textarea
                        value={state.requestBody}
                        onChange={(e) =>
                          updateEndpointState(idx, {
                            requestBody: e.target.value,
                          })
                        }
                        placeholder='{"key": "value"}'
                        rows={4}
                        className="w-full bg-primary border border-secondary rounded px-2 py-1 text-sm font-mono focus:border-accent-primary focus:outline-none resize-y"
                      />
                    </div>
                  )}

                  {/* Full URL Preview */}
                  <div>
                    <label className="text-xs font-semibold text-secondary block mb-1">
                      Full URL
                    </label>
                    <code className="text-xs bg-primary px-2 py-1 rounded block break-all text-blue-300">
                      {buildUrl(endpoint.path, state.pathParams)}
                    </code>
                  </div>

                  {/* Result */}
                  {state.result && (
                    <div
                      className={`rounded-lg p-3 ${
                        state.result.success
                          ? "bg-green-500/10 border border-green-500/30"
                          : "bg-red-500/10 border border-red-500/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {state.result.success ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400" />
                          )}
                          <span
                            className={`text-sm font-semibold ${
                              state.result.success
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {state.result.status} {state.result.statusText}
                          </span>
                          <span className="text-xs text-secondary flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {state.result.latencyMs}ms
                          </span>
                        </div>
                        {state.result.data !== null &&
                          state.result.data !== undefined && (
                            <button
                              onClick={() =>
                                handleCopyResponse(idx, state.result?.data)
                              }
                              className="text-xs text-secondary hover:text-primary flex items-center gap-1"
                            >
                              {copiedIndex === idx ? (
                                <>
                                  <Check className="w-3 h-3 text-green-400" />
                                  <span className="text-green-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          )}
                      </div>

                      {state.result.error && (
                        <div className="text-sm text-red-400 mb-2">
                          {state.result.error}
                        </div>
                      )}

                      {state.result.data !== null &&
                        state.result.data !== undefined && (
                          <div className="bg-primary rounded p-2 max-h-60 overflow-auto">
                            <pre className="text-xs font-mono text-tertiary">
                              {JSON.stringify(state.result.data, null, 2)}
                            </pre>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EndpointTester;
