/**
 * Swagger Hub Application
 * Fetches and displays MCP status with auto-refresh
 */

// Configuration
const API_BASE = '/api';
const REFRESH_INTERVAL = 30000; // 30 seconds

// State
let autoRefreshEnabled = true;
let refreshIntervalId = null;

// MCP Categories Configuration
const MCP_CATEGORIES = {
  integration: {
    title: 'Integration MCPs',
    type: 'integration',
    mcps: [
      { name: 'azureDevOps', displayName: 'Azure DevOps', port: 8100, description: 'Work item management and sprint tracking', hasReadme: true, mcpFolder: 'azure-devops' },
      { name: 'thirdParty', displayName: 'Third Party', port: 8101, description: 'External API integrations (Stripe, etc.)', hasReadme: true, mcpFolder: 'third-party' },
      { name: 'testPlanManager', displayName: 'Test Plan Manager', port: 8102, description: 'Test plan creation and management', hasReadme: true, mcpFolder: 'test-plan-manager' },
      { name: 'browserControl', displayName: 'Browser Control', port: 8103, description: 'Chrome browser automation via WebSocket bridge', hasReadme: true, mcpFolder: 'browser-control-mcp' }
    ]
  },
  codeAnalysis: {
    title: 'Code Analysis MCPs',
    type: 'code-analysis',
    mcps: [
      { name: 'dotnetCodeAnalyzer', displayName: '.NET Code Analyzer', port: 8200, description: 'C# code structure analysis (classes, methods, complexity)', hasReadme: true, mcpFolder: 'code-analyzer' },
      { name: 'dotnetCoverageAnalyzer', displayName: '.NET Coverage Analyzer', port: 8201, description: 'xUnit/NUnit/MSTest coverage and gap detection', hasReadme: true, mcpFolder: 'coverage-analyzer' },
      { name: 'migrationAnalyzer', displayName: 'Migration Analyzer', port: 8203, description: 'Track Core → Core.Common migration', hasReadme: true, mcpFolder: 'migration-analyzer' },
      { name: 'javascriptCodeAnalyzer', displayName: 'JavaScript Code Analyzer', port: 8204, description: 'React/Vue/TypeScript code analysis', hasReadme: true, mcpFolder: 'javascript-code-analyzer' },
      { name: 'javascriptCoverageAnalyzer', displayName: 'JavaScript Coverage Analyzer', port: 8205, description: 'Jest/Vitest coverage analysis', hasReadme: true, mcpFolder: 'javascript-coverage-analyzer' }
    ]
  },
  qualityAnalysis: {
    title: 'Quality Analysis MCPs',
    type: 'quality-analysis',
    mcps: [
      { name: 'riskAnalyzer', displayName: 'Risk Analyzer', port: 8300, description: 'AI-powered risk assessment', hasReadme: true, mcpFolder: 'risk-analyzer' },
      { name: 'integrationMapper', displayName: 'Integration Mapper', port: 8301, description: 'Map integration points and dependencies', hasReadme: true, mcpFolder: 'integration-mapper' },
      { name: 'testSelector', displayName: 'Test Selector', port: 8302, description: 'Intelligent test selection based on changes', hasReadme: false }
    ]
  },
  playwright: {
    title: 'Playwright MCPs',
    type: 'playwright',
    mcps: [
      { name: 'playwrightGenerator', displayName: 'Playwright Generator', port: 8400, description: 'Generate Playwright tests from acceptance criteria or paths', hasReadme: true, mcpFolder: 'playwright-generator' },
      { name: 'playwrightAnalyzer', displayName: 'Playwright Analyzer', port: 8401, description: 'Analyze applications to discover critical UI paths', hasReadme: true, mcpFolder: 'playwright-analyzer' },
      { name: 'playwrightHealer', displayName: 'Playwright Healer', port: 8402, description: 'Automatically fix broken Playwright tests', hasReadme: true, mcpFolder: 'playwright-healer' }
    ]
  }
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  fetchMCPStatus();
  startAutoRefresh();
});

// Event Listeners
function setupEventListeners() {
  const refreshBtn = document.getElementById('refresh-btn');
  const autoRefreshToggle = document.getElementById('auto-refresh-toggle');

  refreshBtn.addEventListener('click', () => {
    fetchMCPStatus();
    refreshBtn.classList.add('rotating');
    setTimeout(() => refreshBtn.classList.remove('rotating'), 1000);
  });

  autoRefreshToggle.addEventListener('change', (e) => {
    autoRefreshEnabled = e.target.checked;
    if (autoRefreshEnabled) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  });
}

// Auto-refresh Management
function startAutoRefresh() {
  if (refreshIntervalId) {
    clearInterval(refreshIntervalId);
  }
  refreshIntervalId = setInterval(fetchMCPStatus, REFRESH_INTERVAL);
}

function stopAutoRefresh() {
  if (refreshIntervalId) {
    clearInterval(refreshIntervalId);
    refreshIntervalId = null;
  }
}

