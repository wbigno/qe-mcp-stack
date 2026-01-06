// API Configuration
const API_BASE_URL = 'http://localhost:3000';

// Import model selector
import { modelSelector } from './modelSelector.js';

// State Management
let currentData = {
    workItems: [],
    defects: [],
    testRuns: [],
    qualityMetrics: null
};

let currentFilters = {
    sprint: '',
    environment: '',
    state: ''
};

let isLoading = false;

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Initialize model selector
    modelSelector.initialize();

    initializeNavigation();
    initializeFilterBar();
    initializeFilters();
    initializeStoryAnalyzer();
    initializeTestCasesTab();
    addSVGGradients();

    // Show initial message prompting user to set filters
    showStatusMessage('Enter a Sprint and click Apply to load data', 'info');
});

// ============================================
// NAVIGATION (TOP TABS)
// ============================================

function initializeNavigation() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            switchTab(tabName);
            
            // Update active state
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

function switchTab(tabName) {
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    const activeTab = document.getElementById(`${tabName}-tab`);
    if (activeTab) {
        activeTab.classList.add('active');
        
        // Load tab-specific data
        switch(tabName) {
            case 'defects':
                loadDefects();
                break;
            case 'test-cases':
                // Test cases tab - no auto-load needed
                break;
            case 'test-execution':
                loadTestExecution();
                break;
            case 'quality-metrics':
                loadQualityMetrics();
                break;
        }
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
    const applyBtn = document.getElementById('applyFiltersBtn');
    const clearBtn = document.getElementById('clearFiltersBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const sprintInput = document.getElementById('sprintInput');
    const envFilter = document.getElementById('environmentFilter');
    const stateFilter = document.getElementById('stateFilter');
    
    applyBtn.addEventListener('click', () => {
        currentFilters.sprint = sprintInput.value.trim();
        currentFilters.environment = envFilter.value;
        currentFilters.state = stateFilter.value;
        
        loadAllData();
    });
    
    clearBtn.addEventListener('click', () => {
        sprintInput.value = '';
        envFilter.value = '';
        stateFilter.value = '';
        currentFilters = { sprint: '', environment: '', state: '' };
        
        loadAllData();
    });
    
    refreshBtn.addEventListener('click', () => {
        loadAllData();
    });
    
    // Enter key support
    [sprintInput].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                applyBtn.click();
            }
        });
    });
}

// ============================================
// DATA LOADING
// ============================================

async function loadAllData() {
    if (isLoading) return;
    
    isLoading = true;
    const applyBtn = document.getElementById('applyFiltersBtn');
    if (applyBtn) applyBtn.disabled = true;
    
    try {
        // Load core data (work items and defects) - these are required
        await Promise.all([
            loadWorkItems(),
            loadDefects()
        ]);
        
        // Load optional metrics (don't fail if they error)
        loadTestExecution().catch(err => console.log('Test execution metrics not available'));
        loadQualityMetrics().catch(err => console.log('Quality metrics not available'));
        
        updateOverview();
        showStatusMessage('Data loaded successfully!', 'success');
    } catch (error) {
        console.error('Error loading data:', error);
        showStatusMessage(`Failed to load data: ${error.message}`, 'error');
        loadSampleData();
    } finally {
        if (applyBtn) applyBtn.disabled = false;
        isLoading = false;
    }
}

async function loadWorkItems() {
    try {
        const params = new URLSearchParams();
        if (currentFilters.sprint) params.append('sprint', currentFilters.sprint);
        if (currentFilters.state) params.append('state', currentFilters.state);
        
        const url = `${API_BASE_URL}/api/dashboard/aod-summary${params.toString() ? '?' + params : ''}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch work items');
        
        const data = await response.json();
        currentData.workItems = data.workItemDetails || [];
        
        updateWorkItemsTab();
    } catch (error) {
        console.error('Error loading work items:', error);
    }
}

async function loadDefects() {
    try {
        const params = new URLSearchParams();
        if (currentFilters.sprint) params.append('sprint', currentFilters.sprint);
        if (currentFilters.environment) params.append('environment', currentFilters.environment);
        if (currentFilters.state) params.append('state', currentFilters.state);
        
        const url = `${API_BASE_URL}/api/ado/defects${params.toString() ? '?' + params : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            console.log('Defects endpoint not available, using sample data');
            currentData.defects = generateSampleDefects();
            currentData.defectMetrics = generateSampleDefectMetrics();
            updateDefectsTab();
            return;
        }
        
        const data = await response.json();
        currentData.defects = data.defects || [];
        currentData.defectMetrics = data.metrics || {};
        
        updateDefectsTab();
    } catch (error) {
        console.log('Defects not available, using sample data');
        currentData.defects = generateSampleDefects();
        currentData.defectMetrics = generateSampleDefectMetrics();
        updateDefectsTab();
    }
}

