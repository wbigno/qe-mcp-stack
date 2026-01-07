// API Configuration
const API_BASE_URL = 'http://localhost:3000';

// Import components
import { modelSelector } from './modelSelector.js';
import { AppSelector } from './appSelector.js';
import { SprintSelector } from './sprintSelector.js';
import { AnalysisPanel } from './analysisPanel.js';
import { cacheManager } from './cache.js';
import { EmptyState } from './emptyState.js';

// State Management
let currentData = {
    workItems: [],
    defects: [],
    testRuns: [],
    qualityMetrics: null
};

let currentFilters = {
    app: '',
    sprint: '',
    environment: '',
    state: ''
};

// Component instances
let appSelector;
let sprintSelector;
let analysisPanel;

let isLoading = false;

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== ADO Dashboard Initializing ===');

    // Initialize model selector
    console.log('Initializing model selector...');
    modelSelector.initialize();

    console.log('Initializing navigation...');
    initializeNavigation();

    console.log('Initializing filter bar...');
    initializeFilterBar();

    console.log('Initializing filters...');
    initializeFilters();

    console.log('Initializing story analyzer...');
    initializeStoryAnalyzer();

    console.log('Initializing test cases tab...');
    initializeTestCasesTab();

    console.log('Adding SVG gradients...');
    addSVGGradients();

    // Initialize analysis panel
    console.log('Initializing analysis panel...');
    analysisPanel = new AnalysisPanel('analysisPanel');

    // Show initial message prompting user to set filters
    showStatusMessage('Please select App and Sprint, then click Apply to load data', 'info');

    console.log('=== ADO Dashboard Initialized Successfully ===');
});

// ============================================
// NAVIGATION (TOP TABS)
// ============================================

function initializeNavigation() {
    console.log('[Navigation] Initializing tabs...');
    const tabBtns = document.querySelectorAll('.tab-btn');
    console.log(`[Navigation] Found ${tabBtns.length} tab buttons`);

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            console.log(`[Navigation] Tab clicked: ${tabName}`);
            switchTab(tabName);

            // Update active state
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

function switchTab(tabName) {
    console.log(`[Tab Switch] Switching to: ${tabName}`);
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));

    const activeTab = document.getElementById(`${tabName}-tab`);
    if (activeTab) {
        activeTab.classList.add('active');
        console.log(`[Tab Switch] Tab ${tabName} is now active`);

        // Load tab-specific data
        switch(tabName) {
            case 'defects':
                console.log('[Tab Switch] Loading defects data...');
                loadDefects();
                break;
            case 'test-cases':
                console.log('[Tab Switch] Test cases tab - no auto-load');
                break;
            case 'test-execution':
                console.log('[Tab Switch] Loading test execution data...');
                loadTestExecution();
                break;
            case 'quality-metrics':
                console.log('[Tab Switch] Loading quality metrics data...');
                loadQualityMetrics();
                break;
            default:
                console.log(`[Tab Switch] No data loading needed for ${tabName}`);
        }
    } else {
        console.error(`[Tab Switch] ERROR: Tab element not found: ${tabName}-tab`);
    }
}

// ============================================
// FILTER BAR (COLLAPSIBLE)
// ============================================

function initializeFilterBar() {
    const toggle = document.getElementById('filterBarToggle');
    const content = document.getElementById('filterBarContent');
    const icon = toggle.querySelector('.toggle-icon');
    
    // Load saved state
    const isCollapsed = localStorage.getItem('filterBarCollapsed') === 'true';
    if (isCollapsed) {
        content.classList.add('collapsed');
        icon.classList.add('collapsed');
    }
    
    toggle.addEventListener('click', () => {
        content.classList.toggle('collapsed');
        icon.classList.toggle('collapsed');
        
        // Save state
        localStorage.setItem('filterBarCollapsed', content.classList.contains('collapsed'));
    });
}

// ============================================
// FILTERS
// ============================================

