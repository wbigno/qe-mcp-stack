# QE MCP Stack - Setup Checklist

Use this checklist to ensure everything is configured correctly.

## ✅ Pre-Installation Checklist

- [ ] macOS system
- [ ] Docker Desktop installed and running
- [ ] .NET applications located at `/Users/williambigno/Desktop/git/`
- [ ] Azure DevOps account access
- [ ] AI API key (Anthropic or OpenAI)

## ✅ Installation Steps

### 1. Project Placement
- [ ] Extracted/moved `qe-mcp-stack` to `/Users/williambigno/Desktop/git/qe-mcp-stack`
- [ ] Verified path: `/Users/williambigno/Desktop/git/qe-mcp-stack`

### 2. Environment Configuration
- [ ] Copied `config/.env.example` to `config/.env`
- [ ] Added Azure DevOps PAT to `config/.env`
- [ ] Added Azure DevOps organization name to `config/.env`
- [ ] Added Azure DevOps project name to `config/.env`
- [ ] Added Anthropic or OpenAI API key to `config/.env`

### 3. Applications Configuration
- [ ] Updated `config/apps.json` with App1 details
- [ ] Updated `config/apps.json` with App2 details
- [ ] Updated `config/apps.json` with App3 details
- [ ] Updated `config/apps.json` with App4 details
- [ ] Verified `localPath` for each app matches actual folder names

### 4. Azure DevOps Configuration
- [ ] Updated `config/ado-config.json` with organization name
- [ ] Updated `config/ado-config.json` with project name
- [ ] Updated test case area path in `config/ado-config.json`

### 5. Docker Volume Mounts
- [ ] Opened `docker-compose.yml`
- [ ] Updated App1 path in volumes section
- [ ] Updated App2 path in volumes section
- [ ] Updated App3 path in volumes section
- [ ] Updated App4 path in volumes section
- [ ] Verified all paths match actual folder names

### 6. Docker Desktop Setup
- [ ] Opened Docker Desktop
- [ ] Went to Settings → Resources → File Sharing
- [ ] Added `/Users/williambigno/Desktop/git` to file sharing
- [ ] Clicked Apply & Restart

## ✅ First Startup

### Start the Stack
- [ ] Opened terminal
- [ ] Changed to project directory: `cd /Users/williambigno/Desktop/git/qe-mcp-stack`
- [ ] Made start script executable: `chmod +x scripts/start.sh`
- [ ] Ran startup script: `./scripts/start.sh`
- [ ] Waited for all services to start (30-60 seconds)

### Verify Services
- [ ] Ran health check: `curl http://localhost:3000/health`
- [ ] Saw all services showing "healthy"
- [ ] Checked services are running: `docker-compose ps`
- [ ] All services show "Up" status

### Test Basic Operations
- [ ] Tested code scan: `curl -X POST http://localhost:3000/api/analysis/code-scan -H "Content-Type: application/json" -d '{"apps": ["App1"]}'`
- [ ] Received successful response
- [ ] Verified app was scanned correctly

## ✅ VS Code Integration

### Install Extensions
- [ ] Opened VS Code
- [ ] Pressed `Cmd+Shift+X` to open extensions
- [ ] Searched for "REST Client"
- [ ] Installed REST Client by Huachao Mao
- [ ] Searched for "Docker"
- [ ] Installed Docker extension by Microsoft (optional but recommended)

### Open Project
- [ ] Opened `/Users/***/Desktop/git/qe-mcp-stack` in VS Code
- [ ] VS Code prompted to install recommended extensions
- [ ] Installed recommended extensions

### Verify VS Code Setup
- [ ] Opened `qe-api-requests.http`
- [ ] Saw "Send Request" links above HTTP requests
- [ ] Clicked "Send Request" on health check
- [ ] Received response in split pane
- [ ] Pressed `Cmd+Shift+P`
- [ ] Typed "Tasks: Run Task"
- [ ] Saw list of QE tasks

### Test Keyboard Shortcuts
- [ ] Pressed `Ctrl+Shift+H` for health check
- [ ] Task ran successfully in terminal

## ✅ Optional Tools

### Install jq (JSON formatter)
- [ ] Ran: `brew install jq`
- [ ] Tested: `echo '{"test": "value"}' | jq '.'`

## ✅ First Real Workflow Test

### Code Analysis Workflow
- [ ] Opened `1-core-analysis.http` `2-test-generation.http` `3-azure-devops.http` in VS Code
- [ ] Found "Scan All Applications" request
- [ ] Clicked "Send Request"
- [ ] Received successful response with code analysis
- [ ] Found "Get Coverage for App1" request
- [ ] Clicked "Send Request"
- [ ] Received coverage report

### Azure DevOps Workflow
- [ ] Found "Pull Stories from Current Sprint" request
- [ ] Updated sprint name in request body
- [ ] Clicked "Send Request"
- [ ] Received stories from ADO
- [ ] Found "Complete Story Workflow" request
- [ ] Updated storyId in request body
- [ ] Clicked "Send Request"
- [ ] Received complete analysis with test cases

## ✅ Troubleshooting (If Needed)

### If Services Won't Start
- [ ] Checked Docker Desktop is running
- [ ] Ran: `docker-compose logs orchestrator`
- [ ] Reviewed logs for errors
- [ ] Tried rebuild: `docker-compose build && docker-compose up -d`

### If Volume Mounts Fail
- [ ] Verified Docker file sharing includes `/Users/williambigno/Desktop/git`
- [ ] Restarted Docker Desktop
- [ ] Verified paths in `docker-compose.yml` match actual folders

### If Azure DevOps Fails
- [ ] Verified PAT token in `config/.env`
- [ ] Checked token hasn't expired in Azure DevOps
- [ ] Verified organization and project names in `config/ado-config.json`

### If REST Client Not Working
- [ ] Verified REST Client extension is installed
- [ ] Reloaded VS Code: `Cmd+Shift+P` → "Reload Window"
- [ ] Verified file has `.http` extension

## ✅ You're All Set!

If all items above are checked, you're ready to use the QE MCP Stack!

### Quick Access

**Command Line:**
```bash
cd /Users/williambigno/Desktop/git/qe-mcp-stack
./scripts/start.sh
curl http://localhost:3000/health
```

**VS Code:**
1. Open project in VS Code
2. Open `qe-api-requests.http`
3. Click "Send Request" on any API call

**Keyboard Shortcuts:**
- `Ctrl+Shift+H` - Health Check
- `Ctrl+Shift+S` - Scan App
- `Ctrl+Shift+C` - Get Coverage
- `Ctrl+Shift+T` - Generate Tests
- `Ctrl+Shift+L` - View Logs

**Tasks:**
- `Cmd+Shift+P` → "Tasks: Run Task" → Select task

### Next Steps

1. ✅ Read `README.md` for detailed MCP explanations
2. ✅ Review `docs/QUICK_REFERENCE.md` for common commands
3. ✅ Try the workflows in the README
4. ✅ Customize for your needs

---

**Need Help?**
- Check logs: `docker-compose logs -f`
- Health: `curl http://localhost:3000/health`
- Full docs: `README.md`

**Enjoy your automated testing platform!** 🚀
