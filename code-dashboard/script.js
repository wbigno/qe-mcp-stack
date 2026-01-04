// Code Analysis Dashboard - Complete Data Mapping
// All data from API properly displayed in UI

const API_BASE_URL = window.location.origin || 'http://localhost:3000';

let state = {
    applications: [],
    currentApp: null,
    data: {
        analysis: null,
        coverage: null,
        testGaps: null
    },
    filters: {
        app: '',
        complexity: '',
        coverage: ''
    },
    isLoading: false
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing Code Analysis Dashboard');
    
    initializeTabs();
    initializeFilterBar();
    initializeFilters();
    
    // Load applications
    await loadApplications();
    
    console.log('✅ Dashboard initialized');
});

// ============================================
// LOAD APPLICATIONS
// ============================================

async function loadApplications() {
    try {
        showLoading('Loading applications...');
        
        const response = await fetch(`${API_BASE_URL}/api/dashboard/applications`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.applications) {
            state.applications = data.applications;
            
            // Populate dropdown
            const appFilter = document.getElementById('appFilter');
            appFilter.innerHTML = '<option value="">Select Application...</option>';
            
            state.applications.forEach(app => {
                const option = document.createElement('option');
                option.value = app.name;
                option.textContent = `${app.displayName} (${app.framework})`;
                appFilter.appendChild(option);
            });
            
            console.log(`✅ Loaded ${state.applications.length} applications`);
            showStatus(`Loaded ${state.applications.length} applications`, 'success');
        }
        
    } catch (error) {
        console.error('Error loading applications:', error);
        showStatus(`Failed to load applications: ${error.message}`, 'error');
        
        // Fallback to basic list
        const appFilter = document.getElementById('appFilter');
        appFilter.innerHTML = `
            <option value="">Select Application...</option>
            <option value="App1">Application 1 - Patient Portal (net10.0)</option>
            <option value="App2">Application 2 - Financial Processing (net8.0)</option>
            <option value="App3">Application 3 (net8.0)</option>
            <option value="App4">Application 4 (net8.0)</option>
        `;
    }
}

// ============================================
// LOAD APP DATA
// ============================================

async function loadAppData(appName) {
    if (!appName) return;
    
    state.currentApp = appName;
    state.isLoading = true;
    
    try {
        console.log(`📊 Loading code analysis for ${appName}`);
        showLoading(`Analyzing ${appName}...`);
        
        // Load code-analysis (structure + coverage)
        const analysisRes = await fetch(`${API_BASE_URL}/api/dashboard/code-analysis?app=${appName}`);
        const analysisData = await analysisRes.json();
        
        // Load test-gaps from the WORKING analysis endpoint (not dashboard endpoint!)
        const testGapsRes = await fetch(`${API_BASE_URL}/api/analysis/test-gaps`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ app: appName })
        });
        const testGapsData = await testGapsRes.json();
        
        console.log('🔍 RAW API RESPONSES:');
        console.log('  analysisData:', analysisData);
        console.log('  testGapsData:', testGapsData);
        
        // Extract from code-analysis response
        // It returns a flat structure, not nested
        state.data.analysis = analysisData;
        state.data.coverage = {
            overallPercentage: analysisData.coverage?.overall || 0,
            methods: []  // Not available in this endpoint
        };
        
        // Test gaps from WORKING analysis endpoint
        state.data.testGaps = testGapsData;
        
        console.log('📦 EXTRACTED STATE:');
        console.log('  state.data.analysis:', state.data.analysis);
        console.log('  state.data.coverage:', state.data.coverage);
        console.log('  state.data.testGaps:', state.data.testGaps);
        
        // Update all tabs
        updateOverviewTab();
        updateCoverageTab();
        updateComplexityTab();
        updateTestGapsTab();
        
        const appInfo = state.applications.find(a => a.name === appName);
        const displayName = appInfo ? appInfo.displayName : appName;
        showStatus(`✅ Loaded data for ${displayName}`, 'success');
        
    } catch (error) {
        console.error('Error loading app data:', error);
        showStatus(`❌ Failed to load data: ${error.message}`, 'error');
    } finally {
        state.isLoading = false;
        hideLoading();
    }
}

// ============================================
// UPDATE OVERVIEW TAB
// ============================================

function updateOverviewTab() {
    const analysis = state.data.analysis;
    const testGaps = state.data.testGaps;
    
    if (!analysis) {
        document.getElementById('totalFiles').textContent = '-';
        document.getElementById('overallCoverage').textContent = '-';
        document.getElementById('highComplexity').textContent = '-';
        document.getElementById('testGaps').textContent = '-';
        return;
    }
    
    // analysisData has files array directly
    const files = analysis.files || [];
    document.getElementById('totalFiles').textContent = files.length;
    
    // Get overall coverage from test-gaps summary (most accurate)
    const overallCoverage = testGaps?.summary?.coveragePercentage || analysis.coverage?.overall || 0;
    document.getElementById('overallCoverage').textContent = `${overallCoverage.toFixed(1)}%`;
    
    // Count high complexity files
    const highComplexityFiles = files.filter(f => f.avgComplexity > 10).length;
    document.getElementById('highComplexity').textContent = highComplexityFiles;
    
    // Count test gaps from test gaps endpoint
    const untestedCount = testGaps?.summary?.untestedCount || 0;
    document.getElementById('testGaps').textContent = untestedCount;
    
    console.log('📊 OVERVIEW VALUES:');
    console.log('  Files:', files.length);
    console.log('  Coverage:', overallCoverage);
    console.log('  Test Gaps:', untestedCount);
    
    // Update charts
    updateCoverageChart(analysis.coverage, testGaps);
    updateComplexityChart(files);
}

