# QE MCP Stack - API Audit & Cleanup Plan

**Date:** 2026-01-07
**Status:** Cleanup Required

## Executive Summary

During dashboard implementation, we identified API endpoint duplication and inconsistencies. This document provides:
1. Complete inventory of all endpoints
2. Identification of duplicates and legacy code
3. Cleanup actions required
4. Updated API documentation

---

## Route Structure

```
/api/mcp/*          → mcp.js (MCP health/status)
/api/analysis/*     → analysis.js (Core analysis operations)
/api/ado/*          → ado.js (Azure DevOps integration)
/api/tests/*        → tests.js (Test generation)
/api/dashboard/*    → dashboard.js (Dashboard-specific endpoints)
```

---

## Critical Issues Found

### 🔴 ISSUE #1: Duplicate Test Gaps Endpoints

**Problem:** Two endpoints doing the same thing with different HTTP methods

```
POST /api/analysis/test-gaps (analysis.js:98)      ✅ ACTIVE - Used by code-dashboard
GET /api/dashboard/test-gaps (dashboard.js:137)    ❌ UNUSED - Causes confusion
```

**Impact:** Frontend was calling one endpoint while we were fixing the other, causing the bug where empty arrays were returned.

**Action:** REMOVE `GET /api/dashboard/test-gaps` from dashboard.js

**Status:** ✅ FIXED - Both endpoints now have correct filtering logic, but need to remove duplicate

---

### 🟡 ISSUE #2: Legacy Test Generation Endpoints

**Problem:** Old endpoints kept for "backward compatibility" but nothing uses them

```
POST /api/tests/generate-unit-tests (tests.js:340)          ❌ LEGACY - Only in .http file
POST /api/tests/generate-integration-tests (tests.js:373)   ❌ LEGACY - Only in .http file
```

**Replaced By:**
```
POST /api/tests/generate-for-file (tests.js:165)                  ✅ ACTIVE - Used by frontend
POST /api/tests/generate-integration-for-file (tests.js:231)      ✅ ACTIVE - Used by frontend
```

**Action:** REMOVE legacy endpoints and update .http file

**Status:** ⏳ PENDING

---

## Complete API Inventory

### `/api/mcp/*` - MCP Management
| Method | Endpoint | Used By | Status |
|--------|----------|---------|--------|
| GET | `/status` | .http tests | ✅ Keep |
| GET | `/health/:mcpName` | .http tests | ✅ Keep |

### `/api/analysis/*` - Core Analysis
| Method | Endpoint | Used By | Status |
|--------|----------|---------|--------|
| POST | `/code-scan` | .http tests | ⚠️ Verify usage |
| POST | `/coverage` | .http tests | ⚠️ Verify usage |
| POST | `/test-gaps` | **code-dashboard** | ✅ Keep - PRIMARY |
| POST | `/analyze-file` | Internal | ⚠️ Verify vs tests route |
| POST | `/risk/analyze-story` | **ado-dashboard** | ✅ Keep |
| POST | `/integrations/map` | **ado-dashboard** | ✅ Keep |
| POST | `/blast-radius/analyze` | **ado-dashboard** | ✅ Keep |
| POST | `/analyze-requirements` | .http tests | ⚠️ Verify usage |

### `/api/dashboard/*` - Dashboard Helpers
| Method | Endpoint | Used By | Status |
|--------|----------|---------|--------|
| GET | `/applications` | **code-dashboard** | ✅ Keep |
| GET | `/code-analysis` | **code-dashboard** | ✅ Keep |
| GET | `/coverage` | None found | ⚠️ May be unused |
| GET | `/test-gaps` | None found | ❌ **REMOVE** (duplicate) |
| GET | `/aod-summary` | **ado-dashboard** | ✅ Keep |
| GET | `/config/apps` | **ado-dashboard** | ✅ Keep |

### `/api/ado/*` - Azure DevOps
| Method | Endpoint | Used By | Status |
|--------|----------|---------|--------|
| POST | `/pull-stories` | TBD | ⚠️ Verify usage |
| POST | `/update-story` | **ado-dashboard** | ✅ Keep |
| POST | `/update-story/preview` | **ado-dashboard** | ✅ Keep |
| POST | `/add-comment` | **ado-dashboard** | ✅ Keep |
| POST | `/batch-update` | TBD | ⚠️ Verify usage |
| POST | `/batch-update/preview` | TBD | ⚠️ Verify usage |
| POST | `/generate-test-cases` | **ado-dashboard** | ✅ Keep |
| GET | `/test-cases/by-story/:id` | **ado-dashboard** | ✅ Keep |
| GET | `/test-plans` | None found | ⚠️ May be unused |
| GET | `/test-plans/:id/suites` | None found | ⚠️ May be unused |
| GET | `/test-runs` | None found | ⚠️ May be unused |
| GET | `/test-runs/:id/results` | None found | ⚠️ May be unused |
| GET | `/test-execution/by-story` | None found | ⚠️ May be unused |
| GET | `/test-execution/metrics` | None found | ⚠️ May be unused |
| GET | `/defects` | None found | ⚠️ May be unused |
| GET | `/defects/by-story/:id` | None found | ⚠️ May be unused |
| GET | `/defects/metrics` | None found | ⚠️ May be unused |
| GET | `/quality-metrics` | None found | ⚠️ May be unused |
| GET | `/iterations/projects` | **ado-dashboard** | ✅ Keep |
| GET | `/iterations/teams` | **ado-dashboard** | ✅ Keep |
| GET | `/iterations/sprints` | None found | ⚠️ May be unused |