async function loadTestExecution() {
    try {
        const params = new URLSearchParams();
        if (currentFilters.sprint) params.append('sprint', currentFilters.sprint);
        
        const url = `${API_BASE_URL}/api/ado/test-execution/metrics${params.toString() ? '?' + params : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            console.log('Test execution metrics endpoint not available, using sample data');
            currentData.testMetrics = generateSampleTestMetrics();
            currentData.testRuns = generateSampleTestRuns();
            updateTestExecutionTab();
            return;
        }
        
        const data = await response.json();
        currentData.testMetrics = data.metrics || {};
        
        // Also get test runs
        const runsResponse = await fetch(`${API_BASE_URL}/api/ado/test-runs${params.toString() ? '?' + params : ''}`);
        if (runsResponse.ok) {
            const runsData = await runsResponse.json();
            currentData.testRuns = runsData.testRuns || [];
        } else {
            currentData.testRuns = generateSampleTestRuns();
        }
        
        updateTestExecutionTab();
    } catch (error) {
        console.log('Test execution not available, using sample data');
        currentData.testMetrics = generateSampleTestMetrics();
        currentData.testRuns = generateSampleTestRuns();
        updateTestExecutionTab();
    }
}

async function loadQualityMetrics() {
    try {
        const params = new URLSearchParams();
        if (currentFilters.sprint) params.append('sprint', currentFilters.sprint);
        
        const url = `${API_BASE_URL}/api/ado/quality-metrics${params.toString() ? '?' + params : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            console.log('Quality metrics endpoint not available, using sample data');
            currentData.qualityMetrics = generateSampleQualityMetrics();
            updateQualityMetricsTab();
            return;
        }
        
        const data = await response.json();
        currentData.qualityMetrics = data.metrics || {};
        
        updateQualityMetricsTab();
    } catch (error) {
        console.log('Quality metrics not available, using sample data');
        currentData.qualityMetrics = generateSampleQualityMetrics();
        updateQualityMetricsTab();
    }
}

// ============================================
// UPDATE OVERVIEW TAB
// ============================================

function updateOverview() {
    // Update metric cards
    document.getElementById('activeWorkItems').textContent = currentData.workItems.length || 0;
    document.getElementById('activeDefects').textContent = currentData.defectMetrics?.open || 0;
    document.getElementById('testPassRate').textContent = `${currentData.testMetrics?.passRate || 0}%`;
    document.getElementById('qualityScore').textContent = currentData.qualityMetrics?.qualityScore || '-';
    
    // Update charts
    updateDefectsByEnvChart();
    updateTestTrendsChart();
}

function updateDefectsByEnvChart() {
    const container = document.getElementById('defectsByEnvChart');
    const envData = currentData.defectMetrics?.byEnvironment || { dev: 0, uat: 0, prod: 0 };
    
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
}

function updateTestTrendsChart() {
    const container = document.getElementById('testTrendsChart');
    const passRate = parseFloat(currentData.testMetrics?.passRate || 0);
    
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
}

// ============================================
// UPDATE WORK ITEMS TAB
// ============================================