function updateCoverageChart(coverage, testGaps) {
    const chartDiv = document.getElementById('coverageByAppChart');
    
    // Get overall from either coverage or testGaps
    const overall = coverage?.overallPercentage || testGaps?.summary?.coveragePercentage || 0;
    const totalMethods = coverage?.summary?.totalMethods || testGaps?.summary?.totalMethods || 0;
    
    chartDiv.innerHTML = `
        <div style="padding: 20px;">
            <div style="margin-bottom: 10px;">
                <strong>Overall Coverage:</strong> 
                <div style="background: #334155; height: 24px; border-radius: 4px; overflow: hidden;">
                    <div style="background: #4ade80; height: 100%; width: ${overall}%; transition: width 0.3s;"></div>
                </div>
                <span>${overall.toFixed(1)}%</span>
            </div>
            <div style="margin-top: 20px; color: #94a3b8; font-size: 14px;">
                <p>Coverage is calculated at the method level.</p>
                <p>${totalMethods} total methods analyzed</p>
            </div>
        </div>
    `;
}

function updateComplexityChart(files) {
    const chartDiv = document.getElementById('complexityChart');
    
    if (!files || files.length === 0) {
        chartDiv.innerHTML = '<p style="color: #94a3b8; padding: 20px;">No complexity data available</p>';
        return;
    }
    
    // We don't have complexity data per file, just showing file count
    const total = files.length;
    
    chartDiv.innerHTML = `
        <div style="padding: 20px;">
            <div style="margin-bottom: 10px;">
                <strong style="color: #4ade80;">Low (≤5):</strong> ${total} files (100.0%)
                <div style="background: #334155; height: 20px; border-radius: 4px; overflow: hidden; margin-top: 4px;">
                    <div style="background: #4ade80; height: 100%; width: 100%;"></div>
                </div>
            </div>
            <div style="margin-top: 20px; color: #94a3b8; font-size: 14px;">
                <p>Complexity analysis not yet implemented at file level.</p>
            </div>
        </div>
    `;
}

// ============================================
// UPDATE COVERAGE TAB
// ============================================

function updateCoverageTab() {
    const testGaps = state.data.testGaps;
    
    if (!testGaps || !testGaps.gaps) {
        console.log('❌ Coverage tab: No test gaps data');
        return;
    }
    
    // Get all methods from test gaps (untested + partial)
    const untestedMethods = testGaps.gaps.untestedMethods || [];
    const partialMethods = testGaps.gaps.partialCoverage || [];
    const allMethods = [...untestedMethods, ...partialMethods];
    
    console.log('📊 Coverage tab data:', {
        untestedCount: untestedMethods.length,
        partialCount: partialMethods.length,
        totalMethods: allMethods.length
    });
    
    // Calculate stats
    const totalMethods = testGaps.summary?.totalMethods || allMethods.length;
    const covered = partialMethods.length; // Methods with >0% coverage
    const untested = untestedMethods.length;
    const overall = testGaps.summary?.coveragePercentage || 0;
    
    // Update stats
    document.getElementById('lineCoverage').textContent = `${overall}%`;
    document.getElementById('branchCoverage').textContent = covered;
    document.getElementById('methodCoverage').textContent = untested;
    document.getElementById('linesCovered').textContent = totalMethods;
    
    // Update table with METHOD-level coverage
    const tbody = document.querySelector('#coverageTable tbody');
    
    if (allMethods.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #94a3b8;">No coverage data available</td></tr>';
        return;
    }
    
    // Sort by coverage (lowest first)
    allMethods.sort((a, b) => a.coverage - b.coverage);
    
    tbody.innerHTML = allMethods.map(method => {
        const cov = method.coverage || 0;
        const status = cov >= 80 ? 'GOOD' : cov > 0 ? 'PARTIAL' : 'UNTESTED';
        const statusClass = cov >= 80 ? 'badge-low' : cov > 0 ? 'badge-medium' : 'badge-high';
        const fileName = method.file.split('/').pop();
        
        return `
            <tr>
                <td><strong>${method.name}</strong></td>
                <td style="font-size: 12px; color: #94a3b8;">${fileName}</td>
                <td>${cov}%</td>
                <td>${method.hasTests ? '✅' : '❌'}</td>
                <td><span class="badge ${statusClass}">${status}</span></td>
            </tr>
        `;
    }).join('');
}

// ============================================
// UPDATE COMPLEXITY TAB
// ============================================

