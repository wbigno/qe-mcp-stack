import type { InfrastructureData } from "../types/infrastructure";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

/**
 * Error types returned by the resilient proxy
 */
export type SwaggerErrorType =
  | "TIMEOUT"
  | "NETWORK"
  | "HTTP_ERROR"
  | "PARSE_ERROR"
  | "CIRCUIT_OPEN"
  | "VALIDATION_ERROR"
  | "UNKNOWN";

/**
 * Swagger fetch result with metadata
 */
export interface SwaggerFetchResult<T = unknown> {
  data: T;
  fromCache: boolean;
  circuitState: string;
  attempts?: number;
}

/**
 * Swagger fetch error with detailed information
 */
export interface SwaggerFetchError {
  success: false;
  error: string;
  errorType: SwaggerErrorType;
  suggestion?: string;
  willRetryAt?: string;
  details?: Record<string, unknown>;
  url?: string;
}

/**
 * Proxy health status
 */
export interface ProxyHealthStatus {
  success: boolean;
  status: string;
  cache: {
    valid: number;
    expired: number;
    total: number;
  };
  circuitBreaker: {
    open: number;
    closed: number;
    halfOpen: number;
  };
}

export class InfrastructureAPI {
  /**
   * Fetch all infrastructure data
   */
  static async getInfrastructureData(): Promise<InfrastructureData> {
    const response = await fetch(`${API_BASE_URL}/api/infrastructure/status`);
    if (!response.ok) {
      throw new Error("Failed to fetch infrastructure data");
    }
    const result = await response.json();
    return result.data;
  }

