# Infrastructure Dashboard Enhancement Plan

## Branch: `infra-enhancements`

## Overview

Enhance the Authentication Flow Testing and API Endpoints sections to:

1. Display the actual token/key in the success message (masked with reveal option)
2. Make API Endpoints functional - users can call endpoints using the obtained token

---

## Services That Will Receive This Enhancement

### Services with Authentication + Endpoints Defined

| App          | Integration         | Auth Method                  | Endpoints   | Priority |
| ------------ | ------------------- | ---------------------------- | ----------- | -------- |
| ServiceLayer | **Nice InContact**  | OAuth 2.0 Client Credentials | 3 endpoints | HIGH     |
| ServiceLayer | **Payeezy**         | API Secret + HMAC            | 2 endpoints | HIGH     |
| ServiceLayer | **RevSpring**       | OAuth token-based            | 2 endpoints | MEDIUM   |
| ServiceLayer | **Payments API**    | API Key (X-API-Key)          | 2 endpoints | HIGH     |
| ServiceLayer | **Integration API** | Multi-API Key/OAuth          | 3 endpoints | HIGH     |
| Payments     | **Payeezy**         | API Secret + HMAC            | 2 endpoints | MEDIUM   |
| PreCare      | **ServiceLayer**    | API Key                      | 4 endpoints | MEDIUM   |

### Total: 7 integrations, 18 endpoints

---

## Implementation Plan

### Phase 1: Token Display Enhancement

**File:** `infrastructure-dashboard/src/components/panels/AuthTestSection.tsx`

**Changes:**

1. Store the obtained token in state after successful auth
2. Display token in success message with masking
3. Add "Copy Token" button
4. Add "Show/Hide" toggle for token visibility

**New State:**

```typescript
const [obtainedToken, setObtainedToken] = useState<string | null>(null);
```

**UI Enhancement:**

```
┌─────────────────────────────────────────────────────────┐
│ ✓ Authentication Successful                             │
│ ⏱ 833ms                              Status: 200        │
│                                                         │
│ Token: eyJhbGciOiJIUzI1NiIs... ●●●●●●●●  [👁] [📋 Copy] │
│                                                         │
│ Token expires: 2026-01-16 06:00:00 (55 min remaining)  │
└─────────────────────────────────────────────────────────┘
```

---

### Phase 2: Interactive Endpoint Tester Component

**New File:** `infrastructure-dashboard/src/components/panels/EndpointTester.tsx`

**Purpose:** Make each endpoint clickable with ability to:

- Use obtained token automatically
- Edit path parameters (e.g., `{agentId}`)
- Provide request body for POST/PUT
- Execute request and display response

**UI Design:**

```
┌─────────────────────────────────────────────────────────┐
│ API Endpoints                                           │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ POST  /token                                    [▶] │ │
│ │ Get OAuth token                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ GET   /agents/{agentId}                         [▶] │ │
│ │ Get agent details                                   │ │
│ │ ┌───────────────────────────────────────────────┐   │ │
│ │ │ Path Parameters:                              │   │ │
│ │ │ agentId: [_____________]                      │   │ │
│ │ └───────────────────────────────────────────────┘   │ │
│ │ ┌───────────────────────────────────────────────┐   │ │
│ │ │ Response: 200 OK (234ms)                      │   │ │
│ │ │ {                                             │   │ │
│ │ │   "agentId": "12345",                         │   │ │
│ │ │   "name": "John Doe",                         │   │ │
│ │ │   ...                                         │   │ │
│ │ │ }                                             │   │ │
│ │ └───────────────────────────────────────────────┘   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ POST  /contacts                                 [▶] │ │
│ │ Log call contact                                    │ │
│ │ ┌───────────────────────────────────────────────┐   │ │
│ │ │ Request Body (JSON):                          │   │ │
│ │ │ {                                             │   │ │
│ │ │   "contactType": "phone",                     │   │ │
│ │ │   "duration": 120                             │   │ │
│ │ │ }                                             │   │ │
│ │ └───────────────────────────────────────────────┘   │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Component Props:**

```typescript
interface EndpointTesterProps {
  endpoint: {
    method: string;
    path: string;
    purpose: string;
    pathParams?: string[];
    requestBody?: object;
  };
  environment: Environment; // From existing EnvironmentSelector
  baseUrl: string; // Auto-selected based on environment
  token: string | null; // From AuthTestSection
  authMethod: string;
  onExecute: (result: EndpointResult) => void;
}
```

**Key Behavior:**

- Uses `environment` prop from parent (selected via existing header navigation)
- When `environment` is 'preprod' or 'prod', shows disabled message instead of execute button
- `baseUrl` is automatically set based on selected environment
- No new environment selector UI - keeps dashboard consistent

---

### Phase 3: Backend Proxy for CORS

**File:** `orchestrator/src/routes/infrastructure.js` (new route)

**Purpose:** Proxy API calls to avoid CORS issues when calling external APIs from the browser.

**New Endpoint:**

```
POST /api/infrastructure/proxy
```

**Request Body:**

```json
{
  "url": "https://api-c48.nice-incontact.com/inContactAPI/services/v22.0/agents/12345",
  "method": "GET",
  "headers": {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIs..."
  },
  "body": null
}
```

**Response:**

```json
{
  "status": 200,
  "statusText": "OK",
  "headers": { "content-type": "application/json" },
  "data": { "agentId": "12345", "name": "John Doe" },
  "latencyMs": 234
}
```

---

### Phase 4: Update Infrastructure API Service

**File:** `infrastructure-dashboard/src/services/api.ts`

**Add Methods:**

```typescript
// Execute endpoint via proxy
static async executeEndpoint(request: {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: object;
}): Promise<EndpointResponse>

