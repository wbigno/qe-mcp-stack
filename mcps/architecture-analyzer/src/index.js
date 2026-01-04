import express from 'express';
import { DotNetAnalyzer } from '../shared/dotnet-analyzer.js';

const app = express();
const PORT = process.env.PORT || 3007;

app.use(express.json());

const analyzer = new DotNetAnalyzer();

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'architecture-analyzer-mcp',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

/**
 * Analyze application architecture - AGNOSTIC (works with any app)
 */
app.post('/analyze-architecture', async (req, res) => {
  try {
    const {
      app: appName,
      includeDataFlow = true,
      includeDependencies = true,
      includePatterns = true
    } = req.body;

    if (!appName) {
      return res.status(400).json({ error: 'Application name is required' });
    }

    console.log(`[Architecture Analyzer] Analyzing ${appName}...`);

    // Load app configuration
    const appConfig = await analyzer.loadAppConfig(appName);
    console.log(`[Architecture Analyzer] Found app at ${appConfig.path}`);

    // Scan all C# files
    const files = await analyzer.scanCSharpFiles(appConfig.path, false);
    console.log(`[Architecture Analyzer] Found ${files.length} C# files`);

    // Parse all files
    const parsedFiles = [];
    for (const file of files) {
      const parsed = await analyzer.parseFile(file.fullPath);
      if (parsed) {
        parsedFiles.push(parsed);
      }
    }

    // Analyze architecture layers
    const layers = analyzeLayers(parsedFiles);
    
    // Detect patterns
    const patterns = includePatterns ? detectPatterns(parsedFiles, layers) : [];
    
    // Analyze dependencies
    const dependencies = includeDependencies ? analyzeDependencies(parsedFiles) : [];
    
    // Analyze data flow
    const dataFlow = includeDataFlow ? analyzeDataFlow(parsedFiles, layers) : [];
    
    // Calculate metrics
    const metrics = calculateMetrics(parsedFiles);
    
    // Identify technical debt
    const technicalDebt = identifyTechnicalDebt(parsedFiles);

    res.json({
      success: true,
      app: appName,
      type: appConfig.type,
      framework: appConfig.framework,
      timestamp: new Date().toISOString(),
      architecture: {
        layers,
        patterns,
        dependencies,
        dataFlow,
        metrics,
        technicalDebt,
        summary: {
          totalFiles: parsedFiles.length,
          totalClasses: parsedFiles.reduce((sum, f) => sum + f.classes.length, 0),
          totalMethods: parsedFiles.reduce((sum, f) => 
            sum + f.classes.reduce((m, c) => m + c.methods.length, 0), 0
          ),
          averageComplexity: metrics.averageComplexity,
          maintainabilityScore: metrics.maintainabilityScore
        }
      }
    });

  } catch (error) {
    console.error('[Architecture Analyzer] Error:', error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Get list of analyzable applications
 */
app.get('/applications', async (req, res) => {
  try {
    const configPath = './../../config/apps.json';
    const fs = await import('fs/promises');
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content);

    const apps = config.applications.map(app => ({
      name: app.name,
      displayName: app.displayName,
      type: app.type,
      framework: app.framework,
      canAnalyze: app.type === 'dotnet'
    }));

    res.json({
      success: true,
      applications: apps
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Analyze architecture layers
 */
function analyzeLayers(files) {
  const layers = {
    presentation: [],
    business: [],
    data: [],
    integration: [],
    infrastructure: []
  };

  for (const file of files) {
    for (const cls of file.classes) {
      if (cls.isController) {
        layers.presentation.push({
          name: cls.name,
          file: file.file,
          methods: cls.methods.length,
          dependencies: cls.inherits ? [cls.inherits] : []
        });
      } else if (cls.isService && !cls.name.includes('Epic') && !cls.name.includes('Financial')) {
        layers.business.push({
          name: cls.name,
          file: file.file,
          methods: cls.methods.length,
          complexity: cls.methods.reduce((sum, m) => sum + m.complexity, 0) / cls.methods.length
        });
      } else if (cls.isService && (cls.name.includes('Epic') || cls.name.includes('Financial'))) {
        layers.integration.push({
          name: cls.name,
          file: file.file,
          externalSystem: cls.name.includes('Epic') ? 'Epic' : 'Financial',
          methods: cls.methods.length
        });
      } else if (cls.isRepository) {
        layers.data.push({
          name: cls.name,
          file: file.file,
          methods: cls.methods.length
        });
      } else if (cls.isModel) {
        layers.data.push({
          name: cls.name,
          file: file.file,
          properties: cls.properties.length,
          isEntity: true
        });
      }
    }
  }

  return layers;
}

/**
 * Detect architectural patterns
 */
function detectPatterns(files, layers) {
  const patterns = [];

  // MVC Pattern
  if (layers.presentation.length > 0 && layers.business.length > 0 && layers.data.length > 0) {
    patterns.push({
      name: 'Model-View-Controller (MVC)',
      confidence: 'high',
      evidence: [
        `${layers.presentation.length} controllers`,
        `${layers.business.length} service classes`,
        `${layers.data.length} models/repositories`
      ]
    });
  }

  // Dependency Injection
  const hasInterfaces = files.some(f => f.interfaces.length > 0);
  const hasConstructorInjection = files.some(f => 
    f.classes.some(c => c.methods.some(m => m.name === '.ctor'))
  );
  
  if (hasInterfaces || hasConstructorInjection) {
    patterns.push({
      name: 'Dependency Injection',
      confidence: 'high',
      evidence: ['Interfaces found', 'Constructor injection used']
    });
  }

  // Repository Pattern
  if (layers.data.some(d => d.name && d.name.includes('Repository'))) {
    patterns.push({
      name: 'Repository Pattern',
      confidence: 'high',
      evidence: [`${layers.data.filter(d => d.name && d.name.includes('Repository')).length} repository classes`]
    });
  }

  // Service Layer
  if (layers.business.length > 0) {
    patterns.push({
      name: 'Service Layer',
      confidence: 'high',
      evidence: [`${layers.business.length} service classes`]
    });
  }

  // Integration Layer
  if (layers.integration.length > 0) {
    patterns.push({
      name: 'Integration Layer',
      confidence: 'high',
      evidence: [
        `${layers.integration.length} integration services`,
        `External systems: ${[...new Set(layers.integration.map(i => i.externalSystem))].join(', ')}`
      ]
    });
  }

  return patterns;
}

/**
 * Analyze dependencies between components
 */
function analyzeDependencies(files) {
  const dependencies = [];

  for (const file of files) {
    for (const cls of file.classes) {
      // Check usings for dependencies
      if (file.usings) {
        for (const using of file.usings) {
          if (!using.startsWith('System') && !using.startsWith('Microsoft')) {
            dependencies.push({
              from: cls.name,
              to: using,
              type: 'namespace',
              file: file.file
            });
          }
        }
      }

      // Check inheritance
      if (cls.inherits) {
        const inherited = cls.inherits.split(',').map(s => s.trim());
        for (const parent of inherited) {
          dependencies.push({
            from: cls.name,
            to: parent,
            type: 'inheritance',
            file: file.file
          });
        }
      }
    }
  }

  return dependencies;
}

/**
 * Analyze data flow
 */
function analyzeDataFlow(files, layers) {
  const flows = [];

  // Controller -> Service flow
  for (const controller of layers.presentation) {
    for (const service of layers.business) {
      flows.push({
        from: controller.name,
        to: service.name,
        layer: 'presentation -> business',
        type: 'method_call'
      });
    }
  }

  // Service -> Integration flow
  for (const service of layers.business) {
    for (const integration of layers.integration) {
      flows.push({
        from: service.name,
        to: integration.name,
        layer: 'business -> integration',
        type: 'external_call',
        externalSystem: integration.externalSystem
      });
    }
  }

  return flows;
}

/**
 * Calculate architecture metrics
 */
function calculateMetrics(files) {
  let totalComplexity = 0;
  let methodCount = 0;
  let classCount = 0;
  let linesOfCode = 0;

  for (const file of files) {
    for (const cls of file.classes) {
      classCount++;
      for (const method of cls.methods) {
        methodCount++;
        totalComplexity += method.complexity;
        linesOfCode += method.linesOfCode || 0;
      }
    }
  }

  const averageComplexity = methodCount > 0 ? totalComplexity / methodCount : 0;
  const averageMethodsPerClass = classCount > 0 ? methodCount / classCount : 0;
  
  // Maintainability Index (simplified formula)
  // MI = 171 - 5.2 * ln(HV) - 0.23 * CC - 16.2 * ln(LOC)
  // Simplified: Higher complexity and LOC = lower MI
  const maintainabilityScore = Math.max(0, Math.min(100, 
    100 - (averageComplexity * 5) - (linesOfCode / methodCount * 0.1)
  ));

  return {
    totalClasses: classCount,
    totalMethods: methodCount,
    averageComplexity: parseFloat(averageComplexity.toFixed(2)),
    averageMethodsPerClass: parseFloat(averageMethodsPerClass.toFixed(2)),
    maintainabilityScore: parseFloat(maintainabilityScore.toFixed(2)),
    rating: maintainabilityScore >= 80 ? 'A' :
            maintainabilityScore >= 60 ? 'B' :
            maintainabilityScore >= 40 ? 'C' : 'D'
  };
}

/**
 * Identify technical debt
 */
function identifyTechnicalDebt(files) {
  const debt = [];

  for (const file of files) {
    for (const cls of file.classes) {
      // God classes (too many methods)
      if (cls.methods.length > 15) {
        debt.push({
          type: 'God Class',
          location: `${cls.name} in ${file.file}`,
          severity: 'high',
          description: `Class has ${cls.methods.length} methods (recommended: < 15)`,
          estimatedHours: Math.ceil(cls.methods.length / 5)
        });
      }

      // Complex methods
      for (const method of cls.methods) {
        if (method.complexity > 10) {
          debt.push({
            type: 'High Complexity',
            location: `${cls.name}.${method.name}`,
            severity: method.complexity > 15 ? 'high' : 'medium',
            description: `Method complexity: ${method.complexity} (recommended: < 10)`,
            estimatedHours: 2
          });
        }

        // Missing error handling
        if (!method.hasErrorHandling && method.isPublic) {
          debt.push({
            type: 'Missing Error Handling',
            location: `${cls.name}.${method.name}`,
            severity: 'medium',
            description: 'Public method lacks try-catch blocks',
            estimatedHours: 1
          });
        }
      }
    }
  }

  const totalHours = debt.reduce((sum, d) => sum + d.estimatedHours, 0);
  const totalValue = totalHours * 200; // $200/hour estimate

  return {
    items: debt.slice(0, 20), // Top 20
    summary: {
      totalItems: debt.length,
      estimatedHours: totalHours,
      estimatedValue: `$${totalValue.toLocaleString()}`
    }
  };
}

app.listen(PORT, () => {
  console.log(`Architecture Analyzer MCP running on port ${PORT}`);
  console.log('Endpoints:');
  console.log('  POST /analyze-architecture');
  console.log('  GET  /applications');
});
