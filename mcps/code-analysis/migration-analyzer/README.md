# Migration Analyzer MCP

## Overview

The Migration Analyzer MCP provides comprehensive tracking and analysis for code migration projects, specifically designed for migrating from Core to Core.Common architecture. This MCP helps identify migration progress, compatibility issues, dependency conflicts, and provides insights to ensure smooth transitions.

**Port**: 8203 (HTTP API)
**Swagger UI**: http://localhost:8203/api-docs
**Category**: Code Analysis MCP
**Docker Container**: `qe-migration-analyzer-mcp`

## Architecture

```
Source Code Repository (Core + Core.Common)
         ↕ File System Analysis
    Migration Analyzer MCP Server (HTTP)
         ↕ HTTP REST API (port 8203)
         Orchestrator / Claude Desktop
```

The system provides:
1. **Migration Progress Tracking**: Monitor file-by-file migration status
2. **Compatibility Analysis**: Identify breaking changes and compatibility issues
3. **Dependency Mapping**: Track dependencies between Core and Core.Common
4. **Risk Assessment**: Evaluate migration risk for each module

## Features

- 📊 **Migration Dashboard**: Real-time migration progress tracking
- 🔍 **Compatibility Checks**: Identify breaking API changes
- 🗺️ **Dependency Mapping**: Visualize Core ↔ Core.Common dependencies
- ⚠️ **Risk Assessment**: Evaluate migration risk per module
- 📝 **Migration Reports**: Generate comprehensive migration status reports
- 🔄 **Change Detection**: Track what's been migrated and what remains
- 💚 **Health Monitoring**: Built-in health checks and status endpoints

## Core Concepts

### Migration States
Files and modules can be in one of these states:
- **Not Started**: Still in Core, not migrated
- **In Progress**: Partially migrated or under development
- **Completed**: Successfully migrated to Core.Common
- **Blocked**: Migration blocked by dependencies or issues
- **Deprecated**: Marked for removal, no migration planned

### Compatibility Levels
- **Fully Compatible**: No changes needed, drop-in replacement
- **Minor Changes**: Small adjustments required (namespace, imports)
- **Major Changes**: Significant refactoring needed
- **Breaking Changes**: Incompatible API, requires redesign

### Dependency Types
- **Hard Dependencies**: Direct code references that must be resolved
- **Soft Dependencies**: Optional integrations, can be migrated independently
- **Circular Dependencies**: Mutual dependencies requiring coordinated migration

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=8203
NODE_ENV=production

# Repository Paths
CORE_REPO_PATH=/app/repositories/Core
CORE_COMMON_REPO_PATH=/app/repositories/Core.Common

# Analysis Configuration
ENABLE_DEEP_ANALYSIS=true
CACHE_ANALYSIS_RESULTS=true
ANALYSIS_CACHE_TTL=3600

