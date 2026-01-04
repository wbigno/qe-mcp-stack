# Documentation Generator - STDIO MCP

**Type:** STDIO MCP (AI-Powered)  
**Location:** `mcps/documentation-generator/`  
**Technology:** Node.js + Claude API  
**Status:** ✅ Production Ready

## Overview

AI-powered documentation generator for creating comprehensive technical documentation including API docs, architecture guides, setup instructions, deployment guides, and troubleshooting manuals.

## Input

```typescript
{
  data: {
    app: string;
    docType: "api" | "architecture" | "setup" | "deployment" | "troubleshooting" | "general";
    content: object;  // Content to document
    format?: "markdown" | "html" | "json";  // default: markdown
  }
}
```

## Output

Structured documentation with sections, table of contents, and formatted output.

## Doc Types

- **api** - API endpoint documentation
- **architecture** - System architecture docs
- **setup** - Installation/setup guides
- **deployment** - Deployment procedures
- **troubleshooting** - Problem-solving guides
- **general** - General technical docs

## Quick Start

```bash
cd mcps/documentation-generator
npm install
cat sample-input.json | node index.js
npm test
```

## Environment

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

## Performance

- **Generation Time:** 8-15 seconds
- **Tokens:** ~3,000-6,000

---

**Need help?** See `tests/test.js`
