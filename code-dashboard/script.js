// Code Analysis Dashboard - Backend/Frontend Separation
// Connects to new orchestrator endpoints

const API_BASE_URL = window.location.origin || "http://localhost:3000";

let state = {
  applications: [],
  currentApp: null,
  data: {
    overview: null,
    backend: null,
    frontend: null,
    testGaps: null,
  },
  isLoading: false,
  // Multi-select state
  selectedFiles: new Set(),
  typeFilter: "all",
  // Review queue state
  reviewQueue: [],
  reviewQueueIdCounter: 0,
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Initializing Code Analysis Dashboard");

  initializeTabs();
  initializeFilterBar();
  initializeFilters();
  initializeTestGapsControls();
  loadReviewQueueFromStorage();

  await loadApplications();

  console.log("✅ Dashboard initialized");
});

// ============================================
// LOAD APPLICATIONS
// ============================================

async function loadApplications() {
  try {
    showLoading("Loading applications...");

    const response = await fetch(`${API_BASE_URL}/api/dashboard/applications`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.success && data.applications) {
      state.applications = data.applications;

      const appFilter = document.getElementById("appFilter");
      appFilter.innerHTML = '<option value="">Select Application...</option>';

      state.applications.forEach((app) => {
        const option = document.createElement("option");
        option.value = app.name;
        option.textContent = `${app.displayName} (${app.framework})`;
        appFilter.appendChild(option);
      });

      console.log(`✅ Loaded ${state.applications.length} applications`);
      showStatus(`Loaded ${state.applications.length} applications`, "success");
    }

    hideLoading();
  } catch (error) {
    console.error("❌ Error loading applications:", error);
    showStatus("Failed to load applications", "error");
    hideLoading();
  }
}

// ============================================
// LOAD DATA
// ============================================

async function loadAllData(appName) {
  if (!appName) {
    showStatus("Please select an application", "warning");
    return;
  }

  state.currentApp = appName;
  showLoading(`Analyzing ${appName}...`);

  try {
    // Load all data in parallel
    const [overview, backend, frontend, testGaps] = await Promise.all([
      loadOverview(appName),
      loadBackend(appName),
      loadFrontend(appName),
      loadTestGaps(appName),
    ]);

    state.data.overview = overview;
    state.data.backend = backend;
    state.data.frontend = frontend;
    state.data.testGaps = testGaps;

    // Render the active tab
    const activeTab = document.querySelector(".tab-btn.active").dataset.tab;
    renderTab(activeTab);

    showStatus(`Analysis complete for ${appName}`, "success");
    hideLoading();
  } catch (error) {
    console.error("❌ Error loading data:", error);
    showStatus(`Failed to analyze ${appName}`, "error");
    hideLoading();
  }
}

async function loadOverview(appName) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/dashboard/overview?app=${appName}`,
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error loading overview:", error);
    return null;
  }
}

async function loadBackend(appName) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/dashboard/code-analysis?app=${appName}`,
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error loading backend:", error);
    return null;
  }
}