# Logging
LOG_LEVEL=info
```

## API Endpoints

### Migration Status

#### GET /api/migration/status
Get overall migration status and progress.

**Query Parameters:**
- `project` - Filter by project (optional)
- `detailed` - Include detailed breakdown (default: false)

**Response:**
```json
{
  "success": true,
  "status": {
    "overall": {
      "totalFiles": 1250,
      "migratedFiles": 850,
      "inProgress": 150,
      "notStarted": 200,
      "blocked": 50,
      "percentComplete": 68.0
    },
    "byModule": [
      {
        "module": "Authentication",
        "totalFiles": 45,
        "migratedFiles": 40,
        "percentComplete": 88.9,
        "status": "in_progress",
        "blockers": []
      },
      {
        "module": "PaymentProcessing",
        "totalFiles": 120,
        "migratedFiles": 85,
        "percentComplete": 70.8,
        "status": "in_progress",
        "blockers": ["DatabaseMigration pending"]
      }
    ],
    "lastUpdated": "2026-01-11T12:00:00.000Z"
  }
}
```

#### GET /api/migration/status/:module
Get detailed status for a specific module.

**Response:**
```json
{
  "success": true,
  "module": {
    "name": "Authentication",
    "totalFiles": 45,
    "migratedFiles": 40,
    "inProgress": 3,
    "notStarted": 2,
    "blocked": 0,
    "files": [
      {
        "path": "Core/Auth/UserAuth.cs",
        "status": "completed",
        "migratedTo": "Core.Common/Auth/UserAuth.cs",
        "migratedDate": "2026-01-05",
        "compatibilityLevel": "fully_compatible"
      },
      {
        "path": "Core/Auth/TokenService.cs",
        "status": "in_progress",
        "migratedTo": "Core.Common/Auth/TokenService.cs",
        "compatibilityLevel": "minor_changes",
        "issues": ["Namespace updates needed"]
      }
    ]
  }
}
```

### Compatibility Analysis

#### POST /api/migration/compatibility
Analyze compatibility between Core and Core.Common files.

**Request Body:**
```json
{
  "corePath": "Core/Services/PaymentService.cs",
  "coreCommonPath": "Core.Common/Services/PaymentService.cs"
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "compatibilityLevel": "major_changes",
    "breakingChanges": [
      {
        "type": "method_signature",
        "location": "ProcessPayment()",
        "description": "Parameter type changed from PaymentDTO to IPaymentRequest",
        "severity": "high"
      }
    ],
    "minorChanges": [
      {
        "type": "namespace",
        "description": "Namespace changed from Core.Services to Core.Common.Services"
      }
    ],
    "recommendations": [
      "Create adapter pattern to maintain backward compatibility",
      "Update all callers to use new IPaymentRequest interface"
    ]
  }
}
```

#### GET /api/migration/compatibility/report
Generate comprehensive compatibility report.

**Query Parameters:**
- `format` - Report format (json, html, pdf)
- `modules` - Comma-separated list of modules (optional)

**Response:**
```json
{
  "success": true,
  "report": {
    "generatedAt": "2026-01-11T12:00:00.000Z",
    "summary": {
      "fullyCompatible": 650,
      "minorChanges": 150,
      "majorChanges": 35,
      "breakingChanges": 15
    },
    "criticalIssues": [
      {
        "module": "PaymentProcessing",
        "file": "PaymentService.cs",
        "issue": "Breaking API changes",
        "impact": "High - affects 23 dependent services"
      }
    ],
    "downloadUrl": "/reports/compatibility-2026-01-11.pdf"
  }
}
```

### Dependency Analysis

#### GET /api/migration/dependencies
Get dependency map between Core and Core.Common.

**Query Parameters:**
- `module` - Filter by module (optional)
- `depth` - Dependency depth to analyze (default: 3)

**Response:**
```json
{
  "success": true,
  "dependencies": {
    "coreToCoreCommon": [
      {
        "source": "Core/Services/UserService.cs",
        "target": "Core.Common/Models/UserModel.cs",
        "type": "hard_dependency",
        "migrationStatus": "blocked",
        "reason": "Target not yet migrated"
      }
    ],
    "coreCommonToCore": [
      {
        "source": "Core.Common/Services/AuthService.cs",
        "target": "Core/Legacy/OldAuthProvider.cs",
        "type": "soft_dependency",
        "migrationStatus": "planned",
        "reason": "Backward compatibility layer"
      }
    ],
    "circularDependencies": [
      {
        "files": [
          "Core/Services/A.cs",
          "Core.Common/Services/B.cs",
          "Core/Services/C.cs"
        ],
        "severity": "medium",
        "recommendation": "Break circular dependency by introducing interface"
      }
    ]
  }
}
```

#### POST /api/migration/dependencies/check
Check if a file can be safely migrated based on dependencies.

**Request Body:**
```json
{
  "filePath": "Core/Services/EmailService.cs",
  "targetPath": "Core.Common/Services/EmailService.cs"
}
```

**Response:**
```json
{
  "success": true,
  "canMigrate": false,
  "blockers": [
    {
      "dependency": "Core/Config/EmailConfig.cs",
      "reason": "Hard dependency not yet migrated",
      "priority": "high"
    }
  ],
  "recommendations": [
    "Migrate EmailConfig.cs first",
    "Or create interface to decouple dependency"
  ]
}
```

### Migration Planning

#### POST /api/migration/plan
Generate migration plan for a module.

**Request Body:**
```json
{
  "module": "Authentication",
  "strategy": "incremental",
  "includeTests": true
}
```

**Response:**
```json
{
  "success": true,
  "plan": {
    "module": "Authentication",
    "estimatedDuration": "2 weeks",
    "phases": [
      {
        "phase": 1,
        "name": "Preparation",
        "tasks": [
          "Create Core.Common/Auth directory structure",
          "Setup unit test framework",
          "Document current API contracts"
        ],
        "duration": "2 days"
      },
      {
        "phase": 2,
        "name": "Core Migration",
        "tasks": [
          "Migrate UserModel.cs",
          "Migrate AuthService.cs",
          "Update namespace references"
        ],
        "duration": "5 days",
        "dependencies": ["Phase 1 complete"]
      },
      {
        "phase": 3,
        "name": "Testing & Validation",
        "tasks": [
          "Run integration tests",
          "Performance testing",
          "Backward compatibility verification"
        ],
        "duration": "3 days"
      }
    ],
    "risks": [
      {
        "risk": "Breaking changes in AuthService API",
        "mitigation": "Maintain facade pattern for backward compatibility",
        "severity": "medium"
      }
    ]
  }
}
```

### Health Check

#### GET /health
Service health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "migration-analyzer-mcp",
  "timestamp": "2026-01-11T12:00:00.000Z",
  "port": 8203,
  "repositories": {
    "core": "accessible",
    "coreCommon": "accessible"
  },
  "lastAnalysis": "2026-01-11T11:45:00.000Z"
}
```

