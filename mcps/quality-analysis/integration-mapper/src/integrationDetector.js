import fs from 'fs';
import path from 'path';

export class IntegrationDetector {
  constructor() {
    // Define patterns for different integration types
    this.integrationPatterns = {
      epic: {
        patterns: [
          /Epic\.Fhir/i,
          /HL7\.Fhir/i,
          /\/api\/FHIR\//i,
          /FhirClient/i,
          /EpicClient/i,
          /FHIRClient/i
        ],
        urlPatterns: [
          /https?:\/\/[^\/\s'"]*epic[^\/\s'"]*\/api\/FHIR/i,
          /https?:\/\/[^\/\s'"]*\/api\/FHIR/i
        ],
        keywords: ['epic', 'fhir', 'hl7', 'healthcare']
      },
      financial: {
        patterns: [
          /Stripe/i,
          /PayPal/i,
          /Plaid/i,
          /stripe\.com\/v[0-9]/i,
          /paypal\.com\/v[0-9]/i,
          /StripeClient/i,
          /PayPalClient/i
        ],
        urlPatterns: [
          /https?:\/\/api\.stripe\.com/i,
          /https?:\/\/api[^\/\s'"]*\.paypal\.com/i,
          /https?:\/\/[^\/\s'"]*\.plaid\.com/i
        ],
        keywords: ['stripe', 'paypal', 'plaid', 'payment', 'billing']
      },
      messaging: {
        patterns: [
          /Twilio/i,
          /SendGrid/i,
          /MailChimp/i,
          /TwilioClient/i,
          /SendGridClient/i,
          /MailChimpClient/i
        ],
        urlPatterns: [
          /https?:\/\/api\.twilio\.com/i,
          /https?:\/\/api\.sendgrid\.com/i,
          /https?:\/\/[^\/\s'"]*\.mailchimp\.com/i
        ],
        keywords: ['twilio', 'sendgrid', 'mailchimp', 'sms', 'email']
      },
      database: {
        patterns: [
          /SqlConnection/i,
          /MongoClient/i,
          /DbContext/i,
          /IRepository/i,
          /DatabaseContext/i,
          /ConnectionString/i
        ],
        keywords: ['database', 'sql', 'mongo', 'repository', 'dbcontext']
      },
      external: {
        patterns: [
          /HttpClient/i,
          /RestClient/i,
          /WebClient/i,
          /HttpRequestMessage/i
        ],
        keywords: ['api', 'http', 'rest', 'external']
      }
    };
  }

  /**
   * Main entry point - discovers all integrations in an app
   */
  async discoverIntegrations(appConfig, parsedFiles) {
    console.log(`[IntegrationDetector] Analyzing ${parsedFiles.length} files for integrations...`);

    const integrations = [];

    // Scan each parsed file for integration patterns
    for (const parsedFile of parsedFiles) {
      const fileIntegrations = await this.detectInFile(parsedFile, appConfig);
      integrations.push(...fileIntegrations);
    }

    console.log(`[IntegrationDetector] Found ${integrations.length} integration points`);

    // Group by type
    const grouped = this.groupByType(integrations);

    // Calculate summary statistics
    const summary = {
      total: integrations.length,
      byType: {}
    };

    for (const [type, items] of Object.entries(grouped)) {
      summary.byType[type] = items.length;
    }

    return {
      integrations,
      integrationsByType: grouped,
      summary
    };
  }

  /**
   * Detect integrations in a single parsed file
   */
  async detectInFile(parsedFile, appConfig) {
    const integrations = [];

    try {
      // Read the actual file content for pattern matching
      const content = fs.readFileSync(parsedFile.file, 'utf8');
      const lines = content.split('\n');

      // 1. Detect HttpClient and REST API calls
      const httpIntegrations = this.detectHttpClientUsage(content, parsedFile.file, lines);
      integrations.push(...httpIntegrations);

      // 2. Detect specific integration library usage
      const libraryIntegrations = this.detectLibraryUsage(content, parsedFile.file, lines);
      integrations.push(...libraryIntegrations);

      // 3. Detect database connections
      const dbIntegrations = this.detectDatabaseConnections(content, parsedFile.file, lines);
      integrations.push(...dbIntegrations);

      // 4. Scan class-level patterns from parsed structure
      for (const cls of parsedFile.classes || []) {
        const classIntegrations = this.detectInClass(cls, parsedFile.file, content);
        integrations.push(...classIntegrations);
      }

    } catch (error) {
      console.error(`[IntegrationDetector] Error analyzing file ${parsedFile.file}:`, error.message);
    }

    return integrations;
  }

  /**
   * Detect HttpClient usage and extract URLs
   */
  detectHttpClientUsage(content, filePath, lines) {
    const integrations = [];

    // Pattern to detect HttpClient instantiation or usage
    const httpClientPattern = /HttpClient|HttpRequestMessage|RestClient|WebClient/;

    if (!httpClientPattern.test(content)) {
      return integrations;
    }

    // Extract URL patterns - looking for various URL assignment patterns
    const urlPatterns = [
      /new\s+Uri\s*\(\s*["']([^"']+)["']/g,                    // new Uri("url")
      /BaseAddress\s*=\s*new\s+Uri\s*\(\s*["']([^"']+)["']/g, // BaseAddress = new Uri("url")
      /baseUrl\s*=\s*["']([^"']+)["']/gi,                       // baseUrl = "url"
      /\.GetAsync\s*\(\s*["']([^"']+)["']/g,                   // .GetAsync("url")
      /\.PostAsync\s*\(\s*["']([^"']+)["']/g,                  // .PostAsync("url")
      /\.PutAsync\s*\(\s*["']([^"']+)["']/g,                   // .PutAsync("url")
      /\.DeleteAsync\s*\(\s*["']([^"']+)["']/g,                // .DeleteAsync("url")
      /\.SendAsync\s*\([^)]*["']([^"']+)["']/g,                // .SendAsync(..., "url")
      /RequestUri\s*=\s*new\s+Uri\s*\(\s*["']([^"']+)["']/g   // RequestUri = new Uri("url")
    ];

    const foundUrls = new Set();

    for (const pattern of urlPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const url = match[1];
        if (url && url.startsWith('http') && !foundUrls.has(url)) {
          foundUrls.add(url);

          const type = this.classifyUrl(url);
          const lineNumber = this.getLineNumber(content, match.index);

          integrations.push({
            file: filePath,
            type,
            url,
            method: 'HTTP',
            lineNumber,
            pattern: 'HttpClient',
            details: {
              urlPattern: url,
              detectedBy: 'HttpClient usage'
            }
          });
        }
      }
    }

    return integrations;
  }

  /**
   * Detect specific integration library usage (Epic, Stripe, etc.)
   */
  detectLibraryUsage(content, filePath, lines) {
    const integrations = [];

    for (const [type, config] of Object.entries(this.integrationPatterns)) {
      if (type === 'external') continue; // Skip generic external pattern

      for (const pattern of config.patterns) {
        if (pattern.test(content)) {
          // Find specific matches and their line numbers
          const regex = new RegExp(pattern.source, pattern.flags);
          let match;
          const searchContent = content;

          // Create a global version of the pattern if it isn't already
          const globalPattern = new RegExp(pattern.source, 'gi');

          while ((match = globalPattern.exec(searchContent)) !== null) {
            const lineNumber = this.getLineNumber(content, match.index);
            const line = lines[lineNumber - 1] || '';

            // Extract more context
            const details = this.extractIntegrationDetails(content, match[0], type, lineNumber);

            integrations.push({
              file: filePath,
              type,
              pattern: match[0],
              lineNumber,
              details,
              method: 'Library',
              description: `${type} integration detected via ${match[0]}`
            });

            // Only report once per pattern per file to avoid duplicates
            break;
          }
        }
      }
    }

    return integrations;
  }

  /**
   * Detect database connections
   */
  detectDatabaseConnections(content, filePath, lines) {
    const integrations = [];

    const dbConfig = this.integrationPatterns.database;

    for (const pattern of dbConfig.patterns) {
      if (pattern.test(content)) {
        const lineNumber = this.findFirstMatch(content, pattern);

        // Try to extract connection string or database name
        const connectionStringMatch = content.match(/connectionString["\s:=]*["']([^"']+)["']/i);
        const databaseNameMatch = content.match(/database["\s:=]*["']([^"']+)["']/i);

        integrations.push({
          file: filePath,
          type: 'database',
          pattern: pattern.source,
          lineNumber,
          method: 'Database',
          details: {
            connectionPattern: pattern.source,
            connectionString: connectionStringMatch ? this.sanitizeConnectionString(connectionStringMatch[1]) : 'Not found',
            databaseName: databaseNameMatch ? databaseNameMatch[1] : 'Unknown'
          },
          description: `Database connection detected`
        });

        // Only report once per file
        break;
      }
    }

    return integrations;
  }

  /**
   * Detect integrations at class level
   */
  detectInClass(cls, filePath, content) {
    const integrations = [];

    // Check if class name suggests an integration
    const className = cls.name || '';

    for (const [type, config] of Object.entries(this.integrationPatterns)) {
      for (const keyword of config.keywords || []) {
        if (className.toLowerCase().includes(keyword)) {
          integrations.push({
            file: filePath,
            type,
            className: className,
            method: 'Class naming',
            details: {
              className: className,
              methodCount: cls.methods?.length || 0,
              detectedBy: `Class name contains "${keyword}"`
            },
            description: `${type} integration class detected: ${className}`
          });
          break; // Only report once per class
        }
      }
    }

    return integrations;
  }

  /**
   * Classify a URL by its domain/pattern
   */
  classifyUrl(url) {
    for (const [type, config] of Object.entries(this.integrationPatterns)) {
      if (config.urlPatterns) {
        for (const pattern of config.urlPatterns) {
          if (pattern.test(url)) {
            return type;
          }
        }
      }
    }

    // Check if it's an internal/localhost URL
    if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('::1')) {
      return 'internal';
    }

    return 'external';
  }

  /**
   * Extract detailed integration information
   */
  extractIntegrationDetails(content, matchedPattern, type, lineNumber) {
    // Look for class name near the match
    const classMatch = content.match(/class\s+(\w+)/);

    // Look for authentication patterns
    const authPatterns = [
      /OAuth/i,
      /Bearer/i,
      /ApiKey/i,
      /Certificate/i,
      /Basic\s+Auth/i,
      /JWT/i,
      /Token/i
    ];

    let authentication = 'Unknown';
    for (const authPattern of authPatterns) {
      if (authPattern.test(content)) {
        authentication = authPattern.source.replace(/\\/g, '').replace(/i$/, '');
        break;
      }
    }

    return {
      className: classMatch ? classMatch[1] : 'Unknown',
      authentication,
      integrationType: type,
      matchedPattern
    };
  }

  /**
   * Group integrations by type
   */
  groupByType(integrations) {
    const grouped = {};

    for (const integration of integrations) {
      const type = integration.type || 'unknown';
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(integration);
    }

    return grouped;
  }

  /**
   * Generate Mermaid diagram for integrations
   */
  async generateDiagram(integrations, appName = 'Application') {
    const grouped = this.groupByType(integrations);

    let mermaid = 'graph LR\n';
    mermaid += `  App["${appName}"]\n`;
    mermaid += '  \n';

    // Add type-level nodes
    for (const [type, items] of Object.entries(grouped)) {
      if (items.length === 0) continue;

      const typeId = type.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
      const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

      mermaid += `  ${typeId}["${typeLabel} Integrations"]\n`;
      mermaid += `  App --> ${typeId}\n`;

      // Add specific service nodes (limit to top 5 per type to avoid clutter)
      const uniqueServices = this.extractUniqueServices(items);
      const limitedServices = uniqueServices.slice(0, 5);

      for (let i = 0; i < limitedServices.length; i++) {
        const service = limitedServices[i];
        const serviceId = `${typeId}${i}`;
        const serviceName = this.formatServiceName(service);

        mermaid += `  ${serviceId}["${serviceName}"]\n`;
        mermaid += `  ${typeId} --> ${serviceId}\n`;
      }

      if (uniqueServices.length > 5) {
        mermaid += `  ${typeId}More["... and ${uniqueServices.length - 5} more"]\n`;
        mermaid += `  ${typeId} -.-> ${typeId}More\n`;
      }

      mermaid += '  \n';
    }

    // Add styling
    mermaid += '  classDef epicClass fill:#e3f2fd,stroke:#1976d2,stroke-width:2px\n';
    mermaid += '  classDef financialClass fill:#fff3e0,stroke:#f57c00,stroke-width:2px\n';
    mermaid += '  classDef messagingClass fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px\n';
    mermaid += '  classDef databaseClass fill:#e8f5e9,stroke:#388e3c,stroke-width:2px\n';
    mermaid += '  classDef externalClass fill:#fce4ec,stroke:#c2185b,stroke-width:2px\n';

    return mermaid;
  }

  /**
   * Extract unique services from integration items
   */
  extractUniqueServices(items) {
    const services = new Set();

    for (const item of items) {
      if (item.url) {
        try {
          const urlObj = new URL(item.url);
          services.add(urlObj.hostname);
        } catch (e) {
          // Invalid URL, skip
        }
      } else if (item.className) {
        services.add(item.className);
      } else if (item.details?.className) {
        services.add(item.details.className);
      } else if (item.pattern) {
        services.add(item.pattern);
      }
    }

    return Array.from(services);
  }

  /**
   * Format service name for diagram display
   */
  formatServiceName(service) {
    // Remove common prefixes/suffixes
    let name = service
      .replace(/^www\./, '')
      .replace(/\.com$/, '')
      .replace(/\.net$/, '')
      .replace(/\.org$/, '')
      .replace(/Client$/, '')
      .replace(/Service$/, '')
      .replace(/Integration$/, '');

    // Truncate if too long
    if (name.length > 30) {
      name = name.substring(0, 27) + '...';
    }

    return name;
  }

  /**
   * Helper: Get line number from character position
   */
  getLineNumber(content, charPosition) {
    const upToPosition = content.substring(0, charPosition);
    return upToPosition.split('\n').length;
  }

  /**
   * Helper: Find first match line number
   */
  findFirstMatch(content, pattern) {
    const match = content.match(pattern);
    if (match) {
      return this.getLineNumber(content, match.index);
    }
    return 0;
  }

  /**
   * Helper: Sanitize connection string (remove passwords)
   */
  sanitizeConnectionString(connString) {
    return connString
      .replace(/password=([^;]+)/gi, 'password=***')
      .replace(/pwd=([^;]+)/gi, 'pwd=***')
      .replace(/Pass\s*=\s*([^;]+)/gi, 'Pass=***');
  }
}