async function loadFrontend(appName) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/dashboard/javascript-analysis?app=${appName}`,
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error loading frontend:", error);
    return null;
  }
}

async function loadTestGaps(appName) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analysis/test-gaps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app: appName }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error loading test gaps:", error);
    return null;
  }
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderTab(tabName) {
  console.log(`📊 Rendering tab: ${tabName}`);

  switch (tabName) {
    case "overview":
      renderOverviewTab();
      break;
    case "backend":
      renderBackendTab();
      break;
    case "frontend":
      renderFrontendTab();
      break;
    case "test-gaps":
      renderTestGapsTab();
      break;
  }
}

function renderOverviewTab() {
  const data = state.data.overview;

  if (!data) {
    console.log("No overview data");
    return;
  }

  // Backend stats
  document.getElementById("overview-backend-files").textContent =
    data.backend?.files || 0;
  document.getElementById("overview-backend-classes").textContent =
    data.backend?.classes || 0;
  document.getElementById("overview-backend-methods").textContent =
    data.backend?.methods || 0;
  document.getElementById("overview-backend-coverage").textContent =
    `${data.backend?.coverage || 0}%`;
  document.getElementById("overview-backend-untested").textContent =
    data.backend?.untestedMethods || 0;

  // Frontend stats
  document.getElementById("overview-frontend-files").textContent =
    data.frontend?.files || 0;
  document.getElementById("overview-frontend-components").textContent =
    data.frontend?.components || 0;
  document.getElementById("overview-frontend-functions").textContent =
    data.frontend?.functions || 0;
  document.getElementById("overview-frontend-coverage").textContent =
    `${data.frontend?.coverage || 0}%`;
  document.getElementById("overview-frontend-untested").textContent =
    data.frontend?.untestedFunctions || 0;

  // Combined stats
  document.getElementById("overview-combined-files").textContent =
    data.combined?.totalFiles || 0;
  document.getElementById("overview-combined-units").textContent =
    data.combined?.totalCodeUnits || 0;
  document.getElementById("overview-combined-coverage").textContent =
    `${data.combined?.averageCoverage || 0}%`;
  document.getElementById("overview-combined-untested").textContent =
    data.combined?.totalUntested || 0;

  // Coverage bars
  const backendCoverage = data.backend?.coverage || 0;
  const frontendCoverage = data.frontend?.coverage || 0;

  updateCoverageBar(
    "overview-backend-bar",
    "overview-backend-bar-text",
    backendCoverage,
  );
  updateCoverageBar(
    "overview-frontend-bar",
    "overview-frontend-bar-text",
    frontendCoverage,
  );

  console.log("✅ Overview tab rendered");
}

function renderBackendTab() {
  const data = state.data.backend;

  if (!data) {
    console.log("No backend data");
    return;
  }

  // Metrics
  document.getElementById("backend-files").textContent =
    data.files?.length || 0;
  document.getElementById("backend-classes").textContent =
    data.classes?.length || 0;
  document.getElementById("backend-methods").textContent =
    data.methods?.length || 0;
  document.getElementById("backend-coverage").textContent =
    `${data.coverage?.overall || 0}%`;

  // Files table
  const tbody = document.getElementById("backend-files-tbody");
  tbody.innerHTML = "";

  if (data.files && data.files.length > 0) {
    // Show top 50 files by default
    data.files.slice(0, 50).forEach((file) => {
      const row = document.createElement("tr");
      row.innerHTML = `
                <td class="truncate" title="${file.path}">${file.name}</td>
                <td>${file.classCount || 0}</td>
                <td>${file.methodCount || 0}</td>
                <td>${file.avgComplexity ? file.avgComplexity.toFixed(1) : "0.0"}</td>
                <td>
                    <span class="coverage-badge ${getCoverageBadgeClass(file.lineCoverage || 0)}">
                        ${file.lineCoverage || 0}%
                    </span>
                </td>
            `;
      tbody.appendChild(row);
    });

    if (data.files.length > 50) {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="5" class="text-center muted">Showing 50 of ${data.files.length} files</td>`;
      tbody.appendChild(row);
    }
  } else {
    tbody.innerHTML =
      '<tr><td colspan="5" class="no-data">No files found</td></tr>';
  }

  console.log("✅ Backend tab rendered");
}

function renderFrontendTab() {
  const data = state.data.frontend;

  if (!data) {
    console.log("No frontend data");
    return;
  }

  // Metrics
  document.getElementById("frontend-files").textContent =
    data.summary?.totalFiles || 0;
  document.getElementById("frontend-components").textContent =
    data.summary?.totalComponents || 0;
  document.getElementById("frontend-functions").textContent =
    data.summary?.totalFunctions || 0;
  document.getElementById("frontend-hooks").textContent =
    data.summary?.totalHooks || 0;
  document.getElementById("frontend-coverage").textContent =
    `${data.coverage?.overall || 0}%`;

  // Components table
  const componentsTbody = document.getElementById("frontend-components-tbody");
  componentsTbody.innerHTML = "";

  if (data.components && data.components.length > 0) {
    data.components.slice(0, 50).forEach((component) => {
      const row = document.createElement("tr");
      const fileName = component.file
        ? component.file.split("/").pop()
        : "Unknown";
      const hooks = component.hooks ? component.hooks.join(", ") : "None";

      row.innerHTML = `
                <td>${component.name}</td>
                <td><span class="badge badge-blue">${component.type}</span></td>
                <td class="truncate" title="${component.file}">${fileName}</td>
                <td class="truncate" title="${hooks}">${hooks}</td>
                <td>${component.complexity || 1}</td>
            `;
      componentsTbody.appendChild(row);
    });

    if (data.components.length > 50) {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="5" class="text-center muted">Showing 50 of ${data.components.length} components</td>`;
      componentsTbody.appendChild(row);
    }
  } else {
    componentsTbody.innerHTML =
      '<tr><td colspan="5" class="no-data">No components found</td></tr>';
  }

  // Functions table
  const functionsTbody = document.getElementById("frontend-functions-tbody");
  functionsTbody.innerHTML = "";

  if (data.functions && data.functions.length > 0) {
    data.functions.slice(0, 50).forEach((func) => {
      const row = document.createElement("tr");
      const fileName = func.file ? func.file.split("/").pop() : "Unknown";
      const hasTests = func.hasTests !== undefined ? func.hasTests : false;

      row.innerHTML = `
                <td>${func.name}</td>
                <td class="truncate" title="${func.file}">${fileName}</td>
                <td><span class="badge badge-purple">${func.type || "function"}</span></td>
                <td>${func.complexity || 1}</td>
                <td>
                    <span class="badge ${hasTests ? "badge-green" : "badge-red"}">
                        ${hasTests ? "✓ Yes" : "✗ No"}
                    </span>
                </td>
            `;
      functionsTbody.appendChild(row);
    });

    if (data.functions.length > 50) {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="5" class="text-center muted">Showing 50 of ${data.functions.length} functions</td>`;
      functionsTbody.appendChild(row);
    }
  } else {
    functionsTbody.innerHTML =
      '<tr><td colspan="5" class="no-data">No functions found</td></tr>';
  }

  console.log("✅ Frontend tab rendered");
}

