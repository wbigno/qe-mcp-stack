# Azure DevOps Secrets Configuration Guide

This guide explains how to configure all required secrets and variables for the QE MCP Stack pipelines.

## Overview

The pipelines use Azure DevOps **Variable Groups** to manage secrets and configuration values securely. All sensitive values should be marked as **secret** to prevent them from being exposed in logs.

## Required Variable Group

### Creating the Variable Group

1. Navigate to **Pipelines** → **Library** in your Azure DevOps project
2. Click **+ Variable group**
3. Name it: `qe-mcp-stack-variables`
4. Add all variables listed below

## Required Variables

### Azure Configuration

| Variable Name | Description | Secret? | Example Value |
|--------------|-------------|---------|---------------|
| `azureSubscription` | Azure service connection name | No | `Azure-Production` |
| `staticWebAppToken` | Static Web App deployment token | Yes | `<token-from-azure-portal>` |
| `environment` | Target environment | No | `development` / `staging` / `production` |

**How to get Azure Service Connection:**
1. Go to **Project Settings** → **Service connections**
2. Click **New service connection** → **Azure Resource Manager**
3. Follow the wizard to authenticate with Azure
4. Note the connection name for `azureSubscription` variable

**How to get Static Web App Token:**
1. Go to Azure Portal → Your Static Web App
2. Navigate to **Deployment** → **Deployment token**
3. Copy the token and add as secret variable

### Azure DevOps Integration

| Variable Name | Description | Secret? | Example Value |
|--------------|-------------|---------|---------------|
| `AZURE_DEVOPS_ORG` | Azure DevOps organization name | No | `mycompany` |
| `AZURE_DEVOPS_PROJECT` | Azure DevOps project name | No | `MyProject` |
| `AZURE_DEVOPS_PAT` | Personal Access Token | Yes | `<your-pat-token>` |

**How to create Personal Access Token (PAT):**
1. Click on your profile icon → **Security**
2. Click **+ New Token**
3. Give it a name: "QE MCP Stack Pipeline"
4. Set expiration (recommend: Custom - 1 year)
5. Select scopes:
   - **Work Items**: Read & Write
   - **Test Management**: Read & Write
   - **Code**: Read
6. Click **Create** and copy the token immediately

### AI Services

| Variable Name | Description | Secret? | Example Value |
|--------------|-------------|---------|---------------|
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | Yes | `sk-ant-api03-...` |
| `OPENAI_API_KEY` | OpenAI API key (optional) | Yes | `sk-...` |

**How to get Anthropic API Key:**
1. Go to https://console.anthropic.com/
2. Navigate to **API Keys**
3. Click **Create Key**
4. Copy the key immediately

**How to get OpenAI API Key:**
1. Go to https://platform.openai.com/api-keys
2. Click **Create new secret key**
3. Copy the key immediately

### Third-Party Integrations

| Variable Name | Description | Secret? | Example Value |
|--------------|-------------|---------|---------------|
| `STRIPE_API_KEY` | Stripe test API key | Yes | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | Yes | `whsec_...` |

**How to get Stripe API Keys:**
1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy the **Secret key** (starts with `sk_test_`)
3. For webhook secret:
   - Go to **Developers** → **Webhooks**
   - Create or select endpoint
   - Copy **Signing secret**

### Deployment URLs

| Variable Name | Description | Secret? | Example Value |
|--------------|-------------|---------|---------------|
| `dashboardUrl` | Dashboard URL for testing | No | `https://qe-dashboard-dev.azurestaticapps.net` |

## Step-by-Step Setup Instructions

### 1. Create the Variable Group

```bash
# Using Azure CLI (optional - can also use UI)
az pipelines variable-group create \
  --organization https://dev.azure.com/YOUR_ORG \
  --project YOUR_PROJECT \
  --name qe-mcp-stack-variables \
  --variables \
    environment=development \
    AZURE_DEVOPS_ORG=YOUR_ORG \
    AZURE_DEVOPS_PROJECT=YOUR_PROJECT
```

### 2. Add Secret Variables

In the Azure DevOps UI:

1. Go to the variable group you just created
2. Click **+ Add** for each secret variable
3. Enter the variable name
4. Enter the value
5. **Important:** Click the lock icon 🔒 to mark it as secret
6. Click **Save**

### 3. Link Variable Group to Pipelines

The variable group is already referenced in `azure-pipelines.yml`:

```yaml
variables:
  - group: qe-mcp-stack-variables
```

No additional linking is required.

### 4. Set Up Azure Resources

Before running pipelines, ensure these Azure resources exist:

#### Web Apps for MCPs

Create Azure Web Apps for each MCP:

