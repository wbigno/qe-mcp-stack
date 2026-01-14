import React, { useState, useEffect, useMemo } from "react";
import {
  FileJson,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Server,
  AlertCircle,
  RefreshCw,
  Play,
  Clock,
  X,
} from "lucide-react";
import { MethodBadge } from "../common/MethodBadge";
import type {
  SwaggerSpec,
  EndpointInfo,
  EndpointGroup,
  SchemaObject,
} from "../../types/swagger";
import type { Application, Environment } from "../../types/infrastructure";

// Orchestrator proxy URL
const ORCHESTRATOR_URL = "http://localhost:3000";

interface SwaggerPanelProps {
  apps: Record<string, Application>;
  selectedAppKey: string;
  environment: Environment;
}

interface ExecutionResult {
  success: boolean;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: unknown;
  duration?: number;
  error?: string;
}

/**
 * Group endpoints by their tags
 */
function groupEndpointsByTag(spec: SwaggerSpec | null): EndpointGroup[] {
  if (!spec?.paths) return [];

  const groups = new Map<string, EndpointGroup>();

  // Initialize groups from tags
  spec.tags?.forEach((tag) => {
    groups.set(tag.name, {
      tag: tag.name,
      description: tag.description,
      endpoints: [],
    });
  });

  // Process each path
  Object.entries(spec.paths).forEach(([path, pathItem]) => {
    const methods: Array<"get" | "post" | "put" | "delete" | "patch"> = [
      "get",
      "post",
      "put",
      "delete",
      "patch",
    ];

    methods.forEach((method) => {
      const operation = pathItem[method];
      if (!operation) return;

      const tags = operation.tags || ["Untagged"];

      tags.forEach((tag) => {
        if (!groups.has(tag)) {
          groups.set(tag, {
            tag,
            endpoints: [],
          });
        }

        const endpoint: EndpointInfo = {
          method: method.toUpperCase() as EndpointInfo["method"],
          path,
          operationId: operation.operationId,
          summary: operation.summary,
          operation,
        };

        groups.get(tag)!.endpoints.push(endpoint);
      });
    });
  });

  // Sort groups alphabetically and endpoints by path
  return Array.from(groups.values())
    .sort((a, b) => a.tag.localeCompare(b.tag))
    .map((group) => ({
      ...group,
      endpoints: group.endpoints.sort((a, b) => a.path.localeCompare(b.path)),
    }));
}