function initializeFilters() {
    console.log('[Filters] Initializing filter controls...');
    const applyBtn = document.getElementById('applyFiltersBtn');
    const clearBtn = document.getElementById('clearFiltersBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const envFilter = document.getElementById('environmentFilter');
    const stateFilter = document.getElementById('stateFilter');
    const appSelect = document.getElementById('appSelect');

    console.log('[Filters] Filter elements found:', {
        applyBtn: !!applyBtn,
        clearBtn: !!clearBtn,
        refreshBtn: !!refreshBtn,
        envFilter: !!envFilter,
        stateFilter: !!stateFilter,
        appSelect: !!appSelect
    });

    // ============================================
    // FORM VALIDATION
    // Enables/disables Apply button based on required fields
    // ============================================
    function validateFilters() {
        const selectedApp = appSelector?.getSelectedApp();
        const selectedSprint = sprintSelector?.getSelectedSprintPath();

        console.log('[Filters] Validating:', { selectedApp, selectedSprint });

        const isValid = selectedApp && selectedSprint;

        if (applyBtn) {
            applyBtn.disabled = !isValid;
            if (isValid) {
                applyBtn.title = 'Click to load data';
            } else {
                const missing = [];
                if (!selectedApp) missing.push('Application');
                if (!selectedSprint) missing.push('Sprint');
                applyBtn.title = `Please select: ${missing.join(', ')}`;
            }
        }

        // Add/remove invalid class for visual feedback
        if (appSelect) {
            if (selectedApp) {
                appSelect.classList.remove('invalid');
            } else {
                appSelect.classList.add('invalid');
            }
        }
    }

    // Initialize app selector with validation callback
    appSelector = new AppSelector('appSelect', (appName) => {
        currentFilters.app = appName || '';
        validateFilters();
    });

    // Initialize sprint selector with validation callback
    sprintSelector = new SprintSelector('sprintSelectorContainer', (sprintPath) => {
        currentFilters.sprint = sprintPath || '';
        validateFilters();
    });

    // Also validate when app select changes directly (fallback)
    if (appSelect) {
        appSelect.addEventListener('change', () => {
            validateFilters();
        });
    }

    // Run initial validation after a short delay to ensure selectors are ready
    setTimeout(() => validateFilters(), 500);

    applyBtn.addEventListener('click', () => {
        console.log('[Filters] Apply button clicked');
        const selectedApp = appSelector.getSelectedApp();
        const selectedSprint = sprintSelector.getSelectedSprintPath();

        console.log('[Filters] Selected values:', { selectedApp, selectedSprint });

        if (!selectedApp) {
            console.warn('[Filters] No app selected');
            showStatusMessage('Please select an application', 'error');
            return;
        }

        if (!selectedSprint) {
            console.warn('[Filters] No sprint selected');
            showStatusMessage('Please select a sprint (Project → Team → Sprint)', 'error');
            return;
        }

        currentFilters.app = selectedApp;
        currentFilters.sprint = selectedSprint;
        currentFilters.environment = envFilter.value;
        currentFilters.state = stateFilter.value;

        console.log('[Filters] Current filters set:', currentFilters);
        loadAllData();
    });

    clearBtn.addEventListener('click', () => {
        console.log('[Filters] Clear button clicked');
        // Reset app selector
        if (appSelector && appSelector.select) {
            appSelector.select.value = '';
        }

        // Reset sprint selector by reinitializing
        sprintSelector = new SprintSelector('sprintSelectorContainer', (sprintPath) => {
            currentFilters.sprint = sprintPath || '';
            validateFilters();
        });

        envFilter.value = '';
        stateFilter.value = '';
        currentFilters = { app: '', sprint: '', environment: '', state: '' };

        validateFilters(); // Revalidate after clearing
        showStatusMessage('Filters cleared', 'info');
    });

    refreshBtn.addEventListener('click', () => {
        loadAllData();
    });
}

// ============================================
// DATA LOADING
// ============================================

async function loadAllData() {
    console.log('[Load All] Starting data load...');
    console.log('[Load All] Current filters:', currentFilters);

    if (isLoading) {
        console.warn('[Load All] Already loading, skipping...');
        return;
    }

    isLoading = true;
    const applyBtn = document.getElementById('applyFiltersBtn');
    if (applyBtn) {
        applyBtn.disabled = true;
        console.log('[Load All] Apply button disabled');
    }

    try {
        console.log('[Load All] Loading core data (work items & defects)...');
        // Load core data (work items and defects) - these are required
        await Promise.all([
            loadWorkItems(),
            loadDefects()
        ]);
        console.log('[Load All] Core data loaded successfully');

        // Load optional metrics (don't fail if they error)
        console.log('[Load All] Loading optional metrics...');
        loadTestExecution().catch(err => console.log('[Load All] Test execution metrics not available:', err.message));
        loadQualityMetrics().catch(err => console.log('[Load All] Quality metrics not available:', err.message));

        console.log('[Load All] Updating overview...');
        updateOverview();

        console.log('[Load All] ✅ All data loaded successfully!');
        showStatusMessage('Data loaded successfully!', 'success');
    } catch (error) {
        console.error('[Load All] ❌ Error loading data:', error);
        showStatusMessage(`Failed to load data: ${error.message}`, 'error');
        // Individual load functions handle their own error states with EmptyState components
    } finally {
        if (applyBtn) {
            applyBtn.disabled = false;
            console.log('[Load All] Apply button re-enabled');
        }
        isLoading = false;
        console.log('[Load All] Load complete, isLoading = false');
    }
}

async function loadWorkItems() {
    console.log('[Work Items] Loading work items...');
    const workItemsContent = document.getElementById('workItemsContent');
    if (!workItemsContent) {
        console.error('[Work Items] workItemsContent element not found!');
        return;
    }

    // Show loading state
    workItemsContent.innerHTML = '';
    workItemsContent.appendChild(EmptyState.createLoading('Loading work items...'));
    console.log('[Work Items] Loading state displayed');

    try {
        const params = {
            sprint: currentFilters.sprint,
            state: currentFilters.state
        };
        console.log('[Work Items] API params:', params);

        const cacheKey = cacheManager.generateKey('/api/dashboard/aod-summary', params);
        console.log('[Work Items] Cache key:', cacheKey);

        // Check cache first
        const cachedData = cacheManager.get(cacheKey);
        if (cachedData) {
            console.log('[Work Items] ✅ Using cached data, items:', cachedData.workItemDetails?.length || 0);
            currentData.workItems = cachedData.workItemDetails || [];
            updateWorkItemsTab();

            // Show cache indicator
            const metadata = cacheManager.getMetadata(cacheKey);
            const indicator = EmptyState.createCacheIndicator(metadata, () => {
                cacheManager.remove(cacheKey);
                loadWorkItems();
            });
            workItemsContent.insertBefore(indicator, workItemsContent.firstChild);
            return;
        }

        // Make API call
        const urlParams = new URLSearchParams();
        if (params.sprint) urlParams.append('sprint', params.sprint);
        if (params.state) urlParams.append('state', params.state);

        const url = `${API_BASE_URL}/api/dashboard/aod-summary${urlParams.toString() ? '?' + urlParams : ''}`;
        console.log('[Work Items] Fetching from API:', url);

        const response = await fetch(url);
        console.log('[Work Items] Response status:', response.status, response.statusText);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('[Work Items] Response data:', {
            hasData: !!data,
            workItemCount: data.workItemDetails?.length || 0,
            dataKeys: Object.keys(data || {})
        });

        currentData.workItems = data.workItemDetails || [];
        console.log('[Work Items] Stored in currentData:', currentData.workItems.length, 'items');

        // Cache the response
        cacheManager.set(cacheKey, data, params);
        console.log('[Work Items] Data cached');

        console.log('[Work Items] Calling updateWorkItemsTab()...');
        updateWorkItemsTab();
        console.log('[Work Items] ✅ Complete');
    } catch (error) {
        console.error('[Work Items] ❌ Error:', error);
        workItemsContent.innerHTML = '';
        workItemsContent.appendChild(EmptyState.createError(error.message, () => loadWorkItems()));
    }
}

async function loadDefects() {
    console.log('[Defects] Loading defects...');
    const defectsContent = document.getElementById('defectsContent');
    if (!defectsContent) {
        console.error('[Defects] defectsContent element not found!');
        return;
    }

    // Show loading state
    defectsContent.innerHTML = '';
    defectsContent.appendChild(EmptyState.createLoading('Loading defects...'));
    console.log('[Defects] Loading state displayed');

    try {
        const params = {
            sprint: currentFilters.sprint,
            environment: currentFilters.environment,
            state: currentFilters.state
        };
        console.log('[Defects] API params:', params);

        // Generate cache key
        const cacheKey = cacheManager.generateKey('/api/ado/defects', params);
        console.log('[Defects] Cache key:', cacheKey);

        // Check cache first
        const cachedData = cacheManager.get(cacheKey);
        if (cachedData) {
            console.log('[Defects] ✅ Using cached data, defects:', cachedData.defects?.length || 0);
            currentData.defects = cachedData.defects || [];
            currentData.defectMetrics = cachedData.metrics || {};
            updateDefectsTab();

            // Show cache indicator
            const metadata = cacheManager.getMetadata(cacheKey);
            const indicator = EmptyState.createCacheIndicator(metadata, () => {
                cacheManager.remove(cacheKey);
                loadDefects();
            });
            defectsContent.insertBefore(indicator, defectsContent.firstChild);
            return;
        }

        // Make API call
        const urlParams = new URLSearchParams();
        if (params.sprint) urlParams.append('sprint', params.sprint);
        if (params.environment) urlParams.append('environment', params.environment);
        if (params.state) urlParams.append('state', params.state);

        const url = `${API_BASE_URL}/api/ado/defects${urlParams.toString() ? '?' + urlParams : ''}`;
        console.log('[Defects] Fetching from API:', url);

        const response = await fetch(url);
        console.log('[Defects] Response status:', response.status, response.statusText);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('[Defects] Response data:', {
            hasData: !!data,
            defectCount: data.defects?.length || 0,
            hasMetrics: !!data.metrics,
            dataKeys: Object.keys(data || {})
        });

        currentData.defects = data.defects || [];
        currentData.defectMetrics = data.metrics || {};
        console.log('[Defects] Stored in currentData:', currentData.defects.length, 'defects');

        // Cache the response
        cacheManager.set(cacheKey, data, params);
        console.log('[Defects] Data cached');

        console.log('[Defects] Calling updateDefectsTab()...');
        updateDefectsTab();
        console.log('[Defects] ✅ Complete');
    } catch (error) {
        console.error('[Defects] ❌ Error:', error);
        defectsContent.innerHTML = '';
        defectsContent.appendChild(EmptyState.createError(error.message, () => loadDefects()));
    }
}

async function loadTestExecution() {
    console.log('[Test Execution] Loading test execution by story...');
    const testExecutionContent = document.getElementById('testExecutionContent');
    if (!testExecutionContent) {
        console.error('[Test Execution] testExecutionContent element not found!');
        return;
    }

    // Show loading state
    testExecutionContent.innerHTML = '';
    testExecutionContent.appendChild(EmptyState.createLoading('Loading test execution data...'));
    console.log('[Test Execution] Loading state displayed');

    try {
        const params = { sprint: currentFilters.sprint };
        console.log('[Test Execution] API params:', params);
        const cacheKey = cacheManager.generateKey('/api/ado/test-execution/by-story', params);
        console.log('[Test Execution] Cache key:', cacheKey);

        // Check cache first
        const cachedData = cacheManager.get(cacheKey);
        if (cachedData) {
            console.log('[Test Execution] ✅ Using cached data, stories:', cachedData.stories?.length || 0);
            currentData.testExecutionStories = cachedData.stories || [];
            currentData.testExecutionMetrics = cachedData.metrics || {};
            updateTestExecutionTab();

            // Show cache indicator
            const metadata = cacheManager.getMetadata(cacheKey);
            const indicator = EmptyState.createCacheIndicator(metadata, () => {
                cacheManager.remove(cacheKey);
                loadTestExecution();
            });
            testExecutionContent.insertBefore(indicator, testExecutionContent.firstChild);
            return;
        }

        // Make API call to story-centric endpoint
        const urlParams = new URLSearchParams();
        if (params.sprint) urlParams.append('sprint', params.sprint);

        const url = `${API_BASE_URL}/api/ado/test-execution/by-story${urlParams.toString() ? '?' + urlParams : ''}`;
        console.log('[Test Execution] Fetching from API:', url);
        const response = await fetch(url);
        console.log('[Test Execution] Response status:', response.status, response.statusText);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('[Test Execution] Response data:', data);
        currentData.testExecutionStories = data.stories || [];
        currentData.testExecutionMetrics = data.metrics || {};

        console.log('[Test Execution] Stored in currentData:', {
            metrics: currentData.testExecutionMetrics,
            storiesCount: currentData.testExecutionStories.length
        });

        // Cache the response
        cacheManager.set(cacheKey, {
            metrics: currentData.testExecutionMetrics,
            stories: currentData.testExecutionStories
        }, params);
        console.log('[Test Execution] Data cached');

        console.log('[Test Execution] Calling updateTestExecutionTab()...');
        updateTestExecutionTab();
        console.log('[Test Execution] ✅ Complete');
    } catch (error) {
        console.error('[Test Execution] ❌ Error:', error);
        testExecutionContent.innerHTML = '';
        testExecutionContent.appendChild(EmptyState.createError(error.message, () => loadTestExecution()));
    }
}

async function loadQualityMetrics() {
    console.log('[Quality Metrics] Loading quality metrics...');
    const qualityMetricsContent = document.getElementById('qualityMetricsContent');
    if (!qualityMetricsContent) {
        console.error('[Quality Metrics] qualityMetricsContent element not found!');
        return;
    }

    // Show loading state
    qualityMetricsContent.innerHTML = '';
    qualityMetricsContent.appendChild(EmptyState.createLoading('Loading quality metrics...'));
    console.log('[Quality Metrics] Loading state displayed');

    try {
        const params = { sprint: currentFilters.sprint };
        console.log('[Quality Metrics] API params:', params);
        const cacheKey = cacheManager.generateKey('/api/ado/quality-metrics', params);
        console.log('[Quality Metrics] Cache key:', cacheKey);

        // Check cache first
        const cachedData = cacheManager.get(cacheKey);
        if (cachedData) {
            console.log('[Quality Metrics] ✅ Using cached data:', cachedData.metrics);
            currentData.qualityMetrics = cachedData.metrics || {};
            updateQualityMetricsTab();

            // Show cache indicator
            const metadata = cacheManager.getMetadata(cacheKey);
            const indicator = EmptyState.createCacheIndicator(metadata, () => {
                cacheManager.remove(cacheKey);
                loadQualityMetrics();
            });
            qualityMetricsContent.insertBefore(indicator, qualityMetricsContent.firstChild);
            return;
        }

        // Make API call
        const urlParams = new URLSearchParams();
        if (params.sprint) urlParams.append('sprint', params.sprint);

        const url = `${API_BASE_URL}/api/ado/quality-metrics${urlParams.toString() ? '?' + urlParams : ''}`;
        console.log('[Quality Metrics] Fetching from API:', url);
        const response = await fetch(url);
        console.log('[Quality Metrics] Response status:', response.status, response.statusText);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('[Quality Metrics] Response data:', data);
        currentData.qualityMetrics = data.metrics || {};
        console.log('[Quality Metrics] Stored in currentData:', currentData.qualityMetrics);

        // Cache the response
        cacheManager.set(cacheKey, data, params);
        console.log('[Quality Metrics] Data cached');

        console.log('[Quality Metrics] Calling updateQualityMetricsTab()...');
        updateQualityMetricsTab();
        console.log('[Quality Metrics] ✅ Complete');
    } catch (error) {
        console.error('[Quality Metrics] ❌ Error:', error);
        qualityMetricsContent.innerHTML = '';
        qualityMetricsContent.appendChild(EmptyState.createError(error.message, () => loadQualityMetrics()));
    }
}

// ============================================
// UPDATE OVERVIEW TAB
// ============================================

function updateOverview() {
    console.log('[Overview] Updating overview tab...');
    console.log('[Overview] Current data:', {
        workItemsCount: currentData.workItems?.length || 0,
        defectMetrics: currentData.defectMetrics,
        testMetrics: currentData.testMetrics,
        qualityMetrics: currentData.qualityMetrics
    });

    // Update metric cards
    const activeWorkItems = document.getElementById('activeWorkItems');
    const activeDefects = document.getElementById('activeDefects');
    const testPassRate = document.getElementById('testPassRate');
    const qualityScore = document.getElementById('qualityScore');

    console.log('[Overview] Metric card elements:', { activeWorkItems, activeDefects, testPassRate, qualityScore });

    if (activeWorkItems) {
        activeWorkItems.textContent = currentData.workItems.length || 0;
        console.log('[Overview] Set activeWorkItems:', activeWorkItems.textContent);
    }

    if (activeDefects) {
        activeDefects.textContent = currentData.defectMetrics?.open || 0;
        console.log('[Overview] Set activeDefects:', activeDefects.textContent);
    }

    if (testPassRate) {
        testPassRate.textContent = `${currentData.testMetrics?.passRate || 0}%`;
        console.log('[Overview] Set testPassRate:', testPassRate.textContent);
    }

    if (qualityScore) {
        qualityScore.textContent = currentData.qualityMetrics?.qualityScore || '-';
        console.log('[Overview] Set qualityScore:', qualityScore.textContent);
    }

    // Update charts
    console.log('[Overview] Updating charts...');
    updateDefectsByEnvChart();
    updateTestTrendsChart();
    console.log('[Overview] ✅ Complete');
}

function updateDefectsByEnvChart() {
    console.log('[Defects Chart] Updating defects by environment chart...');
    const container = document.getElementById('defectsByEnvChart');
    if (!container) {
        console.error('[Defects Chart] defectsByEnvChart element not found!');
        return;
    }
    const envData = currentData.defectMetrics?.byEnvironment || { dev: 0, uat: 0, prod: 0 };
    console.log('[Defects Chart] Environment data:', envData);

    container.innerHTML = `
        <div style="padding: 20px;">
            <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: var(--text-secondary);">Dev</span>
                    <span style="color: var(--text-primary); font-weight: 600;">${envData.dev}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${envData.dev * 10}%"></div>
                </div>
            </div>
            <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: var(--text-secondary);">UAT</span>
                    <span style="color: var(--text-primary); font-weight: 600;">${envData.uat}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${envData.uat * 10}%"></div>
                </div>
            </div>
            <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="color: var(--text-secondary);">Prod</span>
                    <span style="color: var(--text-primary); font-weight: 600;">${envData.prod}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill failed" style="width: ${envData.prod * 10}%"></div>
                </div>
            </div>
        </div>
    `;
    console.log('[Defects Chart] Chart updated');
}

function updateTestTrendsChart() {
    console.log('[Test Trends Chart] Updating test trends chart...');
    const container = document.getElementById('testTrendsChart');
    if (!container) {
        console.error('[Test Trends Chart] testTrendsChart element not found!');
        return;
    }
    const passRate = parseFloat(currentData.testMetrics?.passRate || 0);
    console.log('[Test Trends Chart] Test metrics:', {
        passRate,
        totalRuns: currentData.testMetrics?.totalRuns,
        automationRate: currentData.testMetrics?.automationRate
    });

    container.innerHTML = `
        <div style="padding: 20px; text-align: center;">
            <div style="font-size: 48px; font-weight: 700; color: var(--text-primary); margin-bottom: 10px;">
                ${passRate.toFixed(1)}%
            </div>
            <div style="color: var(--text-secondary); margin-bottom: 20px;">Overall Pass Rate</div>
            <div class="progress-bar" style="height: 12px;">
                <div class="progress-fill" style="width: ${passRate}%"></div>
            </div>
            <div style="margin-top: 20px; display: flex; justify-content: space-around;">
                <div>
                    <div style="font-size: 24px; color: #4ade80;">${currentData.testMetrics?.totalRuns || 0}</div>
                    <div style="font-size: 12px; color: var(--text-muted);">Total Runs</div>
                </div>
                <div>
                    <div style="font-size: 24px; color: #60a5fa;">${currentData.testMetrics?.automationRate || 0}%</div>
                    <div style="font-size: 12px; color: var(--text-muted);">Automated</div>
                </div>
            </div>
        </div>
    `;
    console.log('[Test Trends Chart] Chart updated');
}

// ============================================
// UPDATE WORK ITEMS TAB
// ============================================

// ============================================
// UPDATE WORK ITEMS TAB - HIERARCHICAL CARD VIEW
// ============================================

function updateWorkItemsTab() {
    console.log('[Work Items Tab] Updating work items tab...');
    const workItemsContent = document.getElementById('workItemsContent');

    console.log('[Work Items Tab] Work items data:', {
        hasData: !!currentData.workItems,
        count: currentData.workItems?.length || 0
    });

    if (!currentData.workItems || currentData.workItems.length === 0) {
        console.log('[Work Items Tab] No work items, showing empty state');
        if (workItemsContent) {
            workItemsContent.innerHTML = '';
            workItemsContent.appendChild(EmptyState.create('work-items'));
        }
        return;
    }

    // Separate parents and children
    const parents = currentData.workItems.filter(item =>
        ['Feature', 'Product Backlog Item', 'Issue', 'Bug'].includes(item.type)
    );
    const children = currentData.workItems.filter(item =>
        item.type === 'Task' || item.parentId
    );
    const orphans = children.filter(item => !item.parentId);

    console.log('[Work Items Tab] Hierarchy:', {
        parents: parents.length,
        children: children.length,
        orphans: orphans.length
    });

    // Build hierarchy map
    const childrenByParent = {};
    children.forEach(child => {
        if (child.parentId) {
            if (!childrenByParent[child.parentId]) {
                childrenByParent[child.parentId] = [];
            }
            childrenByParent[child.parentId].push(child);
        }
    });

    // Create card-based layout
    workItemsContent.innerHTML = '<div class="work-items-hierarchy"></div>';
    const container = workItemsContent.querySelector('.work-items-hierarchy');

    // Render parent items with their children
    parents.forEach(parent => {
        const childTasks = childrenByParent[parent.id] || [];
        const card = createParentCard(parent, childTasks);
        container.appendChild(card);
    });

    // Render orphan tasks (no parent)
    if (orphans.length > 0) {
        const orphanCard = createOrphanTasksCard(orphans);
        container.appendChild(orphanCard);
    }

    console.log('[Work Items Tab] ✅ Hierarchy rendered successfully');
}

function createParentCard(parent, children) {
    const card = document.createElement('div');
    card.className = 'parent-card';

    const completedCount = children.filter(c => c.state === 'Done' || c.state === 'Closed').length;
    const inProgressCount = children.filter(c => c.state === 'In Progress' || c.state === 'Active').length;
    const todoCount = children.filter(c => c.state === 'To Do' || c.state === 'New').length;
    const progressPercent = children.length > 0 ? Math.round((completedCount / children.length) * 100) : 0;

    // Helper to strip HTML tags from description
    const stripHtml = (html) => {
        if (!html) return '';
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    };

    const hasDescription = parent.description || parent.acceptanceCriteria || parent.reproSteps;
    const descriptionText = stripHtml(parent.description || parent.reproSteps || '');
    const acceptanceCriteriaText = stripHtml(parent.acceptanceCriteria || '');

    card.innerHTML = `
        <div class="parent-header">
            <div class="parent-info">
                <div class="parent-title-row">
                    <span class="parent-id">#${parent.id}</span>
                    ${getWorkItemTypeBadge(parent.type)}
                    ${getStateBadge(parent.state)}
                </div>
                <h3 class="parent-title">${parent.title}</h3>
                <div class="parent-meta">
                    <span class="meta-item">👤 ${parent.assignedTo || 'Unassigned'}</span>
                    <span class="meta-item">🎯 Priority ${parent.priority || 3}</span>
                    <span class="meta-item">📋 ${children.length} Tasks</span>
                </div>
            </div>
            <div class="parent-progress">
                <div class="progress-stats">
                    <span class="stat done">✓ ${completedCount}</span>
                    <span class="stat in-progress">⟳ ${inProgressCount}</span>
                    <span class="stat todo">○ ${todoCount}</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${progressPercent}%"></div>
                </div>
                <div class="progress-text">${progressPercent}% Complete</div>
            </div>
        </div>
        ${hasDescription ? `
        <div class="parent-description-section">
            <button class="description-toggle">
                <span class="toggle-icon">▼</span>
                <span class="toggle-text">Description</span>
            </button>
            <div class="description-content" style="display: none;">
                ${descriptionText ? `
                    <div class="description-field">
                        <h4>${parent.type === 'Bug' ? 'Repro Steps' : 'Description'}</h4>
                        <p>${descriptionText}</p>
                    </div>
                ` : ''}
                ${acceptanceCriteriaText ? `
                    <div class="description-field">
                        <h4>Acceptance Criteria</h4>
                        <p>${acceptanceCriteriaText}</p>
                    </div>
                ` : ''}
            </div>
        </div>
        ` : ''}
        <div class="parent-tasks-section">
            <button class="tasks-toggle">
                <span class="toggle-icon">▶</span>
                <span class="toggle-text">Tasks (${children.length})</span>
            </button>
            <div class="children-container" style="display: none;">
                ${children.length > 0 ? children.map(child => createChildTaskHtml(child)).join('') : '<div class="no-tasks">No tasks</div>'}
            </div>
        </div>
    `;

    // Add event listeners for child tasks
    children.forEach((child, index) => {
        const childElement = card.querySelectorAll('.child-task')[index];
        if (childElement) {
            const viewBtn = childElement.querySelector('.view-task-btn');

            if (viewBtn) {
                viewBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showTaskDetailsModal(child);
                });
            }
        }
    });

    // Add Analyze and View buttons to parent card header
    const parentHeader = card.querySelector('.parent-header');
    const parentActions = document.createElement('div');
    parentActions.className = 'parent-actions';
    parentActions.innerHTML = `
        <button class="btn btn-sm btn-primary analyze-parent-btn">🔍 Analyze</button>
        <button class="btn btn-sm btn-secondary view-parent-btn">📊 View Analysis</button>
    `;
    parentHeader.appendChild(parentActions);

    // Add event listeners for parent buttons
    const analyzeParentBtn = card.querySelector('.analyze-parent-btn');
    const viewParentBtn = card.querySelector('.view-parent-btn');

    if (analyzeParentBtn) {
        analyzeParentBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Navigate to Story Analyzer tab and pre-fill the ID
            switchTab('story-analyzer');
            const storyIdInput = document.getElementById('storyIdInput');
            if (storyIdInput) {
                storyIdInput.value = parent.id;
            }
        });
    }

    if (viewParentBtn) {
        viewParentBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            viewStoryAnalysis(parent);
        });
    }

    // Add event listener for description toggle
    const descriptionToggle = card.querySelector('.description-toggle');
    if (descriptionToggle) {
        descriptionToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const content = card.querySelector('.description-content');
            const icon = descriptionToggle.querySelector('.toggle-icon');
            if (content.style.display === 'none') {
                content.style.display = 'block';
                icon.textContent = '▲';
            } else {
                content.style.display = 'none';
                icon.textContent = '▼';
            }
        });
    }

    // Add event listener for tasks toggle
    const tasksToggle = card.querySelector('.tasks-toggle');
    if (tasksToggle) {
        tasksToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const content = card.querySelector('.children-container');
            const icon = tasksToggle.querySelector('.toggle-icon');
            if (content.style.display === 'none') {
                content.style.display = 'block';
                icon.textContent = '▼';
            } else {
                content.style.display = 'none';
                icon.textContent = '▶';
            }
        });
    }

    return card;
}