function renderTestGapsTab() {
  const data = state.data.testGaps;

  if (!data) {
    console.log("No test gaps data");
    return;
  }

  // Metrics
  document.getElementById("gaps-untested").textContent =
    data.gaps?.untestedMethods?.length || 0;
  document.getElementById("gaps-partial").textContent =
    data.gaps?.partialCoverage?.length || 0;
  document.getElementById("gaps-negative").textContent =
    data.gaps?.missingNegativeTests?.length || 0;

  // Untested methods table
  const tbody = document.getElementById("gaps-untested-tbody");
  tbody.innerHTML = "";

  let untestedMethods = data.gaps?.untestedMethods || [];

  // Apply type filter
  if (state.typeFilter !== "all") {
    untestedMethods = untestedMethods.filter(
      (m) => m.fileType === state.typeFilter,
    );
  }

  if (untestedMethods.length > 0) {
    untestedMethods.slice(0, 100).forEach((method, index) => {
      const row = document.createElement("tr");
      const fileName = method.file ? method.file.split("/").pop() : "Unknown";
      const methodType = method.fileType || "Unknown";
      const fileKey = `${method.file}::${method.name}`;
      const isSelected = state.selectedFiles.has(fileKey);

      if (isSelected) {
        row.classList.add("selected");
      }

      // Escape values for HTML attributes
      const escapedFile = escapeHtmlAttr(method.file || "");
      const escapedMethod = escapeHtmlAttr(method.name || "");
      const escapedKey = escapeHtmlAttr(fileKey);

      row.innerHTML = `
                <td class="checkbox-col">
                    <input type="checkbox"
                           data-file="${escapedFile}"
                           data-method="${escapedMethod}"
                           data-key="${escapedKey}"
                           data-index="${index}"
                           ${isSelected ? "checked" : ""}
                           onchange="toggleFileSelection(this)">
                </td>
                <td>${escapeHtml(method.name)}</td>
                <td class="truncate" title="${escapedFile}">${escapeHtml(fileName)}</td>
                <td><span class="badge badge-purple">${escapeHtml(methodType)}</span></td>
                <td>${method.complexity || 1}</td>
                <td>
                    <button class="action-btn small" data-method="${escapedMethod}" data-file="${escapedFile}" onclick="handleGenerateTest(this)">
                        Generate Test
                    </button>
                </td>
            `;
      tbody.appendChild(row);
    });

    if (untestedMethods.length > 100) {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="6" class="text-center muted">Showing 100 of ${untestedMethods.length} untested methods</td>`;
      tbody.appendChild(row);
    }
  } else {
    tbody.innerHTML =
      '<tr><td colspan="6" class="no-data">No untested methods found - Great job! 🎉</td></tr>';
  }

  // Update selection UI
  updateSelectionUI();

  // Render review queue
  renderReviewQueue();

  console.log("✅ Test gaps tab rendered");
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function updateCoverageBar(barId, textId, percentage) {
  const bar = document.getElementById(barId);
  const text = document.getElementById(textId);

  if (bar && text) {
    bar.style.width = `${percentage}%`;
    text.textContent = `${percentage}%`;

    // Update color based on percentage
    bar.classList.remove("low", "medium", "high");
    if (percentage < 50) {
      bar.classList.add("low");
    } else if (percentage < 80) {
      bar.classList.add("medium");
    } else {
      bar.classList.add("high");
    }
  }
}

function getCoverageBadgeClass(coverage) {
  if (coverage >= 80) return "high";
  if (coverage >= 50) return "medium";
  return "low";
}

async function generateTest(methodName, file) {
  console.log("Generate test for:", methodName, file);

  if (!state.currentApp) {
    showStatus("Please select an application first", "error");
    return;
  }

  // Extract className from file path
  // Example: /mnt/apps/PreCare/CarePayment.PreCare.Api/Services/ServiceLayerAPIClient.cs
  // -> ServiceLayerAPIClient
  const fileName = file.split("/").pop().replace(/\.cs$/, "");
  const className = fileName;

  showStatus(`Generating test for ${methodName} in ${className}...`, "info");

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/tests/generate-for-file`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app: state.currentApp,
          file: file,
          className: className,
          includeNegativeTests: true,
          includeMocks: true,
          onlyNegativeTests: false,
          // model parameter omitted - uses backend default (claude-sonnet-4-20250514)
        }),
      },
    );

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || data.message || "Test generation failed");
    }

    // Display results in a modal or alert
    showTestResults(methodName, className, data.result);
    showStatus(`✅ Test generated for ${methodName}`, "success");
  } catch (error) {
    console.error("Test generation error:", error);
    showStatus(`❌ Test generation failed: ${error.message}`, "error");
  }
}

