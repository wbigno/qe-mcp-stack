# Model Configuration Guide

## ⚠️ CRITICAL: Model ID Management

This document explains how to properly manage AI model IDs to prevent repeated issues.

## The Problem We Keep Hitting

We've repeatedly had issues with hardcoded invalid model IDs like:

- `"claude-3-5-sonnet-20241022"` (doesn't exist)
- `"sonnet-3-5"` (invalid format)
- `"claude-3-sonnet-20240229"` (outdated)

**Result:** 404 errors from Anthropic API, test generation failures, wasted time debugging.

## The Solution: Single Source of Truth

**ONE PLACE** defines the default model: `orchestrator/src/utils/aiHelper.js`

```javascript
const DEFAULT_MODEL = "claude-sonnet-4-20250514";
```

## Rules for Model Usage

### ✅ DO:

1. **Backend (orchestrator)**: Use `callClaude(prompt, model)` where `model` is optional
   - If `model` is null/undefined → uses DEFAULT_MODEL
   - If `model` is provided → uses that model (for advanced use cases)

2. **Frontend (dashboards)**: NEVER specify model parameter
   - Let the backend use its default
   - Only exception: User-facing model selector UI

3. **Environment Override**: Set `CLAUDE_MODEL` env var to override default
   ```bash
   CLAUDE_MODEL=claude-opus-4-5-20251101
   ```

### ❌ DON'T:

1. **NEVER hardcode model IDs in frontend JavaScript**

   ```javascript
   // ❌ BAD
   model: "sonnet-3-5";
   model: "claude-3-5-sonnet-20241022";

   // ✅ GOOD
   // (omit model parameter entirely)
   ```

2. **NEVER hardcode model IDs in API routes**

   ```javascript
   // ❌ BAD
   await callClaude(prompt, "claude-3-5-sonnet-20241022", 4096);

   // ✅ GOOD
   await callClaude(prompt, model, 4096); // model from request or undefined
   ```

## Current Valid Model IDs (as of 2026-01)

- `claude-sonnet-4-20250514` ✅ (DEFAULT)
- `claude-opus-4-5-20251101` ✅
- `claude-3-5-sonnet-20241022` ❌ (DOES NOT EXIST)
- `sonnet-3-5` ❌ (INVALID FORMAT)

## When Model Changes Are Needed

**Only update ONE file:** `orchestrator/src/utils/aiHelper.js`

```javascript
// When Anthropic releases a new model:
const DEFAULT_MODEL = "claude-sonnet-5-20260115"; // New model
```

**Then restart orchestrator:**

```bash
docker restart qe-orchestrator
```

All endpoints automatically use the new model. No frontend changes needed.

## Verification After Changes

```bash
# Test that model is working
curl -X POST http://localhost:3000/api/tests/generate-for-file \
  -H "Content-Type: application/json" \
  -d '{
    "app":"PreCare",
    "file":"/mnt/apps/PreCare/test.cs",
    "className":"Test"
  }'

# Should NOT return 404 model error
```

## Files That Should NEVER Specify Model

- ❌ `code-dashboard/script.js`
- ❌ `ado-dashboard/script.js`
- ❌ `infrastructure-dashboard/script.js`
- ❌ Any frontend JavaScript

## Files That Accept Model as Optional Parameter

- ✅ `orchestrator/src/routes/ado.js` (accepts from API request)
- ✅ `orchestrator/src/routes/tests.js` (accepts from API request)
- ✅ `orchestrator/src/utils/aiHelper.js` (has DEFAULT_MODEL)

## History of This Issue

1. **2026-01-11**: Fixed hardcoded `claude-3-5-sonnet-20241022` in tests.js
2. **2026-01-11**: Branch switch reverted changes, had to fix again
3. **2026-01-11**: Found `model: "sonnet-3-5"` in code-dashboard script.js
4. **2026-01-11**: Created this documentation to prevent future issues

## Action Items for Developers

Before committing code that calls AI:

1. ✅ Search your changes for hardcoded model IDs
2. ✅ If frontend: Remove any model parameter
3. ✅ If backend: Accept model as optional parameter, never hardcode
4. ✅ Test with actual API calls
5. ✅ Update this doc if you find new issues

---

**Remember:** When in doubt, omit the model parameter. The backend has a working default.
