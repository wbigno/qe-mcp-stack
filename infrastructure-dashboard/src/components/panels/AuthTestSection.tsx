import React, { useState, useEffect } from "react";
import {
  Shield,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Key,
  Lock,
  Globe,
  Eye,
  EyeOff,
  Save,
  Copy,
  Check,
  Timer,
} from "lucide-react";
import type {
  Integration,
  AuthTestResultWithToken,
  Environment,
} from "../../types/infrastructure";
import { InfrastructureAPI } from "../../services/api";

interface AuthTestSectionProps {
  integration: Integration;
  appKey: string;
  integrationKey: string;
  environment?: Environment;
  baseUrl?: string;
  onTokenObtained?: (token: string, expiresAt?: string) => void;
}

const AUTH_FLOW_STEPS: Record<string, string[]> = {
  "API Key": [
    "Read API key from configuration",
    "Add key to request header (X-API-Key)",
    "Send request to endpoint",
    "Validate response status",
  ],
  "OAuth 2.0": [
    "Request access token from auth server",
    "Include client credentials in request",
    "Receive and store access token",
    "Add Bearer token to Authorization header",
    "Send authenticated request",
  ],
  JWT: [
    "Generate JWT with claims and secret",
    "Sign token with algorithm (HS256/RS256)",
    "Add token to Authorization header",
    "Server validates signature and claims",
  ],
  HMAC: [
    "Prepare request payload",
    "Generate HMAC signature with secret key",
    "Add signature to request headers",
    "Server recalculates and compares signature",
  ],
  Basic: [
    "Encode username:password in Base64",
    "Add Authorization: Basic header",
    "Server decodes and validates credentials",
  ],
  "Bearer Token": [
    "Retrieve stored bearer token",
    "Add Authorization: Bearer header",
    "Server validates token validity",
  ],
};

// LocalStorage key prefix for storing API keys
const STORAGE_KEY_PREFIX = "carepayment_auth_key_";

