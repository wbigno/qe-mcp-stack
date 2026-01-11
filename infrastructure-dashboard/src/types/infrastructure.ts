export type IntegrationType = 'payment' | 'api' | 'external' | 'auth' | 'email' | 'reporting' | 'service' | 'cache' | 'background' | 'database' | 'cloud';

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
  cacheStrategy?: Record<string, {
    ttl: string;
    keys: string;
    usage: string;
  }>;
  jobs?: Array<{
    name: string;
    schedule: string;
    description: string;
    code?: string;
  }>;
  services?: Record<string, {
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
  }>;
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
  authentication: string;
  features: string[];
  integrations: Record<string, Integration>;
  dependencies?: {
    core?: string[];
    business?: string[];
    nuget?: string[];
  };
}

export interface InfrastructureData {
  applications: Record<string, Application>;
  lastUpdated?: string;
}

export type ViewMode = 'visual' | 'details';