// Update testAuthConfig to return token
static async testAuthConfig(
  appKey: string,
  integrationKey: string,
  authConfig: AuthConfig
): Promise<AuthTestResult & { token?: string; expiresAt?: string }>
```

---

### Phase 5: Enhance Endpoint Data Structure

**File:** `orchestrator/src/data/carePaymentApps.js`

**Add to endpoint objects:**

```javascript
endpoints: [
  {
    method: "GET",
    path: "/agents/{agentId}",
    purpose: "Get agent details",
    pathParams: ["agentId"], // NEW: List of path parameters
    queryParams: [], // NEW: List of query parameters
    requestBody: null, // NEW: Sample request body
    responseExample: {
      // NEW: Example response
      agentId: "string",
      name: "string",
      status: "active | inactive",
    },
  },
];
```

---

## File Changes Summary

| File                                       | Action | Description                                                           |
| ------------------------------------------ | ------ | --------------------------------------------------------------------- |
| `AuthTestSection.tsx`                      | MODIFY | Add token display, copy, expiration; accept environment/baseUrl props |
| `EndpointTester.tsx`                       | CREATE | New interactive endpoint component with environment awareness         |
| `IntegrationView.tsx`                      | MODIFY | Accept environment/baseUrl props, pass token to EndpointTester        |
| `InfrastructureDashboard.tsx`              | MODIFY | Pass environment/baseUrl to IntegrationView                           |
| `orchestrator/routes/infrastructure.js`    | MODIFY | Add API proxy endpoint                                                |
| `infrastructure-dashboard/services/api.ts` | MODIFY | Add proxy call method                                                 |
| `carePaymentApps.js`                       | MODIFY | Enhance endpoint definitions with pathParams, requestBody             |
| `infrastructure/types.ts`                  | MODIFY | Add EndpointTesterProps, EndpointResult types                         |

---

## Detailed Changes by Integration

### 1. Nice InContact (OAuth 2.0)

- Auth returns: `access_token`, `expires_in`
- Store and display token
- Enable: `/token`, `/agents/{agentId}`, `/contacts`

### 2. Payeezy (HMAC)

- Auth returns: HMAC signature validation
- Store API key for subsequent calls
- Enable: `/payment/v1/charges`, `/payment/v1/tokens`

### 3. RevSpring (OAuth)

- Auth returns: `access_token`
- Store and display token
- Enable: `/payments`, `/statements/{accountId}`

### 4. Payments API (API Key)

- Uses X-API-Key header
- Key already stored in localStorage
- Enable: `/Payments/Payeezy`, `/CarePayment/FiServ/PaymentInformations/{accountNumber}`

### 5. Integration API (Multi-Auth)

- Supports both API Key and OAuth
- Enable: `/v1/accounts/accountNumber/{accountNumber}`, `/v1/payments`, `/v1/tokenize`

### 6. ServiceLayer (API Key)

- Uses ServiceLayerAccessKey
- Enable PreCare endpoints: `/PreCare/Submit`, `/PreCare/{id}`, `/PreCare/UpdatePreCareInfo`, `/PreCare/Tracking`

---

## Integration with Existing Environment Navigation

The dashboard already has an `EnvironmentSelector` component (`src/components/common/EnvironmentSelector.tsx`) that provides:

- Environment buttons: Local | Dev | QA | QA2 | Staging | PreProd | Prod
- Selected environment state managed in parent component
- Environment-specific base URLs via `app.baseUrls?.[environment]`

### How Endpoint Tester Uses Existing Navigation

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Header                                                                  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ Local │ Dev │ QA │ QA2 │ Staging │ PreProd │ Prod                 │  │
│  │       ├─────┴────┴─────┴─────────┤         │      │               │  │
│  │       │    ✅ ENABLED            │   ❌ DISABLED   │               │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Base URL: https://qa-api.example.com  ← Auto-updates with selection    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  API Endpoints (when QA selected)                                        │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ GET /agents/{agentId}                                       [▶] │    │
│  │ Uses: https://qa-api.example.com/agents/{agentId}               │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  API Endpoints (when Prod selected)                                      │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ ⚠️ Endpoint testing is disabled in production environments       │    │
│  │    Switch to Dev, QA, QA2, or Staging to test endpoints         │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Props Flow Changes

**Current Flow:**

```
InfrastructureDashboard (manages environment state)
  → Header (receives environment, displays EnvironmentSelector)
  → IntegrationView (does NOT receive environment)
    → AuthTestSection (does NOT receive environment)
