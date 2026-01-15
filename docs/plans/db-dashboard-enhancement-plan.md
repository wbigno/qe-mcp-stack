# Database Tab Enhancement Plan

## Current State

Your existing Infrastructure dashboard already has:

- Application sidebar (9 apps)
- Environment selector (Local, Dev, QA, QA2, Staging, PreProd, Prod, Demo)
- Database tab with:
  - Schema selector (CarePayment, MessageContext, etc.)
  - Basic table list (CardAccount, SitePatientAccount, etc.)
  - Connected Applications panel
  - Application-Database Connections diagram

## Enhancement Goals

Integrate the detailed schema data to provide:

1. **Full table/column browser** (not just table names)
2. **Schema explorer** with 56 schemas, 1,204 tables
3. **ERD visualization** for selected tables
4. **Environment comparison** (PROD vs QA diff)
5. **Search functionality** across all tables/columns

---

## UI Enhancement Design

### Enhanced Database Tab Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🗄 Database Schema    [CarePayment ▼]     🔍 Search tables/columns...      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Sub-tabs:  [📋 Tables] [🔗 ERD] [⚖️ Compare] [📖 Dictionary]               │
│                                                                              │
├──────────────────┬───────────────────────────────────────────────────────────┤
│                  │                                                           │
│  SCHEMAS (56)    │  TABLES IN: Accounting (68 tables)                        │
│  ──────────────  │  ─────────────────────────────────────────────────────── │
│  🔽 Accounting   │                                                           │
│     JE_Account   │  ┌────────────────────────────────────────────────────┐  │
│     JE_Entry     │  │  📋 SettDetail                        27 columns   │  │
│     MiscTran     │  │  Settlement detail transactions                    │  │
│     SettDetail ◄─┼──│  ────────────────────────────────────────────────  │  │
│     SettHeader   │  │  Column          Type       Null   PK   FK         │  │
│     ...          │  │  SDTID           int        NO     ✓              │  │
│  ▶ CallCenter    │  │  SSTID           int        NO          → SettStatus │
│  ▶ CarePayment   │  │  SHDID           int        NO          → SettHeader │
│  ▶ ClientData    │  │  SSSID           int        NO          → SettSubSch │
│  ▶ Epic          │  │  SDTPatientAcctID int       NO                     │  │
│  ▶ FiServ        │  │  SDTRefNumber    int        NO                     │  │
│  ▶ Report        │  │  SDTCardAcctNum  varchar    NO                     │  │
│  ...             │  │  SDTTranAmt      money      YES                    │  │
│                  │  │  ...                                               │  │
│  ──────────────  │  └────────────────────────────────────────────────────┘  │
│  56 schemas      │                                                           │
│  1,204 tables    │  [Show in ERD]  [View History Table]  [Export]           │
│  13,960 columns  │                                                           │
└──────────────────┴───────────────────────────────────────────────────────────┘
```

### ERD Sub-Tab

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Sub-tabs:  [📋 Tables] [🔗 ERD] [⚖️ Compare] [📖 Dictionary]               │
├─────────────────────────────────────────────────────────────────────────────┤
│  Schema: [Accounting ▼]          [+ Add Table] [Clear] [Export PNG]          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌─────────────────┐                     ┌─────────────────┐              │
│    │   SettStatus    │                     │  SettCategory   │              │
│    ├─────────────────┤                     ├─────────────────┤              │
│    │ SSTID (PK)      │                     │ SCAID (PK)      │              │
│    │ SSTStatusName   │                     │ SCADescription  │              │
│    └────────┬────────┘                     └────────┬────────┘              │
│             │                                       │                        │
│             │ 1:N                                   │ 1:N                    │
│             ▼                                       ▼                        │
│    ┌─────────────────┐         ┌─────────────────────────────┐              │
│    │   SettHeader    │─────────│       SettSchedule          │              │
│    ├─────────────────┤   1:N   ├─────────────────────────────┤              │
│    │ SHDID (PK)      │         │ SSCID (PK)                  │              │
│    │ SHDStartDate    │         │ SSCDescription               │              │
│    │ SHDEndDate      │         │ SCAID (FK)                   │              │
│    │ SLGID (FK)      │         └─────────────────────────────┘              │
│    │ SSTID (FK)      │                                                      │
│    └────────┬────────┘                                                      │
│             │                                                                │
│             │ 1:N                                                            │
│             ▼                                                                │
│    ┌─────────────────┐                                                      │
│    │   SettDetail    │                                                      │
│    ├─────────────────┤                                                      │
│    │ SDTID (PK)      │                                                      │
│    │ SHDID (FK)      │                                                      │
│    │ SDTTranAmt      │                                                      │
│    └─────────────────┘                                                      │
│                                                                              │
│  [Zoom +] [Zoom -] [Fit to View] [Auto-Layout]                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Compare Sub-Tab

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Sub-tabs:  [📋 Tables] [🔗 ERD] [⚖️ Compare] [📖 Dictionary]               │
├─────────────────────────────────────────────────────────────────────────────┤
│  Compare: [PROD ▼]  vs  [QA ▼]                      Schema Match: 99.1%     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  SUMMARY                                                             │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │  11 tables   │  │   2 tables   │  │   6 tables   │               │   │
│  │  │  PROD only   │  │   QA only    │  │  col diffs   │               │   │
│  │  │  ⚠️ Warning  │  │  ✚ New       │  │  🔄 Changed  │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  TABLES ONLY IN PROD              │  TABLES ONLY IN QA              │   │
│  │  ─────────────────────────        │  ─────────────────────          │   │
│  │  ⚠ DataLoad.AccountInitialLoad... │  ✚ OnFile.ExtendedTerms (15)   │   │
│  │  ⚠ Withdraw.RequestArchive (13)   │  ✚ OnFile.AcceptedStatus (2)   │   │
│  │  ⚠ Withdraw.RequestException (13) │                                 │   │
│  │  ⚠ DBA.TransactionInitialLoad...  │                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  COLUMN DIFFERENCES                                                  │   │
│  │  Table                           PROD           QA                   │   │
│  │  FiServ.CardAccount              GuarantorID    GuarantorId          │   │
│  │  CarePayment.SelfDirectedHardship -             SourceApplicationId  │   │
│  │  CarePayment.LogoConfig_OnFile   -             ExtendedTermsLookback │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  [Export Comparison Report]  [View Full Details]                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Data Integration

- [ ] Load schema JSON files into dashboard
- [ ] Create schema index for fast search
- [ ] Map schemas to existing app structure

### Phase 2: Schema Explorer Enhancement

- [ ] Add collapsible schema tree (56 schemas)
- [ ] Show full table list per schema
- [ ] Display column details on table click
- [ ] Add PK/FK indicators
- [ ] Highlight identity columns

### Phase 3: Search Functionality

- [ ] Global search across tables/columns
- [ ] Filter by data type
- [ ] Filter by schema
- [ ] Highlight matches in tree

### Phase 4: ERD Visualization

- [ ] Integrate Mermaid.js for ERD rendering
- [ ] Per-schema ERD generation
- [ ] User-selectable tables for custom ERD
- [ ] Export to PNG/SVG

### Phase 5: Environment Comparison

- [ ] Load multiple environment schemas
- [ ] Diff algorithm for tables/columns
- [ ] Visual diff highlighting
- [ ] Export comparison report

---

## Technical Implementation

### File Structure (add to code-dashboard)

```
code-dashboard/
├── database/
│   ├── schemaExplorer.js      # Schema tree + table browser
│   ├── tableDetails.js        # Column details panel
│   ├── erdGenerator.js        # Mermaid ERD integration
│   ├── schemaCompare.js       # Environment diff logic
│   └── schemaSearch.js        # Search functionality
├── schemas/                   # Schema JSON data
│   ├── CarePayment_PROD.json
│   ├── CarePayment_QA.json
│   └── index.json             # Schema index for fast lookup
└── lib/
    └── mermaid.min.js         # ERD visualization
```

### Schema Index Format

```json
{
  "databases": {
    "CarePayment": {
      "environments": ["PROD", "QA"],
      "schemaCount": 56,
      "tableCount": 1204,
      "columnCount": 13960
    }
  },
  "searchIndex": {
    "patient": ["Epic.PatientInformation", "CarePayment.SitePatientAccount", ...],
    "cardaccount": ["CarePayment.CardAccountLedger", "FiServ.CardAccount", ...]
  }
}
```

---

## Integration with Existing Dashboard

The existing Database tab shows:

- Database schema buttons (CarePayment, MessageContext, etc.)
- Basic table list
- Connected Applications
- Application-Database Connections

**Enhancement approach:**

1. Keep existing layout but expand table list to full schema explorer
2. Add sub-tabs (Tables, ERD, Compare, Dictionary)
3. Load detailed schema from JSON files
4. Use existing environment selector for comparison

---

## Next Steps

1. **Find the existing code-dashboard source** to understand current implementation
2. **Add schema JSON loading** capability
3. **Enhance table list** to full schema explorer
4. **Add sub-tab navigation** for ERD/Compare views
