import type { CommonQuery } from "../types/schema";

export const commonQueries: CommonQuery[] = [
  // Patient Queries
  {
    id: "patient-balance-summary",
    name: "Patient Balance Summary",
    description: "Overview of patient account balances by site",
    category: "patient",
    sql: `SELECT
    pa.SiteIdentifier,
    COUNT(*) AS TotalAccounts,
    SUM(pa.Balance) AS TotalBalance,
    AVG(pa.Balance) AS AvgBalance,
    MAX(pa.Balance) AS MaxBalance,
    MIN(pa.Balance) AS MinBalance
FROM CarePayment.SitePatientAccount pa
GROUP BY pa.SiteIdentifier
ORDER BY TotalBalance DESC;`,
  },
  {
    id: "patient-high-balance",
    name: "High Balance Patients",
    description: "Patients with balance over threshold",
    category: "patient",
    sql: `SELECT TOP 100
    pa.PAAcctID,
    pa.PatientName,
    pa.Balance,
    pa.SiteIdentifier,
    pa.OpenDate
FROM CarePayment.SitePatientAccount pa
WHERE pa.Balance > 1000
ORDER BY pa.Balance DESC;`,
    parameters: [
      {
        name: "threshold",
        type: "money",
        description: "Minimum balance amount",
      },
    ],
  },
  {
    id: "patient-no-recent-payment",
    name: "Patients Without Recent Payment",
    description: "Patients who haven't made a payment in specified days",
    category: "patient",
    sql: `WITH RecentPayments AS (
    SELECT
        CardAccountID,
        MAX(PostingDate) AS LastPaymentDate
    FROM CarePayment.CardAccountLedger
    WHERE TransactionType = 'Payment'
    GROUP BY CardAccountID
)
SELECT
    pa.PAAcctID,
    pa.PatientName,
    pa.Balance,
    rp.LastPaymentDate,
    DATEDIFF(day, rp.LastPaymentDate, GETDATE()) AS DaysSincePayment
FROM CarePayment.SitePatientAccount pa
LEFT JOIN RecentPayments rp ON pa.CardAccountID = rp.CardAccountID
WHERE pa.Balance > 0
  AND (rp.LastPaymentDate IS NULL OR DATEDIFF(day, rp.LastPaymentDate, GETDATE()) > 60)
ORDER BY pa.Balance DESC;`,
  },

  // Settlement Queries
  {
    id: "settlement-by-date",
    name: "Settlement Totals by Date",
    description: "Settlement amounts grouped by funding date",
    category: "settlement",
    sql: `SELECT
    sh.SHDFundingDate,
    slg.SLGDescription AS LogoGroup,
    ss.SSTStatusName AS Status,
    COUNT(sd.SDTID) AS TransactionCount,
    SUM(sd.SDTNetAmount) AS NetAmount
FROM Accounting.SettHeader sh
INNER JOIN Accounting.SettDetail sd ON sh.SHDID = sd.SHDID
INNER JOIN Accounting.SettConfigLogoGroup slg ON sh.SLGID = slg.SLGID
INNER JOIN Accounting.SettStatus ss ON sh.SSTID = ss.SSTID
WHERE sh.SHDFundingDate >= DATEADD(month, -1, GETDATE())
GROUP BY sh.SHDFundingDate, slg.SLGDescription, ss.SSTStatusName
ORDER BY sh.SHDFundingDate DESC;`,
  },
  {
    id: "settlement-adjustments",
    name: "Settlement Adjustments",
    description: "Adjustments made to settlements",
    category: "settlement",
    sql: `SELECT
    sh.SHDID,
    sh.SHDFundingDate,
    slg.SLGDescription AS LogoGroup,
    sa.SADAmount AS AdjustmentAmount,
    sat.SATDescription AS AdjustmentType,
    sa.AdjustmentDescription,
    sa.SADDate
FROM Accounting.SettHeader sh
INNER JOIN Accounting.SettConfigLogoGroup slg ON sh.SLGID = slg.SLGID
INNER JOIN Accounting.SettAdjustment sa ON sh.SHDID = sa.SHDID
INNER JOIN Accounting.SettAdjustmentType sat ON sa.SATID = sat.SATID
WHERE sh.SHDFundingDate >= DATEADD(month, -1, GETDATE())
ORDER BY sh.SHDFundingDate DESC, AdjustmentAmount DESC;`,
  },

  // Epic Integration Queries
  {
    id: "epic-patient-info",
    name: "Epic Patient Information",
    description: "Patient data from Epic integration",
    category: "epic",
    sql: `SELECT
    pi.PatientID,
    pi.FirstName,
    pi.LastName,
    pi.DateOfBirth,
    pi.MRN,
    pi.InsuranceInfo
FROM Epic.PatientInformation pi
ORDER BY pi.LastName, pi.FirstName;`,
  },
  {
    id: "epic-patient-events",
    name: "Epic Patient Events",
    description: "Recent patient events from Epic",
    category: "epic",
    sql: `SELECT
    pe.EventID,
    pi.FirstName + ' ' + pi.LastName AS PatientName,
    pet.Description AS EventType,
    pe.EventDate,
    pe.Status
FROM Epic.PatientEvent pe
INNER JOIN Epic.PatientInformation pi ON pe.PatientID = pi.PatientID
INNER JOIN Epic.PatientEventType pet ON pe.EventTypeID = pet.EventTypeID
ORDER BY pe.EventDate DESC;`,
  },
  {
    id: "epic-billing-config",
    name: "Epic Billing Configuration",
    description: "Billing indicator configurations",
    category: "epic",
    sql: `SELECT
    bic.ConfigID,
    bic.BillingIndicator,
    bic.Description,
    bic.IsActive
FROM Epic.BillingIndicatorConfig bic
ORDER BY bic.BillingIndicator;`,
  },

  // FiServ Queries
  {
    id: "fiserv-card-accounts",
    name: "FiServ Card Accounts",
    description: "Card account information from FiServ",
    category: "fiserv",
    sql: `SELECT TOP 100
    ca.CardAccountID,
    ca.AccountStatus,
    ca.OpenDate,
    ca.CreditLimit,
    ca.CurrentBalance,
    l.LogoName
FROM FiServ.CardAccount ca
INNER JOIN FiServ.Logo l ON ca.LogoID = l.LogoID
ORDER BY ca.OpenDate DESC;`,
  },
  {
    id: "fiserv-statements",
    name: "FiServ Statement Summary",
    description: "Statement data summary",
    category: "fiserv",
    sql: `SELECT
    StatementDate,
    COUNT(*) AS StatementCount,
    SUM(TotalAmount) AS TotalAmount
FROM FiServ.Statement_RowType_B
WHERE StatementDate >= DATEADD(month, -3, GETDATE())
GROUP BY StatementDate
ORDER BY StatementDate DESC;`,
  },

  // Accounting Queries
  {
    id: "accounting-misc-trans",
    name: "Miscellaneous Transactions",
    description: "Recent miscellaneous transactions",
    category: "accounting",
    sql: `SELECT
    mt.AMTID,
    mtt.MTTDescription AS TransactionType,
    mts.MTSStatusName AS Status,
    mt.AMTAmount,
    mt.AMTDate,
    mt.AMTRefNum
FROM Accounting.MiscTran mt
INNER JOIN Accounting.MiscTranType mtt ON mt.MTTID = mtt.MTTID
INNER JOIN Accounting.MiscTranStatus mts ON mt.MTSID = mts.MTSID
WHERE mt.AMTDate >= DATEADD(month, -1, GETDATE())
ORDER BY mt.AMTDate DESC;`,
  },
  {
    id: "accounting-recalls",
    name: "Patient Account Recalls",
    description: "Account recall history",
    category: "accounting",
    sql: `SELECT
    par.PARID,
    par.PARPatientAccountID,
    mts.MTSStatusName AS Status,
    par.PARRecallFeeCalc,
    par.PARRefundCalc,
    par.PARDate,
    arr.ARRDescription AS RecallReason
FROM Accounting.PatientAccountRecall par
INNER JOIN Accounting.MiscTranStatus mts ON par.MTSID = mts.MTSID
LEFT JOIN Accounting.PatientAccountRecall_Log parl ON par.PARID = parl.PARID
LEFT JOIN Accounting.PatientAccountRecall_Reason arr ON parl.ARARecallReasonID = arr.ARRReasonID
ORDER BY par.PARDate DESC;`,
  },

  // Reporting Queries
  {
    id: "report-data-load-status",
    name: "Data Load Status",
    description: "Recent data load processing status",
    category: "reporting",
    sql: `SELECT TOP 50
    PackageName,
    ProcessingStatus,
    StartTime,
    EndTime,
    DATEDIFF(minute, StartTime, EndTime) AS DurationMinutes,
    RecordsProcessed,
    ErrorCount
FROM DataLoad.PackageProcessingHistory
ORDER BY StartTime DESC;`,
  },
  {
    id: "report-table-row-counts",
    name: "Table Row Counts",
    description: "Row counts for major tables (approximate)",
    category: "reporting",
    sql: `SELECT
    s.name AS SchemaName,
    t.name AS TableName,
    p.rows AS ApproxRowCount
FROM sys.tables t
INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
INNER JOIN sys.partitions p ON t.object_id = p.object_id AND p.index_id IN (0, 1)
WHERE p.rows > 1000
ORDER BY p.rows DESC;`,
  },
];

export const queryCategories = [
  { id: "patient", name: "Patient & Accounts", icon: "👤", color: "blue" },
  { id: "settlement", name: "Settlements", icon: "📊", color: "green" },
  { id: "epic", name: "Epic Integration", icon: "🏥", color: "purple" },
  { id: "fiserv", name: "FiServ", icon: "💳", color: "orange" },
  { id: "accounting", name: "Accounting", icon: "💰", color: "yellow" },
  { id: "reporting", name: "Reporting", icon: "📈", color: "cyan" },
];

export function getQueriesByCategory(category: string): CommonQuery[] {
  return commonQueries.filter((q) => q.category === category);
}