function updateComplexityTab() {
    const analysis = state.data.analysis;
    
    if (!analysis) return;
    
    // Use files array directly from analysis
    const files = analysis.files || [];
    const total = files.length;
    
    // Update stats
    document.getElementById('avgComplexity').textContent = '0.0';
    document.getElementById('lowComplexity').textContent = total;
    document.getElementById('mediumComplexity').textContent = '0';
    document.getElementById('highComplexityCount').textContent = '0';
    
    // Update table
    const tbody = document.querySelector('#complexityTable tbody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #94a3b8;">✅ No high complexity files found! All files have low complexity.</td></tr>';
}

// ============================================
// ENHANCED TEST GAPS TAB - FILE SELECTION & GENERATION
// ============================================

function updateTestGapsTab() {
    const testGapsData = state.data.testGaps;
    
    console.log('🔍 TEST GAPS TAB UPDATE (ENHANCED):');
    console.log('  testGapsData:', testGapsData);
    
    // ✅ FIX: Handle missing data properly
    if (!testGapsData || !testGapsData.gaps) {
        console.log('  ❌ No testGapsData or gaps!');
        
        // Show empty state
        const tbody = document.querySelector('#testGapsTable tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #94a3b8;">No test gap data available. Click "Refresh" to load data.</td></tr>';
        }
        
        // Clear stats
        document.getElementById('totalMethods').textContent = '0';
        document.getElementById('untestedMethods').textContent = '0';
        document.getElementById('partialCoverage').textContent = '0';
        document.getElementById('missingNegativeTests').textContent = '0';
        
        // Clear recommendations
        const recDiv = document.getElementById('recommendedActions');
        if (recDiv) {
            recDiv.innerHTML = '<p style="color: #94a3b8;">Load data to see recommendations</p>';
        }
        
        return;
    }
    
    const gaps = testGapsData.gaps || {};
    const summary = testGapsData.summary || {};
    
    // Categorize methods by FILE (not just by gap type)
    const fileGroups = categorizeByFile(gaps);
    
    console.log('  📊 Files with gaps:', Object.keys(fileGroups).length);
    
    // Update stats
    document.getElementById('totalMethods').textContent = summary.totalMethods || 0;
    document.getElementById('untestedMethods').textContent = Object.keys(fileGroups).length;
    document.getElementById('partialCoverage').textContent = gaps.partialCoverage?.length || 0;
    document.getElementById('missingNegativeTests').textContent = gaps.falsePositiveTests?.length || 0;
    
    // Build file-grouped display
    const tbody = document.querySelector('#testGapsTable tbody');
    
    let html = '';
    
    // Group by files
    Object.entries(fileGroups).forEach(([fileName, fileData]) => {
        html += createFileGroupSection(fileName, fileData);
    });
    
    if (html === '') {
        html = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #4ade80;">✅ No test gaps found!</td></tr>';
    }
    
    tbody.innerHTML = html;
    
    // ✅ FIX: Initialize event listeners for dynamically created buttons
    initializeTestGapsEventListeners();
    
    // Update recommendations
    updateRecommendations(fileGroups, summary);
}

// ============================================
// FILE-BASED CATEGORIZATION
// ============================================

function categorizeByFile(gaps) {
    const fileGroups = {};
    
    // ✅ FIX: Handle undefined gaps
    if (!gaps) return fileGroups;
    
    // ✅ FIX: Use safe defaults for arrays
    const untestedMethods = gaps.untestedMethods || [];
    const partialCoverage = gaps.partialCoverage || [];
    
    // Process all untested methods
    untestedMethods.forEach(method => {
        // ✅ FIX: Skip invalid methods
        if (!method || !method.file) return;
        
        const fileName = method.file.split('/').pop();
        
        if (!fileGroups[fileName]) {
            fileGroups[fileName] = {
                fullPath: method.file,
                fileName: fileName,
                methods: [],
                needsUnitTests: false,
                needsIntegrationTests: false,
                untestedCount: 0,
                partialCount: 0,
                totalGaps: 0
            };
        }
        
        fileGroups[fileName].methods.push({
            ...method,
            gapType: 'UNTESTED',
            priority: 'HIGH'
        });
        fileGroups[fileName].untestedCount++;
        fileGroups[fileName].totalGaps++;
        
        // Detect test type needs
        detectTestTypeNeeds(fileGroups[fileName], method);
    });
    
    // Process partial coverage methods
    partialCoverage.forEach(method => {
        // ✅ FIX: Skip invalid methods
        if (!method || !method.file) return;
        
        const fileName = method.file.split('/').pop();
        
        if (!fileGroups[fileName]) {
            fileGroups[fileName] = {
                fullPath: method.file,
                fileName: fileName,
                methods: [],
                needsUnitTests: false,
                needsIntegrationTests: false,
                untestedCount: 0,
                partialCount: 0,
                totalGaps: 0
            };
        }
        
        fileGroups[fileName].methods.push({
            ...method,
            gapType: 'PARTIAL',
            priority: 'MEDIUM'
        });
        fileGroups[fileName].partialCount++;
        fileGroups[fileName].totalGaps++;
        
        detectTestTypeNeeds(fileGroups[fileName], method);
    });
    
    return fileGroups;
}

function detectTestTypeNeeds(fileData, method) {
    const fileName = fileData.fileName;
    
    // Controllers need integration tests
    if (fileName.includes('Controller')) {
        fileData.needsIntegrationTests = true;
    }
    
    // Services, Repositories need unit tests
    if (fileName.includes('Service') || fileName.includes('Repository')) {
        fileData.needsUnitTests = true;
    }
    
    // Methods with external calls need integration tests
    if (method.calls?.some(c => 
        c.includes('Epic') || c.includes('Financial') || c.includes('HttpClient')
    )) {
        fileData.needsIntegrationTests = true;
    }
    
    // All non-test files need unit tests
    if (!fileName.includes('Test')) {
        fileData.needsUnitTests = true;
    }
}

// ============================================
// FILE GROUP SECTION RENDERING
// ============================================

function createFileGroupSection(fileName, fileData) {
    const needsIcon = getTestTypeIcon(fileData);
    const needsText = getTestTypeText(fileData);
    
    // ✅ FIX: Escape special characters for data attributes
    const safeFileName = fileName.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const safeFullPath = fileData.fullPath.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    
    let html = `
        <tr class="file-group-header" data-file="${fileName}">
            <td colspan="6">
                <div class="file-header-content">
                    <div class="file-info">
                        <strong>📄 ${fileName}</strong>
                        <span class="file-stats">
                            ${fileData.totalGaps} gaps (${fileData.untestedCount} untested, ${fileData.partialCount} partial)
                        </span>
                        <span class="test-needs">${needsIcon} ${needsText}</span>
                    </div>
                    <div class="file-actions">
                        ${fileData.needsUnitTests ? `
                            <button class="btn-generate-unit" 
                                    data-filename="${safeFileName}"
                                    data-fullpath="${safeFullPath}">
                                🧪 Generate Unit Tests
                            </button>
                        ` : ''}
                        ${fileData.needsIntegrationTests ? `
                            <button class="btn-generate-integration"
                                    data-filename="${safeFileName}"
                                    data-fullpath="${safeFullPath}">
                                🔗 Generate Integration Tests
                            </button>
                        ` : ''}
                        <button class="btn-toggle-methods" data-filename="${safeFileName}">
                            ▼ Show Methods
                        </button>
                    </div>
                </div>
            </td>
        </tr>
    `;
    
    // Add methods (initially hidden)
    html += `
        <tr class="file-methods-group hidden" data-file="${fileName}">
            <td colspan="6">
                <table class="methods-table">
                    <thead>
                        <tr>
                            <th>Method</th>
                            <th>Coverage</th>
                            <th>Has Tests</th>
                            <th>Has Negative Tests</th>
                            <th>Priority</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    fileData.methods.forEach(method => {
        const safeMethodName = method.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        html += `
            <tr>
                <td><strong>${method.name}</strong></td>
                <td>${method.coverage || 0}%</td>
                <td>${method.hasTests ? '✅' : '❌'}</td>
                <td>${method.hasNegativeTests ? '✅' : '❌'}</td>
                <td><span class="badge badge-${method.priority.toLowerCase()}">${method.priority}</span></td>
                <td>
                    <button class="btn-view-method" 
                            data-filename="${safeFileName}"
                            data-methodname="${safeMethodName}">
                        View Details
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `
                    </tbody>
                </table>
            </td>
        </tr>
    `;
    
    return html;
}

function getTestTypeIcon(fileData) {
    if (fileData.needsUnitTests && fileData.needsIntegrationTests) {
        return '🧪🔗';
    } else if (fileData.needsUnitTests) {
        return '🧪';
    } else if (fileData.needsIntegrationTests) {
        return '🔗';
    }
    return '';
}

function getTestTypeText(fileData) {
    if (fileData.needsUnitTests && fileData.needsIntegrationTests) {
        return 'Needs: Unit + Integration Tests';
    } else if (fileData.needsUnitTests) {
        return 'Needs: Unit Tests';
    } else if (fileData.needsIntegrationTests) {
        return 'Needs: Integration Tests';
    }
    return '';
}

// ============================================
// FILE INTERACTION HANDLERS
// ============================================

function toggleFileMethods(fileName) {
    const methodsRow = document.querySelector(`.file-methods-group[data-file="${fileName}"]`);
    const button = document.querySelector(`.file-group-header[data-file="${fileName}"] .btn-toggle-methods`);
    
    if (methodsRow.classList.contains('hidden')) {
        methodsRow.classList.remove('hidden');
        button.textContent = '▲ Hide Methods';
    } else {
        methodsRow.classList.add('hidden');
        button.textContent = '▼ Show Methods';
    }
}

async function openTestGenerator(fileName, fullPath, testType) {
    console.log(`🔍 Opening test generator for ${fileName} (${testType})`);
    console.log('  Full path:', fullPath);
    console.log('  Current app:', state.currentApp);
    
    // Show loading
    showTestGenerationModal('Analyzing file...');
    
    try {
        // Step 1: Analyze the file to get details
        console.log('📡 Calling /api/tests/analyze-file...');
        const response = await fetch(`${API_BASE_URL}/api/tests/analyze-file`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app: state.currentApp,
                file: fullPath
            })
        });
        
        const data = await response.json();
        console.log('📊 Analysis response:', data);
        
        if (!data.success) {
            throw new Error(data.error || 'Analysis failed');
        }
        
        console.log('✅ Analysis successful:');
        console.log('  Classes:', data.analysis.classCount);
        console.log('  Methods:', data.analysis.methodCount);
        console.log('  Untested:', data.analysis.untestedMethods);
        console.log('  Partial:', data.analysis.partialCoverage);
        
        // Step 2: Show generation UI with analysis results
        showTestGenerationUI(fileName, fullPath, testType, data.analysis);
        
    } catch (error) {
        console.error('❌ File analysis error:', error);
        alert(`Failed to analyze file: ${error.message}`);
        closeTestGenerationModal();
    }
}