function showTestResults(methodName, className, result) {
  // Create a simple modal to show the generated test
  const modal = document.createElement("div");
  modal.className = "test-results-modal";
  modal.innerHTML = `
        <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
        <div class="modal-content" style="max-width: 900px; max-height: 80vh; overflow: auto;">
            <div class="modal-header">
                <h2>Generated Test: ${methodName}</h2>
                <button class="btn-close" onclick="this.closest('.test-results-modal').remove()">✕</button>
            </div>
            <div class="modal-body">
                <h3>Class: ${className}</h3>
                <div class="test-code">
                    <pre><code>${escapeHtml(result.completeTestFile || result.testCode || JSON.stringify(result, null, 2))}</code></pre>
                </div>
                <div class="modal-actions" style="margin-top: 20px;">
                    <button class="btn btn-primary" onclick="copyTestToClipboard(this)">📋 Copy to Clipboard</button>
                    <button class="btn btn-secondary" onclick="this.closest('.test-results-modal').remove()">Close</button>
                </div>
            </div>
        </div>
    `;

  // Store test code for copying
  modal.querySelector(".test-code").dataset.testCode =
    result.completeTestFile ||
    result.testCode ||
    JSON.stringify(result, null, 2);

  document.body.appendChild(modal);
}

function copyTestToClipboard(button) {
  const testCode = button.closest(".modal-body").querySelector(".test-code")
    .dataset.testCode;
  navigator.clipboard
    .writeText(testCode)
    .then(() => {
      const originalText = button.textContent;
      button.textContent = "✅ Copied!";
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    })
    .catch((err) => {
      console.error("Failed to copy:", err);
      alert("Failed to copy to clipboard");
    });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// TAB MANAGEMENT
// ============================================

function initializeTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabName = btn.dataset.tab;
      switchTab(tabName);

      tabBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

function switchTab(tabName) {
  const tabs = document.querySelectorAll(".tab-content");
  tabs.forEach((tab) => tab.classList.remove("active"));

  const targetTab = document.getElementById(`${tabName}-tab`);
  if (targetTab) {
    targetTab.classList.add("active");
    renderTab(tabName);
  }
}

// ============================================
// FILTER BAR
// ============================================

function initializeFilterBar() {
  const toggle = document.getElementById("filterBarToggle");
  const content = document.getElementById("filterBarContent");

  toggle.addEventListener("click", () => {
    const isOpen = content.classList.toggle("open");
    const icon = toggle.querySelector(".toggle-icon");
    icon.textContent = isOpen ? "▲" : "▼";
  });
}

// ============================================
// FILTERS
// ============================================

function initializeFilters() {
  const appFilter = document.getElementById("appFilter");
  const refreshBtn = document.getElementById("refreshBtn");

  appFilter.addEventListener("change", (e) => {
    const appName = e.target.value;
    if (appName) {
      loadAllData(appName);
    }
  });

  refreshBtn.addEventListener("click", () => {
    if (state.currentApp) {
      loadAllData(state.currentApp);
    } else {
      showStatus("Please select an application first", "warning");
    }
  });
}

// ============================================
// UI HELPERS
// ============================================

function showLoading(message = "Loading...") {
  state.isLoading = true;
  const indicator = document.getElementById("loadingIndicator");
  const text = document.getElementById("loadingText");
  if (indicator) indicator.style.display = "flex";
  if (text) text.textContent = message;
}

function hideLoading() {
  state.isLoading = false;
  const indicator = document.getElementById("loadingIndicator");
  if (indicator) indicator.style.display = "none";
}

function showStatus(message, type = "info") {
  const statusBar = document.getElementById("statusBar");
  if (!statusBar) return;

  statusBar.textContent = message;
  statusBar.className = `status-bar ${type}`;
  statusBar.style.display = "block";

  setTimeout(() => {
    statusBar.style.display = "none";
  }, 5000);
}

// ============================================
// MULTI-SELECT & BATCH GENERATION
// ============================================

/**
 * Escape HTML attribute values for safe insertion
 */
function escapeHtmlAttr(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Initialize test gaps controls and event listeners
 */
function initializeTestGapsControls() {
  console.log("🔧 Initializing test gaps controls");
  // Event listeners are attached via onclick in HTML
  // This function ensures state is properly initialized
  state.selectedFiles = new Set();
  state.typeFilter = "all";
  updateSelectionUI();
}

/**
 * Toggle selection of a single file
 */
function toggleFileSelection(checkbox) {
  const key = checkbox.dataset.key;
  console.log("Toggle selection:", key, "checked:", checkbox.checked);

  if (checkbox.checked) {
    state.selectedFiles.add(key);
    checkbox.closest("tr")?.classList.add("selected");
  } else {
    state.selectedFiles.delete(key);
    checkbox.closest("tr")?.classList.remove("selected");
  }

  updateSelectionUI();
}

/**
 * Select all visible (filtered) items
 */
function selectAllVisible() {
  console.log("Select all visible");
  const checkboxes = document.querySelectorAll(
    '#gaps-untested-tbody input[type="checkbox"]',
  );

  checkboxes.forEach((cb) => {
    cb.checked = true;
    const key = cb.dataset.key;
    if (key) {
      state.selectedFiles.add(key);
      cb.closest("tr")?.classList.add("selected");
    }
  });

  // Update header checkbox
  const selectAllCheckbox = document.getElementById("selectAllCheckbox");
  if (selectAllCheckbox) selectAllCheckbox.checked = true;

  updateSelectionUI();
}

/**
 * Clear all selections
 */
function clearSelection() {
  console.log("Clear selection");
  state.selectedFiles.clear();

  const checkboxes = document.querySelectorAll(
    '#gaps-untested-tbody input[type="checkbox"]',
  );
  checkboxes.forEach((cb) => {
    cb.checked = false;
    cb.closest("tr")?.classList.remove("selected");
  });

  // Update header checkbox
  const selectAllCheckbox = document.getElementById("selectAllCheckbox");
  if (selectAllCheckbox) selectAllCheckbox.checked = false;

  updateSelectionUI();
}

/**
 * Update selection UI elements (count, button state)
 */
function updateSelectionUI() {
  const count = state.selectedFiles.size;
  console.log("Update selection UI, count:", count);

  const countEl = document.getElementById("selectedCount");
  const generateBtn = document.getElementById("generateSelectedBtn");

  if (countEl) countEl.textContent = count;
  if (generateBtn) generateBtn.disabled = count === 0;
}

/**
 * Handle type filter change
 */
function handleTypeFilterChange(value) {
  console.log("Type filter changed:", value);
  state.typeFilter = value;
  clearSelection();
  renderTestGapsTab();
}

/**
 * Handle single test generation from button click
 */
function handleGenerateTest(button) {
  const methodName = button.dataset.method;
  const file = button.dataset.file;
  console.log("Generate single test:", methodName, file);
  generateTest(methodName, file);
}

/**
 * Generate tests for all selected files (batch)
 */
async function generateBatchTests() {
  console.log("🚀 Starting batch test generation");
  console.log("Selected files:", Array.from(state.selectedFiles));

  if (state.selectedFiles.size === 0) {
    showStatus("No files selected", "warning");
    return;
  }

  // Confirm if large selection
  if (state.selectedFiles.size > 10) {
    if (
      !confirm(
        `Generate tests for ${state.selectedFiles.size} files? This may take a while.`,
      )
    ) {
      return;
    }
  }

  const selectedItems = [];
  state.selectedFiles.forEach((key) => {
    const [file, methodName] = key.split("::");
    const fileName = file.split("/").pop().replace(/\.cs$/, "");
    selectedItems.push({
      file,
      methodName,
      className: fileName,
    });
  });

  console.log("Processing items:", selectedItems);

  showProgressModal(selectedItems.length);

  const results = [];
  let completed = 0;

  for (const item of selectedItems) {
    updateProgressModal(
      completed,
      selectedItems.length,
      `Generating test for ${item.methodName}...`,
    );

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/tests/generate-for-file`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            app: state.currentApp,
            file: item.file,
            className: item.className,
            includeNegativeTests: true,
            includeMocks: true,
            onlyNegativeTests: false,
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        results.push({
          ...item,
          success: true,
          testCode: data.result.completeTestFile || data.result.testCode,
          testFramework: data.result.testFramework,
        });
        console.log(`✅ Generated test for ${item.methodName}`);
      } else {
        results.push({
          ...item,
          success: false,
          error: data.error || data.message || "Unknown error",
        });
        console.error(`❌ Failed for ${item.methodName}:`, data.error);
      }
    } catch (error) {
      results.push({
        ...item,
        success: false,
        error: error.message,
      });
      console.error(`❌ Error for ${item.methodName}:`, error);
    }

    completed++;
    updateProgressModal(completed, selectedItems.length);
  }

  hideProgressModal();

  // Add results to review queue
  const successCount = results.filter((r) => r.success).length;
  addToReviewQueue(results.filter((r) => r.success));

  clearSelection();

  showStatus(
    `Generated ${successCount}/${results.length} tests. Check review queue.`,
    successCount === results.length ? "success" : "warning",
  );

  console.log(
    `✅ Batch complete: ${successCount}/${results.length} successful`,
  );
}

// ============================================
// PROGRESS MODAL
// ============================================

function showProgressModal(total) {
  console.log("Show progress modal, total:", total);
  const modal = document.getElementById("progressModal");
  if (modal) {
    modal.style.display = "flex";
    updateProgressModal(0, total, "Starting...");
  }
}

function updateProgressModal(current, total, detail = "") {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  const fill = document.getElementById("progressBarFill");
  const text = document.getElementById("progressText");
  const detailEl = document.getElementById("progressDetail");

  if (fill) fill.style.width = `${percent}%`;
  if (text) text.textContent = `${current} of ${total} complete (${percent}%)`;
  if (detailEl) detailEl.textContent = detail;
}

function hideProgressModal() {
  console.log("Hide progress modal");
  const modal = document.getElementById("progressModal");
  if (modal) {
    modal.style.display = "none";
  }
}

// ============================================
// REVIEW QUEUE
// ============================================

/**
 * Add batch results to review queue
 */
function addToReviewQueue(results) {
  console.log("Adding to review queue:", results.length, "items");

  results.forEach((result) => {
    const id = `review-${++state.reviewQueueIdCounter}`;
    const defaultPath = generateDefaultTestPath(result.file, result.className);

    state.reviewQueue.push({
      id,
      methodName: result.methodName,
      className: result.className,
      sourceFile: result.file,
      testCode: result.testCode,
      testFramework: result.testFramework,
      destinationPath: defaultPath,
      status: "pending",
      error: null,
    });
  });

  console.log("Review queue now has", state.reviewQueue.length, "items");

  saveReviewQueueToStorage();
  renderReviewQueue();
}

/**
 * Generate default test file path based on source file
 */
function generateDefaultTestPath(sourceFile, className) {
  if (!sourceFile) return "";

  // Find current app config
  const app = state.applications.find((a) => a.name === state.currentApp);
  const localPath = app?.localPath || "";

  // Extract relative path from source file
  const fileName = sourceFile.split("/").pop();
  const testFileName = fileName.replace(".cs", "Tests.cs");

  // Simple default: put tests in Tests folder
  return `${localPath}/Tests/${className}Tests.cs`;
}

/**
 * Render the review queue panel
 */
function renderReviewQueue() {
  console.log("Rendering review queue, items:", state.reviewQueue.length);

  const panel = document.getElementById("reviewQueuePanel");
  const list = document.getElementById("reviewQueueList");
  const countBadge = document.getElementById("queueCount");

  if (!panel || !list) {
    console.warn("Review queue elements not found");
    return;
  }

  // Show/hide panel based on queue
  if (state.reviewQueue.length === 0) {
    panel.style.display = "none";
    return;
  }

  panel.style.display = "block";
  if (countBadge) countBadge.textContent = state.reviewQueue.length;

  // Render queue items
  list.innerHTML = state.reviewQueue
    .map(
      (item) => `
    <div class="review-queue-item ${item.status}" data-id="${item.id}">
      <div class="queue-item-header" onclick="toggleReviewItem('${item.id}')">
        <div class="queue-item-info">
          <span class="queue-item-name">${escapeHtml(item.methodName)}</span>
          <span class="queue-item-class">${escapeHtml(item.className)}</span>
          <span class="queue-item-status badge badge-${getStatusBadgeClass(item.status)}">${item.status}</span>
        </div>
        <span class="queue-item-toggle">▼</span>
      </div>
      <div class="queue-item-content" id="content-${item.id}" style="display: none;">
        <div class="queue-item-path">
          <label>Destination Path:</label>
          <input type="text"
                 value="${escapeHtmlAttr(item.destinationPath)}"
                 onchange="updateDestinationPath('${item.id}', this.value)"
                 class="path-input">
        </div>
        <div class="queue-item-code">
          <pre><code>${escapeHtml(item.testCode || "")}</code></pre>
        </div>
        <div class="queue-item-actions">
          <button class="btn btn-sm btn-secondary" onclick="editTest('${item.id}')">✏️ Edit</button>
          <button class="btn btn-sm btn-secondary" onclick="copyQueueTestToClipboard('${item.id}')">📋 Copy</button>
          ${item.status !== "approved" ? `<button class="btn btn-sm btn-primary" onclick="approveTest('${item.id}')">✓ Approve</button>` : ""}
          ${item.status === "approved" ? `<button class="btn btn-sm btn-success" onclick="saveTestToCodebase('${item.id}')">💾 Save to Codebase</button>` : ""}
          <button class="btn btn-sm btn-danger" onclick="removeFromQueue('${item.id}')">✕ Remove</button>
        </div>
      </div>
    </div>
  `,
    )
    .join("");
}

function getStatusBadgeClass(status) {
  switch (status) {
    case "pending":
      return "yellow";
    case "approved":
      return "green";
    case "saved":
      return "blue";
    case "error":
      return "red";
    default:
      return "gray";
  }
}

/**
 * Toggle review item expand/collapse
 */
function toggleReviewItem(id) {
  const content = document.getElementById(`content-${id}`);
  if (content) {
    const isVisible = content.style.display !== "none";
    content.style.display = isVisible ? "none" : "block";

    const header = content.previousElementSibling;
    const toggle = header?.querySelector(".queue-item-toggle");
    if (toggle) toggle.textContent = isVisible ? "▼" : "▲";
  }
}

/**
 * Update destination path for a queue item
 */
function updateDestinationPath(id, newPath) {
  const item = state.reviewQueue.find((i) => i.id === id);
  if (item) {
    item.destinationPath = newPath;
    saveReviewQueueToStorage();
  }
}

/**
 * Approve a single test
 */
function approveTest(id) {
  const item = state.reviewQueue.find((i) => i.id === id);
  if (item) {
    item.status = "approved";
    saveReviewQueueToStorage();
    renderReviewQueue();
    showStatus(`Approved test for ${item.methodName}`, "success");
  }
}

/**
 * Approve all pending tests
 */
function approveAllTests() {
  state.reviewQueue.forEach((item) => {
    if (item.status === "pending") {
      item.status = "approved";
    }
  });
  saveReviewQueueToStorage();
  renderReviewQueue();
  showStatus("All pending tests approved", "success");
}

/**
 * Remove item from queue
 */
function removeFromQueue(id) {
  state.reviewQueue = state.reviewQueue.filter((i) => i.id !== id);
  saveReviewQueueToStorage();
  renderReviewQueue();
}

/**
 * Clear entire review queue
 */
function clearReviewQueue() {
  if (confirm("Clear all items from the review queue?")) {
    state.reviewQueue = [];
    saveReviewQueueToStorage();
    renderReviewQueue();
    showStatus("Review queue cleared", "info");
  }
}

/**
 * Copy test code from queue item to clipboard
 */
function copyQueueTestToClipboard(id) {
  const item = state.reviewQueue.find((i) => i.id === id);
  if (item && item.testCode) {
    navigator.clipboard
      .writeText(item.testCode)
      .then(() => showStatus("Test code copied to clipboard", "success"))
      .catch(() => showStatus("Failed to copy to clipboard", "error"));
  }
}

// ============================================
// EDIT TEST MODAL
// ============================================

function editTest(id) {
  const item = state.reviewQueue.find((i) => i.id === id);
  if (!item) return;

  // Create edit modal
  const modal = document.createElement("div");
  modal.className = "edit-test-modal";
  modal.id = "editTestModal";
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeEditModal()"></div>
    <div class="modal-content edit-modal-content">
      <div class="modal-header">
        <h2>Edit Test: ${escapeHtml(item.methodName)}</h2>
        <button class="btn-close" onclick="closeEditModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="edit-path-row">
          <label>Destination Path:</label>
          <input type="text" id="editDestPath" value="${escapeHtmlAttr(item.destinationPath)}" class="edit-path-input">
        </div>
        <div class="edit-code-row">
          <label>Test Code:</label>
          <textarea id="editTestCode" class="edit-code-textarea">${escapeHtml(item.testCode || "")}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeEditModal()">Cancel</button>
        <button class="btn btn-primary" onclick="saveTestEdit('${item.id}')">Save Changes</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function closeEditModal() {
  const modal = document.getElementById("editTestModal");
  if (modal) modal.remove();
}

function saveTestEdit(id) {
  const item = state.reviewQueue.find((i) => i.id === id);
  if (!item) return;

  const newPath = document.getElementById("editDestPath")?.value;
  const newCode = document.getElementById("editTestCode")?.value;

  if (newPath) item.destinationPath = newPath;
  if (newCode) item.testCode = newCode;

  saveReviewQueueToStorage();
  closeEditModal();
  renderReviewQueue();
  showStatus("Test updated", "success");
}

// ============================================
// SAVE TO CODEBASE
// ============================================

async function saveTestToCodebase(id) {
  const item = state.reviewQueue.find((i) => i.id === id);
  if (!item) return;

  if (!item.destinationPath) {
    showStatus("Please set a destination path first", "error");
    return;
  }

  showStatus(`Saving test to ${item.destinationPath}...`, "info");

  try {
    const response = await fetch(`${API_BASE_URL}/api/tests/save-to-file`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app: state.currentApp,
        testCode: item.testCode,
        destinationPath: item.destinationPath,
        overwrite: false,
      }),
    });

    const data = await response.json();

    if (data.success) {
      item.status = "saved";
      saveReviewQueueToStorage();
      renderReviewQueue();
      showStatus(`✅ Test saved to ${item.destinationPath}`, "success");
    } else {
      throw new Error(data.error || data.message || "Save failed");
    }
  } catch (error) {
    console.error("Save error:", error);
    item.status = "error";
    item.error = error.message;
    saveReviewQueueToStorage();
    renderReviewQueue();
    showStatus(`❌ Save failed: ${error.message}`, "error");
  }
}

async function saveAllApprovedTests() {
  const approved = state.reviewQueue.filter((i) => i.status === "approved");

  if (approved.length === 0) {
    showStatus("No approved tests to save", "warning");
    return;
  }

  showProgressModal(approved.length);

  let saved = 0;
  let failed = 0;

  for (let i = 0; i < approved.length; i++) {
    const item = approved[i];
    updateProgressModal(i, approved.length, `Saving ${item.className}...`);

    try {
      const response = await fetch(`${API_BASE_URL}/api/tests/save-to-file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app: state.currentApp,
          testCode: item.testCode,
          destinationPath: item.destinationPath,
          overwrite: false,
        }),
      });

      const data = await response.json();

      if (data.success) {
        item.status = "saved";
        saved++;
      } else {
        item.status = "error";
        item.error = data.error || "Save failed";
        failed++;
      }
    } catch (error) {
      item.status = "error";
      item.error = error.message;
      failed++;
    }
  }

  hideProgressModal();
  saveReviewQueueToStorage();
  renderReviewQueue();

  showStatus(
    `Saved ${saved}/${approved.length} tests${failed > 0 ? ` (${failed} failed)` : ""}`,
    failed > 0 ? "warning" : "success",
  );
}

