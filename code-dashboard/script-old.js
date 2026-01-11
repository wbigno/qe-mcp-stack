// Code Analysis Dashboard - Complete Data Mapping
// All data from API properly displayed in UI

const API_BASE_URL = window.location.origin || 'http://localhost:3000';

// Import model selector
import { modelSelector } from './modelSelector.js';

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
        coverage: '',
        gapType: ''
    },
    categorizedGaps: null, // Store categorized test gaps for filtering
    isLoading: false
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing Code Analysis Dashboard');

    // Initialize model selector
    modelSelector.initialize();

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
            <option value="App1">Application 1 - Core (net10.0)</option>
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
    const methodsWithCoverage = allMethods.filter(m => m.coverage !== null && m.coverage !== undefined);
    const methodsWithTests = allMethods.filter(m => m.hasTests);

    // Calculate percentages
    const lineCoveragePercent = testGaps.summary?.coveragePercentage || 0;
    const methodCoveragePercent = totalMethods > 0 ? Math.round((methodsWithTests.length / totalMethods) * 100) : 0;

    // Branch coverage and lines covered require actual XML data
    const hasCoverageData = methodsWithCoverage.length > 0;
    const branchCoverageDisplay = hasCoverageData ? '0' : 'N/A'; // We don't parse branch coverage from XML yet
    const linesCoveredDisplay = hasCoverageData ? methodsWithCoverage.length : 'N/A'; // Approximation

    // Update stats
    document.getElementById('lineCoverage').textContent = `${lineCoveragePercent}%`;
    document.getElementById('branchCoverage').textContent = branchCoverageDisplay;
    document.getElementById('methodCoverage').textContent = `${methodCoveragePercent}%`;
    document.getElementById('linesCovered').textContent = linesCoveredDisplay;
    
    // Update table with METHOD-level coverage
    const tbody = document.querySelector('#coverageTable tbody');
    
    if (allMethods.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #94a3b8;">No coverage data available</td></tr>';
        return;
    }
    
    // Sort by coverage (lowest first, nulls at end)
    allMethods.sort((a, b) => {
        if (a.coverage === null) return 1;
        if (b.coverage === null) return -1;
        return a.coverage - b.coverage;
    });

    tbody.innerHTML = allMethods.map(method => {
        const cov = method.coverage;
        const covDisplay = cov !== null ? `${cov}%` : 'N/A';
        const status = cov === null ? 'NO DATA' : (cov >= 80 ? 'GOOD' : cov > 0 ? 'PARTIAL' : 'UNTESTED');
        const statusClass = cov === null ? 'badge-medium' : (cov >= 80 ? 'badge-low' : cov > 0 ? 'badge-medium' : 'badge-high');
        const fileName = method.file.split('/').pop();

        return `
            <tr>
                <td><strong>${method.name}</strong></td>
                <td style="font-size: 12px; color: #94a3b8;">${fileName}</td>
                <td>${covDisplay}</td>
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

    // Get methods from analysis
    const methods = analysis.methods || [];

    if (methods.length === 0) {
        // No methods to analyze
        document.getElementById('avgComplexity').textContent = '0.0';
        document.getElementById('lowComplexity').textContent = '0';
        document.getElementById('mediumComplexity').textContent = '0';
        document.getElementById('highComplexityCount').textContent = '0';

        const tbody = document.querySelector('#complexityTable tbody');
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #94a3b8;">No methods found for complexity analysis.</td></tr>';
        return;
    }

    // Group methods by file and calculate complexity stats per file
    const fileComplexityMap = {};

    for (const method of methods) {
        const file = method.file || 'Unknown';
        const complexity = method.complexity || 1;

        if (!fileComplexityMap[file]) {
            fileComplexityMap[file] = {
                file: file,
                complexities: [],
                methods: []
            };
        }

        fileComplexityMap[file].complexities.push(complexity);
        fileComplexityMap[file].methods.push({
            name: method.name,
            complexity: complexity,
            className: method.className
        });
    }

    // Calculate avg and max complexity per file
    const fileStats = Object.values(fileComplexityMap).map(fileData => {
        const complexities = fileData.complexities;
        const avgComplexity = complexities.reduce((sum, c) => sum + c, 0) / complexities.length;
        const maxComplexity = Math.max(...complexities);

        return {
            file: fileData.file,
            avgComplexity: avgComplexity,
            maxComplexity: maxComplexity,
            methodCount: fileData.methods.length,
            methods: fileData.methods
        };
    });

    // Calculate overall stats
    const allComplexities = methods.map(m => m.complexity || 1);
    const overallAvg = allComplexities.reduce((sum, c) => sum + c, 0) / allComplexities.length;

    // Categorize by complexity levels
    const lowComplexity = fileStats.filter(f => f.avgComplexity < 5);
    const mediumComplexity = fileStats.filter(f => f.avgComplexity >= 5 && f.avgComplexity <= 10);
    const highComplexity = fileStats.filter(f => f.avgComplexity > 10);

    // Update stat cards
    document.getElementById('avgComplexity').textContent = overallAvg.toFixed(1);
    document.getElementById('lowComplexity').textContent = lowComplexity.length;
    document.getElementById('mediumComplexity').textContent = mediumComplexity.length;
    document.getElementById('highComplexityCount').textContent = highComplexity.length;

    // Update table with high complexity files only
    const tbody = document.querySelector('#complexityTable tbody');

    if (highComplexity.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #94a3b8;">✅ No high complexity files found! All files have low or medium complexity.</td></tr>';
        return;
    }

    // Sort by avgComplexity descending (worst first)
    highComplexity.sort((a, b) => b.avgComplexity - a.avgComplexity);

    // Build table rows
    tbody.innerHTML = highComplexity.map(file => {
        // Determine severity level
        let severity, severityClass;
        if (file.avgComplexity > 20) {
            severity = '🔴 Critical';
            severityClass = 'badge-danger';
        } else if (file.avgComplexity > 15) {
            severity = '🟠 High';
            severityClass = 'badge-warning';
        } else {
            severity = '🟡 Moderate';
            severityClass = 'badge-info';
        }

        // Shorten file path for display
        const fileName = file.file.split('/').pop() || file.file;
        const filePath = file.file.replace(/\\/g, '/');

        return `
            <tr class="clickable-row" data-file="${file.file}">
                <td>
                    <strong>${fileName}</strong>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">${filePath}</div>
                </td>
                <td><strong style="color: #f59e0b;">${file.avgComplexity.toFixed(1)}</strong></td>
                <td><strong style="color: #ef4444;">${file.maxComplexity}</strong></td>
                <td>${file.methodCount} methods</td>
                <td><span class="badge ${severityClass}">${severity}</span></td>
            </tr>
        `;
    }).join('');

    // Add click handlers to show method details
    tbody.querySelectorAll('tr.clickable-row').forEach(row => {
        row.addEventListener('click', () => {
            const filePath = row.getAttribute('data-file');
            const fileData = highComplexity.find(f => f.file === filePath);
            showComplexityMethodDetails(fileData);
        });
    });

    console.log('📊 COMPLEXITY TAB UPDATED:');
    console.log('  Total methods:', methods.length);
    console.log('  Overall avg complexity:', overallAvg.toFixed(1));
    console.log('  Low complexity files:', lowComplexity.length);
    console.log('  Medium complexity files:', mediumComplexity.length);
    console.log('  High complexity files:', highComplexity.length);
}

// Show detailed method complexity breakdown for a file
function showComplexityMethodDetails(fileData) {
    // Sort methods by complexity descending
    const sortedMethods = [...fileData.methods].sort((a, b) => b.complexity - a.complexity);

    const methodsList = sortedMethods.map(method => {
        let complexityBadge, complexityClass;
        if (method.complexity > 10) {
            complexityBadge = 'High';
            complexityClass = 'badge-danger';
        } else if (method.complexity >= 5) {
            complexityBadge = 'Medium';
            complexityClass = 'badge-warning';
        } else {
            complexityBadge = 'Low';
            complexityClass = 'badge-success';
        }

        return `
            <div style="padding: 10px; border-bottom: 1px solid #2d3748; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong>${method.name}</strong>
                    ${method.className ? `<span style="color: #94a3b8; margin-left: 8px;">(${method.className})</span>` : ''}
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <span style="color: #f59e0b; font-weight: bold;">Complexity: ${method.complexity}</span>
                    <span class="badge ${complexityClass}">${complexityBadge}</span>
                </div>
            </div>
        `;
    }).join('');

    const modal = document.getElementById('complexityDetailsModal');
    if (!modal) {
        // Create modal if it doesn't exist
        const modalHTML = `
            <div id="complexityDetailsModal" class="modal" style="display: none;">
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3 id="complexityDetailsTitle">Method Complexity Details</h3>
                        <span class="close" onclick="document.getElementById('complexityDetailsModal').style.display='none'">&times;</span>
                    </div>
                    <div id="complexityDetailsContent" style="max-height: 500px; overflow-y: auto;"></div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    const fileName = fileData.file.split('/').pop() || fileData.file;
    document.getElementById('complexityDetailsTitle').textContent = `Method Complexity: ${fileName}`;
    document.getElementById('complexityDetailsContent').innerHTML = `
        <div style="padding: 15px; background: #1a202c; border-radius: 8px; margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-around; text-align: center;">
                <div>
                    <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${fileData.avgComplexity.toFixed(1)}</div>
                    <div style="color: #94a3b8; font-size: 12px;">Average</div>
                </div>
                <div>
                    <div style="font-size: 24px; font-weight: bold; color: #ef4444;">${fileData.maxComplexity}</div>
                    <div style="color: #94a3b8; font-size: 12px;">Maximum</div>
                </div>
                <div>
                    <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${fileData.methodCount}</div>
                    <div style="color: #94a3b8; font-size: 12px;">Methods</div>
                </div>
            </div>
        </div>
        <h4 style="margin: 20px 0 10px 0; color: #e2e8f0;">Methods (sorted by complexity)</h4>
        <div style="border: 1px solid #2d3748; border-radius: 8px; overflow: hidden;">
            ${methodsList}
        </div>
    `;

    document.getElementById('complexityDetailsModal').style.display = 'block';
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

    // ✅ NEW: Categorize test gaps to identify false positives
    const categorizedGaps = categorizeTestGaps(gaps);
    console.log('  🔍 Categorized gaps:', {
        falsePositives: categorizedGaps.falsePositiveTests.length,
        productionWithoutTests: categorizedGaps.productionWithoutTests.length,
        needsMoreTests: categorizedGaps.needsMoreTests.length,
        missingNegativeTests: categorizedGaps.missingNegativeTests.length
    });

    // ✅ DEBUG: Log some false positive examples
    if (categorizedGaps.falsePositiveTests.length > 0) {
        console.log('  🚨 FALSE POSITIVE EXAMPLES:');
        categorizedGaps.falsePositiveTests.slice(0, 3).forEach(fp => {
            console.log(`    - ${fp.name} in ${fp.file} (isTest=${fp.isTest})`);
        });
    } else {
        console.log('  ℹ️ No false positives detected in current data');
        console.log('  📊 Gap sources:', {
            untested: gaps.untestedMethods?.length || 0,
            partial: gaps.partialCoverage?.length || 0,
            missingNegative: gaps.missingNegativeTests?.length || 0
        });
    }

    // Store categorized gaps in state for filtering
    state.categorizedGaps = categorizedGaps;

    // Categorize methods by FILE (not just by gap type)
    let fileGroups = categorizeByFile(gaps, categorizedGaps);

    console.log('  📊 Files with gaps (before filters):', Object.keys(fileGroups).length);

    // Apply complexity and coverage filters
    fileGroups = applyFiltersToFileGroups(fileGroups);

    console.log('  📊 Files with gaps (after filters):', Object.keys(fileGroups).length);
    if (state.filters.complexity) {
        console.log('  🔍 Complexity filter:', state.filters.complexity);
    }
    if (state.filters.coverage) {
        console.log('  🔍 Coverage filter:', state.filters.coverage);
    }
    
    // Update stats
    const totalMethodsCount = summary.totalMethods || 0;
    const untestedFilesCount = Object.keys(fileGroups).length;
    const untestedMethodsCount = gaps.untestedMethods?.length || 0;
    const untestedPercent = totalMethodsCount > 0 ? Math.round((untestedMethodsCount / totalMethodsCount) * 100) : 0;
    const falsePositiveCount = categorizedGaps.falsePositiveTests.length;

    document.getElementById('totalMethods').textContent = totalMethodsCount;
    document.getElementById('untestedMethods').textContent = untestedFilesCount;
    document.getElementById('untestedLabel').textContent = `Untested (${untestedPercent}%)`;
    document.getElementById('partialCoverage').textContent = gaps.partialCoverage?.length || 0;
    document.getElementById('missingNegativeTests').textContent = gaps.missingNegativeTests?.length || 0;

    // ✅ NEW: Update false positive count if element exists
    const falsePositiveEl = document.getElementById('falsePositiveTests');
    if (falsePositiveEl) {
        falsePositiveEl.textContent = falsePositiveCount;
    }
    
    // Build file-grouped display
    const tbody = document.querySelector('#testGapsTable tbody');

    let html = '';

    // ✅ Sort files alphabetically for easier navigation
    const sortedFiles = Object.entries(fileGroups).sort((a, b) =>
        a[0].localeCompare(b[0])
    );

    // Group by files
    sortedFiles.forEach(([fileName, fileData]) => {
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

// ============================================
// PRIORITY SCORING ALGORITHM
// ============================================

/**
 * Multi-factor priority scoring algorithm
 * Calculates priority based on 5 weighted factors
 */
function calculatePriorityScore(method, fileType) {
    let score = 0;
    const breakdown = {
        coverage: 0,
        complexity: 0,
        visibility: 0,
        fileType: 0,
        callFrequency: 0
    };

    // Factor 1: Test Coverage Status (40% weight)
    if (!method.hasTests) {
        breakdown.coverage = 40; // No tests at all = URGENT
    } else if (method.hasTests && !method.hasNegativeTests) {
        breakdown.coverage = 20; // Has positive but no negative = IMPORTANT
    } else {
        breakdown.coverage = 0; // Fully covered
    }

    // Factor 2: Method Complexity (25% weight)
    const complexity = method.complexity || 1;
    if (complexity > 10) {
        breakdown.complexity = 25; // High complexity
    } else if (complexity >= 5) {
        breakdown.complexity = 15; // Medium complexity
    } else {
        breakdown.complexity = 5; // Low complexity
    }

    // Factor 3: Visibility/Access Level (20% weight)
    // Infer visibility from method name or default to public for production code
    const isPublic = method.isPublic !== false; // Default to true if not specified
    if (isPublic) {
        breakdown.visibility = 20; // Public methods
    } else {
        breakdown.visibility = 5; // Private/internal
    }

    // Factor 4: File Type/Role (10% weight)
    const fType = method.fileType || fileType || detectFileTypeFromPath(method.file);
    const fileTypeScores = {
        'Controller': 10,
        'Service': 8,
        'Repository': 8,
        'Utility': 5,
        'Model': 2,
        'Other': 3
    };
    breakdown.fileType = fileTypeScores[fType] || 3;

    // Factor 5: Call Frequency (5% weight) - placeholder for future
    // For now, use default value since we don't have call graph data
    breakdown.callFrequency = 0;

    // Calculate total score
    score = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

    // Map score to priority level
    let priority;
    if (score >= 70) {
        priority = 'CRITICAL';
    } else if (score >= 50) {
        priority = 'HIGH';
    } else if (score >= 30) {
        priority = 'MEDIUM';
    } else {
        priority = 'LOW';
    }

    return {
        score,
        priority,
        breakdown
    };
}

/**
 * Detect file type from path
 */
function detectFileTypeFromPath(filePath) {
    if (!filePath) return 'Other';
    const lower = filePath.toLowerCase();

    if (lower.includes('controller')) return 'Controller';
    if (lower.includes('service')) return 'Service';
    if (lower.includes('repository')) return 'Repository';
    if (lower.includes('helper') || lower.includes('util')) return 'Utility';
    if (lower.includes('model') || lower.includes('dto')) return 'Model';

    return 'Other';
}

/**
 * Comprehensive test file detection
 * Filters out test files that should NEVER appear in coverage gaps
 */
function isTestFile(filePath) {
    if (!filePath) return false;

    const lowerPath = filePath.toLowerCase();
    const fileName = filePath.split('/').pop().toLowerCase();

    // Filename patterns (case insensitive)
    const testFilePatterns = [
        'test.cs',
        'tests.cs',
        '_test.cs',
        '_tests.cs',
        '.test.cs',
        '.tests.cs'
    ];

    if (testFilePatterns.some(pattern => fileName.endsWith(pattern))) {
        return true;
    }

    // Directory patterns (case insensitive)
    const testDirectoryPatterns = [
        '/test/',
        '/tests/',
        '/__tests__/',
        '/testing/',
        '/testproject/'
    ];

    if (testDirectoryPatterns.some(pattern => lowerPath.includes(pattern))) {
        return true;
    }

    return false;
}

/**
 * Apply complexity and coverage threshold filters to file groups
 * Filters methods within each file and removes files with no remaining methods
 */
function applyFiltersToFileGroups(fileGroups) {
    const complexityFilter = state.filters.complexity;
    const coverageFilter = state.filters.coverage;
    const gapTypeFilter = state.filters.gapType;

    // If no filters applied, return original data
    if (!complexityFilter && !coverageFilter && !gapTypeFilter) {
        return fileGroups;
    }

    const filteredGroups = {};

    Object.entries(fileGroups).forEach(([fileName, fileData]) => {
        // Filter methods based on complexity, coverage, and gap type
        const filteredMethods = fileData.methods.filter(method => {
            // ✅ NEW: Apply gap type filter using categorizedGaps
            if (gapTypeFilter && state.categorizedGaps) {
                const isInCategory = (() => {
                    switch (gapTypeFilter) {
                        case 'false-positive':
                            return state.categorizedGaps.falsePositiveTests.some(
                                m => m.name === method.name && m.file === method.file
                            );
                        case 'no-tests':
                            return state.categorizedGaps.productionWithoutTests.some(
                                m => m.name === method.name && m.file === method.file
                            );
                        case 'partial':
                            return state.categorizedGaps.needsMoreTests.some(
                                m => m.name === method.name && m.file === method.file
                            );
                        case 'no-negative':
                            return state.categorizedGaps.missingNegativeTests.some(
                                m => m.name === method.name && m.file === method.file
                            );
                        default:
                            return true;
                    }
                })();

                if (!isInCategory) return false;
            }

            // Apply complexity filter
            if (complexityFilter) {
                const complexity = method.complexity || 1;

                switch (complexityFilter) {
                    case 'low':
                        if (complexity >= 5) return false;
                        break;
                    case 'medium':
                        if (complexity < 5 || complexity > 10) return false;
                        break;
                    case 'high':
                        if (complexity <= 10) return false;
                        break;
                }
            }

            // Apply coverage threshold filter
            if (coverageFilter) {
                const coverage = method.coverage;

                // Note: coverage can be null (no coverage data), 0 (no coverage), or 1-100 (percentage)
                switch (coverageFilter) {
                    case 'high':
                        // ≥ 80%
                        if (coverage === null || coverage < 80) return false;
                        break;
                    case 'medium':
                        // 50-80%
                        if (coverage === null || coverage < 50 || coverage >= 80) return false;
                        break;
                    case 'low':
                        // < 50% (includes null and 0)
                        if (coverage !== null && coverage >= 50) return false;
                        break;
                }
            }

            return true;
        });

        // Only include file if it has remaining methods after filtering
        if (filteredMethods.length > 0) {
            // Recalculate counts based on filtered methods
            const untestedCount = filteredMethods.filter(m => m.gapType === 'UNTESTED').length;
            const partialCount = filteredMethods.filter(m => m.gapType === 'PARTIAL').length;
            const negativeTestCount = filteredMethods.filter(m => m.gapType === 'MISSING_NEGATIVE').length;

            filteredGroups[fileName] = {
                ...fileData,
                methods: filteredMethods,
                untestedCount,
                partialCount,
                negativeTestCount,
                totalGaps: filteredMethods.length
            };
        }
    });

    return filteredGroups;
}

function categorizeByFile(gaps, categorizedGaps) {
    const fileGroups = {};

    // ✅ FIX: Handle undefined gaps
    if (!gaps) return fileGroups;

    // ✅ FIX: Use safe defaults for arrays
    const untestedMethods = gaps.untestedMethods || [];
    const partialCoverage = gaps.partialCoverage || [];
    const falsePositiveTests = categorizedGaps?.falsePositiveTests || [];
    
    // Process all untested methods
    untestedMethods.forEach(method => {
        // ✅ FIX: Skip invalid methods
        if (!method || !method.file) return;

        // ✅ ENHANCED: Comprehensive test file filtering
        if (isTestFile(method.file)) {
            return;
        }

        const fileName = method.file.split('/').pop();
        
        if (!fileGroups[fileName]) {
            fileGroups[fileName] = {
                fullPath: method.file,
                fileName: fileName,
                methods: [],
                needsUnitTests: false,
                needsIntegrationTests: false,
                needsNegativeTests: false,
                untestedCount: 0,
                partialCount: 0,
                negativeTestCount: 0,
                falsePositiveCount: 0,
                totalGaps: 0
            };
        }

        // ✅ Calculate priority score
        const priorityData = calculatePriorityScore(method);

        fileGroups[fileName].methods.push({
            ...method,
            gapType: 'UNTESTED',
            priority: priorityData.priority,
            priorityScore: priorityData.score,
            priorityBreakdown: priorityData.breakdown
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

        // ✅ ENHANCED: Comprehensive test file filtering
        if (isTestFile(method.file)) {
            return;
        }

        const fileName = method.file.split('/').pop();

        if (!fileGroups[fileName]) {
            fileGroups[fileName] = {
                fullPath: method.file,
                fileName: fileName,
                methods: [],
                needsUnitTests: false,
                needsIntegrationTests: false,
                needsNegativeTests: false,
                untestedCount: 0,
                partialCount: 0,
                negativeTestCount: 0,
                falsePositiveCount: 0,
                totalGaps: 0
            };
        }

        // ✅ Calculate priority score
        const priorityData = calculatePriorityScore(method);

        fileGroups[fileName].methods.push({
            ...method,
            gapType: 'PARTIAL',
            priority: priorityData.priority,
            priorityScore: priorityData.score,
            priorityBreakdown: priorityData.breakdown
        });
        fileGroups[fileName].partialCount++;
        fileGroups[fileName].totalGaps++;
        
        detectTestTypeNeeds(fileGroups[fileName], method);
    });

    // ✅ Process methods missing negative tests
    const missingNegativeTests = gaps.missingNegativeTests || [];
    missingNegativeTests.forEach(method => {
        // ✅ FIX: Skip invalid methods
        if (!method || !method.file) return;

        // ✅ ENHANCED: Comprehensive test file filtering
        if (isTestFile(method.file)) {
            return;
        }

        const fileName = method.file.split('/').pop();

        if (!fileGroups[fileName]) {
            fileGroups[fileName] = {
                fullPath: method.file,
                fileName: fileName,
                methods: [],
                needsUnitTests: false,
                needsIntegrationTests: false,
                needsNegativeTests: false,
                untestedCount: 0,
                partialCount: 0,
                negativeTestCount: 0,
                falsePositiveCount: 0,
                totalGaps: 0
            };
        }

        // ✅ Calculate priority score
        const priorityData = calculatePriorityScore(method);

        fileGroups[fileName].methods.push({
            ...method,
            gapType: 'MISSING_NEGATIVE',
            priority: priorityData.priority,
            priorityScore: priorityData.score,
            priorityBreakdown: priorityData.breakdown
        });
        fileGroups[fileName].negativeTestCount = (fileGroups[fileName].negativeTestCount || 0) + 1;
        fileGroups[fileName].totalGaps++;

        detectTestTypeNeeds(fileGroups[fileName], method);
    });

    // ✅ NEW: Count false positives per file
    // Note: False positives are already included in untestedMethods or missingNegativeTests
    // We need to count how many methods in each file group are false positives
    // IMPORTANT: Match by FULL PATH, not just filename, to avoid counting test file methods
    // against production files with the same name
    Object.keys(fileGroups).forEach(fileName => {
        const fileGroup = fileGroups[fileName];
        const fullPath = fileGroup.fullPath;

        // Count how many of THIS file's methods are false positives
        fileGroup.falsePositiveCount = falsePositiveTests.filter(fp =>
            fp.file === fullPath
        ).length;
    });

    return fileGroups;
}

/**
 * Smart button logic - shows ONLY ONE appropriate button per file
 * Priority: Untested > Negative Tests > Integration Tests > Fully Covered
 */
function getFileActionButtons(fileData, safeFileName, safeFullPath) {
    let buttons = '';

    // Priority 1: If file has any untested methods, show "Generate Unit Tests" ONLY
    if (fileData.untestedCount > 0) {
        buttons += `
            <button class="btn-generate-unit"
                    data-filename="${safeFileName}"
                    data-fullpath="${safeFullPath}">
                🧪 Generate Unit Tests
            </button>
        `;
    }
    // Priority 2: Else if file ONLY has methods missing negative tests
    else if (fileData.negativeTestCount > 0 && fileData.untestedCount === 0) {
        buttons += `
            <button class="btn-generate-negative"
                    data-filename="${safeFileName}"
                    data-fullpath="${safeFullPath}">
                ❌ Generate Negative Tests
            </button>
        `;
    }
    // Priority 3: Else if file needs integration tests
    else if (fileData.needsIntegrationTests) {
        buttons += `
            <button class="btn-generate-integration"
                    data-filename="${safeFileName}"
                    data-fullpath="${safeFullPath}">
                🔗 Generate Integration Tests
            </button>
        `;
    }
    // Else: Fully covered
    else {
        buttons += `<span style="color: #4ade80; font-weight: 500;">✅ Fully Covered</span>`;
    }

    return buttons;
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

    // ✅ NEW: Detect if file needs negative tests
    // File needs negative tests if methods have tests but are missing negative test coverage
    if (method.hasTests && !method.hasNegativeTests) {
        fileData.needsNegativeTests = true;
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
                            ${fileData.totalGaps} gaps (${fileData.untestedCount || 0} untested, ${fileData.partialCount || 0} partial, ${fileData.negativeTestCount || 0} missing negative${fileData.falsePositiveCount > 0 ? `, ${fileData.falsePositiveCount} false positive` : ''})
                        </span>
                        <span class="test-needs">${needsIcon} ${needsText}</span>
                    </div>
                    <div class="file-actions">
                        ${getFileActionButtons(fileData, safeFileName, safeFullPath)}
                        <button class="btn-toggle-methods" data-filename="${safeFileName}">
                            ▼ Show Methods
                        </button>
                    </div>
                </div>
            </td>
        </tr>
    `;
    
    // ✅ Group methods by className for multi-class file support
    const methodsByClass = {};
    fileData.methods.forEach(method => {
        const className = method.className || 'Unknown';
        if (!methodsByClass[className]) {
            methodsByClass[className] = [];
        }
        methodsByClass[className].push(method);
    });

    const classNames = Object.keys(methodsByClass).sort();
    const hasMultipleClasses = classNames.length > 1;

    // Add methods (initially hidden)
    html += `
        <tr class="file-methods-group hidden" data-file="${fileName}">
            <td colspan="6">
    `;

    // Loop through each class
    classNames.forEach((className, classIndex) => {
        const classMethods = methodsByClass[className];

        // ✅ Show class header if file has multiple classes
        if (hasMultipleClasses) {
            html += `
                <div class="class-header">
                    <span class="class-name">📦 Class: ${className}</span>
                    <span class="class-method-count">${classMethods.length} method${classMethods.length !== 1 ? 's' : ''}</span>
                </div>
            `;
        }

        // Methods table for this class
        html += `
                <table class="methods-table ${hasMultipleClasses ? 'class-methods-table' : ''}">
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

        classMethods.forEach(method => {
            const safeMethodName = method.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const covDisplay = method.coverage !== null ? `${method.coverage}%` : 'N/A';
            html += `
                <tr>
                    <td><strong>${method.name}</strong></td>
                    <td>${covDisplay}</td>
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
        `;
    });

    html += `
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
                    <h2>${testType === 'unit' ? '🧪 Generate Unit' : testType === 'negative' ? '❌ Generate Negative' : '🔗 Generate Integration'} Tests</h2>
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
                    ` : testType === 'negative' ? `
                        <label>
                            <input type="checkbox" id="includeMocks" checked />
                            Generate mocks (Moq)
                        </label>
                        <p class="info-text">⚠️ This will generate ONLY negative/error scenario tests (null checks, invalid inputs, exceptions)</p>
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

        if (testType === 'unit' || testType === 'negative') {
            // Generate unit tests or negative tests
            const includeNegative = document.getElementById('includeNegative')?.checked ?? true;
            const includeMocks = document.getElementById('includeMocks').checked;
            const { model } = modelSelector.getSelection();

            // ✅ Get className from classes array, or fallback to method's className, or extract from filename
            const className = analysis.classes[0] ||
                             analysis.methods[0]?.className ||
                             fileName.replace(/\.(aspx\.)?cs$/, '').replace(/\./g, '');

            if (!className) {
                throw new Error('Could not determine class name for test generation. File may not contain any classes.');
            }

            response = await fetch(`${API_BASE_URL}/api/tests/generate-for-file`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    app: state.currentApp,
                    file: fullPath,
                    className: className, // ✅ First class, or method's class, or filename
                    includeNegativeTests: includeNegative,
                    includeMocks: includeMocks,
                    onlyNegativeTests: testType === 'negative', // ✅ NEW: Only generate negative tests
                    model
                })
            });
        } else {
            // Generate integration tests
            const includeAuth = document.getElementById('includeAuth').checked;
            const includeDatabase = document.getElementById('includeDatabase').checked;
            const { model } = modelSelector.getSelection();

            response = await fetch(`${API_BASE_URL}/api/tests/generate-integration-for-file`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    app: state.currentApp,
                    file: fullPath,
                    apiEndpoint: analysis.endpoints[0]?.path || '/api/test',
                    includeAuth,
                    includeDatabase,
                    model
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

    // Find the method in the current test gaps data
    const testGapsData = state.data.testGaps;
    if (!testGapsData || !testGapsData.gaps) {
        alert('Method details not available');
        return;
    }

    // Search through all methods in gaps
    let methodData = null;
    const allMethods = [
        ...(testGapsData.gaps.untestedMethods || []),
        ...(testGapsData.gaps.partialCoverage || []),
        ...(testGapsData.gaps.falsePositiveTests || [])
    ];

    methodData = allMethods.find(m =>
        m.name === methodName && m.file && m.file.includes(fileName)
    );

    if (!methodData) {
        alert(`Method ${methodName} details not found`);
        return;
    }

    // Build detailed modal
    const modal = document.createElement('div');
    modal.className = 'ai-modal show';
    modal.innerHTML = `
        <div class="ai-modal-overlay" id="methodDetailsOverlay"></div>
        <div class="ai-modal-content" style="max-width: 700px;">
            <div class="ai-modal-header">
                <h2>📊 Method Details</h2>
                <p style="font-family: monospace; color: #94a3b8;">${fileName}.${methodName}()</p>
            </div>

            <div class="ai-modal-body">
                <div style="display: grid; gap: 15px;">
                    <div class="detail-row">
                        <strong>File Path:</strong>
                        <div style="font-family: monospace; font-size: 12px; color: #94a3b8; margin-top: 5px;">
                            ${methodData.file || 'N/A'}
                        </div>
                    </div>

                    <div class="detail-row">
                        <strong>Coverage:</strong>
                        <div style="margin-top: 5px;">
                            ${methodData.coverage !== null && methodData.coverage !== undefined ? `${methodData.coverage}%` : 'N/A'}
                        </div>
                    </div>

                    <div class="detail-row">
                        <strong>Test Status:</strong>
                        <div style="margin-top: 5px;">
                            <span style="margin-right: 15px;">
                                Has Tests: ${methodData.hasTests ? '✅ Yes' : '❌ No'}
                            </span>
                            <span>
                                Has Negative Tests: ${methodData.hasNegativeTests ? '✅ Yes' : '❌ No'}
                            </span>
                        </div>
                    </div>

                    ${methodData.calls && methodData.calls.length > 0 ? `
                        <div class="detail-row">
                            <strong>Method Calls (${methodData.calls.length}):</strong>
                            <div style="margin-top: 5px; max-height: 150px; overflow-y: auto;">
                                <ul style="font-family: monospace; font-size: 12px; color: #94a3b8;">
                                    ${methodData.calls.map(call => `<li>${escapeHtml(call)}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    ` : ''}

                    ${methodData.complexity !== undefined ? `
                        <div class="detail-row">
                            <strong>Complexity:</strong>
                            <div style="margin-top: 5px;">
                                ${methodData.complexity}
                            </div>
                        </div>
                    ` : ''}

                    ${methodData.lineCount !== undefined ? `
                        <div class="detail-row">
                            <strong>Line Count:</strong>
                            <div style="margin-top: 5px;">
                                ${methodData.lineCount} lines
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>

            <div class="ai-modal-footer">
                <button id="closeMethodDetailsBtn" class="btn btn-primary">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Add close handlers
    document.getElementById('closeMethodDetailsBtn').addEventListener('click', () => {
        modal.remove();
    });

    document.getElementById('methodDetailsOverlay').addEventListener('click', () => {
        modal.remove();
    });

    // ESC key handler
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
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
        // ✅ IMPROVED: Check if method itself is a test method (has [Test]/[Fact]/[Theory]/[TestMethod] attribute)
        // This works regardless of filename - catches tests in any file
        const isTestMethod = method.isTest === true;

        // Fallback to filename check if isTest flag not available (backwards compatibility)
        // ✅ FIX: Check if "test" appears ANYWHERE in filename (case insensitive)
        const fileName = method.file.toLowerCase();
        const isTestFile = fileName.includes('test.cs') || fileName.includes('tests.cs') ||
                          fileName.includes('test\\') || fileName.includes('tests\\') ||
                          fileName.includes('test/') || fileName.includes('tests/');

        if (isTestMethod || isTestFile) {
            // ✅ Any test method with 0% coverage is a false positive
            // Catches: tests in standard test files, tests in helper files, tests anywhere
            categories.falsePositiveTests.push({
                ...method,
                issue: 'Test exists but never runs (0% coverage)',
                type: 'TEST_METHOD'
            });
        } else if (!method.hasTests) {
            // Production method with no tests
            categories.productionWithoutTests.push({
                ...method,
                issue: 'No unit test exists',
                type: 'PRODUCTION_METHOD'
            });
        } else {
            // Production method that has test but 0% coverage (test might not be running)
            categories.productionWithoutTests.push({
                ...method,
                issue: 'Test exists but provides 0% coverage',
                type: 'PRODUCTION_METHOD'
            });
        }
    });
    
    // Categorize partial coverage methods
    (gaps.partialCoverage || []).forEach(method => {
        // ✅ IMPROVED: Check if method is a test method (same logic as above)
        const isTestMethod = method.isTest === true;
        const fileName = method.file.toLowerCase();
        const isTestFile = fileName.includes('test.cs') || fileName.includes('tests.cs') ||
                          fileName.includes('test\\') || fileName.includes('tests\\') ||
                          fileName.includes('test/') || fileName.includes('tests/');

        if (isTestMethod || isTestFile) {
            // Test method with partial execution - might be flaky
            categories.needsMoreTests.push({
                ...method,
                issue: 'Test only partially executes',
                type: 'TEST_METHOD'
            });
        } else {
            // Production method needs more coverage
            const covMsg = method.coverage !== null ? `Only ${method.coverage}% covered - needs more test cases` : 'Coverage data not available - run tests with coverage collection';
            categories.needsMoreTests.push({
                ...method,
                issue: covMsg,
                type: 'PRODUCTION_METHOD'
            });
        }
    });
    
    // Missing negative tests
    (gaps.missingNegativeTests || []).forEach(method => {
        // ✅ FIX: Check if this is actually a test method in a test file (false positive!)
        const isTestMethod = method.isTest === true;
        const fileName = method.file.toLowerCase();
        const isTestFile = fileName.includes('test.cs') || fileName.includes('tests.cs') ||
                          fileName.includes('test\\') || fileName.includes('tests\\') ||
                          fileName.includes('test/') || fileName.includes('tests/');

        if (isTestMethod || isTestFile) {
            // Test method with no negative tests = FALSE POSITIVE (should have been caught as untested)
            // This happens when test methods match themselves and report hasTests=true
            categories.falsePositiveTests.push({
                ...method,
                issue: 'Test exists but likely never runs or only partially executes',
                type: 'TEST_METHOD'
            });
        } else if (!categories.needsMoreTests.find(m => m.name === method.name && m.file === method.file)) {
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
    const coverage = method.coverage !== null && method.coverage !== undefined ? `${method.coverage}%` : 'N/A';
    const fileName = method.file.split('/').pop();

    // ✅ NEW: Check if this is a false positive test
    const isFalsePositive = state.categorizedGaps?.falsePositiveTests.some(
        fp => fp.name === method.name && fp.file === method.file
    );

    const typeIcon = isFalsePositive ? '🚨' :
                     method.type === 'TEST_METHOD' ? '🧪' :
                     method.type === 'PRODUCTION_METHOD' ? '⚙️' : '🔧';

    // ✅ NEW: Add special styling for false positive rows
    const rowClass = isFalsePositive ? 'class="false-positive-row"' : '';
    const issueBadge = isFalsePositive ? '<span class="badge badge-warning" style="margin-left: 8px;">⚠️ FALSE POSITIVE</span>' : '';

    return `
        <tr ${rowClass}>
            <td>
                <strong style="display: inline-flex; align-items: center; gap: 6px;">
                    <span>${typeIcon}</span>
                    <span>${method.name}</span>
                    ${issueBadge}
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

        // Handle "Generate Negative Tests" button
        if (target.classList.contains('btn-generate-negative')) {
            e.preventDefault();
            const fileName = target.dataset.filename;
            const fullPath = target.dataset.fullpath;
            openTestGenerator(fileName, fullPath, 'negative');
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
    const complexityFilter = document.getElementById('complexityFilter');
    const coverageFilter = document.getElementById('coverageFilter');
    const gapTypeFilter = document.getElementById('gapTypeFilter');
    const applyBtn = document.getElementById('applyFiltersBtn');
    const clearBtn = document.getElementById('clearFiltersBtn');
    const refreshBtn = document.getElementById('refreshBtn');

    // App filter - just store the selection, don't trigger API call
    appFilter.addEventListener('change', (e) => {
        state.filters.app = e.target.value;
        console.log('App filter changed:', state.filters.app);
    });

    // Complexity filter - just store the selection
    complexityFilter.addEventListener('change', (e) => {
        state.filters.complexity = e.target.value;
        console.log('Complexity filter changed:', state.filters.complexity);
    });

    // Coverage threshold filter - just store the selection
    coverageFilter.addEventListener('change', (e) => {
        state.filters.coverage = e.target.value;
        console.log('Coverage filter changed:', state.filters.coverage);
    });

    // ✅ NEW: Gap type filter - filters test gaps by category
    gapTypeFilter.addEventListener('change', (e) => {
        state.filters.gapType = e.target.value;
        console.log('Gap type filter changed:', state.filters.gapType);
        // Apply filter immediately to current view
        if (state.currentTab === 'test-gaps' && state.data.testGaps) {
            updateTestGapsTab();
        }
    });

    // Apply button - trigger API call with all filters
    applyBtn.addEventListener('click', async () => {
        const appName = state.filters.app || appFilter.value;

        if (!appName) {
            showStatus('⚠️ Please select an application first', 'warning');
            return;
        }

        console.log('📋 Applying filters:', state.filters);
        await loadAppData(appName);
    });

    // Clear button - reset all filters
    clearBtn.addEventListener('click', () => {
        appFilter.value = '';
        complexityFilter.value = '';
        coverageFilter.value = '';
        gapTypeFilter.value = '';

        state.filters = {
            app: '',
            complexity: '',
            coverage: '',
            gapType: ''
        };

        // Clear all tabs
        document.getElementById('totalFiles').textContent = '-';
        document.getElementById('overallCoverage').textContent = '-';
        document.getElementById('highComplexity').textContent = '-';
        document.getElementById('testGaps').textContent = '-';

        showStatus('🧹 Filters cleared', 'info');
        console.log('Filters cleared');
    });

    // Refresh button - reload current app with current filters
    refreshBtn.addEventListener('click', async () => {
        if (state.currentApp) {
            await loadAppData(state.currentApp);
        } else {
            showStatus('⚠️ Please select an application first', 'warning');
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