function createChildTaskHtml(task) {
    return `
        <div class="child-task">
            <div class="child-info">
                <span class="child-id">#${task.id}</span>
                ${getStateBadge(task.state)}
                <span class="child-title">${task.title}</span>
            </div>
            <div class="child-meta">
                <span class="child-assignee">👤 ${task.assignedTo || 'Unassigned'}</span>
                <div class="child-actions">
                    <button class="btn btn-xs btn-secondary view-task-btn" data-task-id="${task.id}">View Details</button>
                </div>
            </div>
        </div>
    `;
}

function createOrphanTasksCard(orphans) {
    const card = document.createElement('div');
    card.className = 'parent-card orphan-card';

    card.innerHTML = `
        <div class="parent-header">
            <div class="parent-info">
                <h3 class="parent-title">📋 Unlinked Tasks</h3>
                <div class="parent-meta">
                    <span class="meta-item">${orphans.length} tasks without parent items</span>
                </div>
            </div>
        </div>
        <div class="parent-tasks-section">
            <button class="tasks-toggle">
                <span class="toggle-icon">▶</span>
                <span class="toggle-text">Tasks (${orphans.length})</span>
            </button>
            <div class="children-container" style="display: none;">
                ${orphans.map(task => createChildTaskHtml(task)).join('')}
            </div>
        </div>
    `;

    // Add event listeners for orphan tasks
    orphans.forEach((task, index) => {
        const taskElement = card.querySelectorAll('.child-task')[index];
        if (taskElement) {
            const viewBtn = taskElement.querySelector('.view-task-btn');

            if (viewBtn) {
                viewBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showTaskDetailsModal(task);
                });
            }
        }
    });

    // Add event listener for tasks toggle
    const tasksToggle = card.querySelector('.tasks-toggle');
    if (tasksToggle) {
        tasksToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const content = card.querySelector('.children-container');
            const icon = tasksToggle.querySelector('.toggle-icon');
            if (content.style.display === 'none') {
                content.style.display = 'block';
                icon.textContent = '▼';
            } else {
                content.style.display = 'none';
                icon.textContent = '▶';
            }
        });
    }

    return card;
}

// Function to view story in analysis panel
function viewStoryAnalysis(story) {
    console.log('[View Story Analysis] Opening story analysis panel for story:', story.id);
    if (!currentFilters.app) {
        console.warn('[View Story Analysis] No app selected');
        showStatusMessage('Please select an application first', 'error');
        return;
    }

    console.log('[View Story Analysis] Current app:', currentFilters.app);

    // Switch to story analysis tab
    console.log('[View Story Analysis] Switching to story-analysis tab');
    switchTab('story-analysis');

    // Update tab button active state
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(b => b.classList.remove('active'));
    const analysisTabBtn = document.querySelector('.tab-btn[data-tab="story-analysis"]');
    if (analysisTabBtn) {
        analysisTabBtn.classList.add('active');
        console.log('[View Story Analysis] Analysis tab button activated');
    }

    // Show analysis in panel
    console.log('[View Story Analysis] Showing analysis in panel');
    analysisPanel.showAnalysis(story, currentFilters.app);
    console.log('[View Story Analysis] ✅ Complete');
}

// ============================================
// UPDATE DEFECTS TAB
// ============================================

