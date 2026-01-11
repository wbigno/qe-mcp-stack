/**
 * Type definitions for Browser Control MCP
 */

export interface ExtensionMessage {
  requestId: string;
  command: string;
  params?: Record<string, any>;
}

export interface ExtensionResponse {
  requestId: string;
  result?: any;
  error?: string;
}

export interface PageContent {
  url: string;
  title: string;
  text: string;
  html: string;
  metadata?: {
    description?: string;
    keywords?: string;
    author?: string;
    viewport?: string;
  };
  links?: Array<{ text: string; href: string }>;
  images?: Array<{ src: string; alt: string }>;
}

export interface TabInfo {
  id: number;
  url: string;
  title: string;
  active: boolean;
}

export interface CommandParams {
  selector?: string;
  text?: string;
  url?: string;
  script?: string;
  fullPage?: boolean;
}

export interface BrowserCommand {
  command: string;
  params: CommandParams;
  timeout?: number;
}

export type ConnectionState = 'connected' | 'disconnected';

export interface BridgeStatus {
  extensionConnected: boolean;
  lastActivity?: Date;
  messageCount: number;
}
