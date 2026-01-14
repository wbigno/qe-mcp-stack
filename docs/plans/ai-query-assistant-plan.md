# AI Query Assistant - Implementation Plan

## Overview

An AI-powered SQL query generator integrated into the Infrastructure Dashboard's Database tab. Users describe what they're looking for in natural language, and the AI generates optimized SQL queries based on the full database schema.

---

## User Decisions

| Decision           | Choice                            |
| ------------------ | --------------------------------- |
| Query Execution    | Display only (copy/paste)         |
| Complexity Support | Full SQL (subqueries, CTEs, etc.) |

---

## Feature Design

### UI Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Database Tab Sub-navigation:                                                │
│  [📋 Tables] [🔗 ERD] [⚖️ Compare] [🤖 Query Assistant] [📖 Dictionary]     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  🤖 AI Query Assistant                           Database: [CarePayment ▼]  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ What data are you looking for?                                        │  │
│  │                                                                        │  │
│  │ [                                                                    ] │  │
│  │                                                                        │  │
│  │ Examples:                                                              │  │
│  │ • "Find patients with balance over $1000 who haven't paid in 60 days"│  │
│  │ • "Show settlement totals by logo for last month"                     │  │
│  │ • "List all Epic patient events that failed sync"                     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  [🚀 Generate Query]                                                         │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  📚 Common Queries                                                           │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐│
│  │ 💰 Patient     │ │ 📊 Settlement  │ │ 🏥 Epic        │ │ 💳 FiServ      ││
│  │ Balances       │ │ Reports        │ │ Integration    │ │ Statements     ││
│  └────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  📝 Generated Query                                         [📋 Copy SQL]   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ WITH RecentPayments AS (                                              │  │
│  │     SELECT                                                            │  │
│  │         CardAccountID,                                                │  │
│  │         MAX(PostingDate) AS LastPaymentDate                          │  │
│  │     FROM CarePayment.CardAccountLedger                               │  │
│  │     WHERE TransactionType = 'Payment'                                │  │
│  │     GROUP BY CardAccountID                                           │  │
│  │ )                                                                     │  │
│  │ SELECT                                                                │  │
│  │     pa.PAAcctID,                                                      │  │
│  │     pa.PatientName,                                                   │  │
│  │     pa.Balance,                                                       │  │
│  │     rp.LastPaymentDate,                                              │  │
│  │     DATEDIFF(day, rp.LastPaymentDate, GETDATE()) AS DaysSincePayment │  │
│  │ FROM CarePayment.SitePatientAccount pa                               │  │
│  │ LEFT JOIN RecentPayments rp ON pa.CardAccountID = rp.CardAccountID   │  │
│  │ WHERE pa.Balance > 1000                                               │  │
│  │   AND (rp.LastPaymentDate IS NULL                                    │  │
│  │        OR DATEDIFF(day, rp.LastPaymentDate, GETDATE()) > 60)        │  │
│  │ ORDER BY pa.Balance DESC;                                             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  💡 Query Explanation                                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ This query finds patients with high balances who haven't paid         │  │
│  │ recently:                                                             │  │
│  │                                                                        │  │
│  │ 1. CTE (RecentPayments): Finds the most recent payment date for each │  │
│  │    card account from the CardAccountLedger table                      │  │
│  │                                                                        │  │
│  │ 2. Main Query: Joins patient accounts with their last payment,       │  │
│  │    filtering for balances > $1000 and no payment in 60+ days         │  │
│  │                                                                        │  │
│  │ Tables Used:                                                          │  │
│  │ • CarePayment.SitePatientAccount (patient account info)              │  │
│  │ • CarePayment.CardAccountLedger (transaction history)                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ⚠️ Warnings                                                                 │
│  • Large result set possible - consider adding TOP 1000                     │
│  • LEFT JOIN may include patients with no payment history                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture

### Data Flow

```
┌──────────────────┐
│  User types:     │
│  "Find patients  │
│  with balance    │
│  over $1000..."  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│  Dashboard       │────►│  Orchestrator    │
│  QueryAssistant  │     │  /api/ai/query   │
└──────────────────┘     └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │  Build Context   │
                         │  - Schema JSON   │
                         │  - Relationships │
                         │  - Business rules│
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │  Claude AI       │
                         │  Generate SQL    │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │  Validate Query  │
                         │  - Check tables  │
                         │  - Check columns │
                         │  - Add warnings  │
                         └────────┬─────────┘
                                  │
                                  ▼
┌──────────────────┐     ┌──────────────────┐
│  Display SQL     │◄────│  Response        │
│  + Explanation   │     │  + Metadata      │
└──────────────────┘     └──────────────────┘
```

### API Design

#### Request

```typescript
POST /api/ai/generate-query

{
  "database": "CarePayment",
  "environment": "PROD",  // For schema selection
  "prompt": "Find all patients with outstanding balance over $1000 who haven't made a payment in the last 60 days",
  "options": {
    "includeExplanation": true,
    "includeWarnings": true,
    "maxComplexity": "full"  // simple | medium | full
  }
}
```