  /**
   * Fetch specific application data
   */
  static async getApplication(appKey: string): Promise<unknown> {
    const response = await fetch(
      `${API_BASE_URL}/api/infrastructure/applications/${appKey}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch application ${appKey}`);
    }
    const result = await response.json();
    return result.data;
  }

  /**
   * Trigger a rescan of repositories
   */
  static async triggerScan(repo?: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/infrastructure/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo }),
    });
    if (!response.ok) {
      throw new Error("Failed to trigger scan");
    }
  }

  /**
   * Check for infrastructure changes
   */
  static async checkChanges(): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/api/infrastructure/changes`);
    if (!response.ok) {
      throw new Error("Failed to check for changes");
    }
    const result = await response.json();
    return result.changes || [];
  }

  /**
   * Health check
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Swagger/OpenAPI Methods - Using Resilient Proxy
  // ============================================================================

  /**
   * Fetch swagger spec through resilient proxy
   * Features:
   *   - Automatic retry with exponential backoff
   *   - Response caching (5 minutes TTL)
   *   - Circuit breaker for failing endpoints
   *   - Detailed error information
   *
   * @param swaggerUrl - The swagger spec URL to fetch
   * @param options - Fetch options
   * @returns Swagger spec data with metadata
   */
  static async fetchSwaggerSpec<T = unknown>(
    swaggerUrl: string,
    options: {
      noCache?: boolean;
      timeout?: number;
    } = {},
  ): Promise<SwaggerFetchResult<T>> {
    const params = new URLSearchParams({ url: swaggerUrl });
    if (options.noCache) params.append("noCache", "true");
    if (options.timeout) params.append("timeout", options.timeout.toString());

    const response = await fetch(`${API_BASE_URL}/api/proxy/swagger?${params}`);

    // Extract metadata from headers
    const fromCache = response.headers.get("X-Cache-Status") === "HIT";
    const circuitState = response.headers.get("X-Circuit-State") || "UNKNOWN";
    const attempts = parseInt(
      response.headers.get("X-Retry-Attempts") || "1",
      10,
    );

    if (!response.ok) {
      const errorData: SwaggerFetchError = await response.json();
      throw new SwaggerAPIError(
        errorData.error,
        errorData.errorType,
        errorData.suggestion,
        errorData.willRetryAt,
        errorData.details,
      );
    }

    const data = (await response.json()) as T;
    return { data, fromCache, circuitState, attempts };
  }

  /**
   * Invalidate cached swagger spec
   * @param url - Specific URL to invalidate, or undefined to clear all
   */
  static async invalidateSwaggerCache(url?: string): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/api/proxy/swagger/invalidate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to invalidate swagger cache");
    }
  }

  /**
   * Get proxy health and statistics
   * Includes cache stats and circuit breaker status
   */
  static async getProxyHealth(): Promise<ProxyHealthStatus> {
    const response = await fetch(`${API_BASE_URL}/api/proxy/health`);
    if (!response.ok) {
      throw new Error("Failed to fetch proxy health");
    }
    return response.json();
  }

  /**
   * Get detailed swagger proxy statistics
   * Includes per-origin circuit breaker states
   */
  static async getSwaggerStats(): Promise<{
    cache: { valid: number; expired: number; total: number };
    circuitBreaker: {
      open: number;
      closed: number;
      halfOpen: number;
      circuits: Record<
        string,
        { state: string; failures: number; lastFailure: number | null }
      >;
    };
  }> {
    const response = await fetch(`${API_BASE_URL}/api/proxy/swagger/stats`);
    if (!response.ok) {
      throw new Error("Failed to fetch swagger stats");
    }
    const result = await response.json();
    return result;
  }

  /**
   * Reset circuit breaker for a specific origin or all
   * @param origin - Specific origin to reset, or undefined to reset all
   */
  static async resetCircuitBreaker(origin?: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/proxy/circuit/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin }),
    });

    if (!response.ok) {
      throw new Error("Failed to reset circuit breaker");
    }
  }

  /**
   * Execute API call through proxy
   * Features:
   *   - Automatic retry for transient failures
   *   - Timeout handling
   *   - Circuit breaker protection
   */
  static async executeApiCall<T = unknown>(
    url: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: unknown;
      timeout?: number;
      retries?: number;
    } = {},
  ): Promise<{
    success: boolean;
    status: number;
    statusText: string;
    body: T;
    duration: number;
    circuitState?: string;
    attempts?: number;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/proxy/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        method: options.method || "GET",
        headers: options.headers,
        body: options.body,
        timeout: options.timeout,
        retries: options.retries,
      }),
    });

    return response.json();
  }
}

/**
 * Custom error class for Swagger API errors
 * Provides detailed error information from the resilient proxy
 */
export class SwaggerAPIError extends Error {
  public readonly errorType: SwaggerErrorType;
  public readonly suggestion?: string;
  public readonly willRetryAt?: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    errorType: SwaggerErrorType,
    suggestion?: string,
    willRetryAt?: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "SwaggerAPIError";
    this.errorType = errorType;
    this.suggestion = suggestion;
    this.willRetryAt = willRetryAt;
    this.details = details;
  }

  /**
   * Get user-friendly error message based on error type
   */
  getUserMessage(): string {
    switch (this.errorType) {
      case "TIMEOUT":
        return "The service is taking too long to respond. It may be under heavy load or experiencing issues.";
      case "CIRCUIT_OPEN":
        return `The service has been failing consistently. Automatic retry scheduled${this.willRetryAt ? ` at ${new Date(this.willRetryAt).toLocaleTimeString()}` : ""}.`;
      case "NETWORK":
        return "Unable to connect to the service. Please check if it is running and accessible.";
      case "HTTP_ERROR":
        return this.details?.status
          ? `Service returned error ${this.details.status}: ${this.details.statusText || this.message}`
          : this.message;
      case "PARSE_ERROR":
        return "The service returned an invalid response. It may be returning an error page instead of JSON.";
      default:
        return this.message;
    }
  }

  /**
   * Check if error is recoverable (might succeed on retry)
   */
  isRecoverable(): boolean {
    return ["TIMEOUT", "NETWORK", "CIRCUIT_OPEN"].includes(this.errorType);
  }
}