```

**New Flow:**

```
InfrastructureDashboard (manages environment state)
  → Header (receives environment, displays EnvironmentSelector)
  → IntegrationView (receives environment, baseUrl)
    → AuthTestSection (receives environment, baseUrl)
    → EndpointTester (receives environment, baseUrl, token)
```

---

## Security Considerations

1. **Environment Restriction**: Endpoint tester ONLY available in `local`, `dev`, `qa`, `qa2`, `staging` - **NEVER in `preprod` or `prod`**
2. **Token Storage**: Tokens stored in memory/sessionStorage only (not localStorage for OAuth)
3. **Token Masking**: Tokens displayed masked by default, with reveal option
4. **Proxy Validation**: Backend proxy validates request URLs against whitelist of known integration base URLs
5. **No Secrets in Frontend**: API secrets and client credentials never sent to frontend
6. **Request Logging**: All proxy requests logged for audit purposes

### Environment Enforcement

**Frontend Check (EndpointTester.tsx):**

```typescript
// Uses the environment from existing EnvironmentSelector - no new UI needed!
const ALLOWED_ENVIRONMENTS = ['local', 'dev', 'qa', 'qa2', 'staging'];

interface EndpointTesterProps {
  environment: Environment;  // Passed from parent via existing selector
  baseUrl: string;           // Auto-selected based on environment
  // ...
}

// In component:
const isEnvironmentAllowed = ALLOWED_ENVIRONMENTS.includes(environment);

if (!isEnvironmentAllowed) {
  return (
    <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
      <div className="flex items-center gap-2 text-yellow-400">
        <AlertTriangle className="w-5 h-5" />
        <span>Endpoint testing is disabled in {environment}</span>
      </div>
      <p className="text-sm text-tertiary mt-2">
        Switch to Local, Dev, QA, QA2, or Staging to test endpoints
      </p>
    </div>
  );
}
```

**Backend Check (infrastructure.js proxy):**

```javascript
const BLOCKED_ENVIRONMENTS = ["preprod", "prod", "production"];
if (BLOCKED_ENVIRONMENTS.includes(process.env.NODE_ENV)) {
  return res.status(403).json({
    error: "Endpoint testing is disabled in production environments",
  });
}
```

**UI Consistency:**

- NO new environment selector needed - uses existing header navigation
- Base URL automatically updates when user switches environment
- When preprod/prod selected, show inline message instead of hiding section

---

## Testing Plan

1. **Nice InContact Flow:**
   - Authenticate → Get token → Call /agents/{agentId} → Verify response

2. **Payeezy Flow:**
   - Enter API key → Validate → Call /payment/v1/tokens → Verify tokenization

3. **Error Handling:**
   - Invalid token → Show error message
   - Network failure → Show retry option
   - 401 Unauthorized → Prompt re-authentication

---

## Estimated Effort

| Phase                     | Effort     |
| ------------------------- | ---------- |
| Phase 1: Token Display    | Small      |
| Phase 2: Endpoint Tester  | Medium     |
| Phase 3: Backend Proxy    | Medium     |
| Phase 4: API Service      | Small      |
| Phase 5: Data Enhancement | Small      |
| **Total**                 | **Medium** |

---

## Questions for Approval

1. ~~Should we limit which environments can use the endpoint tester?~~ ✅ **RESOLVED: dev, qa, qa2, staging only - never preprod/prod**
2. Should we add request/response history logging?
3. Do you want to include request timing metrics in the UI?
4. Should failed requests be retryable with a single click?

---

_Plan created: January 16, 2026_
_Branch: infra-enhancements_
