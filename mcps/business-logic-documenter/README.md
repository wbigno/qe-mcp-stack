# Business Logic Documenter - STDIO MCP

**Type:** STDIO MCP (AI-Powered)  
**Location:** `mcps/business-logic-documenter/`  
**Technology:** Node.js + Claude API  
**Status:** ✅ Production Ready

## Overview

AI-powered documentation generator that extracts and documents business logic from source code, focusing on WHAT and WHY rather than just HOW.

## Input

```typescript
{
  data: {
    app: string;
    className: string;
    sourceCode: string;
    format?: "markdown" | "html" | "json";  // default: markdown
  }
}
```

## Output

Comprehensive business logic documentation including:
- Business overview and purpose
- Business rules with rationale
- Workflows and processes
- Validation rules with justification
- External integrations
- Security considerations
- Data flow
- Business exceptions
- Decision points
- Performance considerations
- Formatted documentation (markdown/html/json)

## Key Features

✅ Business-focused documentation  
✅ Extracts business rules  
✅ Documents workflows  
✅ Explains validation logic  
✅ Multiple output formats  
✅ User impact analysis  
✅ Decision point documentation  

## Quick Start

```bash
cd mcps/business-logic-documenter
npm install
cat sample-input.json | node index.js
npm test
```

## Example Output

```json
{
  "overview": {
    "purpose": "Manages user registration and account creation",
    "responsibilities": [
      "Validate user registration data",
      "Enforce business rules for user creation",
      "Coordinate with repository and email services"
    ],
    "businessValue": "Ensures only valid users can register while maintaining data integrity and compliance"
  },
  "businessRules": [
    {
      "rule": "Users must be 18 or older to register",
      "implementation": "Age validation in RegisterUser method",
      "location": "UserService.RegisterUser()",
      "rationale": "Legal requirement for handling personal data and contractual agreements"
    },
    {
      "rule": "Email addresses must be unique across all users",
      "implementation": "Database lookup before user creation",
      "location": "UserService.RegisterUser()",
      "rationale": "Prevents duplicate accounts and ensures unique identity"
    }
  ],
  "workflows": [
    {
      "name": "User Registration",
      "trigger": "User submits registration form",
      "steps": [
        {
          "step": 1,
          "action": "Validate age requirement (18+)",
          "businessReason": "Legal compliance",
          "method": "RegisterUser"
        },
        {
          "step": 2,
          "action": "Check email uniqueness",
          "businessReason": "Prevent duplicate accounts",
          "method": "RegisterUser"
        },
        {
          "step": 3,
          "action": "Validate password complexity",
          "businessReason": "Security and data protection",
          "method": "IsPasswordComplex"
        },
        {
          "step": 4,
          "action": "Create user account",
          "businessReason": "Persist user data",
          "method": "RegisterUser"
        },
        {
          "step": 5,
          "action": "Send welcome email",
          "businessReason": "User engagement and verification",
          "method": "RegisterUser"
        }
      ],
      "outcomes": [
        "Success: User account created",
        "Failure: Validation error returned"
      ],
      "edgeCases": [
        "Email already exists",
        "User under 18",
        "Weak password"
      ]
    }
  ],
  "validationRules": [
    {
      "field": "Age",
      "rule": "Must be >= 18",
      "errorMessage": "User must be 18 or older to register",
      "businessJustification": "Legal requirement for data processing consent"
    },
    {
      "field": "Password",
      "rule": "Minimum 8 characters with upper, lower, and digit",
      "errorMessage": "Password does not meet complexity requirements",
      "businessJustification": "Security best practices to protect user accounts"
    }
  ],
  "integrations": [
    {
      "system": "Email Service",
      "purpose": "Send welcome emails to new users",
      "methods": ["RegisterUser"],
      "dataExchanged": "Email address and welcome message"
    },
    {
      "system": "User Repository",
      "purpose": "Store and retrieve user data",
      "methods": ["RegisterUser"],
      "dataExchanged": "User entity with credentials"
    }
  ],
  "documentation": {
    "markdown": "# UserService Business Logic\n\n## Overview\n...",
    "summary": "Manages user registration with age, email uniqueness, and password complexity validations"
  }
}
```

## Use Cases

- **Onboarding** - Help new developers understand business logic
- **Compliance** - Document business rules for audits
- **Knowledge Transfer** - Preserve business knowledge
- **Code Reviews** - Understand business intent
- **API Documentation** - Explain business behavior

## Environment

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

## Performance

- **Generation Time:** 8-15 seconds
- **Tokens:** ~3,000-6,000
- **Memory:** ~50-100 MB

---

**Need help?** See `tests/test.js`