## Usage Examples

### With Claude Desktop

Once the MCP is running and configured:

- "Show me the migration status for the Authentication module"
- "Check if PaymentService.cs can be migrated now"
- "Generate a migration plan for the UserManagement module"
- "What are the breaking changes in OrderService?"
- "Show me all circular dependencies"

### With HTTP API

```bash
# Get overall migration status
curl http://localhost:8203/api/migration/status

# Get detailed module status
curl http://localhost:8203/api/migration/status/Authentication

# Check file compatibility
curl -X POST http://localhost:8203/api/migration/compatibility \
  -H "Content-Type: application/json" \
  -d '{
    "corePath": "Core/Services/PaymentService.cs",
    "coreCommonPath": "Core.Common/Services/PaymentService.cs"
  }'

# Check dependencies
curl http://localhost:8203/api/migration/dependencies?module=Authentication

# Check if file can be migrated
curl -X POST http://localhost:8203/api/migration/dependencies/check \
  -H "Content-Type: application/json" \
  -d '{
    "filePath": "Core/Services/EmailService.cs"
  }'

# Generate migration plan
curl -X POST http://localhost:8203/api/migration/plan \
  -H "Content-Type: application/json" \
  -d '{
    "module": "Authentication",
    "strategy": "incremental"
  }'

# Check health
curl http://localhost:8203/health
```

## Development

### Install Dependencies
```bash
cd mcps/code-analysis/migration-analyzer
npm install
```

### Run in Development Mode
```bash
npm run dev
```

### Run Tests
```bash
npm test
```

### Run in Production
```bash
npm start
```

## Docker

### Build Image
```bash
docker build -t migration-analyzer-mcp -f mcps/code-analysis/migration-analyzer/Dockerfile .
```

### Run Container
```bash
docker run -p 8203:8203 \
  -v /path/to/Core:/app/repositories/Core:ro \
  -v /path/to/Core.Common:/app/repositories/Core.Common:ro \
  migration-analyzer-mcp
```

### Docker Compose
```bash
docker compose up migration-analyzer-mcp
```

## Migration Strategies

### Incremental Migration
Migrate one module at a time while maintaining backward compatibility.

**Pros:**
- Lower risk
- Gradual rollout
- Easier testing and validation

**Cons:**
- Longer overall timeline
- Need to maintain compatibility layers
- Potential for drift between versions

### Big Bang Migration
Migrate entire system at once with coordinated cutover.

