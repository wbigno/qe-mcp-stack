# CarePayment Database: PROD vs QA Comparison

**Compared:** 2026-01-14

---

## Summary

| Metric       | PROD  | QA    | Difference |
| ------------ | ----- | ----- | ---------- |
| Total Tables | 1,204 | 1,195 | -9         |
| Schema Match | -     | -     | **99.1%**  |

---

## Tables Only in PROD (11)

These tables exist in PROD but not in QA:

| Table                                             | Columns | Risk   | Notes                   |
| ------------------------------------------------- | ------- | ------ | ----------------------- |
| `DataLoad.AccountInitialLoad_06142024`            | 65      | Low    | Temp load table (dated) |
| `DataLoad.AccountInitialLoad_06142024File2443953` | 65      | Low    | Temp load table (dated) |
| `Withdraw.RequestArchive`                         | 13      | Medium | Archive table           |
| `Withdraw.RequestException`                       | 13      | Medium | Exception handling      |
| `DBA.TransactionInitialLoad_PBI_61540`            | 9       | Low    | PBI-related temp table  |
| `Maintenance.WithdrawDetail`                      | 10      | Low    | Maintenance table       |
| `Maintenance.WithdrawBatch`                       | 6       | Low    | Maintenance table       |
| `dbo.sysssislog`                                  | 12      | Low    | SSIS logging            |
| `dbo.pkgStats`                                    | 2       | Low    | Package statistics      |
| `dbo.temptesttab1`                                | 1       | None   | Test table              |
| `dbo.temptesttab2`                                | 1       | None   | Test table              |

**Assessment:** Mostly temporary/dated load tables and test artifacts. No critical business tables missing from QA.

---

## Tables Only in QA (2)

These tables exist in QA but not in PROD:

| Table                   | Columns | Risk     | Notes                         |
| ----------------------- | ------- | -------- | ----------------------------- |
| `OnFile.ExtendedTerms`  | 15      | **High** | New feature - not in PROD yet |
| `OnFile.AcceptedStatus` | 2       | Medium   | New feature support           |

**Assessment:** QA has new OnFile feature tables that may be pending deployment to PROD.

---

## Column Differences (6 tables)

### 1. `Maintenance.MassPatientRecallDetail`

| Column     | PROD | QA  |
| ---------- | ---- | --- |
| FileId     | Yes  | No  |
| LineNumber | Yes  | No  |

### 2. `FiServ.CardAccount`

| Column      | PROD | QA  |
| ----------- | ---- | --- |
| GuarantorID | Yes  | No  |
| GuarantorId | No   | Yes |

**Note:** This is a casing difference (ID vs Id) - likely a migration artifact.

### 3. `DataLoad.PackageProcessingHistoryDetail`

| Column       | PROD | QA  |
| ------------ | ---- | --- |
| NumberofRows | Yes  | No  |
| NumberOfRows | No   | Yes |

**Note:** Casing difference only.

### 4. `CarePayment.SelfDirectedHardship`

| Column              | PROD | QA  |
| ------------------- | ---- | --- |
| SourceApplicationId | No   | Yes |

**Note:** QA has new column - pending deployment to PROD.

### 5. `Report.BBC_Delinquency`

| Column           | PROD | QA  |
| ---------------- | ---- | --- |
| CardPlatformType | Yes  | No  |

### 6. `CarePayment.LogoConfig_OnFile`

| Column                    | PROD | QA  |
| ------------------------- | ---- | --- |
| ExtendedTermsLookbackDays | No   | Yes |

**Note:** Related to new OnFile.ExtendedTerms feature.

---

## Data Type Differences (1)

| Table.Column                   | PROD           | QA            |
| ------------------------------ | -------------- | ------------- |
| `FiServ.LogoHistory.LLogoFile` | maxLength: 256 | maxLength: 16 |

**Risk:** Medium - PROD has larger field, QA is more constrained.

---

## QE Testing Implications

### High Priority

1. **OnFile Extended Terms Feature** - New in QA, needs testing before PROD deployment
   - `OnFile.ExtendedTerms` (15 cols)
   - `OnFile.AcceptedStatus` (2 cols)
   - `CarePayment.LogoConfig_OnFile.ExtendedTermsLookbackDays`

2. **SelfDirectedHardship.SourceApplicationId** - New column in QA

### Medium Priority

1. **Withdraw tables** - PROD has archive/exception tables QA doesn't have
2. **FiServ.LogoHistory.LLogoFile** - Size difference could cause truncation issues

### Low Priority (Casing Differences)

1. `FiServ.CardAccount.GuarantorID` vs `GuarantorId`
2. `DataLoad.PackageProcessingHistoryDetail.NumberofRows` vs `NumberOfRows`

These are likely EF Core migration artifacts and may need standardization.

---

## Recommendations

1. **Before PROD deployment of OnFile feature:**
   - Create `OnFile.ExtendedTerms` table in PROD
   - Create `OnFile.AcceptedStatus` table in PROD
   - Add `ExtendedTermsLookbackDays` to `CarePayment.LogoConfig_OnFile`

2. **Investigate:**
   - Why `Withdraw.RequestArchive` and `Withdraw.RequestException` aren't in QA
   - The `FiServ.LogoHistory.LLogoFile` size difference

3. **Cleanup:**
   - Remove temp/test tables from PROD (`temptesttab1`, `temptesttab2`)
   - Standardize column casing between environments