function updateDefectsTab() {
    console.log('[Defects Tab] Updating defects tab...');
    const defectsContent = document.getElementById('defectsContent');
    let container = document.getElementById('defectsList');

    console.log('[Defects Tab] Elements:', { defectsContent, container });
    console.log('[Defects Tab] Defects data:', {
        hasData: !!currentData.defects,
        count: currentData.defects?.length || 0,
        metrics: currentData.defectMetrics
    });

    if (!currentData.defects || currentData.defects.length === 0) {
        // Show empty state
        console.log('[Defects Tab] No defects, showing empty state');
        if (defectsContent) {
            // Remove any cache indicator if present
            const cacheIndicator = defectsContent.querySelector('.cache-indicator');
            if (cacheIndicator) cacheIndicator.remove();

            // Clear content and show empty state
            defectsContent.innerHTML = '';
            const emptyState = EmptyState.create('defects', {
                message: 'No defects found for the selected filters.'
            });
            defectsContent.appendChild(emptyState);
        }
        return;
    }

    const metrics = currentData.defectMetrics || {};
    console.log('[Defects Tab] Metrics:', metrics);

    // If structure was cleared during loading, recreate it
    if (!container && defectsContent) {
        console.log('[Defects Tab] Recreating defects tab structure...');
        defectsContent.innerHTML = `
            <div class="stats-row">
                <div class="stat-box">
                    <div class="stat-value" id="defectsDev">0</div>
                    <div class="stat-label">Dev</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value" id="defectsUat">0</div>
                    <div class="stat-label">UAT</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value" id="defectsProd">0</div>
                    <div class="stat-label">Prod</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value" id="defectsCritical">0</div>
                    <div class="stat-label">Critical</div>
                </div>
            </div>

            <div class="panel">
                <h2>Defect List</h2>
                <div id="defectsList">
                    <!-- Populated by JavaScript -->
                </div>
            </div>
        `;
        container = document.getElementById('defectsList');
    }

    // Update stat boxes
    const defectsDev = document.getElementById('defectsDev');
    const defectsUat = document.getElementById('defectsUat');
    const defectsProd = document.getElementById('defectsProd');
    const defectsCritical = document.getElementById('defectsCritical');

    console.log('[Defects Tab] Stat box elements:', { defectsDev, defectsUat, defectsProd, defectsCritical });

    if (defectsDev) {
        defectsDev.textContent = metrics.byEnvironment?.dev || 0;
        console.log('[Defects Tab] Set defectsDev:', defectsDev.textContent);
    }
    if (defectsUat) {
        defectsUat.textContent = metrics.byEnvironment?.uat || 0;
        console.log('[Defects Tab] Set defectsUat:', defectsUat.textContent);
    }
    if (defectsProd) {
        defectsProd.textContent = metrics.byEnvironment?.prod || 0;
        console.log('[Defects Tab] Set defectsProd:', defectsProd.textContent);
    }
    if (defectsCritical) {
        defectsCritical.textContent = metrics.bySeverity?.critical || 0;
        console.log('[Defects Tab] Set defectsCritical:', defectsCritical.textContent);
    }

    // Update defects list
    if (!container) {
        console.error('[Defects Tab] defectsList container still not found after recreation attempt!');
        return;
    }

    console.log('[Defects Tab] Populating defects list with', currentData.defects.length, 'defects');
    container.innerHTML = '';

    currentData.defects.forEach((defect, index) => {
        console.log(`[Defects Tab] Adding defect ${index + 1}:`, defect.id, defect.title);
        const card = createDefectCard(defect);
        container.appendChild(card);
    });
    console.log('[Defects Tab] ✅ Defects list populated with', currentData.defects.length, 'defects');
}

function createDefectCard(defect) {
    const card = document.createElement('div');
    card.className = 'defect-card';
    
    const severity = defect.fields['Microsoft.VSTS.Common.Severity'] || 'Medium';
    const state = defect.fields['System.State'] || 'Active';
    const tags = defect.fields['System.Tags'] || '';
    const environment = getEnvironmentFromTags(tags);
    
    card.innerHTML = `
        <div class="defect-header">
            <div>
                <div class="defect-title">#${defect.id}: ${defect.fields['System.Title']}</div>
                <div style="color: var(--text-muted); font-size: 13px; margin-top: 4px;">
                    Assigned to: ${defect.fields['System.AssignedTo'] || 'Unassigned'}
                </div>
            </div>
            <div class="defect-badges">
                ${getSeverityBadge(severity)}
                ${getEnvironmentBadge(environment)}
                ${getStateBadge(state)}
            </div>
        </div>
    `;
    
    return card;
}

function getEnvironmentFromTags(tags) {
    const lowerTags = tags.toLowerCase();
    if (lowerTags.includes('prod')) return 'Prod';
    if (lowerTags.includes('uat')) return 'UAT';
    if (lowerTags.includes('dev')) return 'Dev';
    return 'Other';
}

function getSeverityBadge(severity) {
    const sev = severity.toLowerCase();
    let className = 'badge-medium';
    if (sev.includes('critical') || sev === '1') className = 'badge-critical';
    else if (sev.includes('high') || sev === '2') className = 'badge-high';
    else if (sev.includes('low') || sev === '4') className = 'badge-low';
    
    return `<span class="badge ${className}">${severity}</span>`;
}

function getEnvironmentBadge(env) {
    return `<span class="badge badge-${env.toLowerCase()}">${env}</span>`;
}

// ============================================
// UPDATE TEST EXECUTION TAB
// ============================================

function updateTestExecutionTab() {
    console.log('[Test Execution Tab] Updating test execution tab (story-centric view)...');
    const testExecutionContent = document.getElementById('testExecutionContent');

    console.log('[Test Execution Tab] Element:', testExecutionContent);
    console.log('[Test Execution Tab] Test data:', {
        hasStories: !!currentData.testExecutionStories,
        storiesCount: currentData.testExecutionStories?.length || 0,
        metrics: currentData.testExecutionMetrics
    });

    if (!currentData.testExecutionStories || currentData.testExecutionStories.length === 0) {
        // Show empty state
        console.log('[Test Execution Tab] No stories, showing empty state');
        if (testExecutionContent) {
            // Remove any cache indicator if present
            const cacheIndicator = testExecutionContent.querySelector('.cache-indicator');
            if (cacheIndicator) cacheIndicator.remove();

            // Clear content and show empty state
            testExecutionContent.innerHTML = '';
            const emptyState = EmptyState.create('tests', {
                message: 'No stories found for the selected sprint.'
            });
            testExecutionContent.appendChild(emptyState);
        }
        return;
    }

    const metrics = currentData.testExecutionMetrics || {};
    console.log('[Test Execution Tab] Metrics:', metrics);

    // Recreate the tab structure
    console.log('[Test Execution Tab] Creating story-centric test execution view...');
    testExecutionContent.innerHTML = `
        <div class="stats-row">
            <div class="stat-box">
                <div class="stat-value" id="totalStories">0</div>
                <div class="stat-label">Total Stories</div>
            </div>
            <div class="stat-box">
                <div class="stat-value" id="storiesWithTests">0</div>
                <div class="stat-label">With Tests</div>
            </div>
            <div class="stat-box">
                <div class="stat-value" id="totalTestCases">0</div>
                <div class="stat-label">Test Cases</div>
            </div>
            <div class="stat-box">
                <div class="stat-value" id="overallAutomationRate">0%</div>
                <div class="stat-label">Automation</div>
            </div>
        </div>

        <div class="panel">
            <h2>Test Coverage by Story</h2>
            <div id="testStoriesList">
                <!-- Populated by JavaScript -->
            </div>
        </div>
    `;

    // Update stat boxes
    document.getElementById('totalStories').textContent = metrics.totalStories || 0;
    document.getElementById('storiesWithTests').textContent = metrics.storiesWithTests || 0;
    document.getElementById('totalTestCases').textContent = metrics.totalTestCases || 0;
    document.getElementById('overallAutomationRate').textContent = `${metrics.overallAutomationRate || 0}%`;

    // Update stories list
    console.log('[Test Execution Tab] Calling updateTestStoriesList()...');
    updateTestStoriesList();
    console.log('[Test Execution Tab] ✅ Complete');
}

function updateTestStoriesList() {
    console.log('[Test Stories List] Updating test stories list...');
    const container = document.getElementById('testStoriesList');
    if (!container) {
        console.error('[Test Stories List] testStoriesList container not found!');
        return;
    }

    container.innerHTML = '';

    if (!currentData.testExecutionStories || currentData.testExecutionStories.length === 0) {
        console.log('[Test Stories List] No stories to display');
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">No stories found for the selected sprint.</div>';
        return;
    }

    console.log('[Test Stories List] Displaying', currentData.testExecutionStories.length, 'stories');

    currentData.testExecutionStories.forEach((story, index) => {
        console.log(`[Test Stories List] Adding story ${index + 1}:`, story.storyId, story.storyTitle);
        const card = createStoryTestCard(story);
        container.appendChild(card);
    });
    console.log('[Test Stories List] ✅ Test stories list populated');
}

function createStoryTestCard(story) {
    const card = document.createElement('div');
    card.className = 'parent-card';

    const summary = story.summary || {};
    const testCases = story.testCases || [];

    // Calculate status indicators
    const hasTests = summary.totalCases > 0;
    const automationRate = parseFloat(summary.automationRate || 0);
    const passRate = parseFloat(summary.passRate || 0);

    // Determine overall status badge
    let statusBadge = '';
    let statusClass = '';
    if (!hasTests) {
        statusBadge = 'No Tests';
        statusClass = 'badge-high';
    } else if (summary.runCases === 0) {
        statusBadge = 'Not Run';
        statusClass = 'badge-medium';
    } else if (passRate >= 80) {
        statusBadge = 'Passing';
        statusClass = 'badge-low';
    } else if (passRate >= 50) {
        statusBadge = 'Issues';
        statusClass = 'badge-medium';
    } else {
        statusBadge = 'Failing';
        statusClass = 'badge-high';
    }

    card.innerHTML = `
        <div class="parent-header">
            <div class="parent-info">
                <div class="parent-title-row">
                    <span class="parent-id">#${story.storyId}</span>
                    ${getWorkItemTypeBadge(story.storyType)}
                    ${getStateBadge(story.storyState)}
                    <span class="badge ${statusClass}">${statusBadge}</span>
                </div>
                <h3 class="parent-title">${story.storyTitle}</h3>
                <div class="parent-meta">
                    <span class="meta-item">📋 ${summary.totalCases} Test Cases</span>
                    ${summary.totalCases > 0 ? `
                        <span class="meta-item">🤖 ${summary.automatedCases} Automated</span>
                        <span class="meta-item">👤 ${summary.manualCases} Manual</span>
                        <span class="meta-item">⚡ ${automationRate}% Automation</span>
                    ` : ''}
                </div>
            </div>
            ${hasTests ? `
            <div class="parent-progress">
                <div class="progress-stats">
                    <span class="stat done">✓ ${summary.runCases || 0}</span>
                    <span class="stat todo">○ ${summary.pendingCases || 0}</span>
                </div>
                ${summary.runCases > 0 ? `
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${passRate}%; background-color: ${passRate >= 80 ? '#4ade80' : passRate >= 50 ? '#fb923c' : '#f87171'}"></div>
                </div>
                <div class="progress-text">${passRate.toFixed(1)}% Pass Rate</div>
                ` : ''}
            </div>
            ` : ''}
        </div>
        ${hasTests ? `
        <div class="parent-tasks-section">
            <button class="tasks-toggle">
                <span class="toggle-icon">▶</span>
                <span class="toggle-text">Test Cases (${testCases.length})</span>
            </button>
            <div class="children-container" style="display: none;">
                ${testCases.length > 0 ? testCases.map(tc => createTestCaseHtml(tc)).join('') : '<div class="no-tasks">No test cases</div>'}
            </div>
        </div>
        ` : ''}
    `;

    // Add event listener for test cases toggle
    const tasksToggle = card.querySelector('.tasks-toggle');
    if (tasksToggle) {
        tasksToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const content = card.querySelector('.children-container');
            const icon = tasksToggle.querySelector('.toggle-icon');
            if (content.style.display === 'none') {
                content.style.display = 'block';
                icon.textContent = '▼';
            } else {
                content.style.display = 'none';
                icon.textContent = '▶';
            }
        });
    }

    return card;
}