**Pros:**
- Faster overall completion
- No compatibility layer needed
- Clean break from old architecture

**Cons:**
- Higher risk
- Requires extensive testing
- Difficult to rollback

### Strangler Fig Pattern
Build new system alongside old, gradually replacing functionality.

**Pros:**
- Lowest risk
- Can validate in production
- Easy rollback

**Cons:**
- Longest timeline
- Requires routing logic
- Complexity managing two systems

## Best Practices

### Before Migration
1. **Analyze Dependencies**: Understand all dependencies before starting
2. **Create Migration Plan**: Document phases, tasks, and timelines
3. **Setup Testing**: Ensure comprehensive test coverage
4. **Backup Everything**: Create snapshots before major changes

### During Migration
1. **Migrate in Order**: Follow dependency graph from leaves to root
2. **Test Incrementally**: Validate after each file migration
3. **Maintain Compatibility**: Use facades/adapters where needed
4. **Document Changes**: Keep changelog of breaking changes

### After Migration
1. **Run Full Test Suite**: Validate all functionality
2. **Performance Testing**: Ensure no regressions
3. **Update Documentation**: Reflect new structure
4. **Remove Old Code**: Clean up deprecated Core files

## Troubleshooting

### Cannot Access Repositories

**Problem**: "Repository not accessible" error
**Solution**:
```bash
# Verify paths
echo $CORE_REPO_PATH
echo $CORE_COMMON_REPO_PATH

# Check permissions
ls -la $CORE_REPO_PATH
ls -la $CORE_COMMON_REPO_PATH

# Update environment variables
export CORE_REPO_PATH=/correct/path/to/Core
export CORE_COMMON_REPO_PATH=/correct/path/to/Core.Common
```

### Slow Analysis Performance

**Problem**: Analysis taking too long
**Solution**:
- Enable caching: `ENABLE_CACHE=true`
- Reduce analysis depth: `ANALYSIS_DEPTH=2`
- Analyze specific modules instead of entire codebase
- Increase cache TTL: `CACHE_TTL=7200`

### Circular Dependency Issues

**Problem**: Cannot migrate due to circular dependencies
**Solution**:
1. Identify the cycle using dependency API
2. Break cycle by introducing interfaces
3. Use dependency injection to decouple
4. Consider extracting shared code to separate package

## Integration with QE MCP Stack

The Migration Analyzer integrates with:
- **Code Quality Analyzer MCP**: Ensure migrated code meets quality standards
- **Test Analyzer MCP**: Track test coverage for migrated code
- **Risk Analyzer MCP**: Assess risk of migration changes
- **Azure DevOps MCP**: Link migration tasks to work items

## Reports

### Migration Status Report
- Overall progress percentage
- Module-by-module breakdown
- Files in each migration state
- Timeline and milestones

### Compatibility Report
- Breaking changes list
- Compatibility levels by file
- Recommended migration order
- Impact analysis

### Dependency Report
- Dependency graph visualization
- Circular dependencies
- Migration blockers
- Critical path analysis

## Dependencies

- **Node.js** 18+ (Alpine)
- **express** ^4.18.2 - HTTP server
- **axios** ^1.6.2 - HTTP client
- **fast-glob** - File system scanning
- **typescript-parser** - Code analysis (optional)

## Related Documentation

- [Code Quality Analyzer README](../code-analyzer/README.md)
- [Test Analyzer README](../test-analyzer/README.md)
- [System Overview](../../../docs/architecture/system-overview.md)
- [Orchestrator Health](http://localhost:3000/health)

## Contributing

When making changes to this MCP:

1. Update analysis algorithms in `src/analyzers/`
2. Test with real Core/Core.Common repositories
3. Update this README with new features
4. Add API documentation for new endpoints
5. Update migration strategy recommendations

## Roadmap

### Planned Features
- [ ] Visual dependency graph UI
- [ ] Automated migration suggestions
- [ ] Git integration for tracking migration commits
- [ ] AI-powered compatibility analysis
- [ ] Integration with IDE plugins
- [ ] Real-time migration progress dashboard
- [ ] Rollback automation
- [ ] Performance impact prediction

## License

MIT