#### Response

```typescript
{
  "success": true,
  "query": {
    "sql": "WITH RecentPayments AS (...) SELECT ...",
    "formatted": true
  },
  "explanation": {
    "summary": "Finds patients with high balances who haven't paid recently",
    "steps": [
      "CTE finds most recent payment for each account",
      "Main query filters by balance and payment date"
    ],
    "tablesUsed": [
      {
        "schema": "CarePayment",
        "table": "SitePatientAccount",
        "purpose": "Patient account information"
      },
      {
        "schema": "CarePayment",
        "table": "CardAccountLedger",
        "purpose": "Transaction history"
      }
    ]
  },
  "warnings": [
    {
      "type": "performance",
      "message": "Large result set possible - consider adding TOP 1000"
    },
    {
      "type": "logic",
      "message": "LEFT JOIN may include patients with no payment history"
    }
  ],
  "metadata": {
    "complexity": "medium",
    "estimatedRows": "unknown",
    "queryType": "SELECT"
  }
}
```

---

## Schema Context for AI

The AI needs comprehensive schema context to generate accurate queries.

### Context Structure

```typescript
interface SchemaContext {
  database: string;
  environment: string;

  // All schemas with their tables
  schemas: {
    name: string;
    tables: {
      name: string;
      description?: string;
      columns: {
        name: string;
        dataType: string;
        nullable: boolean;
        isPrimaryKey: boolean;
        isForeignKey: boolean;
        foreignKeyRef?: string; // "Schema.Table.Column"
      }[];
    }[];
  }[];

  // Explicit relationships
  relationships: {
    from: string; // "Schema.Table.Column"
    to: string; // "Schema.Table.Column"
    type: "one-to-one" | "one-to-many" | "many-to-many";
  }[];

  // Business context
  businessRules: {
    table: string;
    rules: string[];
  }[];
}
```

### AI System Prompt

```
You are a SQL Server expert assistant. Generate optimized T-SQL queries based on user requests.

CONTEXT:
- Database: CarePayment (SQL Server)
- Environment: PROD
- Schema includes: Accounting, CarePayment, Epic, FiServ, etc.

RULES:
1. Generate only SELECT statements (no INSERT, UPDATE, DELETE)
2. Always use fully qualified table names (Schema.TableName)
3. Use appropriate JOINs based on foreign key relationships
4. Include helpful column aliases
5. Add ORDER BY for meaningful result ordering
6. Consider performance (avoid SELECT * on large tables)

SCHEMA SUMMARY:
{schemaContext}

USER REQUEST:
{userPrompt}

Respond with:
1. The SQL query
2. Brief explanation of the logic
3. List of tables used
4. Any warnings or considerations
```

---

## Common Queries Library

Pre-built queries for frequent use cases.

### Categories

#### 1. Patient & Account Queries

```typescript
const patientQueries = [
  {
    id: "patient-balance-summary",
    name: "Patient Balance Summary",
    description: "Overview of patient account balances",
    sql: `SELECT
    pa.SiteIdentifier,
    COUNT(*) AS TotalAccounts,
    SUM(pa.Balance) AS TotalBalance,
    AVG(pa.Balance) AS AvgBalance,
    MAX(pa.Balance) AS MaxBalance
FROM CarePayment.SitePatientAccount pa
GROUP BY pa.SiteIdentifier
ORDER BY TotalBalance DESC;`,
  },
  {
    id: "patient-payment-history",
    name: "Patient Payment History",
    description: "Recent payments for a specific patient",
    parameters: ["PatientAccountID"],
    sql: `SELECT
    cal.PostingDate,
    cal.TransactionAmt,
    cal.TransactionType,
    cal.ReferenceNumber
FROM CarePayment.CardAccountLedger cal
WHERE cal.CardAccountID = @PatientAccountID
ORDER BY cal.PostingDate DESC;`,
  },
];
```

#### 2. Settlement Queries

```typescript
const settlementQueries = [
  {
    id: "settlement-by-date",
    name: "Settlement Totals by Date",
    description: "Settlement amounts grouped by funding date",
    sql: `SELECT
    sh.SHDFundingDate,
    slg.SLGDescription AS LogoGroup,
    COUNT(sd.SDTID) AS TransactionCount,
    SUM(sd.SDTNetAmount) AS NetAmount
FROM Accounting.SettHeader sh
INNER JOIN Accounting.SettDetail sd ON sh.SHDID = sd.SHDID
INNER JOIN Accounting.SettConfigLogoGroup slg ON sh.SLGID = slg.SLGID
GROUP BY sh.SHDFundingDate, slg.SLGDescription
ORDER BY sh.SHDFundingDate DESC;`,
  },
];
```

#### 3. Epic Integration Queries

```typescript
const epicQueries = [
  {
    id: "epic-patient-sync",
    name: "Epic Patient Sync Status",
    description: "Patients with Epic integration events",
    sql: `SELECT
    pi.PatientID,
    pi.FirstName,
    pi.LastName,
    pe.EventType,
    pe.EventDate,
    pet.Description AS EventTypeDesc