// Fetch MCP Status
async function fetchMCPStatus() {
  try {
    const response = await fetch(`${API_BASE}/mcps`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success) {
      updateUI(result.data);
      hideError();
    } else {
      throw new Error(result.error || 'Failed to fetch MCP status');
    }
  } catch (error) {
    console.error('Error fetching MCP status:', error);
    showError(`Failed to connect to orchestrator: ${error.message}`);
    updateUIWithError();
  }
}

// Update UI with MCP data
function updateUI(data) {
  updateOverview(data);
  updateMCPSections(data);
}

// Update Overview Section
function updateOverview(data) {
  const summary = data.summary || {};

  document.getElementById('mcps-healthy').textContent = summary.mcpsHealthy || 0;
  document.getElementById('mcps-total').textContent = summary.mcpsTotal || 0;
  document.getElementById('last-update').textContent = new Date().toLocaleTimeString();

  const orchestratorStatus = document.getElementById('orchestrator-status');
  orchestratorStatus.textContent = '✓ Connected';
  orchestratorStatus.style.color = 'var(--success-color)';
}

// Update MCP Sections
function updateMCPSections(data) {
  // Integration MCPs
  renderMCPCategory('integration', data.integration || {});

  // Code Analysis MCPs
  renderMCPCategory('codeAnalysis', data.codeAnalysis || {});

  // Quality Analysis MCPs
  renderMCPCategory('qualityAnalysis', data.qualityAnalysis || {});

  // Playwright MCPs
  renderMCPCategory('playwright', data.playwright || {});
}

// Render MCP Category
function renderMCPCategory(categoryKey, mcpData) {
  const category = MCP_CATEGORIES[categoryKey];
  const containerId = `${categoryKey.replace(/([A-Z])/g, '-$1').toLowerCase()}-mcps`;
  const container = document.getElementById(containerId);

  if (!container) return;

  container.innerHTML = '';

  category.mcps.forEach(mcpConfig => {
    const mcpStatus = mcpData[mcpConfig.name] || { status: 'unknown', url: '' };
    const card = createMCPCard(mcpConfig, mcpStatus, category.type);
    container.appendChild(card);
  });
}

// Create MCP Card Element
function createMCPCard(config, status, categoryType) {
  const card = document.createElement('div');
  card.className = `mcp-card ${status.status}`;

  const statusClass = status.status === 'healthy' ? 'healthy' :
                     status.status === 'unhealthy' ? 'unhealthy' : 'unknown';

  const baseUrl = status.url || `http://localhost:${config.port}`;

  // Determine the folder name for the MCP (some have different names)
  const mcpFolder = config.mcpFolder || config.name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');

  // Build documentation URL
  const docsUrl = `http://localhost:3000/docs/${categoryType}/${mcpFolder}`;

  // Build action buttons HTML
  let actionsHtml = `
    <a href="${baseUrl}/health" target="_blank" class="mcp-btn mcp-btn-secondary"
       ${status.status !== 'healthy' ? 'style="opacity: 0.5; pointer-events: none;"' : ''}>
      💚 Health
    </a>
  `;

  // Add docs button if README exists
  if (config.hasReadme) {
    actionsHtml += `
      <a href="${docsUrl}" target="_blank" class="mcp-btn mcp-btn-primary">
        📚 Docs
      </a>
    `;
  }

  card.innerHTML = `
    <div class="mcp-header">
      <div class="mcp-name">${config.displayName}</div>
      <span class="status-badge ${statusClass}">${status.status}</span>
    </div>
    <div class="mcp-url">${baseUrl}</div>
    <p class="section-desc">${config.description}</p>
    <div class="mcp-actions">
      ${actionsHtml}
    </div>
  `;

  return card;
}

// Update UI with Error State
function updateUIWithError() {
  document.getElementById('mcps-healthy').textContent = '?';
  document.getElementById('mcps-total').textContent = '?';
  document.getElementById('last-update').textContent = new Date().toLocaleTimeString();

  const orchestratorStatus = document.getElementById('orchestrator-status');
  orchestratorStatus.textContent = '✗ Disconnected';
  orchestratorStatus.style.color = 'var(--danger-color)';

  // Show loading state in all sections
  ['integration-mcps', 'code-analysis-mcps', 'quality-analysis-mcps'].forEach(id => {
    const container = document.getElementById(id);
    if (container) {
      container.innerHTML = '<div class="loading">Unable to load MCPs. Check orchestrator connection.</div>';
    }
  });
}

// Error Display
function showError(message) {
  const errorBanner = document.getElementById('error-message');
  const errorText = document.getElementById('error-text');

  errorText.textContent = message;
  errorBanner.style.display = 'flex';

  // Auto-hide after 10 seconds
  setTimeout(() => {
    errorBanner.style.display = 'none';
  }, 10000);
}

function hideError() {
  const errorBanner = document.getElementById('error-message');
  errorBanner.style.display = 'none';
}

// Add rotation animation for refresh button
const style = document.createElement('style');
style.textContent = `
  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .rotating {
    animation: rotate 1s linear;
  }
`;
document.head.appendChild(style);
