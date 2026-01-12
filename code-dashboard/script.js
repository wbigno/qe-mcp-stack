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
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Initializing Code Analysis Dashboard");

  initializeTabs();
  initializeFilterBar();
  initializeFilters();

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

  const untestedMethods = data.gaps?.untestedMethods || [];

  if (untestedMethods.length > 0) {
    untestedMethods.slice(0, 100).forEach((method) => {
      const row = document.createElement("tr");
      const fileName = method.file ? method.file.split("/").pop() : "Unknown";
      const methodType = method.fileType || "Unknown";

      row.innerHTML = `
                <td>${method.name}</td>
                <td class="truncate" title="${method.file}">${fileName}</td>
                <td><span class="badge badge-purple">${methodType}</span></td>
                <td>${method.complexity || 1}</td>
                <td>
                    <button class="action-btn small" onclick="generateTest('${method.name}', '${method.file}')">
                        Generate Test
                    </button>
                </td>
            `;
      tbody.appendChild(row);
    });

    if (untestedMethods.length > 100) {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="5" class="text-center muted">Showing 100 of ${untestedMethods.length} untested methods</td>`;
      tbody.appendChild(row);
    }
  } else {
    tbody.innerHTML =
      '<tr><td colspan="5" class="no-data">No untested methods found - Great job! 🎉</td></tr>';
  }

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

// Make functions available globally
window.generateTest = generateTest;
window.copyTestToClipboard = copyTestToClipboard;
window.escapeHtml = escapeHtml;

console.log("✅ Dashboard script loaded");
