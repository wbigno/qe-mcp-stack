/**
 * Shared Swagger/OpenAPI configuration
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

export interface SwaggerOptions {
  title: string;
  version: string;
  description: string;
  servers: Array<{ url: string; description: string }>;
  apis?: string[];
  tags?: Array<{ name: string; description: string }>;
  schemas?: Record<string, any>;
}

export class SwaggerConfig {
  private options: swaggerJsdoc.Options;
  private spec: object;

  constructor(config: SwaggerOptions) {
    this.options = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: config.title,
          version: config.version,
          description: config.description,
        },
        servers: config.servers,
        tags: config.tags || [],
        components: {
          schemas: config.schemas || {},
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
            apiKeyAuth: {
              type: 'apiKey',
              in: 'header',
              name: 'Authorization',
            },
          },
        },
      },
      apis: config.apis || ['./src/routes/*.ts', './src/**/*.ts'],
    };

    this.spec = swaggerJsdoc(this.options);
  }

  public getSpec(): object {
    return this.spec;
  }

  public serve() {
    return swaggerUi.serve;
  }

  public setup(customOptions?: swaggerUi.SwaggerUiOptions) {
    return swaggerUi.setup(this.spec, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      ...customOptions,
    });
  }

  public setupDocs(app: Express, path: string = '/api-docs'): void {
    app.use(path, this.serve(), this.setup());
    app.get(`${path}.json`, (_req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(this.spec);
    });
  }
}

export function createSwaggerConfig(options: SwaggerOptions): SwaggerConfig {
  return new SwaggerConfig(options);
}

export const swaggerSchemas = {
  Error: {
    type: 'object',
    properties: {
      code: { type: 'string' },
      message: { type: 'string' },
      details: { type: 'object' },
    },
  },
  APIResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      data: { type: 'object' },
      error: { $ref: '#/components/schemas/Error' },
      meta: {
        type: 'object',
        properties: {
          timestamp: { type: 'string' },
          requestId: { type: 'string' },
          version: { type: 'string' },
        },
      },
    },
  },
  Health: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['healthy', 'unhealthy', 'degraded'] },
      timestamp: { type: 'string' },
      uptime: { type: 'number' },
      version: { type: 'string' },
      dependencies: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            status: { type: 'string', enum: ['up', 'down'] },
          },
        },
      },
    },
  },
};