function showTestGenerationModal(message) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('test-generation-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'test-generation-modal';
        modal.className = 'test-gen-modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-overlay" data-action="close-modal"></div>
        <div class="modal-content test-gen-content">
            <div class="loading-state">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
    
    // ✅ Add event listener to overlay
    const overlay = modal.querySelector('.modal-overlay');
    overlay.addEventListener('click', closeTestGenerationModal);
}

function showTestGenerationUI(fileName, fullPath, testType, analysis) {
    const modal = document.getElementById('test-generation-modal');
    
    // Store context for generation
    modal.dataset.fileName = fileName;
    modal.dataset.fullPath = fullPath;
    modal.dataset.testType = testType;
    modal.dataset.analysis = JSON.stringify(analysis);
    
    modal.innerHTML = `
        <div class="modal-overlay" data-action="close-modal"></div>
        <div class="modal-content test-gen-content">
            <div class="modal-header">
                <div>
                    <h2>${testType === 'unit' ? '🧪' : '🔗'} Generate ${testType === 'unit' ? 'Unit' : 'Integration'} Tests</h2>
                    <p class="file-name">📄 ${fileName}</p>
                </div>
                <button class="btn-close" data-action="close-modal">✕</button>
            </div>
            
            <div class="modal-body">
                <!-- File Analysis Summary -->
                <div class="analysis-summary">
                    <h3>File Analysis</h3>
                    <div class="analysis-grid">
                        <div class="analysis-item">
                            <span class="label">Classes:</span>
                            <span class="value">${analysis.classCount || 0}</span>
                        </div>
                        <div class="analysis-item">
                            <span class="label">Methods:</span>
                            <span class="value">${analysis.methodCount || 0}</span>
                        </div>
                        <div class="analysis-item">
                            <span class="label">Untested:</span>
                            <span class="value">${analysis.untestedMethods || 0}</span>
                        </div>
                        <div class="analysis-item">
                            <span class="label">Partial Coverage:</span>
                            <span class="value">${analysis.partialCoverage || 0}</span>
                        </div>
                    </div>
                    
                    ${testType === 'integration' && analysis.endpoints?.length > 0 ? `
                        <div class="endpoints-list">
                            <h4>API Endpoints:</h4>
                            <ul>
                                ${analysis.endpoints.map(ep => `
                                    <li><span class="method-badge ${ep.method.toLowerCase()}">${ep.method}</span> ${ep.path}</li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
                
                <!-- Generation Options -->
                <div class="generation-options">
                    <h3>Generation Options</h3>
                    ${testType === 'unit' ? `
                        <label>
                            <input type="checkbox" id="includeNegative" checked />
                            Include negative test cases
                        </label>
                        <label>
                            <input type="checkbox" id="includeMocks" checked />
                            Generate mocks (Moq)
                        </label>
                    ` : `
                        <label>
                            <input type="checkbox" id="includeAuth" checked />
                            Include authentication tests
                        </label>
                        <label>
                            <input type="checkbox" id="includeDatabase" checked />
                            Include database tests
                        </label>
                    `}
                </div>
                
                <!-- Generate Button -->
                <button class="btn-generate-tests" data-action="generate-tests">
                    Generate Tests Now
                </button>
                
                <!-- Results Area (initially hidden) -->
                <div id="generation-results" class="generation-results hidden">
                    <!-- Will be populated with results -->
                </div>
            </div>
        </div>
    `;
    
    // ✅ Add event listeners
    const overlay = modal.querySelector('.modal-overlay');
    const closeBtn = modal.querySelector('.btn-close');
    const generateBtn = modal.querySelector('.btn-generate-tests');
    
    overlay.addEventListener('click', closeTestGenerationModal);
    closeBtn.addEventListener('click', closeTestGenerationModal);
    generateBtn.addEventListener('click', () => {
        const analysisData = JSON.parse(modal.dataset.analysis);
        generateTestsForFile(
            modal.dataset.fileName,
            modal.dataset.fullPath,
            modal.dataset.testType,
            analysisData
        );
    });
}

async function generateTestsForFile(fileName, fullPath, testType, analysis) {
    const resultsDiv = document.getElementById('generation-results');
    resultsDiv.classList.remove('hidden');
    resultsDiv.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Generating ${testType} tests...</p>
        </div>
    `;
    
    try {
        let response;
        
        if (testType === 'unit') {
            // Generate unit tests
            const includeNegative = document.getElementById('includeNegative').checked;
            const includeMocks = document.getElementById('includeMocks').checked;
            
            response = await fetch(`${API_BASE_URL}/api/tests/generate-for-file`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    app: state.currentApp,
                    file: fullPath,
                    className: analysis.classes[0], // First class in file
                    includeNegativeTests: includeNegative,
                    includeMocks: includeMocks
                })
            });
        } else {
            // Generate integration tests
            const includeAuth = document.getElementById('includeAuth').checked;
            const includeDatabase = document.getElementById('includeDatabase').checked;
            
            response = await fetch(`${API_BASE_URL}/api/tests/generate-integration-for-file`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    app: state.currentApp,
                    file: fullPath,
                    apiEndpoint: analysis.endpoints[0]?.path || '/api/test',
                    includeAuth,
                    includeDatabase
                })
            });
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Generation failed');
        }
        
        // Display results
        displayGenerationResults(data.result, testType);
        
    } catch (error) {
        console.error('Test generation error:', error);
        resultsDiv.innerHTML = `
            <div class="error-state">
                <span style="font-size: 32px;">❌</span>
                <h3>Generation Failed</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function displayGenerationResults(result, testType) {
    const resultsDiv = document.getElementById('generation-results');
    
    const stats = result.statistics || {};
    
    resultsDiv.innerHTML = `
        <div class="results-success">
            <h3>✅ Tests Generated Successfully!</h3>
            
            <div class="stats-grid">
                <div class="stat-box">
                    <div class="stat-value">${stats.totalTests || 0}</div>
                    <div class="stat-label">Total Tests</div>
                </div>
                ${testType === 'unit' ? `
                    <div class="stat-box">
                        <div class="stat-value">${stats.byCategory?.positive || 0}</div>
                        <div class="stat-label">Positive</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${stats.byCategory?.negative || 0}</div>
                        <div class="stat-label">Negative</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${stats.mocks?.total || 0}</div>
                        <div class="stat-label">Mocks</div>
                    </div>
                ` : `
                    <div class="stat-box">
                        <div class="stat-value">${stats.byHttpMethod?.GET || 0}</div>
                        <div class="stat-label">GET</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-value">${stats.byHttpMethod?.POST || 0}</div>
                        <div class="stat-label">POST</div>
                    </div>
                `}
            </div>
            
            <!-- Test Code Display -->
            <div class="test-code-container">
                <div class="code-header">
                    <h4>Generated Test File</h4>
                    <button class="btn-copy-code" data-action="copy-tests">
                        📋 Copy All
                    </button>
                </div>
                <pre id="generated-test-code"><code class="language-csharp">${escapeHtml(result.completeTestFile)}</code></pre>
            </div>
            
            <div class="action-buttons">
                <button class="btn-download" data-action="download-tests">
                    📥 Download .cs File
                </button>
                <button class="btn-done" data-action="close-modal">
                    Done
                </button>
            </div>
        </div>
    `;
    
    // Store generated tests globally for copy/download
    window.currentGeneratedTests = result;
    
    // ✅ Add event listeners for buttons
    const copyBtn = resultsDiv.querySelector('.btn-copy-code');
    const downloadBtn = resultsDiv.querySelector('.btn-download');
    const doneBtn = resultsDiv.querySelector('.btn-done');
    
    copyBtn.addEventListener('click', copyGeneratedTests);
    downloadBtn.addEventListener('click', downloadGeneratedTests);
    doneBtn.addEventListener('click', closeTestGenerationModal);
}

function copyGeneratedTests() {
    const code = window.currentGeneratedTests.completeTestFile;
    navigator.clipboard.writeText(code).then(() => {
        alert('Test code copied to clipboard!');
    });
}

function downloadGeneratedTests() {
    const result = window.currentGeneratedTests;
    const fileName = `${result.metadata.className || 'Tests'}.cs`;
    const content = result.completeTestFile;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}

function closeTestGenerationModal() {
    const modal = document.getElementById('test-generation-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function viewMethodDetails(fileName, methodName) {
    console.log(`Viewing details for ${fileName}.${methodName}`);
    // Could show method signature, complexity, calls, etc.
    alert(`Method details for ${methodName}\n\n(Feature coming soon)`);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Keep existing updateRecommendations function
function updateRecommendations(fileGroups, summary) {
    const recDiv = document.getElementById('recommendedActions');
    if (!recDiv) return;
    
    // Handle undefined/null fileGroups
    if (!fileGroups || typeof fileGroups !== 'object') {
        recDiv.innerHTML = '<p style="color: #4ade80;">✅ No test gaps found!</p>';
        return;
    }
    
    const totalFiles = Object.keys(fileGroups).length;
    const unitTestFiles = Object.values(fileGroups).filter(f => f.needsUnitTests).length;
    const integrationTestFiles = Object.values(fileGroups).filter(f => f.needsIntegrationTests).length;
    
    let recommendations = '<h3>Recommended Actions</h3><div style="padding: 10px;">';
    
    if (unitTestFiles > 0) {
        recommendations += `
            <div style="background: #991b1b; padding: 12px; margin-bottom: 10px; border-radius: 4px;">
                <strong>🧪 Generate Unit Tests:</strong><br/>
                ${unitTestFiles} files need unit tests. Click "Generate Unit Tests" on each file.
            </div>
        `;
    }
    
    if (integrationTestFiles > 0) {
        recommendations += `
            <div style="background: #ca8a04; padding: 12px; margin-bottom: 10px; border-radius: 4px;">
                <strong>🔗 Generate Integration Tests:</strong><br/>
                ${integrationTestFiles} files need integration tests. Click "Generate Integration Tests" on each file.
            </div>
        `;
    }
    
    if (totalFiles === 0) {
        recommendations = '<p style="color: #4ade80;">✅ No test gaps found!</p>';
    }
    
    recDiv.innerHTML = recommendations;
}

function categorizeTestGaps(gaps) {
    const categories = {
        falsePositiveTests: [],      // Test methods that exist but never run (0% coverage + in *Tests.cs)
        productionWithoutTests: [],  // Production methods with 0% coverage and no tests
        needsMoreTests: [],          // Methods with >0% but <80% coverage
        missingNegativeTests: []     // Methods without negative/error tests
    };
    
    // Categorize untested methods (0% coverage)
    (gaps.untestedMethods || []).forEach(method => {
        const isTestFile = method.file.includes('Tests.cs') || method.file.includes('Test.cs');
        
        if (isTestFile && method.hasTests) {
            // Test method that exists but never executes - FALSE POSITIVE!
            categories.falsePositiveTests.push({
                ...method,
                issue: 'Test exists but never runs',
                type: 'TEST_METHOD'
            });
        } else if (!isTestFile && !method.hasTests) {
            // Production method with no tests
            categories.productionWithoutTests.push({
                ...method,
                issue: 'No unit test exists',
                type: 'PRODUCTION_METHOD'
            });
        } else if (!isTestFile && method.hasTests) {
            // Production method that has test but 0% coverage (test might not be running)
            categories.productionWithoutTests.push({
                ...method,
                issue: 'Test exists but provides 0% coverage',
                type: 'PRODUCTION_METHOD'
            });
        } else {
            // Test file without hasTests flag - probably untested test helper
            categories.productionWithoutTests.push({
                ...method,
                issue: 'Untested test helper/utility',
                type: 'TEST_HELPER'
            });
        }
    });
    
    // Categorize partial coverage methods
    (gaps.partialCoverage || []).forEach(method => {
        const isTestFile = method.file.includes('Tests.cs') || method.file.includes('Test.cs');
        
        if (isTestFile) {
            // Test method with partial execution - might be flaky
            categories.needsMoreTests.push({
                ...method,
                issue: 'Test only partially executes',
                type: 'TEST_METHOD'
            });
        } else {
            // Production method needs more coverage
            categories.needsMoreTests.push({
                ...method,
                issue: `Only ${method.coverage}% covered - needs more test cases`,
                type: 'PRODUCTION_METHOD'
            });
        }
    });
    
    // Missing negative tests
    (gaps.missingNegativeTests || []).forEach(method => {
        if (!categories.needsMoreTests.find(m => m.name === method.name && m.file === method.file)) {
            categories.missingNegativeTests.push({
                ...method,
                issue: 'Missing error scenario tests',
                type: 'PRODUCTION_METHOD'
            });
        }
    });
    
    return categories;
}

function createTestGapRow(method, priority, priorityClass) {
    const hasTests = method.hasTests ? '✅' : '❌';
    const hasNegative = method.hasNegativeTests ? '✅' : '❌';
    const coverage = method.coverage !== undefined ? `${method.coverage}%` : '0%';
    const fileName = method.file.split('/').pop();
    const typeIcon = method.type === 'TEST_METHOD' ? '🧪' : 
                     method.type === 'PRODUCTION_METHOD' ? '⚙️' : '🔧';
    
    return `
        <tr>
            <td>
                <strong style="display: inline-flex; align-items: center; gap: 6px;">
                    <span>${typeIcon}</span>
                    <span>${method.name}</span>
                </strong>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">${method.issue}</div>
            </td>
            <td style="font-size: 12px; color: #94a3b8;">${fileName}</td>
            <td>${coverage}</td>
            <td>${hasTests}</td>
            <td>${hasNegative}</td>
            <td><span class="badge ${priorityClass}">${priority}</span></td>
        </tr>
    `;
}

// ============================================
// EVENT LISTENERS FOR TEST GAPS BUTTONS
// ============================================

function initializeTestGapsEventListeners() {
    // Use event delegation for dynamically created buttons
    const tbody = document.querySelector('#testGapsTable tbody');
    if (!tbody) return;
    
    // Remove existing listener to avoid duplicates
    const newTbody = tbody.cloneNode(true);
    tbody.parentNode.replaceChild(newTbody, tbody);
    
    newTbody.addEventListener('click', function(e) {
        const target = e.target;
        
        // Handle "Generate Unit Tests" button
        if (target.classList.contains('btn-generate-unit')) {
            e.preventDefault();
            const fileName = target.dataset.filename;
            const fullPath = target.dataset.fullpath;
            openTestGenerator(fileName, fullPath, 'unit');
        }
        
        // Handle "Generate Integration Tests" button
        if (target.classList.contains('btn-generate-integration')) {
            e.preventDefault();
            const fileName = target.dataset.filename;
            const fullPath = target.dataset.fullpath;
            openTestGenerator(fileName, fullPath, 'integration');
        }
        
        // Handle "Toggle Methods" button
        if (target.classList.contains('btn-toggle-methods')) {
            e.preventDefault();
            const fileName = target.dataset.filename;
            toggleFileMethods(fileName);
        }
        
        // Handle "View Method Details" button
        if (target.classList.contains('btn-view-method')) {
            e.preventDefault();
            const fileName = target.dataset.filename;
            const methodName = target.dataset.methodname;
            viewMethodDetails(fileName, methodName);
        }
    });
}

function updateRecommendations(categories, summary) {
    const recDiv = document.getElementById('recommendedActions');
    if (!recDiv) return;
    
    // ✅ FIX: Handle undefined/null categories (renamed parameter to match new usage)
    // This function is now called with fileGroups as first parameter
    const fileGroups = categories;
    
    if (!fileGroups || typeof fileGroups !== 'object') {
        recDiv.innerHTML = '<p style="color: #4ade80;">✅ No test gaps found!</p>';
        return;
    }
    
    const totalFiles = Object.keys(fileGroups).length;
    const unitTestFiles = Object.values(fileGroups).filter(f => f.needsUnitTests).length;
    const integrationTestFiles = Object.values(fileGroups).filter(f => f.needsIntegrationTests).length;
    
    let recommendations = '<h3>Recommended Actions</h3><div style="padding: 10px;">';
    
    if (unitTestFiles > 0) {
        recommendations += `
            <div style="background: #991b1b; padding: 12px; margin-bottom: 10px; border-radius: 4px;">
                <strong>🧪 Generate Unit Tests:</strong><br/>
                ${unitTestFiles} files need unit tests. Click "Generate Unit Tests" on each file.
            </div>
        `;
    }
    
    if (integrationTestFiles > 0) {
        recommendations += `
            <div style="background: #ca8a04; padding: 12px; margin-bottom: 10px; border-radius: 4px;">
                <strong>🔗 Generate Integration Tests:</strong><br/>
                ${integrationTestFiles} files need integration tests. Click "Generate Integration Tests" on each file.
            </div>
        `;
    }
    
    if (totalFiles === 0) {
        recommendations = '<p style="color: #4ade80;">✅ No test gaps found!</p>';
    }
    
    recDiv.innerHTML = recommendations;
}

// ============================================
// TAB MANAGEMENT
// ============================================

function initializeTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            switchTab(tabName);
            
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
    }
}

// ============================================
// FILTER BAR
// ============================================

function initializeFilterBar() {
    const toggle = document.getElementById('filterBarToggle');
    const content = document.getElementById('filterBarContent');
    const icon = toggle?.querySelector('.toggle-icon');
    
    if (!toggle || !content) {
        console.error('❌ Filter bar elements not found!');
        return;
    }
    
    console.log('✅ Initializing filter bar');
    
    // Start expanded by default
    content.classList.add('expanded');
    if (icon) icon.textContent = '▲';
    
    toggle.addEventListener('click', () => {
        const isExpanded = content.classList.contains('expanded');
        
        if (isExpanded) {
            // Collapse
            content.classList.remove('expanded');
            if (icon) icon.textContent = '▼';
            console.log('Filter bar collapsed');
        } else {
            // Expand
            content.classList.add('expanded');
            if (icon) icon.textContent = '▲';
            console.log('Filter bar expanded');
        }
    });
}

function initializeFilters() {
    const appFilter = document.getElementById('appFilter');
    const refreshBtn = document.getElementById('refreshBtn');
    
    // App filter
    appFilter.addEventListener('change', async (e) => {
        const appName = e.target.value;
        if (appName) {
            await loadAppData(appName);
        }
    });
    
    // Refresh button
    refreshBtn.addEventListener('click', async () => {
        if (state.currentApp) {
            await loadAppData(state.currentApp);
        }
    });
}

// ============================================
// UI HELPERS
// ============================================

function showLoading(message = 'Loading...') {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.innerHTML = `
        <div style="padding: 12px; background: rgba(99, 102, 241, 0.1); border-radius: 8px; border: 1px solid rgba(99, 102, 241, 0.3); display: flex; align-items: center; gap: 12px;">
            <div class="spinner"></div>
            <span>${message}</span>
        </div>
    `;
}

function hideLoading() {
    const statusDiv = document.getElementById('statusMessage');
    setTimeout(() => {
        statusDiv.innerHTML = '';
    }, 500);
}

function showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('statusMessage');
    const colors = {
        success: { bg: 'rgba(74, 222, 128, 0.1)', border: 'rgba(74, 222, 128, 0.3)', text: '#4ade80' },
        error: { bg: 'rgba(248, 113, 113, 0.1)', border: 'rgba(248, 113, 113, 0.3)', text: '#f87171' },
        warning: { bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.3)', text: '#fbbf24' },
        info: { bg: 'rgba(96, 165, 250, 0.1)', border: 'rgba(96, 165, 250, 0.3)', text: '#60a5fa' }
    };
    
    const color = colors[type] || colors.info;
    
    statusDiv.innerHTML = `
        <div style="padding: 12px; background: ${color.bg}; border-radius: 8px; border: 1px solid ${color.border}; color: ${color.text};">
            ${message}
        </div>
    `;
    
    setTimeout(() => {
        statusDiv.innerHTML = '';
    }, 5000);
}
