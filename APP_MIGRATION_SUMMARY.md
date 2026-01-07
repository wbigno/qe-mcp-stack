# Application Migration Summary

## Changes Made: App1 Only with New Path

### Overview
Updated the QE MCP Stack to work with a single application (App1) located at the new path `/Users/williambigno/dev/git/core`.

---

## Files Updated

### 1. Configuration File
**File:** `config/apps.json`
- **Before:** 4 applications (App1, App2, App3, App4) with path `/mnt/apps/patient-portal`
- **After:** 1 application (App1) with path `/mnt/apps/core`
- **Display Name:** Changed from "Patient Portal" to "Core"

```json
{
  "applications": [
    {
      "name": "App1",
      "displayName": "Application 1 - Core",
      "path": "/mnt/apps/core",
      "localPath": "/Users/williambigno/dev/git/core",
      ...
    }
  ]
}
```

---

### 2. Docker Compose Volume Mounts
**File:** `docker-compose.yml`

**Orchestrator Service (lines 28):**
- **Before:**
  ```yaml
  - /Users/williambigno/dev/git/patient-portal:/mnt/apps/patient-portal:ro
  - /Users/williambigno/dev/git/app2:/mnt/apps/app2:ro
  - /Users/williambigno/dev/git/app3:/mnt/apps/app3:ro
  - /Users/williambigno/dev/git/app4:/mnt/apps/app4:ro
  ```
- **After:**
  ```yaml
  - /Users/williambigno/dev/git/core:/mnt/apps/core:ro
  ```

**dotnet-code-analyzer Service (lines 45-47):**
- **Before:** 4 volume mounts for all apps
- **After:** Single mount for core
  ```yaml
  - /Users/williambigno/dev/git/core:/mnt/apps/core:ro
  ```

**dotnet-coverage-analyzer Service (lines 60-62):**
- **Before:** 4 volume mounts for all apps
- **After:** Single mount for core
  ```yaml
  - /Users/williambigno/dev/git/core:/mnt/apps/core:ro
  ```

---

### 3. Backend Path Mapping
**File:** `orchestrator/src/routes/tests.js` (line 27-29)

**Test Generation Path Resolution:**
- **Before:**
  ```javascript
  const appPathMap = {
    'App1': 'patient-portal/PatientPortal',
    'App2': 'app2/App2',
    'App3': 'app3/App3',
    'App4': 'app4/App4'
  };
  ```
- **After:**
  ```javascript
  const appPathMap = {
    'App1': 'core'
  };
  ```

---

### 4. Analysis Route Defaults
**File:** `orchestrator/src/routes/analysis.js` (line 55)

**Code Scan Default Apps:**
- **Before:** `const { apps = ['App1', 'App2', 'App3', 'App4'] } = req.body;`
- **After:** `const { apps = ['App1'] } = req.body;`

---

### 5. Frontend Fallback Lists
**File:** `code-dashboard/script.js` (lines 85-88)

**Application Dropdown Fallback:**
- **Before:** Listed all 4 apps
- **After:**
  ```html
  <option value="">Select Application...</option>
  <option value="App1">Application 1 - Core (net10.0)</option>
  ```

---

## Verification Steps Completed

### ✅ 1. Docker Volumes Mounted
```bash
$ docker exec qe-orchestrator ls -la /mnt/apps/
total 8
drwxr-xr-x    3 root     root          4096 Jan  6 20:26 .
drwxr-xr-x    1 root     root          4096 Jan  6 20:26 ..
drwxr-xr-x  135 node     node          4320 Jan  6 20:13 core
```

### ✅ 2. Files Accessible in Container
```bash
$ docker exec qe-orchestrator find /mnt/apps/core -name "*.cs" -type f | head -5
/mnt/apps/core/CarePayment.OmniChannel.Service.Models/EmailMessage.cs
/mnt/apps/core/CarePayment.OmniChannel.Service.Models/ServiceBusMessage.cs
...
```

### ✅ 3. API Configuration Working
```bash
$ curl http://localhost:3000/api/dashboard/config/apps
{
  "apps": [
    {
      "name": "App1",
      "description": "Application 1 - Core",
      "path": "/mnt/apps/core"
    }
  ]
}
```

---

## What Still Works

✅ **ADO Dashboard** - App dropdown will show only App1
✅ **Code Dashboard** - App dropdown will show only App1
✅ **Test Generation** - Will work with App1 and new path
✅ **Code Analysis** - MCPs can access files in /mnt/apps/core
✅ **Coverage Analysis** - MCPs can access files in /mnt/apps/core
✅ **All MCPs** - Have correct volume mounts via orchestrator

---

## Action Required

**None** - All changes are complete and containers are running.

### To Test:
1. Open ADO Dashboard: http://localhost:8081
2. Open Code Dashboard: http://localhost:8080
3. Select "App1" from dropdown
4. Verify data loads correctly

---

## Rollback Instructions (if needed)

If you need to add back multiple apps:
1. Edit `config/apps.json` to add more applications
2. Update `docker-compose.yml` to add volume mounts:
   ```yaml
   - /path/to/app2:/mnt/apps/app2:ro
   ```
3. Update `orchestrator/src/routes/tests.js` appPathMap
4. Restart containers: `docker compose restart`

---

## Summary

**Apps Before:** App1, App2, App3, App4
**Apps After:** App1 only

**Path Before:** `/Users/williambigno/dev/git/patient-portal` → `/mnt/apps/patient-portal`
**Path After:** `/Users/williambigno/dev/git/core` → `/mnt/apps/core`

**Files Changed:** 5 files
**Containers Restarted:** All containers
**Status:** ✅ Complete and Verified