export const SwaggerPanel: React.FC<SwaggerPanelProps> = ({
  apps,
  selectedAppKey,
  environment,
}) => {
  const [spec, setSpec] = useState<SwaggerSpec | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointInfo | null>(
    null,
  );
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [activeAppKey, setActiveAppKey] = useState<string>(selectedAppKey);
  const [selectedDefinition, setSelectedDefinition] = useState<string | null>(
    null,
  );

  // Filter apps that have swagger enabled
  const swaggerApps = useMemo(() => {
    return Object.entries(apps).filter(([_, app]) => app.swagger?.enabled);
  }, [apps]);

  const activeApp = apps[activeAppKey];

  // Get available definitions for the active app
  const definitions = useMemo(() => {
    if (
      !activeApp?.swagger?.definitions ||
      activeApp.swagger.definitions.length === 0
    ) {
      // Return default definition from main url
      return [
        {
          name: activeApp?.swagger?.version || "Default",
          url: activeApp?.swagger?.url || "",
          urls: activeApp?.swagger?.urls,
        },
      ];
    }
    return activeApp.swagger.definitions;
  }, [activeApp]);

  // Get the swagger URL for the current environment and selected definition
  const getSwaggerUrl = () => {
    if (!activeApp?.swagger) return null;

    // If we have multiple definitions, use the selected one
    if (definitions.length > 1 && selectedDefinition) {
      const def = definitions.find((d) => d.name === selectedDefinition);
      if (def) {
        return def.urls?.[environment] || def.url;
      }
    }

    return activeApp.swagger.urls?.[environment] || activeApp.swagger.url;
  };

  // Get the base URL for the current environment
  const getBaseUrl = () => {
    if (!activeApp) return "";
    return activeApp.baseUrls?.[environment] || activeApp.baseUrl;
  };

  const swaggerUrl = getSwaggerUrl();
  const baseUrl = getBaseUrl();

  // Fetch swagger spec through proxy when active app or environment changes
  useEffect(() => {
    const fetchSwagger = async () => {
      if (!activeApp?.swagger?.enabled || !swaggerUrl) {
        setSpec(null);
        setError("No swagger configuration for this application");
        return;
      }

      setLoading(true);
      setError(null);
      setSpec(null);
      setSelectedEndpoint(null);

      try {
        // Use proxy to bypass CORS
        const proxyUrl = `${ORCHESTRATOR_URL}/api/proxy/swagger?url=${encodeURIComponent(swaggerUrl)}`;
        const response = await fetch(proxyUrl);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              `Failed to fetch swagger: ${response.status} ${response.statusText}`,
          );
        }

        const data = await response.json();

        // Check if it's an error response from proxy
        if (data.success === false) {
          throw new Error(data.error || "Failed to fetch swagger spec");
        }

        setSpec(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch swagger spec",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSwagger();
  }, [activeAppKey, activeApp, environment, swaggerUrl, selectedDefinition]);

  const groupedEndpoints = useMemo(() => groupEndpointsByTag(spec), [spec]);

  const toggleTag = (tag: string) => {
    const newExpanded = new Set(expandedTags);
    if (newExpanded.has(tag)) {
      newExpanded.delete(tag);
    } else {
      newExpanded.add(tag);
    }
    setExpandedTags(newExpanded);
  };

  const copyPath = async (path: string) => {
    await navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const handleRefresh = async () => {
    if (!swaggerUrl) return;

    setLoading(true);
    setError(null);

    try {
      const proxyUrl = `${ORCHESTRATOR_URL}/api/proxy/swagger?url=${encodeURIComponent(swaggerUrl)}`;
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch swagger: ${response.status}`);
      }

      const data = await response.json();

      if (data.success === false) {
        throw new Error(data.error || "Failed to fetch swagger spec");
      }

      setSpec(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch swagger spec",
      );
    } finally {
      setLoading(false);
    }
  };

  if (swaggerApps.length === 0) {
    return (
      <div className="p-6">
        <div className="card text-center py-12">
          <FileJson className="w-12 h-12 mx-auto text-tertiary mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            No Swagger Enabled Applications
          </h3>
          <p className="text-secondary text-sm">
            None of the applications have Swagger/OpenAPI documentation
            configured.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header with App Selector */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FileJson className="w-5 h-5" /> API Documentation
          </h2>
          <p className="text-sm text-secondary mt-1">
            Browse and test OpenAPI/Swagger endpoints for CarePayment
            applications
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="btn btn-ghost btn-sm"
          title="Refresh swagger"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Application Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {swaggerApps.map(([appKey, app]) => (
          <button
            key={appKey}
            onClick={() => {
              setActiveAppKey(appKey);
              setSelectedDefinition(null); // Reset definition when switching apps
            }}
            className={`btn ${activeAppKey === appKey ? "btn-primary" : "btn-ghost"}`}
          >
            <div className={`w-3 h-3 rounded-full ${app.color}`} />
            {app.name}
          </button>
        ))}
      </div>

      {/* Definition Selector - shown when multiple definitions are available */}
      {definitions.length > 1 && (
        <div className="mb-4 flex items-center gap-3">
          <span className="text-sm text-secondary">Select Definition:</span>
          <select
            value={selectedDefinition || definitions[0]?.name || ""}
            onChange={(e) => setSelectedDefinition(e.target.value)}
            className="px-3 py-1.5 bg-tertiary border border-primary rounded-lg text-sm focus:outline-none focus:border-accent-primary"
          >
            {definitions.map((def) => (
              <option key={def.name} value={def.name}>
                {def.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Active App Info */}
      {activeApp && (
        <div className="mb-4 p-3 bg-tertiary rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded ${activeApp.color}`} />
            <div>
              <span className="font-semibold">{activeApp.name}</span>
              {activeApp.repository && (
                <span className="text-secondary text-sm ml-2">
                  ({activeApp.repository})
                </span>
              )}
            </div>
            <code className="text-xs bg-primary px-2 py-1 rounded ml-2">
              {baseUrl}
            </code>
          </div>
          <div className="flex gap-2">
            {spec && (
              <>
                <span className="badge">
                  {groupedEndpoints.reduce(
                    (acc, g) => acc + g.endpoints.length,
                    0,
                  )}{" "}
                  endpoints
                </span>
                <span className="badge">{groupedEndpoints.length} tags</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-accent-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-secondary">Loading API documentation...</p>
            <p className="text-xs text-tertiary mt-1">{swaggerUrl}</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="card text-center py-12 max-w-md">
            <AlertCircle className="w-12 h-12 mx-auto text-yellow-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Unable to Load Swagger
            </h3>
            <p className="text-secondary text-sm mb-4">{error}</p>
            <p className="text-xs text-tertiary mb-4">
              Make sure the application is running at:
              <br />
              <code className="text-primary">{swaggerUrl}</code>
            </p>
            <button onClick={handleRefresh} className="btn btn-primary">
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Swagger Content */}
      {spec && !loading && !error && (
        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Endpoint Tree */}
          <div className="w-1/3 overflow-auto">
            <div className="card h-full overflow-auto">
              {spec.info && (
                <div className="mb-4 pb-4 border-b border-primary">
                  <h3 className="font-semibold">{spec.info.title}</h3>
                  <p className="text-sm text-secondary">v{spec.info.version}</p>
                  {spec.info.description && (
                    <p className="text-xs text-tertiary mt-2">
                      {spec.info.description}
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                {groupedEndpoints.map((group) => (
                  <div
                    key={group.tag}
                    className="border-b border-primary last:border-0 pb-2"
                  >
                    {/* Tag Header */}
                    <button
                      onClick={() => toggleTag(group.tag)}
                      className="w-full flex items-center gap-2 p-2 hover:bg-tertiary rounded-lg transition-colors"
                    >
                      {expandedTags.has(group.tag) ? (
                        <ChevronDown className="w-4 h-4 text-secondary" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-secondary" />
                      )}
                      <Server className="w-4 h-4 text-purple-400" />
                      <span className="font-semibold text-sm">{group.tag}</span>
                      <span className="text-xs text-tertiary ml-auto">
                        {group.endpoints.length} endpoints
                      </span>
                    </button>

                    {/* Endpoints */}
                    {expandedTags.has(group.tag) && (
                      <div className="ml-6 mt-1 space-y-1">
                        {group.endpoints.map((endpoint, idx) => (
                          <button
                            key={`${endpoint.method}-${endpoint.path}-${idx}`}
                            onClick={() => setSelectedEndpoint(endpoint)}
                            className={`w-full text-left p-2 rounded-lg transition-colors flex items-center gap-2 ${
                              selectedEndpoint?.path === endpoint.path &&
                              selectedEndpoint?.method === endpoint.method
                                ? "bg-tertiary border border-secondary"
                                : "hover:bg-tertiary"
                            }`}
                          >
                            <MethodBadge method={endpoint.method} />
                            <span className="text-xs text-white truncate flex-1 font-mono">
                              {endpoint.path}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Endpoint Detail & Execution */}
          <div className="w-2/3 overflow-auto">
            {selectedEndpoint ? (
              <EndpointDetail
                endpoint={selectedEndpoint}
                baseUrl={baseUrl}
                onCopyPath={copyPath}
                copiedPath={copiedPath}
                securitySchemes={spec?.components?.securitySchemes}
              />
            ) : (
              <div className="card h-full flex items-center justify-center">
                <div className="text-center text-secondary">
                  <FileJson className="w-12 h-12 mx-auto mb-4 text-tertiary" />
                  <p>Select an endpoint to view details and execute</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface SecurityParamInfo {
  name: string;
  type: "apiKey" | "http" | "oauth2" | "openIdConnect";
  in?: "header" | "query" | "cookie";
  schemeName: string;
  scheme?: string;
  bearerFormat?: string;
}

interface EndpointDetailProps {
  endpoint: EndpointInfo;
  baseUrl: string;
  onCopyPath: (path: string) => void;
  copiedPath: string | null;
  securitySchemes?: Record<
    string,
    import("../../types/swagger").SecurityScheme
  >;
}

const EndpointDetail: React.FC<EndpointDetailProps> = ({
  endpoint,
  baseUrl,
  onCopyPath,
  copiedPath,
  securitySchemes,
}) => {
  const { operation } = endpoint;
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [securityValues, setSecurityValues] = useState<Record<string, string>>(
    {},
  );
  const [requestBody, setRequestBody] = useState<string>("");
  const [headers, setHeaders] = useState<string>("");
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [showResponse, setShowResponse] = useState(false);

  // Extract security parameters from the operation's security requirements
  const securityParams = useMemo<SecurityParamInfo[]>(() => {
    if (!operation.security || !securitySchemes) return [];

    const params: SecurityParamInfo[] = [];
    operation.security.forEach((secReq) => {
      Object.keys(secReq).forEach((schemeName) => {
        const scheme = securitySchemes[schemeName];
        if (scheme) {
          params.push({
            name: scheme.name || schemeName,
            type: scheme.type,
            in: scheme.in,
            schemeName,
            scheme: scheme.scheme,
            bearerFormat: scheme.bearerFormat,
          });
        }
      });
    });
    return params;
  }, [operation.security, securitySchemes]);

  // Reset state when endpoint changes
  useEffect(() => {
    setParamValues({});
    setSecurityValues({});
    setRequestBody("");
    setResult(null);
    setShowResponse(false);

    // Generate sample request body if there's a request body schema
    if (operation.requestBody?.content?.["application/json"]?.schema) {
      const schema = operation.requestBody.content["application/json"].schema;
      const sample = generateSampleFromSchema(schema);
      setRequestBody(JSON.stringify(sample, null, 2));
    }
  }, [endpoint, operation]);

  const buildUrl = () => {
    let path = endpoint.path;

    // Replace path parameters
    operation.parameters?.forEach((param) => {
      if (param.in === "path" && paramValues[param.name]) {
        path = path.replace(
          `{${param.name}}`,
          encodeURIComponent(paramValues[param.name]),
        );
      }
    });

    // Build query string
    const queryParams = operation.parameters
      ?.filter((p) => p.in === "query" && paramValues[p.name])
      .map(
        (p) =>
          `${encodeURIComponent(p.name)}=${encodeURIComponent(paramValues[p.name])}`,
      )
      .join("&");

    const fullUrl = `${baseUrl.replace(/\/$/, "")}${path}${queryParams ? `?${queryParams}` : ""}`;
    return fullUrl;
  };

  const executeRequest = async () => {
    setExecuting(true);
    setResult(null);
    setShowResponse(true);

    const url = buildUrl();

    try {
      // Parse custom headers
      let customHeaders: Record<string, string> = {};
      if (headers.trim()) {
        try {
          customHeaders = JSON.parse(headers);
        } catch {
          // Try parsing as key: value lines
          headers.split("\n").forEach((line) => {
            const [key, ...valueParts] = line.split(":");
            if (key && valueParts.length) {
              customHeaders[key.trim()] = valueParts.join(":").trim();
            }
          });
        }
      }

      // Add security headers (API key, Bearer token, etc.)
      securityParams.forEach((param) => {
        const value = securityValues[param.schemeName];
        if (value) {
          if (param.type === "apiKey" && param.in === "header" && param.name) {
            customHeaders[param.name] = value;
          } else if (param.type === "http" && param.scheme === "bearer") {
            customHeaders["Authorization"] = `Bearer ${value}`;
          } else if (param.type === "http" && param.scheme === "basic") {
            customHeaders["Authorization"] = `Basic ${value}`;
          }
        }
      });

      // Parse request body
      let body = undefined;
      if (requestBody.trim() && !["GET", "HEAD"].includes(endpoint.method)) {
        try {
          body = JSON.parse(requestBody);
        } catch {
          body = requestBody;
        }
      }

      const response = await fetch(`${ORCHESTRATOR_URL}/api/proxy/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          method: endpoint.method,
          headers: customHeaders,
          body,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : "Failed to execute request",
      });
    } finally {
      setExecuting(false);
    }
  };

  const hasPathParams = operation.parameters?.some((p) => p.in === "path");
  const hasQueryParams = operation.parameters?.some((p) => p.in === "query");
  const hasBody = ["POST", "PUT", "PATCH"].includes(endpoint.method);
  const hasSecurityParams = securityParams.length > 0;

  return (
    <div className="card h-full overflow-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <MethodBadge method={endpoint.method} />
            <code className="text-sm font-mono">{endpoint.path}</code>
          </div>
          {operation.summary && (
            <p className="text-secondary text-sm">{operation.summary}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onCopyPath(endpoint.path)}
            className="btn btn-ghost btn-sm"
            title="Copy path"
          >
            {copiedPath === endpoint.path ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={executeRequest}
            disabled={executing}
            className="btn btn-primary btn-sm"
          >
            {executing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Execute
          </button>
        </div>
      </div>

      {/* URL Preview */}
      <div className="mb-4 p-2 bg-tertiary rounded-lg">
        <div className="text-xs text-secondary mb-1">Request URL</div>
        <code className="text-xs text-primary break-all">{buildUrl()}</code>
      </div>

      {/* Parameters */}
      {(hasPathParams || hasQueryParams) && (
        <div className="mb-4">
          <h4 className="font-semibold text-sm mb-2">Parameters</h4>
          <div className="space-y-2">
            {operation.parameters?.map((param, idx) => (
              <div key={idx} className="bg-tertiary rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <code className="text-xs font-semibold text-primary">
                    {param.name}
                  </code>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      param.in === "path"
                        ? "bg-purple-500/20 text-purple-400"
                        : "bg-blue-500/20 text-blue-400"
                    }`}
                  >
                    {param.in}
                  </span>
                  {param.required && (
                    <span className="text-xs text-red-400">required</span>
                  )}
                  {param.schema?.type && (
                    <span className="text-xs text-tertiary">
                      ({param.schema.type})
                    </span>
                  )}
                </div>
                {param.description && (
                  <p className="text-xs text-tertiary mb-2">
                    {param.description}
                  </p>
                )}
                <input
                  type="text"
                  value={paramValues[param.name] || ""}
                  onChange={(e) =>
                    setParamValues((prev) => ({
                      ...prev,
                      [param.name]: e.target.value,
                    }))
                  }
                  placeholder={`Enter ${param.name}...`}
                  className="w-full px-3 py-2 bg-primary border border-primary rounded-lg text-sm focus:outline-none focus:border-accent-primary"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security Parameters (API Keys, Bearer Tokens, etc.) */}
      {hasSecurityParams && (
        <div className="mb-4">
          <h4 className="font-semibold text-sm mb-2">Authentication</h4>
          <div className="space-y-2">
            {securityParams.map((param, idx) => (
              <div key={idx} className="bg-tertiary rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <code className="text-xs font-semibold text-primary">
                    {param.name}
                  </code>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                    {param.type === "apiKey" ? `header` : param.type}
                  </span>
                  <span className="text-xs text-red-400">required</span>
                  {param.type === "http" && param.scheme && (
                    <span className="text-xs text-tertiary">
                      ({param.scheme})
                    </span>
                  )}
                </div>
                <p className="text-xs text-tertiary mb-2">
                  {param.type === "apiKey" && param.in === "header"
                    ? `API key passed in the "${param.name}" header`
                    : param.type === "http" && param.scheme === "bearer"
                      ? `Bearer token for Authorization header${param.bearerFormat ? ` (${param.bearerFormat})` : ""}`
                      : param.type === "http" && param.scheme === "basic"
                        ? "Basic authentication (base64 encoded username:password)"
                        : `Security scheme: ${param.schemeName}`}
                </p>
                <input
                  type={param.type === "apiKey" ? "text" : "password"}
                  value={securityValues[param.schemeName] || ""}
                  onChange={(e) =>
                    setSecurityValues((prev) => ({
                      ...prev,
                      [param.schemeName]: e.target.value,
                    }))
                  }
                  placeholder={
                    param.type === "apiKey"
                      ? `Enter ${param.name}...`
                      : param.type === "http" && param.scheme === "bearer"
                        ? "Enter bearer token..."
                        : "Enter value..."
                  }
                  className="w-full px-3 py-2 bg-primary border border-primary rounded-lg text-sm focus:outline-none focus:border-accent-primary"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request Body */}
      {hasBody && (
        <div className="mb-4">
          <h4 className="font-semibold text-sm mb-2">Request Body</h4>
          <textarea
            value={requestBody}
            onChange={(e) => setRequestBody(e.target.value)}
            placeholder='{"key": "value"}'
            rows={8}
            className="w-full px-3 py-2 bg-tertiary border border-primary rounded-lg text-sm font-mono focus:outline-none focus:border-accent-primary resize-y"
          />
        </div>
      )}

      {/* Custom Headers (collapsed by default since security params cover most cases) */}
      <details className="mb-4">
        <summary className="font-semibold text-sm mb-2 cursor-pointer text-secondary hover:text-primary">
          Additional Headers (Optional)
        </summary>
        <textarea
          value={headers}
          onChange={(e) => setHeaders(e.target.value)}
          placeholder='{"X-Custom": "value"}'
          rows={3}
          className="w-full px-3 py-2 bg-tertiary border border-primary rounded-lg text-sm font-mono focus:outline-none focus:border-accent-primary resize-y mt-2"
        />
      </details>

      {/* Response */}
      {showResponse && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm">Response</h4>
            {result && (
              <button
                onClick={() => setShowResponse(false)}
                className="btn btn-ghost btn-sm"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {executing && (
            <div className="bg-tertiary rounded-lg p-4 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-secondary">Executing request...</p>
            </div>
          )}

          {result && !executing && (
            <div className="bg-tertiary rounded-lg overflow-hidden">
              {/* Status Bar */}
              <div
                className={`flex items-center justify-between p-3 ${
                  result.success && result.status && result.status < 400
                    ? "bg-green-500/10 border-b border-green-500/20"
                    : "bg-red-500/10 border-b border-red-500/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  {result.status ? (
                    <span
                      className={`px-2 py-1 rounded text-sm font-bold ${
                        result.status < 300
                          ? "bg-green-500/20 text-green-400"
                          : result.status < 400
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {result.status}
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded text-sm font-bold bg-red-500/20 text-red-400">
                      Error
                    </span>
                  )}
                  <span className="text-sm text-secondary">
                    {result.statusText || result.error}
                  </span>
                </div>
                {result.duration && (
                  <div className="flex items-center gap-1 text-xs text-secondary">
                    <Clock className="w-3 h-3" />
                    {result.duration}ms
                  </div>
                )}
              </div>

              {/* Response Headers */}
              {result.headers && Object.keys(result.headers).length > 0 && (
                <details className="border-b border-primary">
                  <summary className="p-3 text-sm font-semibold cursor-pointer hover:bg-primary/50">
                    Response Headers ({Object.keys(result.headers).length})
                  </summary>
                  <div className="p-3 bg-primary/50 text-xs font-mono overflow-auto max-h-32">
                    {Object.entries(result.headers).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <span className="text-blue-400">{key}:</span>
                        <span className="text-secondary">{value}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* Response Body */}
              <div className="p-3">
                <div className="text-xs font-semibold mb-2">Response Body</div>
                <pre className="text-xs font-mono overflow-auto max-h-96 bg-primary p-3 rounded-lg">
                  {typeof result.body === "object"
                    ? JSON.stringify(result.body, null, 2)
                    : String(result.body || result.error || "No response body")}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Description */}
      {operation.description && !showResponse && (
        <div className="mb-4">
          <h4 className="font-semibold text-sm mb-2">Description</h4>
          <p className="text-sm text-secondary">{operation.description}</p>
        </div>
      )}

      {/* Responses Documentation */}
      {!showResponse && (
        <div className="mb-4">
          <h4 className="font-semibold text-sm mb-2">Expected Responses</h4>
          <div className="space-y-2">
            {Object.entries(operation.responses).map(([code, response]) => (
              <div key={code} className="bg-tertiary rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold ${
                      code.startsWith("2")
                        ? "bg-green-500/20 text-green-400"
                        : code.startsWith("4")
                          ? "bg-yellow-500/20 text-yellow-400"
                          : code.startsWith("5")
                            ? "bg-red-500/20 text-red-400"
                            : "bg-gray-500/20 text-gray-400"
                    }`}
                  >
                    {code}
                  </span>
                  <span className="text-xs text-secondary">
                    {response.description}
                  </span>
                </div>
                {response.content &&
                  Object.entries(response.content).map(
                    ([contentType, media]) => (
                      <div key={contentType} className="mt-2">
                        <div className="text-xs text-tertiary mb-1">
                          {contentType}
                        </div>
                        {media.schema && (
                          <SchemaDisplay schema={media.schema} />
                        )}
                      </div>
                    ),
                  )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security */}
      {operation.security && operation.security.length > 0 && !showResponse && (
        <div>
          <h4 className="font-semibold text-sm mb-2">Security</h4>
          <div className="flex flex-wrap gap-2">
            {operation.security.map((sec, idx) => (
              <span key={idx} className="badge">
                {Object.keys(sec).join(", ")}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Generate a sample object from a JSON schema
 */
function generateSampleFromSchema(schema: SchemaObject): unknown {
  if (schema.$ref) {
    return { "...": "reference" };
  }

  if (schema.example !== undefined) {
    return schema.example;
  }

  switch (schema.type) {
    case "object":
      if (schema.properties) {
        const obj: Record<string, unknown> = {};
        Object.entries(schema.properties).forEach(([key, propSchema]) => {
          obj[key] = generateSampleFromSchema(propSchema);
        });
        return obj;
      }
      return {};
    case "array":
      if (schema.items) {
        return [generateSampleFromSchema(schema.items)];
      }
      return [];
    case "string":
      if (schema.enum && schema.enum.length > 0) {
        return schema.enum[0];
      }
      return schema.format === "date-time"
        ? new Date().toISOString()
        : schema.format === "date"
          ? new Date().toISOString().split("T")[0]
          : schema.format === "email"
            ? "user@example.com"
            : schema.format === "uuid"
              ? "00000000-0000-0000-0000-000000000000"
              : "string";
    case "number":
    case "integer":
      return 0;
    case "boolean":
      return true;
    default:
      return null;
  }
}

interface SchemaDisplayProps {
  schema: SchemaObject;
  depth?: number;
}

const SchemaDisplay: React.FC<SchemaDisplayProps> = ({ schema, depth = 0 }) => {
  if (depth > 3) return <span className="text-xs text-tertiary">...</span>;

  if (schema.$ref) {
    const refName = schema.$ref.split("/").pop();
    return <code className="text-xs text-purple-400">${refName}</code>;
  }

  if (schema.type === "object" && schema.properties) {
    return (
      <div className="text-xs font-mono">
        <span className="text-tertiary">{"{"}</span>
        <div className="ml-2">
          {Object.entries(schema.properties).map(([key, prop]) => (
            <div key={key} className="flex items-start gap-1">
              <span className="text-blue-400">{key}</span>
              <span className="text-tertiary">:</span>
              <SchemaDisplay schema={prop} depth={depth + 1} />
              {schema.required?.includes(key) && (
                <span className="text-red-400 text-xs">*</span>
              )}
            </div>
          ))}
        </div>
        <span className="text-tertiary">{"}"}</span>
      </div>
    );
  }

  if (schema.type === "array" && schema.items) {
    return (
      <span className="text-xs">
        <span className="text-tertiary">[</span>
        <SchemaDisplay schema={schema.items} depth={depth + 1} />
        <span className="text-tertiary">]</span>
      </span>
    );
  }

  return (
    <span className="text-xs text-green-400">
      {schema.type || "any"}
      {schema.format && (
        <span className="text-tertiary">({schema.format})</span>
      )}
    </span>
  );
};

export default SwaggerPanel;
