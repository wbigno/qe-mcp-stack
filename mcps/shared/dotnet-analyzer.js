import fs from 'fs/promises';
import path from 'path';

export class DotNetAnalyzer {
  
  async scanCSharpFiles(basePath, includeTests = false, excludePaths = ['bin', 'obj', 'packages', 'node_modules']) {
    const files = [];
    
    async function scan(dir) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(basePath, fullPath);
          
          if (excludePaths.some(ex => relativePath.includes(ex))) continue;
          
          if (entry.isDirectory()) {
            await scan(fullPath);
          } else if (entry.name.endsWith('.cs')) {
            if (!includeTests && (entry.name.includes('Test') || entry.name.includes('test'))) continue;
            files.push({ fullPath, relativePath });
          }
        }
      } catch (error) {
        console.error(`Error scanning ${dir}:`, error.message);
      }
    }
    
    await scan(basePath);
    return files;
  }
  
  async parseFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      return {
        file: filePath,
        namespace: this.extractNamespace(content),
        usings: this.extractUsings(content),
        classes: this.extractClasses(content, filePath),
        interfaces: this.extractInterfaces(content),
        integrations: this.detectIntegrations(content),
        complexity: this.calculateComplexity(content)
      };
    } catch (error) {
      console.error(`Error parsing ${filePath}:`, error.message);
      return null;
    }
  }
  
  extractNamespace(content) {
    const match = content.match(/namespace\s+([\w.]+)/);
    return match ? match[1] : null;
  }
  
  extractUsings(content) {
    const matches = content.matchAll(/using\s+([\w.]+);/g);
    return Array.from(matches, m => m[1]);
  }
  
  extractClasses(content, filePath) {
    const classes = [];
    const classRegex = /(?:public|private|protected|internal)?\s*(?:abstract|sealed|static)?\s*class\s+(\w+)(?:\s*:\s*([\w,\s<>]+))?\s*{/g;
    
    let match;
    while ((match = classRegex.exec(content)) !== null) {
      const className = match[1];
      const inheritance = match[2] ? match[2].trim() : null;
      
      classes.push({
        name: className,
        file: filePath,
        inherits: inheritance,
        methods: this.extractMethods(content),
        properties: this.extractProperties(content),
        attributes: this.extractAttributes(content, className),
        isController: className.endsWith('Controller'),
        isService: className.endsWith('Service'),
        isRepository: className.endsWith('Repository'),
        isModel: !className.endsWith('Controller') && !className.endsWith('Service') && !className.endsWith('Repository')
      });
    }
    
    return classes;
  }
  
  extractMethods(content) {
    const methods = [];
    const methodRegex = /(?:public|private|protected|internal)\s+(?:static\s+)?(?:async\s+)?(?:Task<?(\w*)>?|void|[\w<>]+)\s+(\w+)\s*\([^)]*\)/g;
    
    let match;
    while ((match = methodRegex.exec(content)) !== null) {
      const returnType = match[1] || 'void';
      const methodName = match[2];
      
      if (methodName.startsWith('get_') || methodName.startsWith('set_')) continue;
      
      const methodStart = match.index;
      const methodContent = this.extractMethodBody(content, methodStart);
      
      methods.push({
        name: methodName,
        returnType,
        isAsync: content.substring(Math.max(0, methodStart - 20), methodStart).includes('async'),
        isPublic: content.substring(Math.max(0, methodStart - 20), methodStart).includes('public'),
        hasErrorHandling: methodContent.includes('try') && methodContent.includes('catch'),
        complexity: this.calculateComplexity(methodContent),
        linesOfCode: methodContent.split('\n').length
      });
    }
    
    return methods;
  }
  
  extractMethodBody(content, startIndex) {
    let braceCount = 0;
    let inMethod = false;
    let body = '';
    
    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];
      
      if (char === '{') {
        braceCount++;
        inMethod = true;
      } else if (char === '}') {
        braceCount--;
      }
      
      if (inMethod) {
        body += char;
      }
      
      if (inMethod && braceCount === 0) {
        break;
      }
    }
    
    return body;
  }
  
  extractProperties(content) {
    const properties = [];
    const propRegex = /public\s+([\w<>]+)\s+(\w+)\s*{\s*get;\s*set;\s*}/g;
    
    let match;
    while ((match = propRegex.exec(content)) !== null) {
      properties.push({
        name: match[2],
        type: match[1]
      });
    }
    
    return properties;
  }
  
  extractAttributes(content, className) {
    const attributes = [];
    const attrRegex = /\[(\w+)(?:\([^)]*\))?\]/g;
    
    let match;
    while ((match = attrRegex.exec(content)) !== null) {
      attributes.push(match[1]);
    }
    
    return attributes;
  }
  
  extractInterfaces(content) {
    const interfaces = [];
    const interfaceRegex = /(?:public|internal)?\s*interface\s+(\w+)/g;
    
    let match;
    while ((match = interfaceRegex.exec(content)) !== null) {
      interfaces.push({ name: match[1] });
    }
    
    return interfaces;
  }
  
  detectIntegrations(content) {
    const integrations = [];
    const patterns = {
      'Epic': ['Epic', 'epic', 'EHR', 'EMR', 'FHIR'],
      'Financial': ['Financial', 'Payment', 'Billing', 'Transaction', 'Invoice'],
      'LDAP': ['LDAP', 'ActiveDirectory', 'AD'],
      'Database': ['SqlConnection', 'DbContext', 'Database', 'Entity'],
      'HTTP': ['HttpClient', 'RestClient', 'WebClient', 'HttpRequest'],
      'AWS': ['AWS', 'S3', 'DynamoDB', 'Lambda', 'SQS', 'SNS'],
      'Azure': ['Azure', 'Blob', 'ServiceBus', 'CosmosDB'],
      'Redis': ['Redis', 'StackExchange.Redis', 'IDistributedCache'],
      'RabbitMQ': ['RabbitMQ', 'AMQP'],
      'Kafka': ['Kafka', 'Confluent']
    };
    
    for (const [system, keywords] of Object.entries(patterns)) {
      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          if (!integrations.includes(system)) {
            integrations.push(system);
          }
          break;
        }
      }
    }
    
    return integrations;
  }
  
  calculateComplexity(content) {
    const ifCount = (content.match(/\bif\s*\(/g) || []).length;
    const forCount = (content.match(/\bfor\s*\(/g) || []).length;
    const whileCount = (content.match(/\bwhile\s*\(/g) || []).length;
    const foreachCount = (content.match(/\bforeach\s*\(/g) || []).length;
    const caseCount = (content.match(/\bcase\s+/g) || []).length;
    const catchCount = (content.match(/\bcatch\s*\(/g) || []).length;
    const andOr = (content.match(/(\&\&|\|\|)/g) || []).length;
    const ternary = (content.match(/\?.*:/g) || []).length;
    
    return 1 + ifCount + forCount + whileCount + foreachCount + caseCount + catchCount + andOr + ternary;
  }
  
  findReferences(content, patterns) {
    const references = [];
    
    for (const pattern of patterns) {
      const regex = new RegExp(pattern, 'gi');
      let match;
      while ((match = regex.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        references.push({
          pattern: match[0],
          lineNumber,
          context: this.getContext(content, match.index)
        });
      }
    }
    
    return references;
  }
  
  getContext(content, index, lines = 2) {
    const allLines = content.split('\n');
    const lineNumber = content.substring(0, index).split('\n').length - 1;
    
    const start = Math.max(0, lineNumber - lines);
    const end = Math.min(allLines.length, lineNumber + lines + 1);
    
    return allLines.slice(start, end).join('\n');
  }
  
  async loadAppConfig(appName) {
    try {
      // Use /app/config in Docker, fallback to relative path for local dev
      const configPath = process.env.CONFIG_PATH || '/app/config/apps.json';
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);
      
      const app = config.applications.find(a => a.name === appName);
      if (!app) {
        throw new Error(`Application ${appName} not found in configuration`);
      }
      
      return app;
    } catch (error) {
      console.error('Error loading app config:', error);
      throw error;
    }
  }
}

export default DotNetAnalyzer;