FROM Epic.PatientInformation pi
LEFT JOIN Epic.PatientEvent pe ON pi.PatientID = pe.PatientID
LEFT JOIN Epic.PatientEventType pet ON pe.EventTypeID = pet.EventTypeID
ORDER BY pe.EventDate DESC;`,
  },
];
```

#### 4. FiServ Queries

```typescript
const fiservQueries = [
  {
    id: "fiserv-card-account",
    name: "FiServ Card Account Details",
    description: "Card account information from FiServ",
    sql: `SELECT
    ca.CardAccountID,
    ca.AccountStatus,
    ca.OpenDate,
    ca.CreditLimit,
    ca.CurrentBalance,
    na.FirstName,
    na.LastName
FROM FiServ.CardAccount ca
INNER JOIN FiServ.NameAddress na ON ca.CardAccountID = na.CardAccountID
WHERE na.AddressType = 'P';`  -- Primary address
  }
];
```

---

## Implementation Steps

### Phase 1: Backend API (Orchestrator)

- [ ] Create `/api/ai/generate-query` endpoint
- [ ] Build schema context loader
- [ ] Integrate with Claude AI
- [ ] Add query validation
- [ ] Implement response formatting

### Phase 2: Frontend Component

- [ ] Create `QueryAssistant.tsx` component
- [ ] Build natural language input with examples
- [ ] Add SQL syntax highlighting (Prism.js)
- [ ] Implement copy-to-clipboard
- [ ] Add loading states and error handling

### Phase 3: Common Queries

- [ ] Create query library data structure
- [ ] Build category selector UI
- [ ] Implement parameterized queries
- [ ] Add query favoriting (localStorage)

### Phase 4: Polish

- [ ] Add query history (recent queries)
- [ ] Implement query explanation toggle
- [ ] Add "Refine Query" for follow-up requests
- [ ] Dark mode syntax highlighting

---

## Files to Create

### Backend (Orchestrator)

```
orchestrator/src/
├── routes/
│   └── ai.js                    # NEW - AI endpoints
├── services/
│   └── queryGenerator.js        # NEW - Query generation logic
└── prompts/
    └── sqlGenerator.txt         # NEW - AI system prompt
```

### Frontend (Infrastructure Dashboard)

```
infrastructure-dashboard/src/
├── components/panels/
│   └── QueryAssistant.tsx       # NEW - Main component
├── data/
│   └── commonQueries.ts         # NEW - Query library
├── services/
│   └── queryApi.ts              # NEW - API client
└── utils/
    └── sqlFormatter.ts          # NEW - SQL formatting
```

---

## Example Prompts & Outputs

### Example 1: Simple Query

**Input:** "Show me the top 10 patients with highest balance"

**Output:**

```sql
SELECT TOP 10
    pa.PAAcctID,
    pa.PatientName,
    pa.Balance,
    pa.SiteIdentifier
FROM CarePayment.SitePatientAccount pa
ORDER BY pa.Balance DESC;
```

### Example 2: Complex Join

**Input:** "Find all settlements from last month that had adjustments"

**Output:**

```sql
SELECT
    sh.SHDID,
    sh.SHDStartDate,
    sh.SHDEndDate,
    sh.SHDFundingDate,
    slg.SLGDescription AS LogoGroup,
    sa.SADAmount AS AdjustmentAmount,
    sat.SATDescription AS AdjustmentType
FROM Accounting.SettHeader sh
INNER JOIN Accounting.SettConfigLogoGroup slg ON sh.SLGID = slg.SLGID
INNER JOIN Accounting.SettAdjustment sa ON sh.SHDID = sa.SHDID
INNER JOIN Accounting.SettAdjustmentType sat ON sa.SATID = sat.SATID
WHERE sh.SHDFundingDate >= DATEADD(month, -1, GETDATE())
ORDER BY sh.SHDFundingDate DESC, sa.SADAmount DESC;
```

### Example 3: CTE with Aggregation

**Input:** "Calculate the average days between patient signup and first payment"

**Output:**

```sql
WITH FirstPayments AS (
    SELECT
        cal.CardAccountID,
        MIN(cal.PostingDate) AS FirstPaymentDate
    FROM CarePayment.CardAccountLedger cal
    WHERE cal.TransactionType = 'Payment'
    GROUP BY cal.CardAccountID
)
SELECT
    AVG(DATEDIFF(day, pa.OpenDate, fp.FirstPaymentDate)) AS AvgDaysToFirstPayment,
    MIN(DATEDIFF(day, pa.OpenDate, fp.FirstPaymentDate)) AS MinDays,
    MAX(DATEDIFF(day, pa.OpenDate, fp.FirstPaymentDate)) AS MaxDays,
    COUNT(*) AS PatientCount
FROM CarePayment.SitePatientAccount pa
INNER JOIN FirstPayments fp ON pa.CardAccountID = fp.CardAccountID
WHERE pa.OpenDate IS NOT NULL;
```
