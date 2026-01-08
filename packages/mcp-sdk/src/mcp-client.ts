/**
 * Client for inter-MCP communication
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { APIResponse, ServiceError, retry, logger, logError } from '@qe-mcp-stack/shared';

export interface MCPClientConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  apiKey?: string;
}

export class MCPClient {
  private client: AxiosInstance;
  private config: MCPClientConfig;

  constructor(config: MCPClientConfig) {
    this.config = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      ...config,
    };

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `ApiKey ${this.config.apiKey}` }),
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('MCP Request', {
          method: config.method,
          url: config.url,
          baseURL: config.baseURL,
        });
        return config;
      },
      (error) => {
        logError('MCP Request Error', { error: error.message });
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.debug('MCP Response', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        if (error.response) {
          logError('MCP Response Error', {
            status: error.response.status,
            data: error.response.data,
            url: error.config?.url,
          });
        } else {
          logError('MCP Network Error', {
            message: error.message,
            url: error.config?.url,
          });
        }
        return Promise.reject(error);
      }
    );
  }

  public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('GET', url, undefined, config);
  }

  public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('POST', url, data, config);
  }

  public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('PUT', url, data, config);
  }

  public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('DELETE', url, undefined, config);
  }

  private async request<T>(
    method: string,
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const execute = async (): Promise<T> => {
      try {
        const response: AxiosResponse<APIResponse<T>> = await this.client.request({
          method,
          url,
          data,
          ...config,
        });

        if (!response.data.success) {
          throw new ServiceError(
            response.data.error?.message || 'Request failed',
            response.status
          );
        }

        return response.data.data as T;
      } catch (error: any) {
        if (error.response?.data?.error) {
          throw new ServiceError(
            error.response.data.error.message,
            error.response.status
          );
        }
        throw error;
      }
    };

    return retry(execute, {
      retries: this.config.retries!,
      delay: this.config.retryDelay!,
    });
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.get('/health');
      return true;
    } catch {
      return false;
    }
  }
}

export function createMCPClient(config: MCPClientConfig): MCPClient {
  return new MCPClient(config);
}
