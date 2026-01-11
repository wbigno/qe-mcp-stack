# Azure Deployment Guide

## Overview

This guide covers deploying the QE MCP Stack to Azure using Azure Web Apps and Azure Static Web Apps.

## Prerequisites

- Azure subscription
- Azure CLI installed
- Azure DevOps organization
- Variable group configured (see [Secrets Setup](../../.azuredevops/SECRETS-SETUP.md))

## Resource Architecture

```
Resource Group: qe-mcp-stack-{env}
├── App Service Plan (Linux, P1v2)
│   ├── Orchestrator Web App
│   ├── 10 MCP Web Apps
│   └── Swagger Hub Web App
└── Static Web App
    └── Dashboard
```

## Step 1: Create Resource Group

```bash
az group create \
  --name qe-mcp-stack-dev \
  --location eastus
```

## Step 2: Create App Service Plan

```bash
az appservice plan create \
  --name qe-mcp-plan-dev \
  --resource-group qe-mcp-stack-dev \
  --is-linux \
  --sku P1v2
```

## Step 3: Create Web Apps for MCPs

### Integration MCPs

```bash
# Azure DevOps MCP
az webapp create \
  --name qe-mcp-azure-devops-dev \
  --resource-group qe-mcp-stack-dev \
  --plan qe-mcp-plan-dev \
  --runtime "NODE|18-lts"

# Set environment variables
az webapp config appsettings set \
  --name qe-mcp-azure-devops-dev \
  --resource-group qe-mcp-stack-dev \
  --settings \
    PORT=8100 \
    NODE_ENV=production \
    AZURE_DEVOPS_ORG=$AZURE_DEVOPS_ORG \
    AZURE_DEVOPS_PAT=$AZURE_DEVOPS_PAT \
    AZURE_DEVOPS_PROJECT=$AZURE_DEVOPS_PROJECT

# Repeat for third-party (8101) and test-plan-manager (8102)
```

### Code Analysis MCPs

```bash
# Code Analyzer MCP
az webapp create \
  --name qe-mcp-code-analyzer-dev \
  --resource-group qe-mcp-stack-dev \
  --plan qe-mcp-plan-dev \
  --runtime "NODE|18-lts"

az webapp config appsettings set \
  --name qe-mcp-code-analyzer-dev \
  --resource-group qe-mcp-stack-dev \
  --settings \
    PORT=8200 \
    NODE_ENV=production \
    ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY

# Repeat for coverage-analyzer (8201), playwright-generator (8202), migration-analyzer (8203)
```

### Quality Analysis MCPs

```bash
# Risk Analyzer MCP
az webapp create \
  --name qe-mcp-risk-analyzer-dev \
  --resource-group qe-mcp-stack-dev \
  --plan qe-mcp-plan-dev \
  --runtime "NODE|18-lts"

az webapp config appsettings set \
  --name qe-mcp-risk-analyzer-dev \
  --resource-group qe-mcp-stack-dev \
  --settings \
    PORT=8300 \
    NODE_ENV=production \
    ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
    OPENAI_API_KEY=$OPENAI_API_KEY

# Repeat for integration-mapper (8301), test-selector (8302)
```

### Orchestrator & Swagger Hub

```bash
# Orchestrator
az webapp create \
  --name qe-mcp-orchestrator-dev \
  --resource-group qe-mcp-stack-dev \
  --plan qe-mcp-plan-dev \
  --runtime "NODE|18-lts"

# Swagger Hub
az webapp create \
  --name qe-mcp-swagger-hub-dev \
  --resource-group qe-mcp-stack-dev \
  --plan qe-mcp-plan-dev \
  --runtime "NODE|18-lts"
```

## Step 4: Create Static Web App for Dashboard

```bash
az staticwebapp create \
  --name qe-dashboard-dev \
  --resource-group qe-mcp-stack-dev \
  --location eastus
```

Get deployment token:
```bash
az staticwebapp secrets list \
  --name qe-dashboard-dev \
  --resource-group qe-mcp-stack-dev \
  --query "properties.apiKey" \
  --output tsv
```

## Step 5: Configure Azure Pipelines

1. Create variable group in Azure DevOps:
   - Go to Pipelines → Library
   - Create `qe-mcp-stack-variables`
   - Add all required variables (see [Secrets Setup](../../.azuredevops/SECRETS-SETUP.md))

2. Create service connection:
   - Go to Project Settings → Service connections
   - New service connection → Azure Resource Manager
   - Select subscription and resource group

3. Run pipeline:
   - Go to Pipelines
   - Run `azure-pipelines.yml`

## Step 6: Verify Deployment

```bash
# Check Web App status
az webapp list \
  --resource-group qe-mcp-stack-dev \
  --query "[].{name:name, state:state, url:defaultHostName}" \
  --output table

# Test health endpoints
curl https://qe-mcp-orchestrator-dev.azurewebsites.net/health
curl https://qe-mcp-azure-devops-dev.azurewebsites.net/health
```

## Scaling

### Auto-scaling Rules

```bash
az monitor autoscale create \
  --resource-group qe-mcp-stack-dev \
  --resource qe-mcp-plan-dev \
  --resource-type Microsoft.Web/serverfarms \
  --name autoscale-rule \
  --min-count 1 \
  --max-count 5 \
  --count 1

# Scale out on CPU > 70%
az monitor autoscale rule create \
  --resource-group qe-mcp-stack-dev \
  --autoscale-name autoscale-rule \
  --condition "Percentage CPU > 70 avg 5m" \
  --scale out 1
```

## Monitoring

### Application Insights

```bash
# Create Application Insights
az monitor app-insights component create \
  --app qe-mcp-insights-dev \
  --location eastus \
  --resource-group qe-mcp-stack-dev

# Get instrumentation key
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app qe-mcp-insights-dev \
  --resource-group qe-mcp-stack-dev \
  --query instrumentationKey \
  --output tsv)

# Set for all Web Apps
az webapp config appsettings set \
  --name qe-mcp-orchestrator-dev \
  --resource-group qe-mcp-stack-dev \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY=$INSTRUMENTATION_KEY
```

## Troubleshooting

### Logs

```bash
# Stream logs
az webapp log tail \
  --name qe-mcp-orchestrator-dev \
  --resource-group qe-mcp-stack-dev

# Download logs
az webapp log download \
  --name qe-mcp-orchestrator-dev \
  --resource-group qe-mcp-stack-dev \
  --log-file logs.zip
```

### Restart Web App

```bash
az webapp restart \
  --name qe-mcp-orchestrator-dev \
  --resource-group qe-mcp-stack-dev
```

## Cost Optimization

- Use Basic tier (B1) for dev/test
- Use Premium (P1v2) for production
- Enable auto-scaling to handle load
- Stop dev resources overnight

## Related Documentation

- [Environment Variables](environment-variables.md)
- [Docker Setup](docker-setup.md)
- [Secrets Setup](../../.azuredevops/SECRETS-SETUP.md)