function createTestCaseHtml(testCase) {
    const isAutomated = testCase.automated;
    const hasRun = testCase.lastRun !== null;
    const runStatus = testCase.runHistory || {};

    // Determine status icon and color
    let statusIcon = '○';
    let statusColor = 'var(--text-muted)';
    let statusText = 'Not Run';

    if (hasRun) {
        const passRate = runStatus.totalRuns > 0
            ? ((runStatus.passed / runStatus.totalRuns) * 100).toFixed(0)
            : 0;

        if (runStatus.passed === runStatus.totalRuns) {
            statusIcon = '✓';
            statusColor = '#4ade80';
            statusText = 'Passing';
        } else if (runStatus.failed === runStatus.totalRuns) {
            statusIcon = '✗';
            statusColor = '#f87171';
            statusText = 'Failing';
        } else {
            statusIcon = '⚠';
            statusColor = '#fb923c';
            statusText = `${passRate}% Pass`;
        }
    }

    return `
        <div class="child-task">
            <div class="task-row">
                <div class="task-info">
                    <div class="task-header">
                        <span class="task-id">#${testCase.id}</span>
                        <span class="badge badge-${testCase.state === 'Ready' ? 'low' : testCase.state === 'Design' ? 'medium' : 'info'}">${testCase.state}</span>
                        <span class="badge ${isAutomated ? 'badge-info' : 'badge-medium'}">${isAutomated ? '🤖 Automated' : '👤 Manual'}</span>
                        <span style="color: ${statusColor}; font-weight: 600; margin-left: 8px;">${statusIcon} ${statusText}</span>
                    </div>
                    <div class="task-title">${testCase.title}</div>
                    <div class="task-meta">
                        <span class="meta-item">Priority ${testCase.priority}</span>
                        ${hasRun ? `
                            <span class="meta-item">📊 ${runStatus.totalRuns} Runs</span>
                            <span class="meta-item" style="color: #4ade80;">✓ ${runStatus.passed}</span>
                            <span class="meta-item" style="color: #f87171;">✗ ${runStatus.failed}</span>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function calculatePassed(metrics) {
    const passRate = parseFloat(metrics.passRate || 0);
    const total = metrics.totalRuns || 0;
    return Math.round((passRate / 100) * total);
}

function calculateFailed(metrics) {
    const passRate = parseFloat(metrics.passRate || 0);
    const total = metrics.totalRuns || 0;
    return total - Math.round((passRate / 100) * total);
}

function updateTestRunsList() {
    console.log('[Test Runs List] Updating test runs list...');
    const container = document.getElementById('testRunsList');
    if (!container) {
        console.error('[Test Runs List] testRunsList container not found!');
        return;
    }

    container.innerHTML = '';

    if (!currentData.testRuns || currentData.testRuns.length === 0) {
        console.log('[Test Runs List] No test runs to display');
        return; // Empty state already shown in updateTestExecutionTab
    }

    const displayRuns = currentData.testRuns.slice(0, 10);
    console.log('[Test Runs List] Displaying', displayRuns.length, 'test runs (of', currentData.testRuns.length, 'total)');

    displayRuns.forEach((run, index) => {
        console.log(`[Test Runs List] Adding test run ${index + 1}:`, run.id, run.name);
        const card = createTestRunCard(run);
        container.appendChild(card);
    });
    console.log('[Test Runs List] ✅ Test runs list populated');
}

function createTestRunCard(run) {
    const card = document.createElement('div');
    card.className = 'test-suite-card';
    
    const passRate = run.passedTests && run.totalTests 
        ? ((run.passedTests / run.totalTests) * 100).toFixed(1)
        : 0;
    
    card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
            <div>
                <div style="font-weight: 600; color: var(--text-primary);">${run.name || `Test Run #${run.id}`}</div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
                    ${new Date(run.startedDate).toLocaleString()}
                </div>
            </div>
            <span class="badge ${passRate >= 80 ? 'badge-low' : 'badge-high'}">${passRate}% Pass</span>
        </div>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${passRate}%"></div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 13px;">
            <span style="color: #4ade80;">✓ ${run.passedTests || 0} Passed</span>
            <span style="color: #f87171;">✗ ${run.failedTests || 0} Failed</span>
            <span style="color: var(--text-muted);">− ${run.notExecutedTests || 0} Skipped</span>
        </div>
    `;
    
    return card;
}

// ============================================
// UPDATE QUALITY METRICS TAB
// ============================================

function updateQualityMetricsTab() {
    console.log('[Quality Metrics Tab] Updating quality metrics tab...');
    const qualityMetricsContent = document.getElementById('qualityMetricsContent');

    console.log('[Quality Metrics Tab] Element:', qualityMetricsContent);
    console.log('[Quality Metrics Tab] Quality metrics data:', {
        hasData: !!currentData.qualityMetrics,
        keysCount: currentData.qualityMetrics ? Object.keys(currentData.qualityMetrics).length : 0,
        data: currentData.qualityMetrics
    });

    if (!currentData.qualityMetrics || Object.keys(currentData.qualityMetrics).length === 0) {
        // Show empty state
        console.log('[Quality Metrics Tab] No quality metrics, showing empty state');
        if (qualityMetricsContent) {
            // Remove any cache indicator if present
            const cacheIndicator = qualityMetricsContent.querySelector('.cache-indicator');
            if (cacheIndicator) cacheIndicator.remove();

            // Clear content and show empty state
            qualityMetricsContent.innerHTML = '';
            const emptyState = EmptyState.create('quality', {
                message: 'No quality metrics available for the selected sprint.'
            });
            qualityMetricsContent.appendChild(emptyState);
        }
        return;
    }

    const metrics = currentData.qualityMetrics || {};
    console.log('[Quality Metrics Tab] Metrics:', metrics);

    // If structure was cleared during loading, recreate it
    let qmDefects = document.getElementById('qmDefects');
    if (!qmDefects && qualityMetricsContent) {
        console.log('[Quality Metrics Tab] Recreating quality metrics tab structure...');
        qualityMetricsContent.innerHTML = `
            <div class="metrics-grid">
                <div class="metric-card gradient-blue">
                    <div class="metric-value" id="qmDefects">-</div>
                    <div class="metric-label">Total Defects</div>
                </div>
                <div class="metric-card gradient-purple">
                    <div class="metric-value" id="qmPassRate">-</div>
                    <div class="metric-label">Pass Rate</div>
                </div>
                <div class="metric-card gradient-green">
                    <div class="metric-value" id="qmCoverage">-</div>
                    <div class="metric-label">Test Coverage</div>
                </div>
                <div class="metric-card gradient-orange">
                    <div class="metric-value" id="qmScore">-</div>
                    <div class="metric-label">Quality Score</div>
                </div>
            </div>

            <div class="content-grid">
                <div class="panel">
                    <h2>Defect Breakdown</h2>
                    <div id="qualityDefectsChart"></div>
                </div>

                <div class="panel">
                    <h2>Testing Metrics</h2>
                    <div id="qualityTestingChart"></div>
                </div>
            </div>
        `;
        qmDefects = document.getElementById('qmDefects');
    }

    // Update metric cards
    const qmPassRate = document.getElementById('qmPassRate');
    const qmCoverage = document.getElementById('qmCoverage');
    const qmScore = document.getElementById('qmScore');

    console.log('[Quality Metrics Tab] Metric card elements:', { qmDefects, qmPassRate, qmCoverage, qmScore });

    if (qmDefects) {
        qmDefects.textContent = metrics.defects?.total || 0;
        console.log('[Quality Metrics Tab] Set qmDefects:', qmDefects.textContent);
    }
    if (qmPassRate) {
        qmPassRate.textContent = `${metrics.testing?.passRate || 0}%`;
        console.log('[Quality Metrics Tab] Set qmPassRate:', qmPassRate.textContent);
    }
    if (qmCoverage) {
        const coverage = metrics.coverage
            ? `${Math.round((metrics.coverage.storiesWithTests / metrics.coverage.totalStories) * 100)}%`
            : '-';
        qmCoverage.textContent = coverage;
        console.log('[Quality Metrics Tab] Set qmCoverage:', coverage);
    }
    if (qmScore) {
        qmScore.textContent = metrics.qualityScore || '-';
        console.log('[Quality Metrics Tab] Set qmScore:', qmScore.textContent);
    }

    // Update charts
    console.log('[Quality Metrics Tab] Updating charts...');
    updateQualityDefectsChart();
    updateQualityTestingChart();
    console.log('[Quality Metrics Tab] ✅ Complete');
}

function updateQualityDefectsChart() {
    console.log('[Quality Defects Chart] Updating quality defects chart...');
    const container = document.getElementById('qualityDefectsChart');
    if (!container) {
        console.error('[Quality Defects Chart] qualityDefectsChart element not found!');
        return;
    }
    const defects = currentData.qualityMetrics?.defects || {};
    console.log('[Quality Defects Chart] Defects data:', defects);

    container.innerHTML = `
        <div style="padding: 20px;">
            <div style="margin-bottom: 20px;">
                <h4 style="color: var(--text-secondary); font-size: 13px; margin-bottom: 10px;">By Severity</h4>
                ${Object.entries(defects.bySeverity || {}).map(([key, value]) => `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: var(--text-secondary); text-transform: capitalize;">${key}</span>
                        <span style="color: var(--text-primary); font-weight: 600;">${value}</span>
                    </div>
                `).join('')}
            </div>
            <div>
                <h4 style="color: var(--text-secondary); font-size: 13px; margin-bottom: 10px;">By Environment</h4>
                ${Object.entries(defects.byEnvironment || {}).map(([key, value]) => `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: var(--text-secondary); text-transform: uppercase;">${key}</span>
                        <span style="color: var(--text-primary); font-weight: 600;">${value}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    console.log('[Quality Defects Chart] Chart updated');
}

function updateQualityTestingChart() {
    console.log('[Quality Testing Chart] Updating quality testing chart...');
    const container = document.getElementById('qualityTestingChart');
    if (!container) {
        console.error('[Quality Testing Chart] qualityTestingChart element not found!');
        return;
    }
    const testing = currentData.qualityMetrics?.testing || {};
    const coverage = currentData.qualityMetrics?.coverage || {};
    console.log('[Quality Testing Chart] Testing data:', testing, 'Coverage data:', coverage);

    container.innerHTML = `
        <div style="padding: 20px;">
            <div style="margin-bottom: 20px;">
                <h4 style="color: var(--text-secondary); font-size: 13px; margin-bottom: 10px;">Testing Metrics</h4>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: var(--text-secondary);">Pass Rate</span>
                    <span style="color: var(--text-primary); font-weight: 600;">${testing.passRate}%</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: var(--text-secondary);">Total Runs</span>
                    <span style="color: var(--text-primary); font-weight: 600;">${testing.totalRuns}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: var(--text-secondary);">Automation Rate</span>
                    <span style="color: var(--text-primary); font-weight: 600;">${testing.automationRate}%</span>
                </div>
            </div>
            <div>
                <h4 style="color: var(--text-secondary); font-size: 13px; margin-bottom: 10px;">Coverage</h4>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: var(--text-secondary);">Stories with Tests</span>
                    <span style="color: var(--text-primary); font-weight: 600;">${coverage.storiesWithTests}/${coverage.totalStories}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: var(--text-secondary);">Stories with Defects</span>
                    <span style="color: var(--text-primary); font-weight: 600;">${coverage.storiesWithDefects}</span>
                </div>
            </div>
        </div>
    `;
    console.log('[Quality Testing Chart] Chart updated');
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function sanitizeHtmlContent(html) {
    if (!html) return '';
    // Remove script tags and event handlers
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+="[^"]*"/gi, '')
        .replace(/on\w+='[^']*'/gi, '');
}

// ============================================
// STORY ANALYZER
// ============================================

function initializeStoryAnalyzer() {
    
    const analyzeBtn = document.getElementById('analyzeStoryBtn');
    const generateBtn = document.getElementById('generateTestsBtn');
    const storyIdInput = document.getElementById('storyIdInput');
    
    console.log('Story analyzer elements:', { analyzeBtn, generateBtn, storyIdInput });
    
    if (!analyzeBtn) {
        console.error('analyzeStoryBtn not found!');
        return;
    }
    
    if (!generateBtn) {
        console.error('generateTestsBtn not found!');
        return;
    }
    
    if (!storyIdInput) {
        console.error('storyIdInput not found!');
        return;
    }
    
    analyzeBtn.addEventListener('click', () => {
        const storyId = storyIdInput.value.trim();
        
        if (!storyId) {
            console.warn('No story ID entered');
            showStatusMessage('Please enter a Story ID', 'error');
            return;
        }
        analyzeStoryFull(storyId);
    });
    
    generateBtn.addEventListener('click', () => {
        console.log('Generate button clicked');
        const storyId = storyIdInput.value.trim();
        
        if (!storyId) {
            console.warn('No story ID entered');
            showStatusMessage('Please enter a Story ID', 'error');
            return;
        }
        generateTestCases(storyId);
    });
    
    storyIdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            console.log('Enter key pressed in story ID input');
            analyzeBtn.click();
        }
    });
    
    console.log('Story Analyzer initialized successfully');
}

window.analyzeStory = function(storyId) {
    
    // Find the tab button
    const tabBtn = document.querySelector('.tab-btn[data-tab="story-analyzer"]');
    
    if (tabBtn) {
        tabBtn.click();
    } else {
        console.error('Tab button not found!');
        alert('Error: Story Analyzer tab button not found');
        return;
    }
    
    // Set the story ID
    const storyIdInput = document.getElementById('storyIdInput');
    
    if (storyIdInput) {
        storyIdInput.value = storyId;
        console.log('Story ID set to:', storyIdInput.value);
    } else {
        console.error('Story ID input not found!');
    }
    
    // Click analyze button after short delay
    setTimeout(() => {
        const analyzeBtn = document.getElementById('analyzeStoryBtn');
        console.log('Analyze button found:', analyzeBtn);
        
        if (analyzeBtn) {
            analyzeBtn.click();
        } else {
            console.error('Analyze button not found!');
            alert('Error: Analyze button not found');
        }
    }, 300);
};


async function analyzeStoryFull(storyId) {
    console.log('[Story Analyzer] Starting analysis for story:', storyId);
    const btn = document.getElementById('analyzeStoryBtn');
    const loading = document.getElementById('analyzeLoading');
    const text = document.getElementById('analyzeText');

    console.log('[Story Analyzer] Button elements:', { btn, loading, text });

    if (btn) {
        btn.disabled = true;
        console.log('[Story Analyzer] Analyze button disabled');
    }
    if (loading) {
        loading.style.display = 'inline-block';
        console.log('[Story Analyzer] Loading indicator shown');
    }
    if (text) {
        text.style.display = 'none';
        console.log('[Story Analyzer] Button text hidden');
    }

    try {
        // Step 1: Get the work item
        console.log('[Story Analyzer] Step 1: Fetching work item...');
        const storyUrl = `${API_BASE_URL}/api/ado/pull-stories`;
        console.log('[Story Analyzer] Fetching from:', storyUrl);
        const storyResponse = await fetch(storyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workItemIds: [parseInt(storyId)] })
        });

        console.log('[Story Analyzer] Story response status:', storyResponse.status, storyResponse.statusText);

        if (!storyResponse.ok) {
            throw new Error(`Failed to get work item (${storyResponse.status})`);
        }

        const storyData = await storyResponse.json();
        console.log('[Story Analyzer] Story data:', storyData);

        if (!storyData.stories || storyData.stories.length === 0) {
            throw new Error('Work item not found');
        }

        const story = storyData.stories[0];
        console.log('[Story Analyzer] Story retrieved:', story.id);

        // Step 2: Try to analyze requirements (optional)
        let requirementsAnalysis = null;

        try {
            console.log('[Story Analyzer] Step 2: Analyzing requirements...');
            const { model } = modelSelector.getSelection();
            console.log('[Story Analyzer] Using model:', model);

            const analysisUrl = `${API_BASE_URL}/api/ado/analyze-requirements`;
            console.log('[Story Analyzer] Fetching from:', analysisUrl);
            const analysisResponse = await fetch(analysisUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storyIds: [parseInt(storyId)],
                    includeGapAnalysis: true,
                    model
                })
            });

            console.log('[Story Analyzer] Analysis response status:', analysisResponse.status, analysisResponse.statusText);

            if (analysisResponse.ok) {
                const analysisData = await analysisResponse.json();
                console.log('[Story Analyzer] Analysis data:', analysisData);

                if (analysisData.results && analysisData.results.length > 0) {
                    requirementsAnalysis = analysisData.results[0].analysis;
                    console.log('[Story Analyzer] Requirements analysis retrieved');
                } else {
                    console.warn('[Story Analyzer] No results in analysis data');
                }
            } else {
                const errorText = await analysisResponse.text();
                console.warn('[Story Analyzer] Analysis API failed:', errorText);
            }
        } catch (analysisError) {
            console.warn('[Story Analyzer] Requirements analysis error (non-fatal):', analysisError);
        }

        // Display results
        console.log('[Story Analyzer] Step 3: Preparing display data...');
        const displayData = {
            workItem: {
                id: story.id,
                title: story.fields['System.Title'] || 'N/A',
                type: story.fields['System.WorkItemType'] || 'N/A',
                state: story.fields['System.State'] || 'N/A',
                assignedTo: story.fields['System.AssignedTo']?.displayName || 'Unassigned',
                description: story.fields['System.Description'] || '',
                acceptanceCriteria: story.fields['Microsoft.VSTS.Common.AcceptanceCriteria'] || ''
            },
            requirementsAnalysis: requirementsAnalysis
        };
        console.log('[Story Analyzer] Display data prepared:', displayData);

        console.log('[Story Analyzer] Displaying analysis results...');
        displayAnalysisResults(displayData);

        if (requirementsAnalysis) {
            console.log('[Story Analyzer] ✅ Analysis complete with AI analysis');
            showStatusMessage('Story analyzed successfully!', 'success');
        } else {
            console.log('[Story Analyzer] ⚠️ Analysis complete without AI analysis');
            showStatusMessage('Story loaded (AI analysis unavailable)', 'info');
        }

    } catch (error) {
        console.error('[Story Analyzer] ❌ Error analyzing story:', error);
        console.error('[Story Analyzer] Error stack:', error.stack);
        showStatusMessage(`Failed: ${error.message}`, 'error');
    } finally {
        console.log('[Story Analyzer] Cleanup: Re-enabling buttons...');
        if (btn) {
            btn.disabled = false;
            console.log('[Story Analyzer] Analyze button re-enabled');
        }
        if (loading) {
            loading.style.display = 'none';
            console.log('[Story Analyzer] Loading indicator hidden');
        }
        if (text) {
            text.style.display = 'inline';
            console.log('[Story Analyzer] Button text shown');
        }
        console.log('[Story Analyzer] Analysis function complete');
    }
}

async function generateTestCases(storyId) {
    console.log('[Test Generator] Starting test case generation for story:', storyId);
    const btn = document.getElementById('generateTestsBtn');
    const loading = document.getElementById('generateLoading');
    const text = document.getElementById('generateText');

    console.log('[Test Generator] Button elements:', { btn, loading, text });

    if (btn) {
        btn.disabled = true;
        console.log('[Test Generator] Generate button disabled');
    }
    if (loading) {
        loading.style.display = 'inline-block';
        console.log('[Test Generator] Loading indicator shown');
    }
    if (text) {
        text.style.display = 'none';
        console.log('[Test Generator] Button text hidden');
    }

    try {
        const { model } = modelSelector.getSelection();
        console.log('[Test Generator] Using model:', model);

        const url = `${API_BASE_URL}/api/ado/generate-test-cases`;
        console.log('[Test Generator] Calling generate-test-cases endpoint:', url);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                storyId: parseInt(storyId),
                updateADO: false,
                model
            })
        });

        console.log('[Test Generator] Response status:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Test Generator] Error response:', errorText);
            throw new Error(`Failed to generate tests (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        console.log('[Test Generator] Test generation data received:', data);

        console.log('[Test Generator] Displaying test case results...');
        displayTestCaseResults(data);
        console.log('[Test Generator] ✅ Test cases generated successfully');
        showStatusMessage('Test cases generated!', 'success');
    } catch (error) {
        console.error('[Test Generator] ❌ Error generating tests:', error);
        if (error.message.includes('404')) {
            console.error('[Test Generator] Endpoint not found (404)');
            showStatusMessage('Test case generation endpoint not configured. Please set up /api/ado/generate-test-cases', 'error');
        } else {
            showStatusMessage(`Failed to generate tests: ${error.message}`, 'error');
        }
    } finally {
        console.log('[Test Generator] Cleanup: Re-enabling buttons...');
        if (btn) {
            btn.disabled = false;
            console.log('[Test Generator] Generate button re-enabled');
        }
        if (loading) {
            loading.style.display = 'none';
            console.log('[Test Generator] Loading indicator hidden');
        }
        if (text) {
            text.style.display = 'inline';
            console.log('[Test Generator] Button text shown');
        }
        console.log('[Test Generator] Test generation function complete');
    }
}

function displayAnalysisResults(data) {
    const container = document.getElementById('analysisResults');
    
    if (!container) {
        console.error('analysisResults container not found');
        return;
    }
    
    try {
        // Clear container completely
        container.innerHTML = '';
        container.removeAttribute('style');
        
        // Set display block with !important
        container.style.setProperty('display', 'block', 'important');
        container.style.setProperty('visibility', 'visible', 'important');
        
        // Create wrapper div
        const wrapper = document.createElement('div');
        wrapper.id = 'analysis-content-wrapper';
        wrapper.style.cssText = 'background: var(--bg-secondary); padding: 20px; border-radius: 12px; border: 2px solid var(--border-color); margin-top: 20px;';
        
        // Create header
        const header = document.createElement('h3');
        header.style.cssText = 'color: var(--text-primary); margin-bottom: 16px; font-size: 18px;';
        header.textContent = '📋 Work Item Details';
        wrapper.appendChild(header);
        
        // Create work item details box
        const detailsBox = document.createElement('div');
        detailsBox.style.cssText = 'background: var(--bg-primary); padding: 16px; border-radius: 8px; margin-bottom: 20px;';
        
        if (data.workItem) {
            // Add work item fields
            const fields = [
                { label: 'ID', value: `#${data.workItem.id}` },
                { label: 'Title', value: data.workItem.title || 'N/A' },
                { label: 'Type', value: data.workItem.type || 'N/A' },
                { label: 'State', value: data.workItem.state || 'N/A' },
                { label: 'Assigned To', value: data.workItem.assignedTo || 'Unassigned' }
            ];
            
            
            fields.forEach((field, index) => {
                
                const fieldDiv = document.createElement('div');
                fieldDiv.style.cssText = 'margin-bottom: 8px; color: var(--text-secondary); font-size: 14px;';
                
                const strong = document.createElement('strong');
                strong.style.color = 'var(--text-primary)';
                strong.textContent = field.label + ': ';
                fieldDiv.appendChild(strong);
                
                const span = document.createElement('span');
                span.style.color = 'var(--text-secondary)';
                span.textContent = field.value;
                fieldDiv.appendChild(span);
                
                detailsBox.appendChild(fieldDiv);
            });
            
            // Add description if exists
            if (data.workItem.description) {
                const descDiv = document.createElement('div');
                descDiv.style.cssText = 'margin-top: 16px; padding-top: 16px; border-top: 1px solid #334155;';
                
                const descLabel = document.createElement('strong');
                descLabel.style.color = '#e2e8f0';
                descLabel.textContent = 'Description:';
                descDiv.appendChild(descLabel);
                
                const descContent = document.createElement('div');
                descContent.style.cssText = 'margin-top: 8px; color: #94a3b8;';
                descContent.innerHTML = sanitizeHtmlContent(data.workItem.description);
                descDiv.appendChild(descContent);
                
                detailsBox.appendChild(descDiv);
            }
        }
        
        wrapper.appendChild(detailsBox);
        
        // Add Requirements Analysis section if available
        if (data.requirementsAnalysis) {
            // The data is nested in a result object
            const req = data.requirementsAnalysis.result || data.requirementsAnalysis;
            
            const analysisHeader = document.createElement('h3');
            analysisHeader.style.cssText = 'color: var(--text-primary); margin-bottom: 16px; font-size: 18px;';
            analysisHeader.textContent = '🔍 Requirements Analysis';
            wrapper.appendChild(analysisHeader);
            
            const analysisBox = document.createElement('div');
            analysisBox.style.cssText = 'background: var(--bg-primary); padding: 16px; border-radius: 8px; margin-bottom: 20px;';
            
            // Completeness Score
            if (req.completenessScore !== undefined) {
                const scoreDiv = document.createElement('div');
                scoreDiv.style.cssText = 'margin-bottom: 12px; color: var(--text-secondary);';
                
                const label = document.createElement('strong');
                label.textContent = 'Completeness Score: ';
                scoreDiv.appendChild(label);
                
                const score = document.createElement('span');
                const color = req.completenessScore >= 80 ? '#4ade80' : req.completenessScore >= 50 ? '#fbbf24' : '#f87171';
                score.style.color = color;
                score.textContent = `${req.completenessScore}%`;
                scoreDiv.appendChild(score);
                
                analysisBox.appendChild(scoreDiv);
            }
            
            // Testability Score
            if (req.testabilityScore !== undefined) {
                const scoreDiv = document.createElement('div');
                scoreDiv.style.cssText = 'margin-bottom: 12px; color: var(--text-secondary);';
                
                const label = document.createElement('strong');
                label.textContent = 'Testability Score: ';
                scoreDiv.appendChild(label);
                
                const score = document.createElement('span');
                const color = req.testabilityScore >= 80 ? '#4ade80' : req.testabilityScore >= 50 ? '#fbbf24' : '#f87171';
                score.style.color = color;
                score.textContent = `${req.testabilityScore}%`;
                scoreDiv.appendChild(score);
                
                analysisBox.appendChild(scoreDiv);
            }
            
            // Missing Requirements
            if (req.missingRequirements && req.missingRequirements.length > 0) {
                const missingDiv = document.createElement('div');
                missingDiv.style.cssText = 'margin-top: 16px;';
                
                const label = document.createElement('strong');
                label.textContent = 'Missing Requirements:';
                missingDiv.appendChild(label);
                
                const ul = document.createElement('ul');
                ul.style.cssText = 'margin-top: 8px; margin-left: 20px;';
                
                req.missingRequirements.forEach(item => {
                    const li = document.createElement('li');
                    li.style.cssText = 'color: #94a3b8; margin-bottom: 4px;';
                    li.textContent = item;
                    ul.appendChild(li);
                });
                
                missingDiv.appendChild(ul);
                analysisBox.appendChild(missingDiv);
            }
            
            // Recommendations
            if (req.recommendations && req.recommendations.length > 0) {
                const recDiv = document.createElement('div');
                recDiv.style.cssText = 'margin-top: 16px;';
                
                const label = document.createElement('strong');
                label.textContent = 'Recommendations:';
                recDiv.appendChild(label);
                
                const ul = document.createElement('ul');
                ul.style.cssText = 'margin-top: 8px; margin-left: 20px;';
                
                req.recommendations.forEach(item => {
                    const li = document.createElement('li');
                    li.style.cssText = 'color: #94a3b8; margin-bottom: 4px;';
                    li.textContent = item;
                    ul.appendChild(li);
                });
                
                recDiv.appendChild(ul);
                analysisBox.appendChild(recDiv);
            }
            
            // Ambiguous Requirements
            if (req.ambiguousRequirements && req.ambiguousRequirements.length > 0) {
                const ambigDiv = document.createElement('div');
                ambigDiv.style.cssText = 'margin-top: 16px;';
                
                const label = document.createElement('strong');
                label.textContent = 'Ambiguous Requirements:';
                label.style.color = '#fbbf24';
                ambigDiv.appendChild(label);
                
                const ul = document.createElement('ul');
                ul.style.cssText = 'margin-top: 8px; margin-left: 20px;';
                
                req.ambiguousRequirements.forEach(item => {
                    const li = document.createElement('li');
                    li.style.cssText = 'color: #94a3b8; margin-bottom: 4px;';
                    li.textContent = item;
                    ul.appendChild(li);
                });
                
                ambigDiv.appendChild(ul);
                analysisBox.appendChild(ambigDiv);
            }
            
            // Gaps
            if (req.gaps && req.gaps.length > 0) {
                const gapsDiv = document.createElement('div');
                gapsDiv.style.cssText = 'margin-top: 16px;';
                
                const label = document.createElement('strong');
                label.textContent = 'Identified Gaps:';
                label.style.color = '#f87171';
                gapsDiv.appendChild(label);
                
                const gapsList = document.createElement('div');
                gapsList.style.cssText = 'margin-top: 8px;';
                
                req.gaps.forEach(gap => {
                    const gapItem = document.createElement('div');
                    gapItem.style.cssText = 'padding: 8px; margin-bottom: 8px; background: rgba(248, 113, 113, 0.1); border-left: 3px solid #f87171; border-radius: 4px;';
                    
                    const gapCategory = document.createElement('div');
                    gapCategory.style.cssText = 'font-weight: 600; color: #f87171; margin-bottom: 4px; text-transform: capitalize;';
                    gapCategory.textContent = `${gap.category || 'Unknown'} (${gap.severity || 'medium'})`;
                    gapItem.appendChild(gapCategory);
                    
                    const gapDesc = document.createElement('div');
                    gapDesc.style.cssText = 'color: #94a3b8; font-size: 13px;';
                    gapDesc.textContent = gap.description || 'No description';
                    gapItem.appendChild(gapDesc);
                    
                    gapsList.appendChild(gapItem);
                });
                
                gapsDiv.appendChild(gapsList);
                analysisBox.appendChild(gapsDiv);
            }
            
            wrapper.appendChild(analysisBox);
        } else {
            // Show message that AI analysis is unavailable
            const infoBox = document.createElement('div');
            infoBox.style.cssText = 'background: rgba(99, 102, 241, 0.1); padding: 16px; border-radius: 8px; border: 1px solid rgba(99, 102, 241, 0.3); margin-bottom: 20px;';
            
            const infoHeader = document.createElement('div');
            infoHeader.style.cssText = 'color: #e2e8f0; margin-bottom: 8px; font-size: 14px;';
            const infoHeaderStrong = document.createElement('strong');
            infoHeaderStrong.textContent = '💡 AI Requirements Analysis';
            infoHeader.appendChild(infoHeaderStrong);
            infoBox.appendChild(infoHeader);
            
            const infoText = document.createElement('div');
            infoText.style.cssText = 'color: #94a3b8; font-size: 13px; line-height: 1.6;';
            infoText.textContent = 'AI-powered requirements analysis provides completeness scores, testability metrics, and actionable recommendations. Check the console for details if the analysis failed. The work item details above were successfully loaded from Azure DevOps.';
            infoBox.appendChild(infoText);
            
            wrapper.appendChild(infoBox);
        }
        
        // Append to container
        container.appendChild(wrapper);
        
    } catch (error) {
        console.error('Error creating DOM elements:', error);
        container.textContent = 'Error rendering analysis results. Check console for details.';
        return;
    }
    
    // Scroll into view
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function displayTestCaseResults(data) {
    const container = document.getElementById('analysisResults');
    
    let html = '<div style="background: var(--bg-secondary); padding: 20px; border-radius: 12px; border: 2px solid var(--border-color); margin-top: 20px;">';
    html += '<h3 style="color: var(--text-primary); margin-bottom: 16px;">✅ Test Cases Generated</h3>';
    
    if (data.testCases && data.testCases.length > 0) {
        data.testCases.forEach((tc, i) => {
            html += '<div style="background: var(--bg-primary); padding: 16px; border-radius: 8px; margin-bottom: 12px;">';
            html += `<div style="font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">${i + 1}. ${tc.name || tc.title || 'Test Case'}</div>`;
            
            if (tc.description) {
                html += `<div style="color: var(--text-secondary); margin-bottom: 8px; font-size: 14px;">${tc.description}</div>`;
            }
            
            if (tc.steps && tc.steps.length > 0) {
                html += '<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color);"><strong>Steps:</strong></div>';
                html += '<ol style="margin-left: 20px; margin-top: 8px;">';
                tc.steps.forEach(step => {
                    html += `<li style="color: var(--text-secondary); margin-bottom: 6px; font-size: 14px;">${step}</li>`;
                });
                html += '</ol>';
            }
            
            if (tc.expectedResult) {
                html += `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color);"><strong>Expected Result:</strong> <span style="color: var(--text-secondary);">${tc.expectedResult}</span></div>`;
            }
            
            html += '</div>';
        });
    } else {
        html += '<div style="padding: 20px; text-align: center; color: var(--text-muted);">No test cases generated</div>';
    }
    
    html += '</div>';
    
    container.innerHTML = html;
    container.style.display = 'block';
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getWorkItemTypeBadge(type) {
    const badges = {
        'Bug': '<span class="badge badge-high">Bug</span>',
        'Task': '<span class="badge badge-low">Task</span>',
        'Feature': '<span class="badge badge-low">Feature</span>',
        'Story': '<span class="badge badge-medium">Story</span>'
    };
    return badges[type] || `<span class="badge">${type}</span>`;
}

function getStateBadge(state) {
    const badges = {
        'New': '<span class="badge badge-low">New</span>',
        'Active': '<span class="badge badge-medium">Active</span>',
        'Resolved': '<span class="badge badge-low">Resolved</span>',
        'Closed': '<span class="badge">Closed</span>'
    };
    return badges[state] || `<span class="badge">${state}</span>`;
}

function showStatusMessage(message, type = 'info') {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.innerHTML = `<div class="status-message ${type}">${message}</div>`;
    
    setTimeout(() => {
        statusDiv.innerHTML = '';
    }, 5000);
}

function addSVGGradients() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute';
    svg.style.width = '0';
    svg.style.height = '0';
    
    svg.innerHTML = `
        <defs>
            <linearGradient id="testPassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#4facfe;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#00f2fe;stop-opacity:1" />
            </linearGradient>
        </defs>
    `;
    
    document.body.appendChild(svg);
}

window.refreshAllData = function() {
    loadAllData();
};

// ============================================
// NO MOCK DATA - REMOVED PER REQUIREMENTS
// All data comes from API calls and cache only
// ============================================

// ============================================
// TEST CASES TAB
// ============================================

function initializeTestCasesTab() {
    
    const generateBtn = document.getElementById('generateTestCasesBtn');
    const clearBtn = document.getElementById('clearTestCasesBtn');
    const storyIdInput = document.getElementById('testCaseStoryIdInput');
    
    console.log('Test cases tab elements:', { generateBtn, clearBtn, storyIdInput });
    
    if (!generateBtn || !storyIdInput) {
        console.error('Test cases tab elements not found!');
        return;
    }
    
    generateBtn.addEventListener('click', () => {
        console.log('Generate test cases button clicked');
        const storyId = storyIdInput.value.trim();
        
        if (!storyId) {
            console.warn('No story ID entered');
            showStatusMessage('Please enter a Story ID', 'error');
            return;
        }
        generateTestCasesForTab(storyId);
    });
    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            console.log('Clear test cases clicked');
            storyIdInput.value = '';
            document.getElementById('testCasesResults').style.display = 'none';
            document.getElementById('testCasesByStoryPanel').style.display = 'none';
        });
    }
    
    storyIdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            console.log('Enter key pressed in test case story ID input');
            generateBtn.click();
        }
    });
    
    console.log('Test Cases Tab initialized successfully');
}

