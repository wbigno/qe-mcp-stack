import type {
  InfrastructureData,
  AuthTestResult,
} from "../types/infrastructure";
import type { SwaggerSpec } from "../types/swagger";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

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
  static async getApplication(appKey: string): Promise<any> {
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

  /**
   * Fetch aggregated Swagger/OpenAPI specification
   */
  static async getSwaggerSpec(): Promise<SwaggerSpec> {
    const response = await fetch(`${API_BASE_URL}/api/swagger/aggregated.json`);
    if (!response.ok) {
      throw new Error("Failed to fetch Swagger specification");
    }
    return response.json();
  }

  /**
   * Fetch Swagger spec for a specific MCP/application
   */
  static async getAppSwaggerSpec(appKey: string): Promise<SwaggerSpec | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/swagger/${appKey}`);
      if (!response.ok) return null;
      return response.json();
    } catch {
      return null;
    }
  }

  /**
   * Test authentication configuration for an integration
   * Simulates auth testing based on config validation
   */
  static async testAuthConfig(
    _appKey: string,
    _integrationKey: string,
    authConfig: { method: string; config: string },
  ): Promise<AuthTestResult> {
    const startTime = Date.now();

    // Simulate auth testing based on method type
    // In a real implementation, this would call a backend endpoint
    await new Promise((resolve) =>
      setTimeout(resolve, 500 + Math.random() * 1000),
    );

    const latencyMs = Date.now() - startTime;
    const success = Math.random() > 0.2; // 80% success rate for simulation

    return {
      success,
      method: authConfig.method,
      timestamp: new Date().toISOString(),
      latencyMs,
      error: success ? undefined : "Connection timeout or invalid credentials",
      details: success
        ? {
            tokenObtained:
              authConfig.method.includes("OAuth") ||
              authConfig.method.includes("JWT"),
            statusCode: 200,
          }
        : {
            statusCode: 401,
          },
    };
  }

  /**
   * Get MCP status
   */
  static async getMcpStatus(): Promise<Record<string, unknown>> {
    const response = await fetch(`${API_BASE_URL}/api/mcp/status`);
    if (!response.ok) {
      throw new Error("Failed to fetch MCP status");
    }
    return response.json();
  }
}
