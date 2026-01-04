# Security Analyzer - Comprehensive Security Scanning & Vulnerability Analysis

**Type:** Docker MCP (Always Running)  
**Port:** 3012  
**Container:** `qe-security-analyzer`  
**Location:** `mcps/security-analyzer/`  
**Technology:** Node.js 18 + Express + Security Pattern Detection  
**Status:** ✅ Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Configuration](#configuration)
5. [API Reference](#api-reference)
6. [Usage Examples](#usage-examples)
7. [Input/Output Schemas](#inputoutput-schemas)
8. [Data Persistence](#data-persistence)
9. [Development](#development)
10. [Testing](#testing)
11. [Error Handling](#error-handling)
12. [Troubleshooting](#troubleshooting)
13. [Monitoring](#monitoring)
14. [Integration](#integration)
15. [Changelog](#changelog)

---

## Overview

### Purpose

The **Security Analyzer** is a specialized MCP designed to identify security vulnerabilities, risks, and compliance issues in .NET C# applications through static code analysis. It detects SQL injection vulnerabilities, cross-site scripting (XSS) risks, insecure authentication patterns, hardcoded credentials and secrets, HIPAA compliance violations, insecure API integrations, sensitive data exposure, and provides remediation guidance with severity ratings (critical/high/medium/low). The service acts as an automated security review tool, identifying issues before they reach production.

This MCP addresses the reality that security vulnerabilities are often discovered too late - in penetration testing, security audits, or worse, in production breaches. When PHI (Protected Health Information) is at risk, when authentication is implemented insecurely, when SQL queries aren't parameterized, or when API keys are hardcoded in source, the Security Analyzer proactively identifies these issues, provides specific remediation steps, calculates security risk scores, and generates compliance reports.

The Security Analyzer is essential for pre-deployment security reviews, HIPAA compliance validation, developer security training (showing real examples), penetration test preparation, and security gate enforcement in CI/CD pipelines.

### Key Features

- ✅ **SQL Injection Detection** - Identifies unsafe SQL query construction and concatenation
- ✅ **XSS Vulnerability Detection** - Finds unescaped user input in HTML output
- ✅ **Authentication Analysis** - Detects weak authentication, missing authorization
- ✅ **Secret Detection** - Finds hardcoded passwords, API keys, connection strings
- ✅ **HIPAA Compliance** - Validates PHI handling, audit logging, encryption
- ✅ **API Security** - Analyzes API authentication, input validation, rate limiting
- ✅ **Sensitive Data Detection** - Identifies SSN, credit card numbers, PHI in logs
- ✅ **Security Risk Scoring** - Calculates overall security posture score
- ✅ **Remediation Guidance** - Provides specific fix recommendations with code examples
- ✅ **Compliance Reporting** - Generates HIPAA, PCI-DSS compliance reports

### Use Cases

1. **Pre-Deployment Security Review** - Scan code before deployment for vulnerabilities
2. **HIPAA Compliance Validation** - Verify PHI is properly secured
3. **Security Gate in CI/CD** - Block deployments with critical security issues
4. **Developer Security Training** - Show real vulnerability examples from codebase
5. **Penetration Test Prep** - Identify and fix issues before pentest
6. **Compliance Audit Preparation** - Generate evidence for security audits
7. **Third-Party Code Review** - Scan vendor/contractor code for security issues
8. **Security Metrics** - Track security posture over time

### What It Does NOT Do

- ❌ Does not perform dynamic security testing (DAST)
- ❌ Does not scan infrastructure/network (code only)
- ❌ Does not fix vulnerabilities (provides recommendations only)
- ❌ Does not replace penetration testing (complements with static analysis)
- ❌ Does not scan compiled binaries (source code only)

---

## Quick Start

### Via Orchestrator (Recommended)

```bash
# Run security scan
curl -X POST http://localhost:3000/api/security/scan \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'

# Get HIPAA compliance report
curl -X POST http://localhost:3000/api/security/hipaa-report \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'

# Check for secrets
curl -X POST http://localhost:3000/api/security/scan-secrets \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'
```

### Direct Access (Testing Only)

```bash
# Full security scan
curl -X POST http://localhost:3012/scan \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'

# Scan specific vulnerability type
curl -X POST http://localhost:3012/scan \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "scanType": "sql-injection"
  }'

# Get security score
curl -X POST http://localhost:3012/security-score \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'

# Generate compliance report
curl -X POST http://localhost:3012/compliance-report \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1",
    "standard": "hipaa"
  }'

# Scan for secrets
curl -X POST http://localhost:3012/scan-secrets \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'

# Health check
curl http://localhost:3012/health
```

### Expected Output

```json
{
  "success": true,
  "app": "App1",
  "securityScan": {
    "overallScore": 68,
    "grade": "C",
    "riskLevel": "medium",
    "assessment": "Multiple critical vulnerabilities require immediate attention",
    "vulnerabilities": [
      {
        "id": "SEC-001",
        "type": "SQL Injection",
        "severity": "critical",
        "cwe": "CWE-89",
        "file": "Services/PatientService.cs",
        "line": 45,
        "method": "SearchPatients",
        "code": "string query = \"SELECT * FROM Patients WHERE Name = '\" + searchTerm + \"'\";\nvar results = db.ExecuteQuery(query);",
        "vulnerability": "SQL injection vulnerability - user input directly concatenated into SQL query",
        "impact": "Attacker could extract entire patient database, modify records, or execute arbitrary SQL commands",
        "exploitability": "Easy - simple SQL injection payload in search field",
        "affectedData": "All patient PHI in database",
        "remediation": {
          "priority": "immediate",
          "effort": "low",
          "recommendation": "Use parameterized queries instead of string concatenation",
          "fixCode": "string query = \"SELECT * FROM Patients WHERE Name = @searchTerm\";\nvar cmd = new SqlCommand(query);\ncmd.Parameters.AddWithValue(\"@searchTerm\", searchTerm);\nvar results = cmd.ExecuteReader();",
          "references": [
            "https://owasp.org/www-community/attacks/SQL_Injection",
            "https://learn.microsoft.com/en-us/sql/connect/ado-net/sql/sqlparameter"
          ]
        },
        "compliance": {
          "hipaa": "Violation - PHI at risk of unauthorized access (164.312(a)(1))",
          "pci": "Violation if payment data accessible"
        }
      },
      {
        "id": "SEC-002",
        "type": "Hardcoded Secret",
        "severity": "critical",
        "cwe": "CWE-798",
        "file": "Services/Integration/EpicService.cs",
        "line": 12,
        "code": "private const string API_KEY = \"sk_live_abc123xyz789\";",
        "vulnerability": "API key hardcoded in source code",
        "impact": "If source code is exposed (GitHub leak, insider threat), attacker gains full Epic API access",
        "exploitability": "High - API key visible in source control history",
        "affectedData": "All Epic EMR data accessible with this key",
        "remediation": {
          "priority": "immediate",
          "effort": "low",
          "recommendation": "Store API keys in Azure Key Vault or environment variables",
          "fixCode": "private readonly string _apiKey = Environment.GetEnvironmentVariable(\"EPIC_API_KEY\");\n// Or use Azure Key Vault:\nprivate readonly string _apiKey = await keyVaultClient.GetSecretAsync(\"epic-api-key\");",
          "additionalSteps": [
            "Rotate the exposed API key immediately",
            "Remove key from git history using git-filter-repo",
            "Add secrets scanning to CI/CD pipeline"
          ]
        },
        "compliance": {
          "hipaa": "Violation - inadequate safeguards for PHI access (164.312(a)(2)(i))"
        }
      },
      {
        "id": "SEC-003",
        "type": "Missing Authorization",
        "severity": "high",
        "cwe": "CWE-862",
        "file": "Controllers/PatientController.cs",
        "line": 67,
        "method": "GetPatientChart",
        "code": "[HttpGet(\"{patientId}\")]\npublic IActionResult GetPatientChart(int patientId)\n{\n    var chart = _patientService.GetChart(patientId);\n    return Ok(chart);\n}",
        "vulnerability": "No authorization check - any authenticated user can access any patient chart",
        "impact": "Privacy violation - users can access charts for patients they shouldn't see",
        "exploitability": "Easy - change patientId parameter in URL",
        "affectedData": "All patient charts",
        "remediation": {
          "priority": "high",
          "effort": "medium",
          "recommendation": "Add authorization check to verify user has permission for this patient",
          "fixCode": "[HttpGet(\"{patientId}\")]\n[Authorize]\npublic IActionResult GetPatientChart(int patientId)\n{\n    if (!_authorizationService.CanAccessPatient(User, patientId))\n    {\n        return Forbid();\n    }\n    var chart = _patientService.GetChart(patientId);\n    return Ok(chart);\n}",
          "references": [
            "https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html"
          ]
        },
        "compliance": {
          "hipaa": "Violation - inadequate access controls (164.312(a)(4))"
        }
      },
      {
        "id": "SEC-004",
        "type": "Sensitive Data in Logs",
        "severity": "high",
        "cwe": "CWE-532",
        "file": "Services/BillingService.cs",
        "line": 89,
        "code": "_logger.LogInformation($\"Processing payment for SSN: {patient.SSN}, Card: {payment.CardNumber}\");",
        "vulnerability": "SSN and credit card number logged in plain text",
        "impact": "PHI and PCI data exposed in log files accessible to operations staff",
        "exploitability": "Low - requires log access",
        "affectedData": "Patient SSNs, credit card numbers",
        "remediation": {
          "priority": "high",
          "effort": "low",
          "recommendation": "Never log sensitive data; use redacted/masked values",
          "fixCode": "_logger.LogInformation($\"Processing payment for patient: {patient.Id}, Card: ****{payment.CardNumber.Substring(payment.CardNumber.Length - 4)}\");",
          "additionalSteps": [
            "Implement structured logging with sensitive data scrubbing",
            "Review all existing logs for sensitive data",
            "Restrict log access to authorized personnel only"
          ]
        },
        "compliance": {
          "hipaa": "Violation - PHI in unsecured logs (164.312(a)(1))",
          "pci": "Violation - cardholder data in logs (PCI DSS 3.4)"
        }
      },
      {
        "id": "SEC-005",
        "type": "XSS",
        "severity": "medium",
        "cwe": "CWE-79",
        "file": "Views/Patient/Search.cshtml",
        "line": 23,
        "code": "<div>Search results for: @Model.SearchTerm</div>",
        "vulnerability": "User input displayed without HTML encoding - XSS vulnerability",
        "impact": "Attacker could inject malicious scripts executed in victim's browser",
        "exploitability": "Medium - requires user to search for malicious payload",
        "remediation": {
          "priority": "medium",
          "effort": "low",
          "recommendation": "Use HTML encoding for user input",
          "fixCode": "<div>Search results for: @Html.Encode(Model.SearchTerm)</div>\n<!-- Or use Razor's default encoding: -->\n<div>Search results for: @Model.SearchTerm</div>  <!-- If Model.SearchTerm is string, Razor auto-encodes -->"
        },
        "compliance": {
          "hipaa": "Risk - XSS could lead to PHI disclosure"
        }
      },
      {
        "id": "SEC-006",
        "type": "Weak Cryptography",
        "severity": "medium",
        "cwe": "CWE-327",
        "file": "Services/EncryptionService.cs",
        "line": 34,
        "code": "using (var md5 = MD5.Create())\n{\n    return md5.ComputeHash(data);\n}",
        "vulnerability": "MD5 used for cryptographic purposes - MD5 is cryptographically broken",
        "impact": "Hashed data can be reversed using rainbow tables or collision attacks",
        "exploitability": "Medium - requires cryptographic expertise",
        "remediation": {
          "priority": "medium",
          "effort": "low",
          "recommendation": "Use SHA-256 or better for hashing; use AES-256 for encryption",
          "fixCode": "using (var sha256 = SHA256.Create())\n{\n    return sha256.ComputeHash(data);\n}\n// For encryption (not hashing):\nusing (var aes = Aes.Create())\n{\n    aes.KeySize = 256;\n    // Use AES for encryption\n}"
        },
        "compliance": {
          "hipaa": "Risk - weak encryption (164.312(a)(2)(iv))"
        }
      }
    ],
    "summary": {
      "totalVulnerabilities": 23,
      "bySeverity": {
        "critical": 2,
        "high": 4,
        "medium": 10,
        "low": 7
      },
      "byType": {
        "sqlInjection": 1,
        "xss": 3,
        "authentication": 2,
        "authorization": 2,
        "secrets": 2,
        "sensitiveData": 4,
        "weakCrypto": 3,
        "other": 6
      },
      "complianceStatus": {
        "hipaa": "non-compliant",
        "violations": 6,
        "recommendations": 12
      }
    },
    "prioritizedRemediation": [
      {
        "priority": 1,
        "issues": ["SEC-001", "SEC-002"],
        "action": "Fix critical SQL injection and rotate exposed API key",
        "effort": "2-4 hours",
        "impact": "Eliminates critical attack vectors"
      },
      {
        "priority": 2,
        "issues": ["SEC-003", "SEC-004"],
        "action": "Add authorization checks and remove sensitive data from logs",
        "effort": "4-8 hours",
        "impact": "Improves access control and reduces PHI exposure"
      },
      {
        "priority": 3,
        "issues": ["SEC-005", "SEC-006"],
        "action": "Fix XSS vulnerabilities and upgrade cryptography",
        "effort": "2-4 hours",
        "impact": "Reduces medium-severity risks"
      }
    ],
    "recommendations": [
      "IMMEDIATE: Fix SQL injection vulnerability before next deployment",
      "IMMEDIATE: Rotate exposed API key and implement secrets management",
      "HIGH: Implement authorization checks on all patient data endpoints",
      "HIGH: Remove sensitive data from logging",
      "Implement automated security scanning in CI/CD pipeline",
      "Conduct security training for development team",
      "Schedule penetration test after critical issues resolved"
    ]
  },
  "cached": false,
  "executionTime": 3450,
  "timestamp": "2024-12-29T10:30:00Z"
}
```

---

## Architecture

### Internal Design

```
┌─────────────────────────────────────────────────────────────────┐
│           Security Analyzer (Port 3012)                          │
│                                                                  │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────┐         │
│  │ Express  │──▶│ Vulnerability│──▶│ Pattern        │         │
│  │ Router   │   │ Scanner      │   │ Matcher        │         │
│  │          │   │              │   │                │         │
│  └──────────┘   └──────────────┘   └────────────────┘         │
│       │                │                    │                   │
│       ▼                ▼                    ▼                   │
│  HTTP API      Code Scanning       Security Patterns           │
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐      │
│  │ Compliance   │   │ Secret       │   │ Risk         │      │
│  │ Checker      │   │ Detector     │   │ Scorer       │      │
│  └──────────────┘   └──────────────┘   └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
   HIPAA Compliance    Hardcoded Secrets   Security Score
```

### Components

1. **Express Router** (`src/routes/`)
   - `POST /scan` - Full security scan
   - `POST /security-score` - Get security score
   - `POST /compliance-report` - Generate compliance report
   - `POST /scan-secrets` - Scan for hardcoded secrets
   - `GET /health` - Health check endpoint

2. **Vulnerability Scanner** (`src/scanners/vulnerabilityScanner.js`)
   - **SQL Injection Scanner** - Detects unsafe SQL construction
   - **XSS Scanner** - Finds unescaped user input
   - **Authentication Scanner** - Analyzes auth implementation
   - **Authorization Scanner** - Checks access controls

3. **Pattern Matcher** (`src/matchers/patternMatcher.js`)
   - **Regex Patterns** - SQL injection patterns
   - **AST Analysis** - Code structure analysis
   - **Data Flow Tracking** - Tracks user input flow
   - **Taint Analysis** - Identifies tainted data paths

4. **Secret Detector** (`src/detectors/secretDetector.js`)
   - **API Key Detector** - Finds hardcoded API keys
   - **Password Detector** - Finds hardcoded passwords
   - **Connection String Scanner** - Detects connection strings
   - **Certificate Scanner** - Finds embedded certificates

5. **Compliance Checker** (`src/checkers/complianceChecker.js`)
   - **HIPAA Validator** - Checks HIPAA requirements
   - **PCI-DSS Validator** - Checks payment card standards
   - **Audit Logger** - Validates audit logging
   - **Encryption Checker** - Validates encryption usage

6. **Risk Scorer** (`src/scorers/riskScorer.js`)
   - **Severity Calculator** - Calculates vulnerability severity
   - **Exploitability Assessor** - Assesses ease of exploitation
   - **Impact Analyzer** - Analyzes potential damage
   - **Overall Score Calculator** - Calculates security score

### Dependencies

**Internal:**
- code-analyzer (3001) - For code structure analysis

**External Services:**
- File system access to application code (`/mnt/apps/*`)
- Configuration access (`config/apps.json`)

**Libraries:**
- express - HTTP server
- acorn - JavaScript/TypeScript parsing
- @babel/parser - Alternative parser
- glob - File pattern matching
- winston - Logging

### Data Flow

```
1. HTTP Request (POST /scan)
   │
   ▼
2. Request Validation
   ├─▶ Validate app name
   └─▶ Load app configuration
       │
       ▼
3. Code File Discovery
   ├─▶ Scan for C# source files
   ├─▶ Scan for config files
   ├─▶ Scan for view files
   └─▶ Build file list
       │
       ▼
4. Vulnerability Scanning
   ├─▶ SQL Injection Scan
   │   ├─ Find SQL query construction
   │   ├─ Check for concatenation
   │   ├─ Verify parameterization
   │   └─ Flag vulnerabilities
   ├─▶ XSS Scan
   │   ├─ Find HTML output
   │   ├─ Check for encoding
   │   └─ Flag XSS risks
   ├─▶ Authentication Scan
   │   ├─ Find auth logic
   │   ├─ Check password storage
   │   └─ Validate JWT usage
   └─▶ Authorization Scan
       ├─ Find endpoint handlers
       ├─ Check for [Authorize]
       └─ Flag missing checks
       │
       ▼
5. Secret Detection
   ├─▶ Scan for API key patterns
   ├─▶ Scan for password patterns
   ├─▶ Scan for connection strings
   └─▶ Flag hardcoded secrets
       │
       ▼
6. Compliance Analysis
   ├─▶ Check HIPAA requirements
   ├─▶ Validate audit logging
   ├─▶ Check encryption usage
   └─▶ Flag violations
       │
       ▼
7. Remediation Generation
   ├─▶ Generate fix recommendations
   ├─▶ Provide code examples
   ├─▶ Add references
   └─▶ Prioritize by severity
       │
       ▼
8. Risk Scoring
   ├─▶ Calculate severity scores
   ├─▶ Assess exploitability
   ├─▶ Calculate overall score
   └─▶ Assign grade (A-F)
       │
       ▼
9. Response Assembly
   └─▶ Return JSON with vulnerabilities, score, recommendations
```

---

## Configuration

### Environment Variables

Located in `.env` (root directory)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | ❌ No | 3012 | Security analyzer HTTP port |
| `LOG_LEVEL` | ❌ No | info | Logging level (debug\|info\|warn\|error) |
| `CODE_ANALYZER_URL` | ❌ No | http://code-analyzer:3001 | Code analyzer service URL |

### Configuration Files

#### `config/security-patterns.json`

Security vulnerability patterns:

```json
{
  "sqlInjection": [
    {
      "pattern": "\"SELECT.*\\+.*\"",
      "description": "SQL string concatenation",
      "severity": "critical"
    }
  ],
  "secrets": [
    {
      "pattern": "sk_live_[a-zA-Z0-9]{24,}",
      "description": "Stripe API key",
      "severity": "critical"
    },
    {
      "pattern": "password\\s*=\\s*[\"'][^\"']+[\"']",
      "description": "Hardcoded password",
      "severity": "critical"
    }
  ]
}
```

### Docker Configuration

Located in `docker-compose.yml`:

```yaml
security-analyzer:
  build: ./mcps/security-analyzer
  container_name: qe-security-analyzer
  ports:
    - "3012:3012"
  environment:
    - NODE_ENV=production
    - PORT=3012
    - CODE_ANALYZER_URL=http://code-analyzer:3001
  env_file:
    - .env
  volumes:
    - ./config:/app/config:ro          # Configuration files
    - ./data/security-analyzer:/app/data   # Scan results
    - ${APP1_PATH}:/mnt/apps/app1:ro   # Application code (read-only)
  networks:
    - qe-network
  restart: unless-stopped
  depends_on:
    - code-analyzer
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3012/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

---

## API Reference

### Security Scanning Endpoints

#### POST /scan

Run comprehensive security scan

**Request Body:**
```typescript
{
  app: string;                    // Required: App name from apps.json
  scanType?: string;              // Optional: "sql-injection" | "xss" | "secrets" | "all"
  severity?: string;              // Optional: Min severity to report
}
```

**Response:**
```typescript
{
  success: boolean;
  app: string;
  securityScan: SecurityScanResult;
  cached: boolean;
  executionTime: number;
  timestamp: string;
}
```

**Example:**
```bash
curl -X POST http://localhost:3012/scan \
  -H "Content-Type: application/json" \
  -d '{
    "app": "App1"
  }'
```

---

#### POST /security-score

Get security score

**Request Body:**
```typescript
{
  app: string;                    // Required: App name
}
```

**Response:**
```typescript
{
  success: boolean;
  score: number;
  grade: string;
  riskLevel: string;
}
```

---

#### POST /compliance-report

Generate compliance report

**Request Body:**
```typescript
{
  app: string;                    // Required: App name
  standard: "hipaa" | "pci";      // Required: Compliance standard
}
```

**Response:**
```typescript
{
  success: boolean;
  compliance: ComplianceReport;
}
```

---

#### POST /scan-secrets

Scan for hardcoded secrets

**Request Body:**
```typescript
{
  app: string;                    // Required: App name
}
```

**Response:**
```typescript
{
  success: boolean;
  secrets: Secret[];
}
```

---

### Health Endpoints

#### GET /health

Service health check

**Response:**
```typescript
{
  status: "healthy" | "degraded" | "unhealthy";
  service: string;
  uptime: number;
  version: string;
  timestamp: string;
}
```

---

## Usage Examples

### Example 1: Pre-Deployment Security Scan

**Scenario:** Run security scan before deployment

```bash
curl -X POST http://localhost:3012/scan \
  -d '{"app":"App1"}' | \
  jq '.securityScan.summary.bySeverity'
```

**Output:**
```json
{
  "critical": 2,
  "high": 4,
  "medium": 10,
  "low": 7
}
```

**Action:** Block deployment if critical > 0

---

### Example 2: HIPAA Compliance Check

**Scenario:** Generate HIPAA compliance report

```bash
curl -X POST http://localhost:3012/compliance-report \
  -d '{"app":"App1","standard":"hipaa"}'
```

---

### Example 3: CI/CD Security Gate

**Scenario:** Fail build if critical vulnerabilities found

```bash
#!/bin/bash
CRITICAL=$(curl -s -X POST http://localhost:3012/scan \
  -d '{"app":"App1"}' | \
  jq '.securityScan.summary.bySeverity.critical')

if [ "$CRITICAL" -gt 0 ]; then
  echo "❌ SECURITY FAILURE: $CRITICAL critical vulnerabilities"
  exit 1
fi
```

---

## Input/Output Schemas

### Input Schema: Scan Request

```typescript
interface ScanRequest {
  app: string;
  scanType?: string;
  severity?: string;
}
```

---

### Output Schema: Security Scan Result

```typescript
interface SecurityScanResult {
  overallScore: number;
  grade: string;
  riskLevel: string;
  assessment: string;
  vulnerabilities: Vulnerability[];
  summary: Summary;
  prioritizedRemediation: RemediationPlan[];
  recommendations: string[];
}

interface Vulnerability {
  id: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  cwe: string;
  file: string;
  line: number;
  code: string;
  vulnerability: string;
  impact: string;
  exploitability: string;
  remediation: Remediation;
  compliance?: ComplianceImpact;
}
```

---

## Data Persistence

### Storage Locations

```
./data/security-analyzer/
├── scans/
│   ├── App1-scan-2024-12-29.json
│   └── App2-scan-2024-12-29.json
└── logs/
    └── security-analyzer.log
```

---

## Development

### Local Setup

```bash
cd mcps/security-analyzer
npm install
cp ../../.env.example .env
```

---

## Testing

### Unit Tests

```bash
npm test
```

---

## Error Handling

### Common Error Codes

| Code | HTTP Status | Description | Solution |
|------|-------------|-------------|----------|
| `INVALID_APP` | 400 | App not found | Verify app name in apps.json |
| `NO_SOURCE_FILES` | 404 | No source files found | Check application path |

---

## Troubleshooting

### Issue: False positives

**Solution:** Tune patterns in security-patterns.json

---

## Monitoring

### Health Checks

```bash
curl http://localhost:3012/health
```

---

## Integration

### Used By

**Orchestrator:** `POST /api/security/scan`

### Uses

**Code Analyzer:** For code structure analysis

---

## Changelog

### v1.0.0 (2024-12-29)
- ✅ Initial production release
- ✅ SQL injection detection
- ✅ XSS detection
- ✅ Secret scanning
- ✅ HIPAA compliance checking

---

**Need help?** View logs with `docker compose logs -f security-analyzer`
