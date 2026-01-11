# Environment Variables Guide

## Overview

The QE MCP Stack uses environment variables for configuration. Copy `.env.example` to `.env` and fill in your values.

## Required Variables

### Azure DevOps
```bash
AZURE_DEVOPS_ORG=your-organization
AZURE_DEVOPS_PAT=your-personal-access-token
AZURE_DEVOPS_PROJECT=your-project-name
AZURE_DEVOPS_API_URL=https://dev.azure.com
```

**How to get PAT**:
1. Go to https://dev.azure.com/[your-org]/_usersSettings/tokens
2. Click "New Token"
3. Select scopes: Work Items (Read/Write), Test Management (Read/Write)
4. Copy token immediately

### AI Services
```bash
# Required for AI-powered MCPs
ANTHROPIC_API_KEY=sk-ant-api03-...

# Optional - used by Risk Analyzer
OPENAI_API_KEY=sk-...
```

**How to get Anthropic API Key**:
1. Go to https://console.anthropic.com/
2. Navigate to API Keys
3. Create new key
4. Copy immediately

### Stripe (Third-Party Integration)
```bash
STRIPE_API_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Application URLs
```bash
# For E2E testing
CORE_APP_URL=http://localhost:5000
CORE_COMMON_APP_URL=http://localhost:5001
PAYMENTS_APP_URL=http://localhost:5002
PRECARE_APP_URL=http://localhost:5003
THIRD_PARTY_APP_URL=http://localhost:5004
```

### Application Repository Paths
```bash
# Absolute paths to local repos (for code analysis)
CORE_REPO_PATH=/Users/yourname/dev/Core
CORE_COMMON_REPO_PATH=/Users/yourname/dev/Core.Common
PAYMENTS_REPO_PATH=/Users/yourname/dev/Payments
PRECARE_REPO_PATH=/Users/yourname/dev/PreCare
THIRD_PARTY_REPO_PATH=/Users/yourname/dev/ThirdPartyIntegrations
```

## Optional Variables

### Logging
```bash
LOG_LEVEL=info                    # error, warn, info, debug
LOG_FORMAT=json                   # json, simple
LOG_TO_FILE=true
LOG_FILE_PATH=./logs
```

### Caching
```bash
CACHE_ENABLED=true
CACHE_TTL=3600                    # seconds
CACHE_TYPE=memory                 # memory or redis
```

### Performance
```bash
# Playwright test execution
PLAYWRIGHT_WORKERS=4
PLAYWRIGHT_RETRIES=2
PLAYWRIGHT_TIMEOUT=30000
```

## Environment-Specific Configuration

### Development (.env.development)
```bash
NODE_ENV=development
LOG_LEVEL=debug
CACHE_ENABLED=false
```

### Production (.env.production)
```bash
NODE_ENV=production
LOG_LEVEL=warn
CACHE_ENABLED=true
CACHE_TYPE=redis
```

## Docker Compose Variables

When using Docker Compose, variables are loaded from `.env`:

```yaml
# docker-compose.yml
services:
  orchestrator:
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
```

## Azure Web App Configuration

In Azure, set variables via App Settings:

```bash
az webapp config appsettings set \
  --name qe-mcp-orchestrator-dev \
  --resource-group qe-mcp-stack-dev \
  --settings \
    ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
    AZURE_DEVOPS_PAT=$AZURE_DEVOPS_PAT
```

## Security Best Practices

1. **Never commit `.env` to Git**
   - Already in `.gitignore`
   - Use `.env.example` for documentation

2. **Rotate secrets regularly**
   - API keys every 90 days
   - PATs every 90 days

3. **Use different values per environment**
   - Separate keys for dev/staging/prod

4. **Use Azure Key Vault in production**
   - Store secrets securely
   - Reference in App Settings

## Validation

Check if all required variables are set:

```bash
npm run env:validate
```

## Related Documentation

- [Azure Setup](azure-setup.md)
- [Docker Setup](docker-setup.md)
- [Secrets Setup](../../.azuredevops/SECRETS-SETUP.md)