async function generateTestCasesForTab(storyId) {
    
    const btn = document.getElementById('generateTestCasesBtn');
    const loading = document.getElementById('generateTestCasesLoading');
    const text = document.getElementById('generateTestCasesText');
    const includeNegative = document.getElementById('includeNegativeTests')?.checked || false;
    const includeEdgeCases = document.getElementById('includeEdgeCases')?.checked || false;
    
    if (btn) btn.disabled = true;
    if (loading) loading.style.display = 'inline-block';
    if (text) text.style.display = 'none';
    
    try {
        const { model } = modelSelector.getSelection();

        console.log('Calling generate-test-cases endpoint...');
        console.log('Options:', { includeNegative, includeEdgeCases });

        const response = await fetch(`${API_BASE_URL}/api/ado/generate-test-cases`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                storyId: parseInt(storyId),
                updateADO: false,
                includeNegativeTests: includeNegative,
                includeEdgeCases: includeEdgeCases,
                model
            })
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`Failed to generate test cases (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Test cases data received:', data);
        
        displayTestCasesInTab(data);
        
        // Also try to load existing test cases from ADO
        await loadExistingTestCases(storyId);
        
        showStatusMessage('Test cases generated successfully!', 'success');
    } catch (error) {
        console.error('Error generating test cases:', error);
        showStatusMessage(`Failed to generate test cases: ${error.message}`, 'error');
    } finally {
        if (btn) btn.disabled = false;
        if (loading) loading.style.display = 'none';
        if (text) text.style.display = 'inline';
    }
}

function displayTestCasesInTab(data) {
    const container = document.getElementById('testCasesResults');
    
    let html = '<div style="background: var(--bg-secondary); padding: 20px; border-radius: 12px; border: 2px solid var(--border-color); margin-top: 20px;">';
    html += '<h3 style="color: var(--text-primary); margin-bottom: 16px;">✅ Generated Test Cases</h3>';
    
    const testCases = data.testCases || [];
    
    if (testCases.length === 0) {
        html += '<div style="padding: 20px; text-align: center; color: var(--text-muted);">No test cases generated</div>';
    } else {
        html += `<div style="margin-bottom: 16px; padding: 12px; background: var(--bg-primary); border-radius: 8px;">`;
        html += `<strong>Total Generated:</strong> ${testCases.length} test cases`;
        html += '</div>';
        
        testCases.forEach((tc, i) => {
            html += '<div style="background: var(--bg-primary); padding: 16px; border-radius: 8px; margin-bottom: 12px; border-left: 3px solid var(--accent);">';
            html += `<div style="font-weight: 600; margin-bottom: 8px; color: var(--text-primary); font-size: 15px;">${i + 1}. ${tc.name || tc.title || 'Test Case'}</div>`;
            
            if (tc.description) {
                html += `<div style="color: var(--text-secondary); margin-bottom: 12px; font-size: 14px;">${tc.description}</div>`;
            }
            
            // Preconditions
            if (tc.preconditions && tc.preconditions.length > 0) {
                html += '<div style="margin-top: 12px;"><strong style="color: var(--text-primary);">Preconditions:</strong></div>';
                html += '<ul style="margin-left: 20px; margin-top: 4px;">';
                tc.preconditions.forEach(pre => {
                    html += `<li style="color: var(--text-secondary); font-size: 13px; margin-bottom: 2px;">${pre}</li>`;
                });
                html += '</ul>';
            }
            
            if (tc.category) {
                const categoryColors = {
                    'positive': 'badge-low',
                    'negative': 'badge-high', 
                    'edge-case': 'badge-medium'
                };
                html += `<div style="margin-bottom: 8px;"><span class="badge ${categoryColors[tc.category] || 'badge-medium'}">${tc.category}</span></div>`;
            }
            
            if (tc.type) {
                html += `<div style="margin-bottom: 8px;"><span class="badge badge-medium">${tc.type}</span></div>`;
            }
            
            if (tc.steps && tc.steps.length > 0) {
                html += '<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color);"><strong>Steps:</strong></div>';
                html += '<ol style="margin-left: 20px; margin-top: 8px;">';
                tc.steps.forEach(step => {
                    // Handle both string steps and object steps
                    if (typeof step === 'string') {
                        html += `<li style="color: var(--text-secondary); margin-bottom: 6px; font-size: 14px;">${step}</li>`;
                    } else if (step.action) {
                        html += `<li style="color: var(--text-secondary); margin-bottom: 8px; font-size: 14px;">`;
                        html += `<div style="margin-bottom: 4px;"><strong>Action:</strong> ${step.action}</div>`;
                        if (step.expectedResult) {
                            html += `<div style="color: var(--text-muted); font-size: 13px;"><strong>Expected:</strong> ${step.expectedResult}</div>`;
                        }
                        html += `</li>`;
                    }
                });
                html += '</ol>';
            }
            
            // Postconditions
            if (tc.postconditions && tc.postconditions.length > 0) {
                html += '<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color);"><strong>Postconditions:</strong></div>';
                html += '<ul style="margin-left: 20px; margin-top: 4px;">';
                tc.postconditions.forEach(post => {
                    html += `<li style="color: var(--text-secondary); font-size: 13px; margin-bottom: 2px;">${post}</li>`;
                });
                html += '</ul>';
            }
            
            // Test Data
            if (tc.testData && Object.keys(tc.testData).length > 0) {
                html += '<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color);"><strong>Test Data:</strong></div>';
                html += '<div style="background: var(--bg-secondary); padding: 8px; border-radius: 4px; margin-top: 4px; font-family: monospace; font-size: 12px;">';
                html += '<pre style="margin: 0; white-space: pre-wrap; color: var(--text-secondary);">' + JSON.stringify(tc.testData, null, 2) + '</pre>';
                html += '</div>';
            }
            
            // Tags
            if (tc.tags && tc.tags.length > 0) {
                html += '<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color);"><strong>Tags:</strong> ';
                tc.tags.forEach((tag, idx) => {
                    html += `<span class="badge" style="margin-right: 4px;">${tag}</span>`;
                });
                html += '</div>';
            }
            
            // Automation Feasibility
            if (tc.automationFeasibility) {
                const af = tc.automationFeasibility;
                const feasColor = af.feasibility === 'high' ? '#4ade80' : af.feasibility === 'medium' ? '#fbbf24' : '#f87171';
                html += '<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color);">';
                html += `<strong>Automation:</strong> <span style="color: ${feasColor};">${af.feasibility} (${af.score}%)</span>`;
                html += '</div>';
            }
            
            if (tc.expectedResult) {
                html += `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color);"><strong>Expected Result:</strong> <span style="color: var(--text-secondary);">${tc.expectedResult}</span></div>`;
            }
            
            if (tc.priority) {
                html += `<div style="margin-top: 8px;"><strong>Priority:</strong> ${tc.priority}</div>`;
            }
            
            html += '</div>';
        });
    }
    
    html += '</div>';
    
    container.innerHTML = html;
    container.style.display = 'block';
}

