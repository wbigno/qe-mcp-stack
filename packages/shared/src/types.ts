/**
 * Common TypeScript type definitions used across all services
 */

// ============================================================================
// HTTP Types
// ============================================================================

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  meta?: ResponseMeta;
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
}

export interface ResponseMeta {
  timestamp: string;
  requestId: string;
  version: string;
}

// ============================================================================
// MCP Types
// ============================================================================

export interface MCPConfig {
  name: string;
  version: string;
  description: string;
  port: number;
  host?: string;
  environment?: string;
}

export interface MCPHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  dependencies?: HealthCheck[];
}

export interface HealthCheck {
  name: string;
  status: 'up' | 'down';
  message?: string;
  responseTime?: number;
}

// ============================================================================
// Request Context
// ============================================================================

export interface RequestContext {
  requestId: string;
  userId?: string;
  timestamp: string;
  headers?: Record<string, string>;
}

// ============================================================================
// Authentication Types
// ============================================================================

export interface JWTPayload {
  sub: string;
  email?: string;
  name?: string;
  roles?: string[];
  iat?: number;
  exp?: number;
}

export interface APIKeyInfo {
  key: string;
  name: string;
  permissions: string[];
  expiresAt?: Date;
  createdAt: Date;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface EnvironmentConfig {
  NODE_ENV: string;
  PORT: number;
  LOG_LEVEL: string;
  [key: string]: any;
}

export interface ServiceConfig {
  name: string;
  url: string;
  timeout: number;
  retries: number;
}

// ============================================================================
// Logging Types
// ============================================================================

export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

export interface LogMetadata {
  requestId?: string;
  userId?: string;
  service?: string;
  [key: string]: any;
}

// ============================================================================
// Code Analysis Types
// ============================================================================

export interface CodeMethod {
  name: string;
  file: string;
  startLine: number;
  endLine: number;
  complexity: number;
  className?: string;
  isTest: boolean;
}

export interface CodeFile {
  path: string;
  language: string;
  linesOfCode: number;
  methods: CodeMethod[];
  complexity: number;
}

export interface TestCoverage {
  file: string;
  coveredLines: number;
  totalLines: number;
  coveragePercentage: number;
  uncoveredRanges: Array<{ start: number; end: number }>;
}

// ============================================================================
// Test Types
// ============================================================================

export interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  retries?: number;
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  duration: number;
  passed: number;
  failed: number;
  skipped: number;
}

// ============================================================================
// Azure DevOps Types
// ============================================================================

export interface ADOIteration {
  id: string;
  name: string;
  path: string;
  startDate: string;
  finishDate: string;
  attributes?: {
    startDate?: string;
    finishDate?: string;
    timeFrame?: string;
  };
}

export interface ADOWorkItem {
  id: number;
  title: string;
  workItemType: string;
  state: string;
  assignedTo?: string;
  iterationPath?: string;
  tags?: string[];
}

// ============================================================================
// Migration Types
// ============================================================================

export interface MigrationFeature {
  name: string;
  sourceRepo: string;
  targetRepo: string;
  status: 'not-started' | 'in-progress' | 'completed';
  progress: number;
  testCoverage?: {
    source: number;
    target: number;
  };
  riskLevel?: 'low' | 'medium' | 'high';
}

// ============================================================================
// Utility Types
// ============================================================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ============================================================================
// Error Types
// ============================================================================

export class ValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ServiceError extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'ServiceError';
  }
}