```bash
# Resource group
az group create --name qe-mcp-stack-dev --location eastus

# Integration MCPs
az webapp create --name qe-mcp-azure-devops-dev --resource-group qe-mcp-stack-dev --plan qe-mcp-plan --runtime "NODE|18-lts"
az webapp create --name qe-mcp-third-party-dev --resource-group qe-mcp-stack-dev --plan qe-mcp-plan --runtime "NODE|18-lts"
az webapp create --name qe-mcp-test-plan-manager-dev --resource-group qe-mcp-stack-dev --plan qe-mcp-plan --runtime "NODE|18-lts"

# Code Analysis MCPs
az webapp create --name qe-mcp-code-analyzer-dev --resource-group qe-mcp-stack-dev --plan qe-mcp-plan --runtime "NODE|18-lts"
az webapp create --name qe-mcp-coverage-analyzer-dev --resource-group qe-mcp-stack-dev --plan qe-mcp-plan --runtime "NODE|18-lts"
az webapp create --name qe-mcp-playwright-generator-dev --resource-group qe-mcp-stack-dev --plan qe-mcp-plan --runtime "NODE|18-lts"
az webapp create --name qe-mcp-migration-analyzer-dev --resource-group qe-mcp-stack-dev --plan qe-mcp-plan --runtime "NODE|18-lts"

# Quality Analysis MCPs
az webapp create --name qe-mcp-risk-analyzer-dev --resource-group qe-mcp-stack-dev --plan qe-mcp-plan --runtime "NODE|18-lts"
az webapp create --name qe-mcp-integration-mapper-dev --resource-group qe-mcp-stack-dev --plan qe-mcp-plan --runtime "NODE|18-lts"
az webapp create --name qe-mcp-test-selector-dev --resource-group qe-mcp-stack-dev --plan qe-mcp-plan --runtime "NODE|18-lts"

# Core Services
az webapp create --name qe-mcp-orchestrator-dev --resource-group qe-mcp-stack-dev --plan qe-mcp-plan --runtime "NODE|18-lts"
az webapp create --name qe-mcp-swagger-hub-dev --resource-group qe-mcp-stack-dev --plan qe-mcp-plan --runtime "NODE|18-lts"
```

#### Static Web App for Dashboard

```bash
az staticwebapp create \
  --name qe-dashboard-dev \
  --resource-group qe-mcp-stack-dev \
  --location eastus
```

## Security Best Practices

### 1. Secret Rotation

- Rotate API keys every 90 days
- Update variable group when keys are rotated
- Test pipelines after rotation

### 2. Least Privilege

- Use separate service principals for different environments
- Grant minimum required permissions
- Use separate PATs for different purposes

### 3. Environment Separation

Create separate variable groups for each environment:

- `qe-mcp-stack-variables-dev`
- `qe-mcp-stack-variables-staging`
- `qe-mcp-stack-variables-prod`

Update `azure-pipelines.yml` to use the appropriate group:

```yaml
variables:
  - group: ${{ parameters.environmentVariableGroup }}
```

### 4. Audit Logging

- Enable audit logging on variable groups
- Review access logs regularly
- Monitor for unauthorized access attempts

## Troubleshooting

### Pipeline Fails with "Variable not found"

**Problem:** Variable group not linked to pipeline

**Solution:**
1. Verify variable group name matches exactly: `qe-mcp-stack-variables`
2. Check that variable group has all required variables
3. Ensure pipeline has permission to access variable group

### "Unauthorized" Errors During Deployment

**Problem:** Azure service connection lacks permissions

**Solution:**
1. Check service principal has Contributor role on resource group
2. Verify service connection is not expired
3. Re-authorize the service connection in Project Settings

### "API Key Invalid" Errors

**Problem:** Secret variables not properly configured

**Solution:**
1. Verify secret variables are marked as secret (🔒 icon)
2. Check for extra spaces in copied keys
3. Regenerate keys if necessary
4. Test keys manually before adding to variable group

## Validation Checklist

Before running pipelines, verify:

- [ ] Variable group `qe-mcp-stack-variables` created
- [ ] All required variables added
- [ ] Secret variables marked as secret (🔒)
- [ ] Azure service connection configured
- [ ] Azure Web Apps created for all MCPs
- [ ] Static Web App created for dashboard
- [ ] PAT has correct scopes
- [ ] API keys are valid and not expired
- [ ] Service principal has required permissions

## Getting Help

If you encounter issues:

1. Check Azure DevOps pipeline logs for specific error messages
2. Verify all secrets are correctly configured
3. Test individual services manually before running full pipeline
4. Review the [Azure Pipelines README](../azure-pipelines/README.md) for pipeline-specific troubleshooting

## References

- [Azure DevOps Variable Groups Documentation](https://docs.microsoft.com/en-us/azure/devops/pipelines/library/variable-groups)
- [Azure Service Connections](https://docs.microsoft.com/en-us/azure/devops/pipelines/library/service-endpoints)
- [Personal Access Tokens](https://docs.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate)
- [Azure Static Web Apps](https://docs.microsoft.com/en-us/azure/static-web-apps/)