// ============================================
// LOCAL STORAGE PERSISTENCE
// ============================================

function saveReviewQueueToStorage() {
  try {
    localStorage.setItem(
      "codeAnalysis_reviewQueue",
      JSON.stringify(state.reviewQueue),
    );
    localStorage.setItem(
      "codeAnalysis_queueIdCounter",
      String(state.reviewQueueIdCounter),
    );
  } catch (e) {
    console.warn("Failed to save review queue to localStorage:", e);
  }
}

function loadReviewQueueFromStorage() {
  try {
    const saved = localStorage.getItem("codeAnalysis_reviewQueue");
    const counter = localStorage.getItem("codeAnalysis_queueIdCounter");

    if (saved) {
      state.reviewQueue = JSON.parse(saved);
      console.log(
        "Loaded review queue from storage:",
        state.reviewQueue.length,
        "items",
      );
    }
    if (counter) {
      state.reviewQueueIdCounter = parseInt(counter, 10);
    }
  } catch (e) {
    console.warn("Failed to load review queue from localStorage:", e);
    state.reviewQueue = [];
    state.reviewQueueIdCounter = 0;
  }
}

// ============================================
// GLOBAL EXPORTS
// ============================================

// Make functions available globally for onclick handlers
window.generateTest = generateTest;
window.copyTestToClipboard = copyTestToClipboard;
window.escapeHtml = escapeHtml;
window.toggleFileSelection = toggleFileSelection;
window.selectAllVisible = selectAllVisible;
window.clearSelection = clearSelection;
window.generateBatchTests = generateBatchTests;
window.handleGenerateTest = handleGenerateTest;
window.handleTypeFilterChange = handleTypeFilterChange;
window.toggleReviewItem = toggleReviewItem;
window.updateDestinationPath = updateDestinationPath;
window.approveTest = approveTest;
window.approveAllTests = approveAllTests;
window.removeFromQueue = removeFromQueue;
window.clearReviewQueue = clearReviewQueue;
window.copyQueueTestToClipboard = copyQueueTestToClipboard;
window.editTest = editTest;
window.closeEditModal = closeEditModal;
window.saveTestEdit = saveTestEdit;
window.saveTestToCodebase = saveTestToCodebase;
window.saveAllApprovedTests = saveAllApprovedTests;

console.log("✅ Dashboard script loaded");