export const AuthTestSection: React.FC<AuthTestSectionProps> = ({
  integration,
  appKey,
  integrationKey,
  environment: _environment, // Reserved for future environment-specific auth
  baseUrl: _baseUrl, // Reserved for future environment-specific base URL
  onTokenObtained,
}) => {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<AuthTestResultWithToken | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [apiKeyValue, setApiKeyValue] = useState<string>("");
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);

  // Storage key for this specific integration
  const storageKey = `${STORAGE_KEY_PREFIX}${appKey}_${integrationKey}`;

  // Load saved API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem(storageKey);
    if (savedKey) {
      setApiKeyValue(savedKey);
    } else if (integration.authentication?.config) {
      // If no saved key, use the config hint as placeholder info
      // Don't set the actual value since config is just a description
      setApiKeyValue("");
    }
  }, [storageKey, integration.authentication?.config]);

  if (!integration.authentication) return null;

  const authMethod = integration.authentication.method;
  const flowSteps = AUTH_FLOW_STEPS[authMethod] || AUTH_FLOW_STEPS["API Key"];

  const handleSaveKey = () => {
    if (apiKeyValue.trim()) {
      localStorage.setItem(storageKey, apiKeyValue.trim());
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 2000);
    }
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKeyValue(e.target.value);
    setKeySaved(false);
  };

  const handleCopyToken = async () => {
    if (result?.token) {
      try {
        await navigator.clipboard.writeText(result.token);
        setTokenCopied(true);
        setTimeout(() => setTokenCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy token:", err);
      }
    }
  };

  const maskToken = (token: string): string => {
    if (token.length <= 20) return "●".repeat(token.length);
    return (
      token.substring(0, 10) + "●".repeat(8) + token.substring(token.length - 6)
    );
  };

  const formatExpiryTime = (
    expiresAt?: string,
    expiresIn?: number,
  ): string | null => {
    if (expiresAt) {
      const expiry = new Date(expiresAt);
      const now = new Date();
      const diffMs = expiry.getTime() - now.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins > 0) {
        return `Expires: ${expiry.toLocaleTimeString()} (${diffMins} min remaining)`;
      }
      return "Token expired";
    }
    if (expiresIn) {
      const mins = Math.floor(expiresIn / 60);
      return `Expires in ${mins} minutes`;
    }
    return null;
  };

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    setShowToken(false);
    setTokenCopied(false);

    // Animate through steps
    for (let i = 0; i < flowSteps.length; i++) {
      setCurrentStep(i);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    try {
      const testResult = await InfrastructureAPI.testAuthConfig(
        appKey,
        integrationKey,
        {
          method: authMethod,
          config: apiKeyValue || integration.authentication!.config,
        },
      );
      setResult(testResult);

      // Notify parent of obtained token for endpoint testing
      if (testResult.success && testResult.token && onTokenObtained) {
        onTokenObtained(testResult.token, testResult.expiresAt);
      }
    } catch (error) {
      setResult({
        success: false,
        method: authMethod,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setTesting(false);
      setCurrentStep(-1);
    }
  };

  const getAuthIcon = () => {
    if (authMethod.includes("OAuth") || authMethod.includes("JWT")) {
      return <Lock className="w-5 h-5" />;
    }
    if (authMethod.includes("API Key") || authMethod.includes("Key")) {
      return <Key className="w-5 h-5" />;
    }
    return <Globe className="w-5 h-5" />;
  };

  // Check if this auth method uses an API key or similar credential
  const needsKeyInput =
    authMethod.includes("API Key") ||
    authMethod.includes("Bearer") ||
    authMethod.includes("HMAC") ||
    authMethod.includes("Secret");

  return (
    <div className="mb-6">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Shield className="w-5 h-5" /> Authentication Flow Testing
      </h3>

      {/* Auth Method Display */}
      <div className="bg-tertiary rounded-lg p-4 mb-4">
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-center gap-3">
            <div className="text-indigo-400">{getAuthIcon()}</div>
            <div>
              <div className="text-sm font-semibold">{authMethod}</div>
              <div className="text-xs text-tertiary">
                {integration.authentication.config}
              </div>
            </div>
          </div>
          <button
            onClick={handleTest}
            disabled={testing}
            className="btn btn-primary shrink-0"
          >
            {testing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Test Auth
              </>
            )}
          </button>
        </div>

        {/* API Key Input Field */}
        {needsKeyInput && (
          <div className="mt-4 pt-4 border-t border-primary">
            <label className="block text-xs font-semibold text-secondary mb-2">
              {authMethod.includes("Bearer")
                ? "Bearer Token"
                : authMethod.includes("HMAC")
                  ? "HMAC Secret"
                  : "API Key"}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKeyValue}
                  onChange={handleKeyChange}
                  placeholder={`Enter ${authMethod.includes("Bearer") ? "token" : "key"} value...`}
                  className="w-full bg-primary border border-secondary rounded-lg px-3 py-2 text-sm pr-10 focus:border-accent-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-tertiary hover:text-secondary"
                  title={showKey ? "Hide" : "Show"}
                >
                  {showKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <button
                onClick={handleSaveKey}
                disabled={!apiKeyValue.trim()}
                className={`btn ${keySaved ? "btn-primary" : "btn-ghost"} shrink-0`}
                title="Save to browser storage"
              >
                {keySaved ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-tertiary mt-2">
              Key is stored locally in your browser for future use. It will not
              be sent to any server.
            </p>
          </div>
        )}
      </div>

      {/* Auth Flow Steps */}
      <div className="bg-tertiary rounded-lg p-4 mb-4">
        <div className="text-sm font-semibold mb-3">Authentication Flow</div>
        <div className="space-y-2">
          {flowSteps.map((step, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 p-2 rounded transition-all ${
                currentStep === idx
                  ? "bg-indigo-500/20 border border-indigo-500/50"
                  : currentStep > idx
                    ? "bg-green-500/10"
                    : "bg-primary/50"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep === idx
                    ? "bg-indigo-500 text-white"
                    : currentStep > idx
                      ? "bg-green-500 text-white"
                      : "bg-tertiary text-secondary"
                }`}
              >
                {currentStep > idx ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={`text-xs ${
                  currentStep >= idx ? "text-primary" : "text-tertiary"
                }`}
              >
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Test Result */}
      {result && (
        <div
          className={`rounded-lg p-4 ${
            result.success
              ? "bg-green-500/10 border border-green-500/30"
              : "bg-red-500/10 border border-red-500/30"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {result.success ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
            <span
              className={`font-semibold ${
                result.success ? "text-green-400" : "text-red-400"
              }`}
            >
              {result.success
                ? "Authentication Successful"
                : "Authentication Failed"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1 text-secondary">
              <Clock className="w-3 h-3" />
              {result.latencyMs}ms
            </div>
            {result.details?.statusCode && (
              <div className="text-secondary">
                Status: {result.details.statusCode}
              </div>
            )}
            {result.error && (
              <div className="col-span-2 text-red-400 mt-1">
                Error: {result.error}
              </div>
            )}
          </div>

          {/* Token Display Section */}
          {result.success && result.token && (
            <div className="mt-4 pt-4 border-t border-green-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-secondary flex items-center gap-1">
                  <Key className="w-3 h-3" />
                  {result.tokenType || "Token"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="text-xs text-secondary hover:text-primary flex items-center gap-1"
                    title={showToken ? "Hide token" : "Show token"}
                  >
                    {showToken ? (
                      <EyeOff className="w-3 h-3" />
                    ) : (
                      <Eye className="w-3 h-3" />
                    )}
                  </button>
                  <button
                    onClick={handleCopyToken}
                    className="text-xs text-secondary hover:text-primary flex items-center gap-1"
                    title="Copy token"
                  >
                    {tokenCopied ? (
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
                </div>
              </div>
              <div className="bg-primary rounded-lg p-2">
                <code className="text-xs text-green-300 break-all font-mono">
                  {showToken ? result.token : maskToken(result.token)}
                </code>
              </div>
              {/* Token Expiry */}
              {(result.expiresAt || result.expiresIn) && (
                <div className="mt-2 flex items-center gap-1 text-xs text-secondary">
                  <Timer className="w-3 h-3" />
                  {formatExpiryTime(result.expiresAt, result.expiresIn)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuthTestSection;
