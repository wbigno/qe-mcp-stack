# CarePayment Database Analysis (PROD)

**Extracted:** 2026-01-14
**Server:** CPQA-SQL04.cpytdev.com (PROD)

---

## Summary

| Metric               | Count  |
| -------------------- | ------ |
| Total Tables         | 1,204  |
| Total Columns        | 13,960 |
| Schemas              | 56     |
| History/Audit Tables | 204    |

---

## Schema Breakdown

| Schema             | Tables | Columns | Purpose                    |
| ------------------ | ------ | ------- | -------------------------- |
| **CarePayment**    | 286    | 2,869   | Core business entities     |
| **DataLoad**       | 114    | 2,496   | Data import/ETL            |
| **dbo**            | 106    | 996     | Default schema tables      |
| **Accounting**     | 68     | 590     | Financial/Settlement       |
| **FiServ**         | 67     | 1,896   | FiServ integration         |
| **ClientData**     | 54     | 817     | Client account data        |
| **Report**         | 53     | 453     | Reporting tables           |
| **crm**            | 50     | 302     | CRM functionality          |
| **DWFin**          | 48     | 491     | Data warehouse (financial) |
| **PrintVendor**    | 42     | 234     | Print/Statement vendors    |
| **DWRpt**          | 22     | 284     | Data warehouse (reporting) |
| **FileLoad**       | 20     | 161     | File processing            |
| **Portal**         | 19     | 133     | Portal functionality       |
| **Reject**         | 16     | 118     | Rejection handling         |
| **Config**         | 15     | 50      | Configuration              |
| **WorkBench**      | 15     | 70      | Internal tools             |
| **CallCenter**     | 13     | 433     | Call center operations     |
| **DBA**            | 12     | 136     | Database admin             |
| **Maintenance**    | 12     | 69      | Maintenance jobs           |
| **Epic**           | 11     | 84      | Epic EHR integration       |
| **Mapping**        | 10     | 48      | Data mapping               |
| **SideCar**        | 10     | 96      | SideCar integration        |
| **survey**         | 9      | 49      | Survey data                |
| **Recon**          | 9      | 58      | Reconciliation             |
| **AccountLocator** | 8      | 61      | Account lookup             |
| **FileTransfer**   | 8      | 71      | File transfers             |
| **Withdraw**       | 7      | 56      | Withdrawal processing      |
| **Guarantee**      | 6      | 20      | Guarantee management       |
| **Audit**          | 6      | 29      | Audit logging              |
| Other schemas      | 30+    | Various | Specialized functions      |

---

## Key Business Entities

### Core CarePayment Tables

| Table                   | Columns | Primary Key               | Purpose                     |
| ----------------------- | ------- | ------------------------- | --------------------------- |
| CardAccountDialEligSnap | 135     | CardAccountDialEligSnapId | Dialer eligibility snapshot |
| CardAccountLedger       | 52      | CLLedgerID                | Card account transactions   |
| LogoConfig              | 52      | -                         | Client/Logo configuration   |
| SitePatientAccount      | 48      | PAAcctID                  | Patient account by site     |
| StatementData           | 36      | StatementID               | Statement information       |
| LogoTermLength          | 29      | LogoTermLengthID          | Term length configuration   |
| RevenueRecognition      | 29      | Id                        | Revenue recognition         |
| CardAccountHistory      | 26      | C8AccountHistoryID        | Account history             |

---

## Integration Points

### Epic Integration (11 tables)

Critical for EHR connectivity:

| Table                    | Columns | Risk Level |
| ------------------------ | ------- | ---------- |
| PatientInformation       | 16      | Critical   |
| PatientAcceptance        | 9       | High       |
| PatientEvent             | 6       | High       |
| BalanceExclusionRule     | 6       | Medium     |
| BillingIndicatorConfig   | 5       | Medium     |
| PatientEventType         | 4       | Low        |
| BalanceExclusionRuleType | 3       | Low        |

### FiServ Integration (67 tables)

Core payment processing integration:

| Table               | Columns | Purpose               |
| ------------------- | ------- | --------------------- |
| Statement_RowType_B | 418     | Statement data type B |
| Statement_RowType_E | 352     | Statement data type E |
| CardAccount         | 107     | Card account master   |
| Statement_RowType_F | 71      | Statement data type F |
| Statement_RowType_D | 65      | Statement data type D |
| NameAddress         | 48      | Name/Address data     |
| Notes_ASM_Monetary  | 37      | Monetary notes        |
| Logo                | 32      | Logo/Client config    |

---

## Data Types Distribution

| Data Type | Count | Percentage |
| --------- | ----- | ---------- |
| varchar   | 4,400 | 31.5%      |
| int       | 2,921 | 20.9%      |
| char      | 1,652 | 11.8%      |
| money     | 1,320 | 9.5%       |
| datetime  | 997   | 7.1%       |
| bit       | 780   | 5.6%       |
| datetime2 | 491   | 3.5%       |
| nvarchar  | 409   | 2.9%       |
| smallint  | 290   | 2.1%       |
| Other     | 700   | 5.0%       |

---

## Audit & History Coverage

**204 history/audit tables** tracking changes across:

- Financial transactions (SettDetail_History, MiscTran_History)
- Patient accounts (SitePatientAccount_History)
- Configuration changes (LogoConfig_History)
- Integration data (CardAccount_History, NameAddress_History)

---

## Largest Tables (by column count)

| Schema      | Table                                        | Columns |
| ----------- | -------------------------------------------- | ------- |
| FiServ      | Statement_RowType_B                          | 418     |
| FiServ      | Statement_RowType_E                          | 352     |
| DataLoad    | CreditFile                                   | 253     |
| dbo         | MetroEPICAcct                                | 204     |
| DataLoad    | CreditFile_Characteristics_Archive           | 182     |
| CallCenter  | CardAccountDialEligSnapNiceUnassignedArchive | 141     |
| CallCenter  | CardAccountDialEligSnapNice                  | 140     |
| CarePayment | CardAccountDialEligSnap                      | 135     |

---

## Risk Assessment for QE

### High-Risk Areas (Testing Priority)

1. **FiServ Integration** - Payment processing, 67 tables
2. **Epic Integration** - Patient data, PHI compliance
3. **Accounting/Settlement** - Financial transactions
4. **CardAccountLedger** - Core transaction table

### Medium-Risk Areas

1. **DataLoad tables** - ETL processes
2. **CallCenter tables** - Customer operations
3. **Portal tables** - External access

### Low-Risk Areas

1. **Config tables** - Static configuration
2. **Report tables** - Read-only reporting
3. **DBA/Maintenance** - Internal admin

---

## Notes

- This is the PROD database schema
- QA schema comparison pending
- 56 distinct schemas indicate complex domain separation
- Heavy use of temporal tables (\_History suffix) for audit trails
