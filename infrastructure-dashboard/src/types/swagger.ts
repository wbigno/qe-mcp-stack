/**
 * OpenAPI/Swagger types for the Swagger Panel
 */

export interface SwaggerSpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, SchemaObject>;
    securitySchemes?: Record<string, SecurityScheme>;
  };
  tags?: Array<{ name: string; description?: string }>;
}

export interface PathItem {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  delete?: Operation;
  patch?: Operation;
}

export interface Operation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, Response>;
  security?: SecurityRequirement[];
}

export interface Parameter {
  name: string;
  in: "query" | "path" | "header" | "cookie";
  required?: boolean;
  schema?: SchemaObject;
  description?: string;
}

export interface RequestBody {
  required?: boolean;
  content: Record<string, MediaType>;
}

export interface MediaType {
  schema?: SchemaObject;
  example?: unknown;
}

export interface Response {
  description: string;
  content?: Record<string, MediaType>;
}

export interface SchemaObject {
  type?: string;
  properties?: Record<string, SchemaObject>;
  items?: SchemaObject;
  required?: string[];
  $ref?: string;
  enum?: unknown[];
  format?: string;
  example?: unknown;
  description?: string;
}

export interface SecurityScheme {
  type: "apiKey" | "http" | "oauth2" | "openIdConnect";
  name?: string;
  in?: "query" | "header" | "cookie";
  scheme?: string;
  bearerFormat?: string;
}

export interface SecurityRequirement {
  [name: string]: string[];
}

// Grouped endpoint structure for tree view
export interface EndpointGroup {
  tag: string;
  description?: string;
  endpoints: EndpointInfo[];
}

export interface EndpointInfo {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  operationId?: string;
  summary?: string;
  operation: Operation;
}
