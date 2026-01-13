import { PushPreviewModal } from "./pushPreviewModal.js";

const API_BASE_URL = "http://localhost:3000";

export class AnalysisPanel {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentStory = null;
    this.currentApp = null;
    this.availableApps = [];
    // Store extracted data from Technical Details
    this.extractedData = {
      filePaths: [],
      priorStoryIds: [],
      implementationNotes: [],
    };
    // Store fetched prior stories
    this.priorStories = [];
    // Store analysis results for push to ADO
    this.analysisResults = {
      risk: null,
      integration: null,
      blastRadius: null,
      priorStoryAnalysis: null,
    };
    // Store generated test cases
    this.generatedTestCases = null;
    // Load available apps
    this.loadAvailableApps();
    // Render initial empty state
    this.render();
  }

  async loadAvailableApps() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard/config/apps`);
      if (response.ok) {
        const data = await response.json();
        this.availableApps = data.apps || [];
        this.render();
      }
    } catch (error) {
      console.error("Failed to load apps:", error);
    }
  }

  async showAnalysis(story, app) {
    this.currentStory = story;
    this.currentApp = app;
    // Parse Technical Details when story is loaded
    if (story) {
      this.parseAndExtractDetails(story);
    }
    this.render();
  }

  /**
   * Parse Technical Details field and extract useful information
   */
  parseAndExtractDetails(story) {
    const technicalDetails = story.fields?.["Custom.TechnicalDetails"] || "";

    // Reset extracted data
    this.extractedData = {
      filePaths: [],
      priorStoryIds: [],
      implementationNotes: [],
    };
    this.priorStories = [];

    if (!technicalDetails) return;

    // Strip HTML tags for text analysis
    const textContent = this.stripHtml(technicalDetails);

    // Extract file paths (various patterns)
    const filePatterns = [
      // Full paths with extensions
      /(?:^|[\s,;:(])((?:src|lib|app|services|controllers|models|components|utils|helpers|api|routes|tests|spec)\/[\w\-./]+\.\w+)/gim,
      // C# style paths
      /(?:^|[\s,;:(])((?:Services|Controllers|Models|Repositories|Helpers|Utils|Api)\/[\w\-./]+\.cs)/gim,
      // Generic file paths
      /(?:^|[\s,;:(])([\w-]+(?:\/[\w-]+)+\.\w{2,4})/gim,
      // Namespace/class references that might be files
      /(?:modify|update|change|touch|edit|add to|create)\s+(?:the\s+)?[`"]?([\w./\\]+\.\w+)[`"]?/gim,
    ];

    for (const pattern of filePatterns) {
      let match;
      while ((match = pattern.exec(textContent)) !== null) {
        const filePath = match[1].trim();
        if (filePath && !this.extractedData.filePaths.includes(filePath)) {
          this.extractedData.filePaths.push(filePath);
        }
      }
    }

    // Extract story/work item IDs (various patterns)
    const storyPatterns = [
      // #12345 format
      /#(\d{4,6})/g,
      // PBI/US/Bug 12345 format
      /(?:PBI|US|User Story|Bug|Task|Feature)\s*#?\s*(\d{4,6})/gi,
      // Work Item 12345 format
      /(?:Work Item|WI|Item)\s*#?\s*(\d{4,6})/gi,
      // ADO URL format
      /workitems\/(\d{4,6})/gi,
      // "Story 12345" format
      /(?:story|related to|depends on|see|reference)\s*#?\s*(\d{4,6})/gi,
    ];

    for (const pattern of storyPatterns) {
      let match;
      while ((match = pattern.exec(textContent)) !== null) {
        const storyId = parseInt(match[1]);
        // Exclude current story ID
        if (
          storyId &&
          storyId !== story.id &&
          !this.extractedData.priorStoryIds.includes(storyId)
        ) {
          this.extractedData.priorStoryIds.push(storyId);
        }
      }
    }

    // Extract implementation notes (sentences with key phrases)
    const notePatterns = [
      /(?:^|\.\s*)((?:This|We|The|Need to|Should|Must|Will|Ensure|Make sure|Remember to)[^.]+\.)/gim,
      /(?:^|\.\s*)((?:Implementation|Note|Important|Warning|Caution|TODO|FIXME):[^.]+\.)/gim,
    ];

    for (const pattern of notePatterns) {
      let match;
      while ((match = pattern.exec(textContent)) !== null) {
        const note = match[1].trim();
        if (
          note &&
          note.length > 20 &&
          !this.extractedData.implementationNotes.includes(note)
        ) {
          this.extractedData.implementationNotes.push(note);
        }
      }
    }

    console.log("[AnalysisPanel] Extracted data:", this.extractedData);
  }

  /**
   * Strip HTML tags and decode entities
   */
  stripHtml(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  }

  /**
   * Format HTML content for better display
   */
  formatHtmlContent(html) {
    if (!html) return "";

    // Create a temporary div to parse and format
    const temp = document.createElement("div");
    temp.innerHTML = html;

    // Add classes for styling
    temp.querySelectorAll("ul, ol").forEach((list) => {
      list.classList.add("formatted-list");
    });

    temp.querySelectorAll("p").forEach((p) => {
      p.classList.add("formatted-paragraph");
    });

    // Highlight file paths and story references
    let content = temp.innerHTML;

    // Highlight file paths
    content = content.replace(
      /((?:src|lib|app|services|controllers|models|components)\/[\w\-./]+\.\w+)/gi,
      '<code class="file-ref">$1</code>',
    );

    // Highlight story IDs
    content = content.replace(
      /#(\d{4,6})/g,
      '<a href="#" class="story-ref" data-story-id="$1">#$1</a>',
    );

    return content;
  }

  /**
   * Fetch prior stories for analysis
   */
  async fetchPriorStories() {
    if (this.extractedData.priorStoryIds.length === 0) {
      return [];
    }

    const priorStoriesContainer = document.getElementById(
      "priorStoriesContent",
    );
    if (priorStoriesContainer) {
      priorStoriesContainer.innerHTML =
        '<div class="loading">Loading prior stories...</div>';
    }

    try {
      const fetchPromises = this.extractedData.priorStoryIds.map(async (id) => {
        const response = await fetch(`${API_BASE_URL}/api/ado/work-item/${id}`);
        if (response.ok) {
          const data = await response.json();
          return data.workItem;
        }
        return null;
      });

      this.priorStories = (await Promise.all(fetchPromises)).filter(Boolean);
      this.renderPriorStoriesSection();
      return this.priorStories;
    } catch (error) {
      console.error("Failed to fetch prior stories:", error);
      if (priorStoriesContainer) {
        priorStoriesContainer.innerHTML = `<div class="error">Failed to load prior stories: ${error.message}</div>`;
      }
      return [];
    }
  }

  /**
   * Render the prior stories section
   */
  renderPriorStoriesSection() {
    const container = document.getElementById("priorStoriesContent");
    if (!container) return;

    if (this.priorStories.length === 0) {
      container.innerHTML =
        '<p class="empty-message">No prior stories found or loaded</p>';
      return;
    }

    container.innerHTML = `
      <div class="prior-stories-list">
        ${this.priorStories
          .map(
            (story) => `
          <div class="prior-story-card">
            <div class="prior-story-header">
              <span class="prior-story-id">#${story.id}</span>
              <span class="prior-story-type type-${(story.fields?.["System.WorkItemType"] || "").toLowerCase().replace(/\s+/g, "-")}">${story.fields?.["System.WorkItemType"] || "Unknown"}</span>
              <span class="prior-story-state state-${(story.fields?.["System.State"] || "").toLowerCase()}">${story.fields?.["System.State"] || "Unknown"}</span>
            </div>
            <div class="prior-story-title">${story.fields?.["System.Title"] || "Untitled"}</div>
            ${
              story.fields?.["System.Description"]
                ? `
              <div class="prior-story-description">${this.truncateText(this.stripHtml(story.fields["System.Description"]), 200)}</div>
            `
                : ""
            }
            <div class="prior-story-actions">
              <button class="btn-link" onclick="window.open('${story._links?.html?.href || `https://dev.azure.com/carepayment/Core/_workitems/edit/${story.id}`}', '_blank')">View in ADO</button>
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
      <div class="prior-stories-summary">
        <p><strong>${this.priorStories.length}</strong> related ${this.priorStories.length === 1 ? "story" : "stories"} found. Review these for potential regression impact.</p>
      </div>
    `;
  }

  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }

  render() {
    const hasExtractedFiles = this.extractedData.filePaths.length > 0;
    const hasExtractedStories = this.extractedData.priorStoryIds.length > 0;

    this.container.innerHTML = `
      <div class="analysis-panel">
        ${
          this.currentStory
            ? this.renderStoryAnalysisView(
                hasExtractedFiles,
                hasExtractedStories,
              )
            : this.renderEmptyState()
        }
      </div>
    `;

    if (this.currentStory) {
      this.attachEventListeners();
      // Auto-fetch prior stories if we have IDs
      if (hasExtractedStories && this.priorStories.length === 0) {
        this.fetchPriorStories();
      }
    } else {
      this.attachEmptyStateListeners();
    }
  }

  renderEmptyState() {
    const appOptions = this.availableApps
      .map((app) => `<option value="${app.name}">${app.name}</option>`)
      .join("");

    return `
      <div class="panel analyzer-panel">
        <h2>🔍 Story Analysis</h2>
        <p class="panel-description">Analyze blast radius, risk assessment, and integration impact for any work item</p>

        <div class="analyzer-form">
          <div class="form-group">
            <label for="analysisAppSelect" class="required">Application</label>
            <select id="analysisAppSelect">
              <option value="">Select Application...</option>
              ${appOptions}
            </select>
            <small>Required for code analysis features</small>
          </div>

          <div class="form-group">
            <label for="analysisStoryIdInput" class="required">Story ID</label>
            <input type="number" id="analysisStoryIdInput" placeholder="Enter story ID (e.g., 12345)">
          </div>

          <div class="form-actions">
            <button id="loadStoryForAnalysisBtn" class="btn btn-primary" disabled>
              <span id="loadStoryLoading" style="display:none;" class="loading-spinner"></span>
              <span id="loadStoryText">📊 Load Story</span>
            </button>
          </div>

          <div id="loadStoryError" class="error-message" style="display:none;"></div>
        </div>

        <div class="analysis-alt-option">
          <div class="alt-divider"><span>OR</span></div>
          <p>Navigate from the <strong>Work Items</strong> tab and click <strong>📊 View Analysis</strong> on any parent item.</p>
        </div>
      </div>
    `;
  }

  renderStoryAnalysisView(hasExtractedFiles, hasExtractedStories) {
    const story = this.currentStory;
    const technicalDetails = story.fields?.["Custom.TechnicalDetails"] || "";

    return `
      <div class="analysis-header">
        <div class="story-header-row">
          <h2>Story Analysis</h2>
          <button id="clearStoryBtn" class="btn btn-secondary btn-small">← Back</button>
        </div>
        <div class="story-info">
          <span class="story-id">#${story.id}</span>
          <span class="story-type type-${(story.fields?.["System.WorkItemType"] || "").toLowerCase().replace(/\s+/g, "-")}">${story.fields?.["System.WorkItemType"] || "Unknown"}</span>
          <span class="story-state state-${(story.fields?.["System.State"] || "").toLowerCase()}">${story.fields?.["System.State"] || "Unknown"}</span>
        </div>
        <h3 class="story-title">${story.fields?.["System.Title"] || "Untitled"}</h3>
      </div>

      <!-- Story Details Sections -->
      <div class="story-details-sections">
        ${
          story.fields?.["System.Description"]
            ? `
          <div class="story-section">
            <div class="section-header-collapsible" data-section="description">
              <h4>📄 Description</h4>
              <span class="collapse-icon">▼</span>
            </div>
            <div class="section-content" id="section-description">
              <div class="formatted-content">${this.formatHtmlContent(story.fields["System.Description"])}</div>
            </div>
          </div>
        `
            : ""
        }

        ${
          story.fields?.["Microsoft.VSTS.Common.AcceptanceCriteria"]
            ? `
          <div class="story-section">
            <div class="section-header-collapsible" data-section="acceptance">
              <h4>✅ Acceptance Criteria</h4>
              <span class="collapse-icon">▼</span>
            </div>
            <div class="section-content" id="section-acceptance">
              <div class="formatted-content">${this.formatHtmlContent(story.fields["Microsoft.VSTS.Common.AcceptanceCriteria"])}</div>
            </div>
          </div>
        `
            : ""
        }

        ${
          technicalDetails
            ? `
          <div class="story-section technical-details-section">
            <div class="section-header-collapsible" data-section="technical">
              <h4>🔧 Technical Details</h4>
              <span class="collapse-icon">▼</span>
            </div>
            <div class="section-content" id="section-technical">
              <div class="formatted-content">${this.formatHtmlContent(technicalDetails)}</div>
            </div>
          </div>
        `
            : ""
        }

        ${this.getChildTasksHtml()}
      </div>

      <!-- Extracted Information -->
      ${
        hasExtractedFiles || hasExtractedStories
          ? `
        <div class="extracted-info-section">
          <h3>📊 Extracted Information</h3>
          <p class="section-description">Automatically extracted from Technical Details field</p>

          ${
            hasExtractedFiles
              ? `
            <div class="extracted-block">
              <h4>📁 Detected File Paths (${this.extractedData.filePaths.length})</h4>
              <div class="file-chips">
                ${this.extractedData.filePaths
                  .map(
                    (file) => `
                  <span class="file-chip">${file}</span>
                `,
                  )
                  .join("")}
              </div>
            </div>
          `
              : ""
          }

          ${
            hasExtractedStories
              ? `
            <div class="extracted-block">
              <h4>🔗 Related Stories (${this.extractedData.priorStoryIds.length})</h4>
              <div class="story-chips">
                ${this.extractedData.priorStoryIds
                  .map(
                    (id) => `
                  <span class="story-chip">#${id}</span>
                `,
                  )
                  .join("")}
              </div>
            </div>
          `
              : ""
          }

          ${
            this.extractedData.implementationNotes.length > 0
              ? `
            <div class="extracted-block">
              <h4>📝 Implementation Notes (${this.extractedData.implementationNotes.length})</h4>
              <ul class="notes-list">
                ${this.extractedData.implementationNotes
                  .slice(0, 5)
                  .map(
                    (note) => `
                  <li>${note}</li>
                `,
                  )
                  .join("")}
              </ul>
            </div>
          `
              : ""
          }
        </div>
      `
          : ""
      }

      <!-- Prior Stories Section -->
      ${
        hasExtractedStories
          ? `
        <div class="analysis-section">
          <div class="section-header">
            <h3>📚 Prior Story Analysis</h3>
            <button id="refreshPriorStoriesBtn" class="btn-secondary">Refresh</button>
          </div>
          <div id="priorStoriesContent" class="analysis-content">
            <p class="placeholder">Loading related stories for impact analysis...</p>
          </div>
        </div>
      `
          : ""
      }

      <!-- Analysis Sections -->
      <div class="analysis-sections">
        <div class="analysis-section">
          <div class="section-header-collapsible-with-action" data-section="blast-radius">
            <div class="section-header-left">
              <span class="collapse-icon">▼</span>
              <h3>🔥 Blast Radius Analysis</h3>
            </div>
            <button id="runBlastRadiusBtn" class="btn-secondary" ${!hasExtractedFiles && !this.currentApp ? "disabled" : ""}>
              ${hasExtractedFiles ? "Auto-Analyze" : "Run Analysis"}
            </button>
          </div>
          <div id="blastRadiusContent" class="analysis-content section-collapsible-content" data-section="blast-radius">
            ${
              hasExtractedFiles
                ? `
              <p class="auto-info">✨ ${this.extractedData.filePaths.length} files detected from Technical Details. Click "Auto-Analyze" to run blast radius analysis.</p>
            `
                : `
              <p class="placeholder">No files detected. Enter files manually or ensure Technical Details contains file paths.</p>
              <div class="manual-files-input">
                <label>Manual File Paths (one per line):</label>
                <textarea id="changedFilesInput" rows="4" placeholder="Services/BillingService.cs&#10;Controllers/BillingController.cs"></textarea>
              </div>
            `
            }
          </div>
        </div>

        <div class="analysis-section">
          <div class="section-header-collapsible-with-action" data-section="risk-assessment">
            <div class="section-header-left">
              <span class="collapse-icon">▼</span>
              <h3>⚠️ Risk Assessment</h3>
            </div>
            <button id="runRiskBtn" class="btn-secondary">Run Analysis</button>
          </div>
          <div id="riskAnalysisContent" class="analysis-content section-collapsible-content" data-section="risk-assessment">
            <p class="placeholder">Click "Run Analysis" to assess risk factors based on story content and detected patterns.</p>
          </div>
        </div>

        <div class="analysis-section">
          <div class="section-header-collapsible-with-action" data-section="integration-impact">
            <div class="section-header-left">
              <span class="collapse-icon">▼</span>
              <h3>🔗 Integration Impact</h3>
            </div>
            <button id="runIntegrationBtn" class="btn-secondary" ${!this.currentApp ? "disabled title='Select an app first'" : ""}>Run Analysis</button>
          </div>
          <div id="integrationAnalysisContent" class="analysis-content section-collapsible-content" data-section="integration-impact">
            <p class="placeholder">${this.currentApp ? 'Click "Run Analysis" to discover integration points.' : "⚠️ Application selection required for integration analysis."}</p>
          </div>
        </div>
      </div>

      <!-- Test Case Generation Section -->
      <div class="analysis-section test-generation-section">
        <div class="section-header-collapsible-with-action" data-section="test-generation">
          <div class="section-header-left">
            <span class="collapse-icon">▼</span>
            <h3>✅ Test Case Generation</h3>
          </div>
        </div>
        <div id="testGenerationContent" class="analysis-content section-collapsible-content" data-section="test-generation">
          <p class="placeholder">Run Risk Analysis first to enable risk-prioritized test case generation.</p>
          <div class="test-gen-options" style="display:none;">
            <label><input type="checkbox" id="includeNegativeTestsAnalysis" checked> Include Negative Tests</label>
            <label><input type="checkbox" id="includeEdgeCasesAnalysis" checked> Include Edge Cases</label>
            <label><input type="checkbox" id="includeIntegrationTestsAnalysis" checked> Include Integration Tests</label>
          </div>
        </div>
        <div id="generatedTestCasesResults" class="section-collapsible-content" data-section="test-generation" style="display:none;">
          <!-- Generated test cases will appear here -->
        </div>
      </div>

      <div class="analysis-actions">
        <button id="generateTestCasesFromAnalysisBtn" class="btn-success btn-generate" disabled>
          <span id="generateTestCasesAnalysisLoading" style="display:none;" class="loading-spinner"></span>
          <span id="generateTestCasesAnalysisText">✅ Generate Test Cases</span>
        </button>
        <button id="pushToAdoBtn" class="btn-primary btn-push" disabled>
          <span class="btn-icon">⬆</span>
          Push Analysis to Azure DevOps
        </button>
        <p class="push-info">Run Risk Analysis to enable test case generation, or run any analysis to push to ADO</p>
      </div>
    `;
  }

  attachEmptyStateListeners() {
    const loadStoryBtn = document.getElementById("loadStoryForAnalysisBtn");
    const storyInput = document.getElementById("analysisStoryIdInput");
    const appSelect = document.getElementById("analysisAppSelect");

    // Enable/disable load button based on app selection
    const updateButtonState = () => {
      const hasApp = appSelect?.value?.trim();
      const hasStoryId = storyInput?.value?.trim();
      if (loadStoryBtn) {
        loadStoryBtn.disabled = !hasApp || !hasStoryId;
      }
    };

    if (appSelect) {
      appSelect.addEventListener("change", updateButtonState);
    }

    if (storyInput) {
      storyInput.addEventListener("input", updateButtonState);
      storyInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !loadStoryBtn.disabled) {
          this.loadStoryById();
        }
      });
    }

    if (loadStoryBtn) {
      loadStoryBtn.addEventListener("click", () => this.loadStoryById());
    }
  }

  async loadStoryById() {
    const input = document.getElementById("analysisStoryIdInput");
    const appSelect = document.getElementById("analysisAppSelect");
    const loadingSpinner = document.getElementById("loadStoryLoading");
    const loadText = document.getElementById("loadStoryText");
    const errorDiv = document.getElementById("loadStoryError");
    const loadBtn = document.getElementById("loadStoryForAnalysisBtn");

    const storyId = input?.value?.trim();
    const selectedApp = appSelect?.value?.trim();

    if (!selectedApp) {
      errorDiv.textContent = "Please select an Application";
      errorDiv.style.display = "block";
      return;
    }

    if (!storyId) {
      errorDiv.textContent = "Please enter a story ID";
      errorDiv.style.display = "block";
      return;
    }

    // Show loading state
    loadingSpinner.style.display = "inline-block";
    loadText.textContent = "Loading...";
    loadBtn.disabled = true;
    errorDiv.style.display = "none";

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/ado/work-item/${storyId}`,
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to load story (HTTP ${response.status})`,
        );
      }

      const data = await response.json();

      if (!data.success || !data.workItem) {
        throw new Error(data.error || "Story not found");
      }

      // Load the story into the analysis panel with selected app
      this.showAnalysis(data.workItem, selectedApp);
    } catch (error) {
      console.error("Failed to load story:", error);
      errorDiv.textContent =
        error.message ||
        "Failed to load story. Please check the ID and try again.";
      errorDiv.style.display = "block";

      // Reset button state
      loadingSpinner.style.display = "none";
      loadText.textContent = "📊 Load Story";
      loadBtn.disabled = false;
    }
  }

  attachEventListeners() {
    const runBlastRadiusBtn = document.getElementById("runBlastRadiusBtn");
    const runRiskBtn = document.getElementById("runRiskBtn");
    const runIntegrationBtn = document.getElementById("runIntegrationBtn");
    const pushToAdoBtn = document.getElementById("pushToAdoBtn");
    const clearStoryBtn = document.getElementById("clearStoryBtn");
    const refreshPriorStoriesBtn = document.getElementById(
      "refreshPriorStoriesBtn",
    );
    const generateTestCasesBtn = document.getElementById(
      "generateTestCasesFromAnalysisBtn",
    );

    // Collapsible sections (story details - Description, AC, Technical Details)
    document
      .querySelectorAll(".section-header-collapsible")
      .forEach((header) => {
        header.addEventListener("click", () => {
          const sectionId = header.dataset.section;
          const content = document.getElementById(`section-${sectionId}`);
          const icon = header.querySelector(".collapse-icon");
          if (content) {
            content.classList.toggle("collapsed");
            icon.textContent = content.classList.contains("collapsed")
              ? "▶"
              : "▼";
          }
        });
      });

    // Collapsible analysis sections (with action buttons)
    document
      .querySelectorAll(".section-header-collapsible-with-action")
      .forEach((header) => {
        // Only toggle when clicking on the left side (title area), not the button
        const leftSide = header.querySelector(".section-header-left");
        if (leftSide) {
          leftSide.style.cursor = "pointer";
          leftSide.addEventListener("click", () => {
            const sectionId = header.dataset.section;
            const contents = document.querySelectorAll(
              `.section-collapsible-content[data-section="${sectionId}"]`,
            );
            const icon = header.querySelector(".collapse-icon");

            contents.forEach((content) => {
              content.classList.toggle("collapsed");
            });

            if (icon) {
              const isCollapsed = contents[0]?.classList.contains("collapsed");
              icon.textContent = isCollapsed ? "▶" : "▼";
            }
          });
        }
      });

    if (clearStoryBtn) {
      clearStoryBtn.addEventListener("click", () => {
        this.currentStory = null;
        this.currentApp = null;
        this.extractedData = {
          filePaths: [],
          priorStoryIds: [],
          implementationNotes: [],
        };
        this.priorStories = [];
        this.analysisResults = {
          risk: null,
          integration: null,
          blastRadius: null,
          priorStoryAnalysis: null,
        };
        this.generatedTestCases = null;
        this.render();
      });
    }

    if (refreshPriorStoriesBtn) {
      refreshPriorStoriesBtn.addEventListener("click", () =>
        this.fetchPriorStories(),
      );
    }

    if (runBlastRadiusBtn) {
      runBlastRadiusBtn.addEventListener("click", () => this.loadBlastRadius());
    }

    if (runRiskBtn) {
      runRiskBtn.addEventListener("click", () => this.loadRiskAnalysis());
    }

    if (runIntegrationBtn) {
      runIntegrationBtn.addEventListener("click", () =>
        this.loadIntegrationAnalysis(),
      );
    }

    if (pushToAdoBtn) {
      pushToAdoBtn.addEventListener("click", () => this.showPushPreview());
    }

    if (generateTestCasesBtn) {
      generateTestCasesBtn.addEventListener("click", () =>
        this.generateTestCases(),
      );
    }
  }

  updatePushButtonState() {
    const pushBtn = document.getElementById("pushToAdoBtn");
    if (!pushBtn) return;

    const hasAnyAnalysis =
      this.analysisResults.risk ||
      this.analysisResults.integration ||
      this.analysisResults.blastRadius;

    pushBtn.disabled = !hasAnyAnalysis;

    if (hasAnyAnalysis) {
      const analysisCount = [
        this.analysisResults.risk,
        this.analysisResults.integration,
        this.analysisResults.blastRadius,
      ].filter(Boolean).length;

      const pushInfo = document.querySelector(".push-info");
      if (pushInfo) {
        pushInfo.textContent = `${analysisCount} analysis result${analysisCount > 1 ? "s" : ""} ready to push`;
        pushInfo.style.color = "#28a745";
      }
    }
  }

  showPushPreview() {
    const modal = new PushPreviewModal();
    modal.show(this.currentStory, this.analysisResults);
  }

  getChildTasksHtml() {
    if (!this.currentStory || !this.currentStory.relations) {
      return "";
    }

    const childTasks = [];
    for (const relation of this.currentStory.relations) {
      if (relation.rel === "System.LinkTypes.Hierarchy-Forward") {
        const childIdMatch = relation.url.match(/\/(\d+)$/);
        if (childIdMatch) {
          childTasks.push({ id: parseInt(childIdMatch[1]) });
        }
      }
    }

    if (childTasks.length === 0) {
      return "";
    }

    return `
      <div class="story-section">
        <div class="section-header-collapsible" data-section="tasks">
          <h4>📋 Child Tasks (${childTasks.length})</h4>
          <span class="collapse-icon">▼</span>
        </div>
        <div class="section-content" id="section-tasks">
          <div class="child-tasks-list">
            ${childTasks.map((task) => `<span class="task-chip">#${task.id}</span>`).join("")}
          </div>
        </div>
      </div>
    `;
  }

  extractChangedFiles() {
    // First try to use extracted files from Technical Details
    if (this.extractedData.filePaths.length > 0) {
      return this.extractedData.filePaths;
    }

    // Fall back to manual input
    const textarea = document.getElementById("changedFilesInput");
    if (!textarea) return [];

    const text = textarea.value.trim();
    if (!text) return [];

    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  async loadBlastRadius() {
    const container = document.getElementById("blastRadiusContent");
    const changedFiles = this.extractChangedFiles();

    if (changedFiles.length === 0) {
      container.innerHTML =
        '<div class="error">No file paths detected. Please add files manually or ensure Technical Details contains file paths.</div>';
      return;
    }

    container.innerHTML = `<div class="loading">Analyzing blast radius for ${changedFiles.length} files...</div>`;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/analysis/blast-radius/analyze`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            app: this.currentApp,
            changedFiles,
            analysisDepth: "moderate",
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Analysis failed");
      }

      const blast = data.result;

      // Store analysis result
      this.analysisResults.blastRadius = blast;
      this.updatePushButtonState();

      container.innerHTML = `
        <div class="blast-summary risk-${blast.risk.level}">
          <div class="metric">
            <span class="label">Risk Level:</span>
            <span class="risk-badge ${blast.risk.level}">${blast.risk.level.toUpperCase()}</span>
          </div>
          <div class="metric">
            <span class="label">Risk Score:</span>
            <span class="value">${blast.risk.score}/100</span>
          </div>
        </div>

        <div class="risk-description">
          <p>${blast.risk.description}</p>
        </div>

        <div class="impact-details">
          <h4>📁 Analyzed Files (${blast.changedFiles?.length || 0})</h4>
          <ul class="file-list">
            ${(blast.changedFiles || [])
              .map(
                (file) => `
              <li>
                <span class="file-name">${file.file}</span>
                ${file.exists ? '<span class="badge success">exists</span>' : '<span class="badge error">not found</span>'}
                ${file.classes ? `<small>${file.classes.length} classes</small>` : ""}
              </li>
            `,
              )
              .join("")}
          </ul>

          <h4>🎯 Affected Components (${blast.impact?.affectedComponents?.length || 0})</h4>
          <ul class="component-list">
            ${(blast.impact?.affectedComponents || []).map((comp) => `<li>${comp}</li>`).join("") || '<li class="empty">No components identified</li>'}
          </ul>

          <h4>🧪 Affected Tests (${blast.impact?.affectedTests?.length || 0})</h4>
          <ul class="test-list">
            ${(blast.impact?.affectedTests || []).map((test) => `<li>${test}</li>`).join("") || '<li class="empty">No test files identified</li>'}
          </ul>
        </div>

        <div class="recommendations">
          <h4>💡 Recommendations</h4>
          <ul>
            ${
              (blast.recommendations || [])
                .map(
                  (rec) => `
              <li class="priority-${rec.priority}">
                <strong>[${rec.category}]</strong> ${rec.recommendation}
                ${rec.files ? `<br><small>Files: ${rec.files.join(", ")}</small>` : ""}
              </li>
            `,
                )
                .join("") || "<li>No specific recommendations</li>"
            }
          </ul>
        </div>
      `;
    } catch (error) {
      console.error("Blast radius error:", error);
      container.innerHTML = `<div class="error">Error loading blast radius: ${error.message}</div>`;
    }
  }

  async loadRiskAnalysis() {
    const container = document.getElementById("riskAnalysisContent");
    container.innerHTML =
      '<div class="loading">Analyzing risk factors per Acceptance Criterion...</div>';

    try {
      // Use enhanced per-AC risk analysis endpoint
      const response = await fetch(
        `${API_BASE_URL}/api/analysis/risk/analyze-ac`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            app: this.currentApp,
            story: {
              id: this.currentStory.id,
              title: this.currentStory.fields["System.Title"],
              description: this.currentStory.fields["System.Description"] || "",
              acceptanceCriteria:
                this.currentStory.fields[
                  "Microsoft.VSTS.Common.AcceptanceCriteria"
                ] || "",
              technicalDetails:
                this.currentStory.fields["Custom.TechnicalDetails"] || "",
            },
            acceptanceCriteria:
              this.currentStory.fields[
                "Microsoft.VSTS.Common.AcceptanceCriteria"
              ] || "",
            extractedData: this.extractedData,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Risk analysis failed");
      }

      // Store analysis result
      this.analysisResults.risk = data;
      this.updatePushButtonState();
      this.updateTestGenerationButtonState();

      // Render enhanced risk analysis with per-AC breakdown
      container.innerHTML = this.renderEnhancedRiskAnalysis(data);
    } catch (error) {
      console.error("Risk analysis error:", error);
      container.innerHTML = `
        <div class="warning">
          <p><strong>Note:</strong> Risk analysis failed.</p>
          <p>Error: ${error.message}</p>
        </div>
      `;
    }
  }

  renderEnhancedRiskAnalysis(data) {
    const {
      riskMatrix,
      acRiskMapping,
      formattedOutput,
      testPrioritization,
      suggestedTestTypes,
    } = data;

    // Overall risk summary
    const overallHtml = riskMatrix
      ? `
      <div class="risk-summary risk-${riskMatrix.overall?.level || "medium"}">
        <span class="risk-badge ${riskMatrix.overall?.level || "medium"}">${(riskMatrix.overall?.level || "medium").toUpperCase()}</span>
        <span class="risk-score">Score: ${riskMatrix.overall?.score || 50}/100</span>
      </div>
      <div class="risk-matrix-grid">
        <div class="matrix-cell">
          <strong>Likelihood:</strong> ${riskMatrix.probability?.level || "Medium"} (${riskMatrix.probability?.score || 50}/100)
        </div>
        <div class="matrix-cell">
          <strong>Impact:</strong> ${riskMatrix.impact?.level || "Medium"} (${riskMatrix.impact?.score || 50}/100)
        </div>
      </div>
      <p class="risk-recommendation">${riskMatrix.overall?.recommendation || ""}</p>
    `
      : '<p class="empty-message">Risk matrix not available</p>';

    // AC Risk Summary Table
    const summaryTableHtml =
      formattedOutput?.summaryTable?.length > 0
        ? `
      <div class="ac-risk-table">
        <h4>Risk Summary by Acceptance Criterion</h4>
        <table class="risk-matrix-table">
          <thead>
            <tr>
              <th>AC</th>
              <th>Description</th>
              <th>Risk</th>
              <th>L</th>
              <th>I</th>
              <th>Score</th>
              <th>Test Depth</th>
            </tr>
          </thead>
          <tbody>
            ${formattedOutput.summaryTable
              .map(
                (row) => `
              <tr class="risk-row risk-${row.riskLevel}">
                <td><strong>${row.ac}</strong></td>
                <td>${row.text}</td>
                <td><span class="risk-badge-small ${row.riskLevel}">${row.riskLevel.toUpperCase()}</span></td>
                <td>${row.likelihood}</td>
                <td>${row.impact}</td>
                <td>${row.riskScore}</td>
                <td>${row.testDepth}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `
        : "";

    // Detailed AC Analysis
    const detailedHtml =
      formattedOutput?.detailedAnalysis?.length > 0
        ? `
      <div class="ac-detailed-analysis">
        <h4>Detailed Analysis per AC</h4>
        ${formattedOutput.detailedAnalysis
          .map(
            (ac) => `
          <div class="ac-detail-card risk-border-${ac.riskPriority.toLowerCase()}">
            <div class="ac-detail-header">
              <strong>${ac.acReference}</strong>
              <span class="risk-badge-small ${ac.riskPriority.toLowerCase()}">${ac.riskPriority}</span>
            </div>
            <div class="ac-detail-text">${ac.text}</div>

            <div class="ac-risk-scores">
              <span>Likelihood: <strong>${ac.likelihoodScore}/5</strong></span>
              <span>Impact: <strong>${ac.impactScore}/5</strong></span>
              <span>Risk Score: <strong>${ac.riskScore}</strong></span>
            </div>

            ${
              ac.riskFactors?.integrationPoints?.length > 0
                ? `
              <div class="ac-risk-factors">
                <strong>Risk Factors:</strong> ${ac.riskFactors.integrationPoints.join(", ")}
              </div>
            `
                : ""
            }

            <div class="ac-test-focus">
              <strong>Recommended Test Focus:</strong>
              <ul>
                ${ac.recommendedTestFocus?.testTypes?.map((t) => `<li>${t}</li>`).join("") || "<li>Standard testing</li>"}
              </ul>
              ${
                ac.recommendedTestFocus?.scenarios?.length > 0
                  ? `
                <div class="test-scenarios">
                  <strong>Scenarios:</strong> ${ac.recommendedTestFocus.scenarios.join("; ")}
                </div>
              `
                  : ""
              }
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
    `
        : "";

    // Testing Prioritization
    const priorityHtml = formattedOutput?.testingPriority
      ? `
      <div class="testing-priority">
        <h4>Testing Prioritization Order</h4>
        <ol class="priority-list">
          ${
            formattedOutput.testingPriority.order
              ?.map(
                (item) => `
            <li class="priority-${item.riskLevel}">
              <strong>${item.ac}</strong> - ${item.riskLevel.toUpperCase()}
              ${item.reason ? `<span class="priority-reason">(${item.reason})</span>` : ""}
            </li>
          `,
              )
              .join("") || "<li>No prioritization available</li>"
          }
        </ol>
      </div>
    `
      : "";

    // Integration Recommendations
    const integrationHtml = suggestedTestTypes
      ? `
      <div class="test-type-recommendations">
        <h4>Recommended Test Types</h4>
        <div class="test-type-grid">
          ${Object.entries(suggestedTestTypes)
            .map(
              ([type, rec]) => `
            <div class="test-type-card priority-${rec.priority}">
              <strong>${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
              <span class="priority-badge">${rec.priority}</span>
              <p>${rec.reason}</p>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `
      : "";

    return `
      <div class="enhanced-risk-analysis">
        ${overallHtml}
        ${summaryTableHtml}
        ${detailedHtml}
        ${priorityHtml}
        ${integrationHtml}
      </div>
    `;
  }

  async loadIntegrationAnalysis() {
    const container = document.getElementById("integrationAnalysisContent");

    if (!this.currentApp) {
      container.innerHTML =
        '<div class="warning">Please select an application to run integration analysis.</div>';
      return;
    }

    container.innerHTML = '<div class="loading">Mapping integrations...</div>';

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/analysis/integrations/map`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            app: this.currentApp,
            integrationType: "all",
            includeDiagram: false,
            changedFiles: this.extractedData.filePaths,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Integration mapping failed");
      }

      const integrations = data.result;

      // Store analysis result
      this.analysisResults.integration = integrations;
      this.updatePushButtonState();

      container.innerHTML = `
        <div class="integration-summary">
          <div class="metric">
            <span class="label">Total Integrations:</span>
            <span class="value">${integrations.summary?.total || 0}</span>
          </div>
          <div class="integration-types">
            ${Object.entries(integrations.summary?.byType || {})
              .map(
                ([type, count]) => `
              <span class="type-badge ${type}">${type}: ${count}</span>
            `,
              )
              .join("")}
          </div>
        </div>

        <div class="integration-list">
          <h4>Integration Points:</h4>
          <ul>
            ${
              (integrations.integrations || [])
                .slice(0, 10)
                .map(
                  (integration) => `
              <li>
                <strong>${integration.type}:</strong> ${integration.url || integration.details?.className || "Unknown"}
                <br><small>${integration.file || "No file info"}</small>
              </li>
            `,
                )
                .join("") || '<li class="empty">No integrations found</li>'
            }
          </ul>
          ${integrations.integrations?.length > 10 ? `<p class="more">...and ${integrations.integrations.length - 10} more</p>` : ""}
        </div>
      `;
    } catch (error) {
      console.error("Integration mapping error:", error);
      container.innerHTML = `
        <div class="warning">
          <p><strong>Note:</strong> Integration Mapper requires full implementation (Phase 4).</p>
          <p>Error: ${error.message}</p>
        </div>
      `;
    }
  }

  /**
   * Parse Acceptance Criteria from story
   */
  parseAcceptanceCriteria() {
    const acField =
      this.currentStory?.fields?.["Microsoft.VSTS.Common.AcceptanceCriteria"] ||
      "";
    if (!acField) return [];

    const textContent = this.stripHtml(acField);
    const acceptanceCriteria = [];

    // Pattern 1: Numbered ACs (1. AC text, 2. AC text)
    const numberedPattern = /(\d+)\.\s*([^\d\n][^\n]+)/g;
    let match;
    while ((match = numberedPattern.exec(textContent)) !== null) {
      acceptanceCriteria.push({
        number: parseInt(match[1]),
        text: match[2].trim(),
        id: `AC${match[1]}`,
      });
    }

    // If no numbered ACs found, try bullet points or "Given/When/Then"
    if (acceptanceCriteria.length === 0) {
      // Pattern 2: Given/When/Then scenarios
      const gwtPattern =
        /(?:Given|Scenario)[:\s]+([^\n]+(?:\n(?:And|When|Then)[^\n]+)*)/gi;
      let acNum = 1;
      while ((match = gwtPattern.exec(textContent)) !== null) {
        acceptanceCriteria.push({
          number: acNum,
          text: match[1].trim(),
          id: `AC${acNum}`,
        });
        acNum++;
      }
    }

    // Pattern 3: Bullet points (- or *)
    if (acceptanceCriteria.length === 0) {
      const bulletPattern = /^[\s]*[-*•]\s*(.+)$/gm;
      let acNum = 1;
      while ((match = bulletPattern.exec(textContent)) !== null) {
        acceptanceCriteria.push({
          number: acNum,
          text: match[1].trim(),
          id: `AC${acNum}`,
        });
        acNum++;
      }
    }

    // If still nothing, split by sentences
    if (acceptanceCriteria.length === 0) {
      const sentences = textContent
        .split(/[.!?]+/)
        .filter((s) => s.trim().length > 10);
      sentences.forEach((sentence, index) => {
        acceptanceCriteria.push({
          number: index + 1,
          text: sentence.trim(),
          id: `AC${index + 1}`,
        });
      });
    }

    console.log(
      "[AnalysisPanel] Parsed Acceptance Criteria:",
      acceptanceCriteria,
    );
    return acceptanceCriteria;
  }

  /**
   * Update test generation button state based on risk analysis
   */
  updateTestGenerationButtonState() {
    const generateBtn = document.getElementById(
      "generateTestCasesFromAnalysisBtn",
    );
    const testGenContent = document.getElementById("testGenerationContent");
    const testGenOptions = testGenContent?.querySelector(".test-gen-options");

    if (!generateBtn) return;

    const hasRiskAnalysis = this.analysisResults.risk !== null;
    const hasAcceptanceCriteria =
      this.currentStory?.fields?.["Microsoft.VSTS.Common.AcceptanceCriteria"];

    generateBtn.disabled = !hasAcceptanceCriteria;

    if (testGenContent) {
      if (hasRiskAnalysis && hasAcceptanceCriteria) {
        testGenContent.querySelector(".placeholder").textContent =
          "Ready to generate risk-prioritized test cases based on Acceptance Criteria.";
        if (testGenOptions) testGenOptions.style.display = "flex";
      } else if (!hasAcceptanceCriteria) {
        testGenContent.querySelector(".placeholder").textContent =
          "Story has no Acceptance Criteria. Cannot generate test cases.";
        if (testGenOptions) testGenOptions.style.display = "none";
      } else {
        testGenContent.querySelector(".placeholder").textContent =
          "Run Risk Analysis first for risk-prioritized test generation, or generate basic test cases now.";
        if (testGenOptions) testGenOptions.style.display = "flex";
      }
    }
  }

  /**
   * Generate test cases based on story, ACs, and risk analysis
   */
  async generateTestCases() {
    const resultsContainer = document.getElementById(
      "generatedTestCasesResults",
    );
    const loadingSpinner = document.getElementById(
      "generateTestCasesAnalysisLoading",
    );
    const buttonText = document.getElementById("generateTestCasesAnalysisText");
    const generateBtn = document.getElementById(
      "generateTestCasesFromAnalysisBtn",
    );

    if (!this.currentStory) {
      alert("No story loaded. Please load a story first.");
      return;
    }

    const acceptanceCriteria = this.parseAcceptanceCriteria();
    if (acceptanceCriteria.length === 0) {
      alert(
        "No Acceptance Criteria found in story. Cannot generate test cases.",
      );
      return;
    }

    // Show loading state
    if (loadingSpinner) loadingSpinner.style.display = "inline-block";
    if (buttonText) buttonText.textContent = "Generating...";
    if (generateBtn) generateBtn.disabled = true;
    if (resultsContainer) {
      resultsContainer.style.display = "block";
      resultsContainer.innerHTML =
        '<div class="loading">Generating test cases based on risk analysis and Acceptance Criteria...</div>';
    }

    // Get options
    const includeNegative =
      document.getElementById("includeNegativeTestsAnalysis")?.checked ?? true;
    const includeEdgeCases =
      document.getElementById("includeEdgeCasesAnalysis")?.checked ?? true;
    const includeIntegration =
      document.getElementById("includeIntegrationTestsAnalysis")?.checked ??
      true;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/ado/generate-test-cases`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            app: this.currentApp,
            storyId: this.currentStory.id,
            story: {
              id: this.currentStory.id,
              title: this.currentStory.fields["System.Title"],
              description: this.currentStory.fields["System.Description"] || "",
              acceptanceCriteria:
                this.currentStory.fields[
                  "Microsoft.VSTS.Common.AcceptanceCriteria"
                ] || "",
              technicalDetails:
                this.currentStory.fields["Custom.TechnicalDetails"] || "",
            },
            parsedAcceptanceCriteria: acceptanceCriteria,
            riskAnalysis: this.analysisResults.risk,
            integrationAnalysis: this.analysisResults.integration,
            options: {
              includeNegative,
              includeEdgeCases,
              includeIntegration,
              namingFormat:
                "PBI-{storyId} AC{acNumber}: [{type}] {description}",
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Test case generation failed");
      }

      this.generatedTestCases = data.testCases;
      this.renderGeneratedTestCases(acceptanceCriteria);
    } catch (error) {
      console.error("Test case generation error:", error);
      if (resultsContainer) {
        resultsContainer.innerHTML = `
          <div class="error">
            <p><strong>Error generating test cases:</strong> ${error.message}</p>
            <p>Ensure the test generation API is available and properly configured.</p>
          </div>
        `;
      }
    } finally {
      // Reset button state
      if (loadingSpinner) loadingSpinner.style.display = "none";
      if (buttonText) buttonText.textContent = "✅ Generate Test Cases";
      if (generateBtn) generateBtn.disabled = false;
    }
  }

  /**
   * Render generated test cases grouped by AC
   */
  renderGeneratedTestCases(acceptanceCriteria) {
    const resultsContainer = document.getElementById(
      "generatedTestCasesResults",
    );
    if (!resultsContainer || !this.generatedTestCases) return;

    const testCases = this.generatedTestCases;

    // Group test cases by AC
    const groupedByAC = {};
    acceptanceCriteria.forEach((ac) => {
      groupedByAC[ac.id] = {
        ac: ac,
        testCases: [],
      };
    });

    // Assign test cases to their ACs
    testCases.forEach((tc) => {
      const acRef = tc.acceptanceCriteriaRef || tc.acRef || "AC1";
      if (groupedByAC[acRef]) {
        groupedByAC[acRef].testCases.push(tc);
      } else {
        // If AC not found, add to first AC
        const firstAC = Object.keys(groupedByAC)[0];
        if (firstAC) {
          groupedByAC[firstAC].testCases.push(tc);
        }
      }
    });

    // Count by type
    const typeCounts = {
      positive: testCases.filter((tc) => tc.type === "positive").length,
      negative: testCases.filter((tc) => tc.type === "negative").length,
      edge: testCases.filter((tc) => tc.type === "edge").length,
      integration: testCases.filter((tc) => tc.type === "integration").length,
    };

    resultsContainer.innerHTML = `
      <div class="test-cases-summary">
        <h4>Generated Test Cases Summary</h4>
        <div class="test-stats">
          <span class="stat"><strong>${testCases.length}</strong> Total Test Cases</span>
          <span class="stat type-positive">${typeCounts.positive} Positive</span>
          <span class="stat type-negative">${typeCounts.negative} Negative</span>
          <span class="stat type-edge">${typeCounts.edge} Edge Cases</span>
          <span class="stat type-integration">${typeCounts.integration} Integration</span>
        </div>
      </div>

      <div class="test-cases-by-ac">
        ${Object.entries(groupedByAC)
          .map(
            ([acId, data]) => `
          <div class="ac-group">
            <div class="ac-header">
              <h5>${acId}: ${this.truncateText(data.ac.text, 80)}</h5>
              <span class="ac-test-count">${data.testCases.length} tests</span>
            </div>
            <div class="ac-test-cases">
              ${
                data.testCases.length > 0
                  ? data.testCases
                      .map(
                        (tc) => `
                <div class="test-case-item priority-${tc.priority || "medium"}">
                  <div class="test-case-header">
                    <span class="test-type type-${tc.type}">[${tc.type}]</span>
                    <span class="test-name">${tc.name}</span>
                    ${tc.priority ? `<span class="test-priority priority-${tc.priority}">${tc.priority}</span>` : ""}
                  </div>
                  ${
                    tc.steps && tc.steps.length > 0
                      ? `
                    <div class="test-steps">
                      <ol>
                        ${tc.steps.map((step) => `<li>${step.action || step}</li>`).join("")}
                      </ol>
                    </div>
                  `
                      : ""
                  }
                  ${
                    tc.expectedResult
                      ? `
                    <div class="expected-result">
                      <strong>Expected:</strong> ${tc.expectedResult}
                    </div>
                  `
                      : ""
                  }
                </div>
              `,
                      )
                      .join("")
                  : '<p class="no-tests">No test cases generated for this AC</p>'
              }
            </div>
          </div>
        `,
          )
          .join("")}
      </div>

      <div class="test-cases-actions">
        <button class="btn btn-primary" onclick="window.analysisPanel?.exportTestCases()">
          📥 Export Test Cases
        </button>
        <button class="btn btn-success" onclick="window.analysisPanel?.pushTestCasesToAdo()">
          ⬆️ Push to Azure DevOps
        </button>
      </div>
    `;

    // Store reference for export/push
    window.analysisPanel = this;
  }

  /**
   * Export test cases as JSON
   */
  exportTestCases() {
    if (!this.generatedTestCases) {
      alert("No test cases to export. Generate test cases first.");
      return;
    }

    const exportData = {
      storyId: this.currentStory.id,
      storyTitle: this.currentStory.fields["System.Title"],
      generatedAt: new Date().toISOString(),
      testCases: this.generatedTestCases,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PBI-${this.currentStory.id}-test-cases.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Push test cases to Azure DevOps
   */
  async pushTestCasesToAdo() {
    if (!this.generatedTestCases || this.generatedTestCases.length === 0) {
      alert("No test cases to push. Generate test cases first.");
      return;
    }

    if (
      !confirm(
        `Push ${this.generatedTestCases.length} test cases to Azure DevOps?`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/ado/create-test-cases`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storyId: this.currentStory.id,
            testCases: this.generatedTestCases.map((tc) => ({
              title: tc.name,
              steps: tc.steps,
              expectedResult: tc.expectedResult,
              priority: tc.priority,
              type: tc.type,
              acceptanceCriteriaRef: tc.acceptanceCriteriaRef,
            })),
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        alert(
          `Successfully created ${data.createdCount || this.generatedTestCases.length} test cases in Azure DevOps!`,
        );
      } else {
        throw new Error(data.error || "Failed to create test cases");
      }
    } catch (error) {
      console.error("Push to ADO error:", error);
      alert(`Error pushing test cases: ${error.message}`);
    }
  }
}