function updateWorkItemsTab() {
    const tbody = document.querySelector('#workItemsTable tbody');
    tbody.innerHTML = '';
    
    currentData.workItems.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${item.id}</td>
            <td>${item.title}</td>
            <td>${getWorkItemTypeBadge(item.type)}</td>
            <td>${getStateBadge(item.state)}</td>
            <td>${item.assignedTo || 'Unassigned'}</td>
            <td>
                <button class="btn btn-sm analyze-story-btn" data-story-id="${item.id}">
                    Analyze
                </button>
            </td>
        `;
        
        // Add event listener to the button
        const analyzeBtn = tr.querySelector('.analyze-story-btn');
        analyzeBtn.addEventListener('click', () => {
            analyzeStory(item.id);
        });
        
        tbody.appendChild(tr);
    });
}

// ============================================
// UPDATE DEFECTS TAB
// ============================================

function updateDefectsTab() {
    const metrics = currentData.defectMetrics || {};
    
    // Update stat boxes
    document.getElementById('defectsDev').textContent = metrics.byEnvironment?.dev || 0;
    document.getElementById('defectsUat').textContent = metrics.byEnvironment?.uat || 0;
    document.getElementById('defectsProd').textContent = metrics.byEnvironment?.prod || 0;
    document.getElementById('defectsCritical').textContent = metrics.bySeverity?.critical || 0;
    
    // Update defects list
    const container = document.getElementById('defectsList');
    container.innerHTML = '';
    
    if (currentData.defects.length === 0) {
        container.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted);">No defects found</div>';
        return;
    }
    
    currentData.defects.forEach(defect => {
        const card = createDefectCard(defect);
        container.appendChild(card);
    });
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
    const metrics = currentData.testMetrics || {};
    
    // Update stat boxes
    document.getElementById('totalTestRuns').textContent = metrics.totalRuns || 0;
    document.getElementById('passedTests').textContent = calculatePassed(metrics);
    document.getElementById('failedTests').textContent = calculateFailed(metrics);
    document.getElementById('automationRate').textContent = `${metrics.automationRate || 0}%`;
    
    // Update test runs list
    updateTestRunsList();
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
    const container = document.getElementById('testRunsList');
    container.innerHTML = '';
    
    if (currentData.testRuns.length === 0) {
        container.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted);">No test runs found</div>';
        return;
    }
    
    currentData.testRuns.slice(0, 10).forEach(run => {
        const card = createTestRunCard(run);
        container.appendChild(card);
    });
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
    const metrics = currentData.qualityMetrics || {};
    
    // Update metric cards
    document.getElementById('qmDefects').textContent = metrics.defects?.total || 0;
    document.getElementById('qmPassRate').textContent = `${metrics.testing?.passRate || 0}%`;
    document.getElementById('qmCoverage').textContent = metrics.coverage 
        ? `${Math.round((metrics.coverage.storiesWithTests / metrics.coverage.totalStories) * 100)}%`
        : '-';
    document.getElementById('qmScore').textContent = metrics.qualityScore || '-';
    
    // Update charts
    updateQualityDefectsChart();
    updateQualityTestingChart();
}

function updateQualityDefectsChart() {
    const container = document.getElementById('qualityDefectsChart');
    const defects = currentData.qualityMetrics?.defects || {};
    
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
}

function updateQualityTestingChart() {
    const container = document.getElementById('qualityTestingChart');
    const testing = currentData.qualityMetrics?.testing || {};
    const coverage = currentData.qualityMetrics?.coverage || {};
    
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
    
    const btn = document.getElementById('analyzeStoryBtn');
    const loading = document.getElementById('analyzeLoading');
    const text = document.getElementById('analyzeText');
    
    
    if (btn) btn.disabled = true;
    if (loading) loading.style.display = 'inline-block';
    if (text) text.style.display = 'none';
    
    try {
        // Step 1: Get the work item
        const storyResponse = await fetch(`${API_BASE_URL}/api/ado/pull-stories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workItemIds: [parseInt(storyId)] })
        });
        
        
        if (!storyResponse.ok) {
            throw new Error(`Failed to get work item (${storyResponse.status})`);
        }
        
        const storyData = await storyResponse.json();
        
        if (!storyData.stories || storyData.stories.length === 0) {
            throw new Error('Work item not found');
        }
        
        const story = storyData.stories[0];
        
        // Step 2: Try to analyze requirements (optional)
        let requirementsAnalysis = null;
        
        try {
            const { model } = modelSelector.getSelection();

            const analysisResponse = await fetch(`${API_BASE_URL}/api/ado/analyze-requirements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storyIds: [parseInt(storyId)],
                    includeGapAnalysis: true,
                    model
                })
            });
            
            
            if (analysisResponse.ok) {
                const analysisData = await analysisResponse.json();
                
                if (analysisData.results && analysisData.results.length > 0) {
                    requirementsAnalysis = analysisData.results[0].analysis;
                } else {
                }
            } else {
                const errorText = await analysisResponse.text();
                console.log('Error details:', errorText);
            }
        } catch (analysisError) {
        }
        
        // Display results
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
        
        displayAnalysisResults(displayData);
        
        if (requirementsAnalysis) {
            showStatusMessage('Story analyzed successfully!', 'success');
        } else {
            showStatusMessage('Story loaded (AI analysis unavailable)', 'info');
        }
        
    } catch (error) {
        console.error('Error analyzing story:', error);
        console.error('Error stack:', error.stack);
        showStatusMessage(`Failed: ${error.message}`, 'error');
    } finally {
        if (btn) btn.disabled = false;
        if (loading) loading.style.display = 'none';
        if (text) text.style.display = 'inline';
    }
}

async function generateTestCases(storyId) {
    
    const btn = document.getElementById('generateTestsBtn');
    const loading = document.getElementById('generateLoading');
    const text = document.getElementById('generateText');
    
    if (btn) btn.disabled = true;
    if (loading) loading.style.display = 'inline-block';
    if (text) text.style.display = 'none';
    
    try {
        const { model } = modelSelector.getSelection();

        console.log('Calling generate-test-cases endpoint...');
        const response = await fetch(`${API_BASE_URL}/api/ado/generate-test-cases`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                storyId: parseInt(storyId),
                updateADO: false,
                model
            })
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`Failed to generate tests (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Test generation data received:', data);
        
        displayTestCaseResults(data);
        showStatusMessage('Test cases generated!', 'success');
    } catch (error) {
        console.error('Error generating tests:', error);
        if (error.message.includes('404')) {
            showStatusMessage('Test case generation endpoint not configured. Please set up /api/ado/generate-test-cases', 'error');
        } else {
            showStatusMessage(`Failed to generate tests: ${error.message}`, 'error');
        }
    } finally {
        if (btn) btn.disabled = false;
        if (loading) loading.style.display = 'none';
        if (text) text.style.display = 'inline';
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
// SAMPLE DATA (Fallback)
// ============================================

function generateSampleDefects() {
    return [
        {
            id: 12345,
            fields: {
                'System.Title': 'Login fails on mobile Safari',
                'System.State': 'Active',
                'System.Tags': 'UAT; Mobile',
                'Microsoft.VSTS.Common.Severity': 'High',
                'System.AssignedTo': 'John Doe'
            }
        },
        {
            id: 12346,
            fields: {
                'System.Title': 'Payment form validation error',
                'System.State': 'Active',
                'System.Tags': 'Prod; Payment',
                'Microsoft.VSTS.Common.Severity': 'Critical',
                'System.AssignedTo': 'Jane Smith'
            }
        }
    ];
}

function generateSampleDefectMetrics() {
    return {
        total: 24,
        open: 18,
        byEnvironment: { dev: 8, uat: 12, prod: 4 },
        bySeverity: { critical: 3, high: 8, medium: 10, low: 3 }
    };
}

function generateSampleTestMetrics() {
    return {
        totalRuns: 50,
        passRate: '87.5',
        automationRate: '75.0'
    };
}

function generateSampleTestRuns() {
    return [
        {
            id: 1,
            name: 'Regression Suite',
            startedDate: new Date().toISOString(),
            totalTests: 120,
            passedTests: 105,
            failedTests: 15,
            notExecutedTests: 0
        }
    ];
}

function generateSampleQualityMetrics() {
    return {
        defects: {
            total: 24,
            byEnvironment: { dev: 8, uat: 12, prod: 4 },
            bySeverity: { critical: 3, high: 8, medium: 10, low: 3 }
        },
        testing: {
            passRate: '87.5',
            totalRuns: 50,
            automationRate: '75.0'
        },
        coverage: {
            storiesWithTests: 28,
            storiesWithDefects: 12,
            totalStories: 32
        },
        qualityScore: '85.5'
    };
}

function loadSampleData() {
    currentData.defects = generateSampleDefects();
    currentData.defectMetrics = generateSampleDefectMetrics();
    currentData.testMetrics = generateSampleTestMetrics();
    currentData.testRuns = generateSampleTestRuns();
    currentData.qualityMetrics = generateSampleQualityMetrics();
    
    updateOverview();
    updateDefectsTab();
    updateTestExecutionTab();
    updateQualityMetricsTab();
}

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