### `/api/tests/*` - Test Generation
| Method | Endpoint | Used By | Status |
|--------|----------|---------|--------|
| POST | `/analyze-file` | **code-dashboard** | ✅ Keep |
| POST | `/generate-for-file` | **code-dashboard** | ✅ Keep - ACTIVE |
| POST | `/generate-integration-for-file` | **code-dashboard** | ✅ Keep - ACTIVE |
| POST | `/generate-unit-tests` | .http only | ❌ **REMOVE** (legacy) |
| POST | `/generate-integration-tests` | .http only | ❌ **REMOVE** (legacy) |

---

## Cleanup Actions

### ✅ IMMEDIATE - Remove Confirmed Duplicates

1. **Remove GET /api/dashboard/test-gaps** (dashboard.js:137)
   - Reason: Duplicate of POST /api/analysis/test-gaps
   - Impact: None - not used by any frontend

2. **Remove POST /api/tests/generate-unit-tests** (tests.js:340)
   - Reason: Legacy - replaced by `/generate-for-file`
   - Impact: Only .http file references it

3. **Remove POST /api/tests/generate-integration-tests** (tests.js:373)
   - Reason: Legacy - replaced by `/generate-integration-for-file`
   - Impact: Only .http file references it

### ⚠️ VERIFY - Potentially Unused Endpoints

Need to verify if these are called by external tools or future features:

- GET `/api/dashboard/coverage`
- POST `/api/analysis/code-scan`
- POST `/api/analysis/coverage`
- POST `/api/analysis/analyze-requirements`
- All ADO test plan/run/defect endpoints
- POST `/api/ado/batch-update`

### 📝 UPDATE - Documentation Files

1. **Update `/1-core-analysis.http`**
   - Remove legacy test generation examples
   - Update test-gaps to use POST /api/analysis/test-gaps only
   - Remove GET /api/dashboard/test-gaps references

2. **Update `/2-test-generation.http`**
   - Replace `/generate-unit-tests` → `/generate-for-file`
   - Replace `/generate-integration-tests` → `/generate-integration-for-file`
   - Add proper comments explaining file-based generation

3. **Create `/4-dashboard-apis.http`** (NEW)
   - Document all dashboard-specific endpoints
   - Show proper frontend integration patterns

---

## Frontend API Usage Matrix

### code-dashboard (Code Analysis Dashboard)
```javascript
✅ GET  /api/dashboard/applications
✅ GET  /api/dashboard/code-analysis?app=...
✅ POST /api/analysis/test-gaps          // PRIMARY test gaps endpoint
✅ POST /api/tests/analyze-file
✅ POST /api/tests/generate-for-file
✅ POST /api/tests/generate-integration-for-file
```

### ado-dashboard (Azure DevOps Dashboard)
```javascript
✅ GET  /api/dashboard/config/apps
✅ GET  /api/ado/iterations/projects
✅ GET  /api/ado/iterations/teams
✅ GET  /api/ado/test-cases/by-story/:id
✅ POST /api/ado/update-story/preview
✅ POST /api/ado/update-story
✅ POST /api/ado/add-comment
✅ POST /api/ado/generate-test-cases
✅ POST /api/analysis/blast-radius/analyze
✅ POST /api/analysis/risk/analyze-story
✅ POST /api/analysis/integrations/map
```

---

## Implementation Plan

### Phase 1: Remove Confirmed Duplicates ✅

- [x] Fix filtering logic in both test-gaps endpoints
- [ ] Remove GET /api/dashboard/test-gaps
- [ ] Remove legacy test generation endpoints
- [ ] Test frontends still work

### Phase 2: Verify Unused Endpoints ⏳

- [ ] Check ADO endpoints for external usage
- [ ] Check analysis endpoints for workflow usage
- [ ] Document findings

### Phase 3: Update Documentation ⏳

- [ ] Update all .http files
- [ ] Create API reference guide
- [ ] Add inline comments to route files

### Phase 4: Consolidation (Future) 📋

- Consider merging analysis and dashboard routes
- Standardize response formats
- Add API versioning if needed

---

## Testing Checklist

After cleanup, verify:

- [ ] code-dashboard loads and shows test gaps
- [ ] ado-dashboard loads and shows stories
- [ ] Test generation works from code-dashboard
- [ ] All .http file examples work
- [ ] No 404 errors in browser console
- [ ] No broken links in documentation

---

## Notes

- **Why keep some unused ADO endpoints?** They may be used by external automation or planned features. Need verification before removal.
- **Why not merge routes?** Keeping routes separated by concern makes the codebase more maintainable.
- **When to remove legacy code?** After 1-2 sprint cycles with no usage detected.
