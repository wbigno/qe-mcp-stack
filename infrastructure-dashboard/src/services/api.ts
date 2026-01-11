import type { InfrastructureData } from '../types/infrastructure';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export class InfrastructureAPI {
  /**
   * Fetch all infrastructure data
   */
  static async getInfrastructureData(): Promise<InfrastructureData> {
    const response = await fetch(`${API_BASE_URL}/api/infrastructure/status`);
    if (!response.ok) {
      throw new Error('Failed to fetch infrastructure data');
    }
    const result = await response.json();
    return result.data;
  }

  /**
   * Fetch specific application data
   */
  static async getApplication(appKey: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/infrastructure/applications/${appKey}`);
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo }),
    });
    if (!response.ok) {
      throw new Error('Failed to trigger scan');
    }
  }

  /**
   * Check for infrastructure changes
   */
  static async checkChanges(): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/api/infrastructure/changes`);
    if (!response.ok) {
      throw new Error('Failed to check for changes');
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
}
