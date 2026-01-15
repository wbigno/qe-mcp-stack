export type IntegrationType =
  | "payment"
  | "api"
  | "external"
  | "auth"
  | "email"
  | "reporting"
  | "service"
  | "cache"
  | "background"
  | "database"
  | "cloud";

export interface Integration {
  name: string;
  type: IntegrationType;
  color: string;
  purpose: string;
  baseUrl?: string;
  authentication?: {
    method: string;
    config: string;
  };
  features?: string[];
  endpoints?: Array<{
    method: string;
    path: string;
    purpose: string;
  }>;
  requestStructure?: Record<string, any>;
  responseStructure?: Record<string, any>;
  codeImplementation?: string;
  errorHandling?: string;
  failover?: string;
  configuration?: Record<string, string>;
  dataFlow?: {
    inbound?: string[];
    outbound?: string[];
  };
  cacheStrategy?: Record<
    string,
    {
      ttl: string;
      keys: string;
      usage: string;
    }
  >;
  jobs?: Array<{
    name: string;
    schedule: string;
    description: string;
    code?: string;
  }>;
  services?: Record<
    string,
    {
      name: string;
      purpose: string;
      config?: string;
      tracks?: string[];
      uri?: string;
      secrets?: string[];
      container?: string;
      stores?: string[];
      topic?: string;
      events?: string[];
    }
  >;
  databases?: string[];
  tables?: Record<string, string>;
  connectionStrings?: Record<string, string>;
}

export interface Application {
  name: string;
  tech: string;
  color: string;
  framework: string;
  deployment: string;
  baseUrl: string;
  baseUrls?: EnvironmentUrls;
  authentication: string;
  features: string[];
  integrations: Record<string, Integration>;
  dependencies?: {
    core?: string[];
    business?: string[];
    nuget?: string[];
  };
  swagger?: {
    enabled: boolean;
    url: string;
    urls?: EnvironmentUrls;
    version?: string;
    // Multiple API definitions (like V1.0, V2.0, or different services)
    definitions?: Array<{
      name: string;
      url: string;
      urls?: EnvironmentUrls;
    }>;
  };
  hangfire?: {
    enabled: boolean;
    urls?: EnvironmentUrls;
  };
  environmentLinks?: EnvironmentUrls;
  repository?: string;
}

export interface InfrastructureData {
  applications: Record<string, Application>;
  lastUpdated?: string;
}

export type ViewMode =
  | "visual"
  | "details"
  | "flow"
  | "swagger"
  | "database"
  | "hangfire";

export type Environment =
  | "local"
  | "dev"
  | "qa"
  | "qa2"
  | "staging"
  | "preprod"
  | "prod";

export interface EnvironmentUrls {
  local?: string;
  dev?: string;
  qa?: string;
  qa2?: string;
  staging?: string;
  preprod?: string;
  prod?: string;
}

export type AuthMethod =
  | "API Key"
  | "OAuth 2.0"
  | "JWT"
  | "HMAC"
  | "Basic"
  | "Certificate"
  | "Bearer Token";

export interface AuthTestResult {
  success: boolean;
  method: string;
  timestamp: string;
  latencyMs?: number;
  error?: string;
  details?: {
    tokenObtained?: boolean;
    tokenExpiry?: string;
    scopes?: string[];
    statusCode?: number;
  };
}

export interface DatabaseInfo {
  name: string;
  type: "SQL Server" | "PostgreSQL" | "Redis" | "Azure Table";
  tables: Record<string, TableInfo>;
  connections: string[];
}

export interface TableInfo {
  name: string;
  description: string;
  connectedApps: string[];
}

export interface DatabaseRelationship {
  sourceTable: string;
  targetTable: string;
  relationshipType: "one-to-one" | "one-to-many" | "many-to-many";
  foreignKey?: string;
}