async function loadExistingTestCases(storyId) {
    console.log('Loading existing test cases for story:', storyId);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/ado/test-cases/by-story/${storyId}`);
        
        if (!response.ok) {
            console.warn('No existing test cases endpoint available');
            return;
        }
        
        const data = await response.json();
        console.log('Existing test cases:', data);
        
        if (data.testCases && data.testCases.length > 0) {
            displayExistingTestCases(data);
        }
    } catch (error) {
        console.warn('Could not load existing test cases:', error.message);
        // Non-fatal error, just don't show existing test cases
    }
}

function displayExistingTestCases(data) {
    const panel = document.getElementById('testCasesByStoryPanel');
    const container = document.getElementById('testCasesByStoryList');
    
    let html = `<div style="margin-bottom: 16px; padding: 12px; background: var(--bg-secondary); border-radius: 8px;">`;
    html += `<strong>Existing Test Cases in ADO:</strong> ${data.count || 0}`;
    html += `<div style="margin-top: 8px; font-size: 13px; color: var(--text-muted);">`;
    html += `Automated: ${data.metrics?.automated || 0} | Manual: ${data.metrics?.manual || 0}`;
    html += '</div></div>';
    
    data.testCases.forEach(tc => {
        html += '<div style="background: var(--bg-secondary); padding: 12px; border-radius: 8px; margin-bottom: 8px;">';
        html += `<div style="font-weight: 600; color: var(--text-primary);">#${tc.id}: ${tc.fields['System.Title'] || 'Test Case'}</div>`;
        html += `<div style="margin-top: 4px; font-size: 13px;">`;
        html += `<span class="badge ${tc.fields['System.State'] === 'Closed' ? 'badge-low' : 'badge-medium'}">${tc.fields['System.State'] || 'Unknown'}</span>`;
        if (tc.fields['Microsoft.VSTS.TCM.AutomatedTestName']) {
            html += ` <span class="badge badge-low">Automated</span>`;
        } else {
            html += ` <span class="badge badge-medium">Manual</span>`;
        }
        html += '</div></div>';
    });
    
    container.innerHTML = html;
    panel.style.display = 'block';
}

// ============================================
// TASK DETAILS MODAL
// ============================================

function showTaskDetailsModal(task) {
    console.log('[Task Details] Showing modal for task:', task.id);

    // Helper to strip HTML tags from description
    const stripHtml = (html) => {
        if (!html) return '';
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    };

    const descriptionText = stripHtml(task.description || '');

    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'task-modal-overlay';
    modal.innerHTML = `
        <div class="task-modal">
            <div class="task-modal-header">
                <div class="task-modal-title">
                    <span class="task-modal-id">#${task.id}</span>
                    ${getWorkItemTypeBadge(task.type)}
                    ${getStateBadge(task.state)}
                </div>
                <button class="task-modal-close">&times;</button>
            </div>
            <div class="task-modal-body">
                <h3 class="task-modal-task-title">${task.title}</h3>

                <div class="task-modal-section">
                    <h4>Details</h4>
                    <div class="task-detail-grid">
                        <div class="task-detail-item">
                            <span class="task-detail-label">Assigned To:</span>
                            <span class="task-detail-value">${task.assignedTo || 'Unassigned'}</span>
                        </div>
                        <div class="task-detail-item">
                            <span class="task-detail-label">State:</span>
                            <span class="task-detail-value">${task.state}</span>
                        </div>
                        <div class="task-detail-item">
                            <span class="task-detail-label">Priority:</span>
                            <span class="task-detail-value">${task.priority || 'Not set'}</span>
                        </div>
                        <div class="task-detail-item">
                            <span class="task-detail-label">Area Path:</span>
                            <span class="task-detail-value">${task.areaPath || 'N/A'}</span>
                        </div>
                        <div class="task-detail-item">
                            <span class="task-detail-label">Iteration:</span>
                            <span class="task-detail-value">${task.iterationPath || 'N/A'}</span>
                        </div>
                        <div class="task-detail-item">
                            <span class="task-detail-label">Created:</span>
                            <span class="task-detail-value">${new Date(task.createdDate).toLocaleDateString()}</span>
                        </div>
                        <div class="task-detail-item">
                            <span class="task-detail-label">Last Updated:</span>
                            <span class="task-detail-value">${new Date(task.changedDate).toLocaleDateString()}</span>
                        </div>
                        ${task.tags ? `
                        <div class="task-detail-item full-width">
                            <span class="task-detail-label">Tags:</span>
                            <span class="task-detail-value">${task.tags}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>

                ${descriptionText ? `
                <div class="task-modal-section">
                    <h4>Description</h4>
                    <div class="task-description">${descriptionText}</div>
                </div>
                ` : ''}

                <div class="task-modal-footer">
                    <a href="https://dev.azure.com/${task.organization || 'carepayment'}/${task.project || 'Core'}/_workitems/edit/${task.id}" 
                       target="_blank" 
                       class="btn btn-sm btn-primary">
                        Open in Azure DevOps →
                    </a>
                </div>
            </div>
        </div>
    `;
    
    // Add to body
    document.body.appendChild(modal);
    
    // Add event listeners
    const closeBtn = modal.querySelector('.task-modal-close');
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Close on Escape key
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

