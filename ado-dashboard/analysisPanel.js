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
    // Test Plan management
    this.testPlans = [];
    this.selectedTestPlanId = null;
    this.parentFeature = null;
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

  /**
   * Get the project name from the current story
   */
  getStoryProject() {
    if (!this.currentStory || !this.currentStory.fields) {
      return null;
    }
    // ADO stores project in System.TeamProject field
    return this.currentStory.fields["System.TeamProject"] || null;
  }

  /**
   * Fetch available Test Plans from Azure DevOps
   * Uses the project from the current story to get the correct test plans
   */
  async loadTestPlans() {
    try {
      const project = this.getStoryProject();
      const url = project
        ? `${API_BASE_URL}/api/ado/test-plans?project=${encodeURIComponent(project)}`
        : `${API_BASE_URL}/api/ado/test-plans`;

      console.log(`Loading Test Plans for project: ${project || "default"}`);

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        this.testPlans = data.testPlans || [];
        console.log(
          `Loaded ${this.testPlans.length} Test Plans for project ${project || "default"}`,
        );
      }
    } catch (error) {
      console.error("Failed to load Test Plans:", error);
      this.testPlans = [];
    }
  }

  /**
   * Get parent Feature from story relations
   * Returns { id, title } or null if no parent Feature found
   */
  async getParentFeature() {
    if (!this.currentStory || !this.currentStory.relations) {
      return null;
    }

    // Find parent (Hierarchy-Reverse relation)
    for (const relation of this.currentStory.relations) {
      if (relation.rel === "System.LinkTypes.Hierarchy-Reverse") {
        const parentIdMatch = relation.url.match(/\/(\d+)$/);
        if (parentIdMatch) {
          const parentId = parseInt(parentIdMatch[1]);
          // Fetch the parent work item to get its title and type
          try {
            const response = await fetch(
              `${API_BASE_URL}/api/ado/work-item/${parentId}`,
            );
            if (response.ok) {
              const data = await response.json();
              const parentWorkItem = data.workItem || data;
              const workItemType =
                parentWorkItem.fields?.["System.WorkItemType"];

              // Only return if it's a Feature (not Epic or other types)
              if (workItemType === "Feature") {
                return {
                  id: parentId,
                  title:
                    parentWorkItem.fields?.["System.Title"] ||
                    `Feature ${parentId}`,
                };
              }
            }
          } catch (error) {
            console.error(
              `Failed to fetch parent work item ${parentId}:`,
              error,
            );
          }
        }
      }
    }
    return null;
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
   * Strip HTML tags and decode entities, preserving structure
   */
  stripHtml(html, preserveStructure = false) {
    if (!preserveStructure) {
      const doc = new DOMParser().parseFromString(html, "text/html");
      return doc.body.textContent || "";
    }

    // Preserve structure by converting block elements to newlines
    let text = html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<\/tr>/gi, "\n")
      .replace(/<\/h[1-6]>/gi, "\n\n")
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return text;
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
            <input type="text" id="analysisStoryIdInput" placeholder="Enter story ID (e.g., 12345)" inputmode="numeric" pattern="[0-9]*">
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
            <button id="runBlastRadiusBtn" class="btn-secondary" ${!hasExtractedFiles ? "disabled" : ""}>
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
        <p class="push-info">Run Risk Analysis first to enable risk-prioritized test case generation</p>
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

    // Enable/disable blast radius button based on manual file input
    const changedFilesInput = document.getElementById("changedFilesInput");
    if (changedFilesInput && runBlastRadiusBtn) {
      changedFilesInput.addEventListener("input", () => {
        const hasFiles = changedFilesInput.value.trim().length > 0;
        runBlastRadiusBtn.disabled = !hasFiles;
      });
    }

    if (runRiskBtn) {
      runRiskBtn.addEventListener("click", () => this.loadRiskAnalysis());
    }

    if (runIntegrationBtn) {
      runIntegrationBtn.addEventListener("click", () =>
        this.loadIntegrationAnalysis(),
      );
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
    const { riskMatrix, formattedOutput, suggestedTestTypes } = data;

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
   * Get ACs from Risk Analysis results (preferred source - more complete)
   */
  getACsFromRiskAnalysis() {
    const riskData = this.analysisResults?.risk;
    if (!riskData) return [];

    // Try acRiskMapping first (has AC details with risk levels)
    if (riskData.acRiskMapping && Array.isArray(riskData.acRiskMapping)) {
      return riskData.acRiskMapping.map((ac) => ({
        id: ac.ac,
        number: parseInt(ac.ac.replace(/\D/g, "")) || 0,
        text:
          ac.text ||
          ac.description ||
          `Acceptance Criterion ${ac.ac.replace("AC", "")}`,
        riskLevel: ac.riskLevel,
      }));
    }

    // Try formattedOutput.summaryTable (has AC, description, risk)
    if (
      riskData.formattedOutput?.summaryTable &&
      Array.isArray(riskData.formattedOutput.summaryTable)
    ) {
      return riskData.formattedOutput.summaryTable.map((row) => ({
        id: row.ac,
        number: parseInt(row.ac.replace(/\D/g, "")) || 0,
        text:
          row.description || `Acceptance Criterion ${row.ac.replace("AC", "")}`,
        riskLevel: row.riskLevel,
      }));
    }

    // Try formattedOutput.detailedAnalysis
    if (
      riskData.formattedOutput?.detailedAnalysis &&
      Array.isArray(riskData.formattedOutput.detailedAnalysis)
    ) {
      return riskData.formattedOutput.detailedAnalysis.map((ac) => ({
        id: ac.ac,
        number: parseInt(ac.ac.replace(/\D/g, "")) || 0,
        text:
          ac.text ||
          ac.description ||
          `Acceptance Criterion ${ac.ac.replace("AC", "")}`,
        riskLevel: ac.riskLevel,
      }));
    }

    return [];
  }

  /**
   * Parse Acceptance Criteria from story
   */
  parseAcceptanceCriteria() {
    const acField =
      this.currentStory?.fields?.["Microsoft.VSTS.Common.AcceptanceCriteria"] ||
      "";
    if (!acField) return [];

    const acceptanceCriteria = [];
    const usedNumbers = new Set();
    let match;

    // FIRST: Try hierarchical parsing to capture structure (headers → bullets → sub-bullets)
    const hierarchicalACs = this.parseHierarchicalACs(acField);
    if (hierarchicalACs.length > 0) {
      console.log(
        "[AnalysisPanel] Using hierarchical AC parsing:",
        hierarchicalACs.length,
      );
      return hierarchicalACs;
    }

    // SECOND: Try to extract sections from HTML structure (bold/strong tags often denote headers)
    const boldSections = this.extractBoldSections(acField);
    if (boldSections.length >= 3) {
      console.log("[AnalysisPanel] Found bold sections:", boldSections.length);
      boldSections.forEach((section, index) => {
        acceptanceCriteria.push({
          number: index + 1,
          text: section.title + (section.content ? ": " + section.content : ""),
          id: `AC${index + 1}`,
          title: section.title,
          steps: [], // Empty steps for backward compat
        });
      });
      console.log(
        "[AnalysisPanel] Parsed Acceptance Criteria:",
        acceptanceCriteria.length,
        acceptanceCriteria,
      );
      return acceptanceCriteria;
    }

    // Use structure-preserving HTML stripping
    const textContent = this.stripHtml(acField, true);
    console.log("[AnalysisPanel] Raw AC text (structured):", textContent);

    // Pattern 1: "AC1:" or "AC 1:" format (common in ADO)
    const acPrefixPattern = /AC\s*(\d+)[:\s]+([^\n]+)/gi;
    while ((match = acPrefixPattern.exec(textContent)) !== null) {
      const num = parseInt(match[1]);
      if (!usedNumbers.has(num)) {
        acceptanceCriteria.push({
          number: num,
          text: match[2].trim(),
          id: `AC${num}`,
        });
        usedNumbers.add(num);
      }
    }

    // Pattern 2: Numbered ACs (1. AC text, 2. AC text)
    if (acceptanceCriteria.length === 0) {
      const numberedPattern = /(?:^|\n)\s*(\d+)\.\s+(.+?)(?=\n\s*\d+\.|$)/gs;
      while ((match = numberedPattern.exec(textContent)) !== null) {
        const num = parseInt(match[1]);
        if (!usedNumbers.has(num) && num <= 50) {
          const text = match[2].replace(/\s+/g, " ").trim();
          if (text.length > 5) {
            acceptanceCriteria.push({
              number: num,
              text: text,
              id: `AC${num}`,
            });
            usedNumbers.add(num);
          }
        }
      }
    }

    // Pattern 3: Given/When/Then scenarios
    if (acceptanceCriteria.length === 0) {
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

    // Pattern 4: Bullet points (- or * or •)
    if (acceptanceCriteria.length === 0) {
      const bulletPattern = /^[\s]*[-*•]\s*(.+)$/gm;
      let acNum = 1;
      while ((match = bulletPattern.exec(textContent)) !== null) {
        const text = match[1].trim();
        if (text.length > 10) {
          acceptanceCriteria.push({
            number: acNum,
            text: text,
            id: `AC${acNum}`,
          });
          acNum++;
        }
      }
    }

    // Pattern 5: Double newline separated sections
    if (acceptanceCriteria.length === 0) {
      const items = textContent
        .split(/\n\n+/)
        .filter((s) => s.trim().length > 20);
      if (items.length >= 2) {
        items.forEach((item, index) => {
          acceptanceCriteria.push({
            number: index + 1,
            text: item.trim().replace(/\s+/g, " "),
            id: `AC${index + 1}`,
          });
        });
      }
    }

    // Pattern 6: If still nothing, try to split by Title Case headers
    if (acceptanceCriteria.length === 0) {
      const plainText = this.stripHtml(acField, false);
      const titleCaseSections = this.splitByTitleCaseHeaders(plainText);
      if (titleCaseSections.length >= 3) {
        titleCaseSections.forEach((section, index) => {
          acceptanceCriteria.push({
            number: index + 1,
            text: section,
            id: `AC${index + 1}`,
          });
        });
      }
    }

    // Final fallback: split by sentences
    if (acceptanceCriteria.length === 0) {
      const plainText = this.stripHtml(acField, false);
      const sentences = plainText
        .split(/[.!?]+/)
        .filter((s) => s.trim().length > 15);
      sentences.slice(0, 20).forEach((sentence, index) => {
        acceptanceCriteria.push({
          number: index + 1,
          text: sentence.trim(),
          id: `AC${index + 1}`,
        });
      });
    }

    // Sort by number
    acceptanceCriteria.sort((a, b) => a.number - b.number);

    console.log(
      "[AnalysisPanel] Parsed Acceptance Criteria:",
      acceptanceCriteria.length,
      acceptanceCriteria,
    );
    return acceptanceCriteria;
  }

  /**
   * Parse Acceptance Criteria with hierarchical structure awareness
   * Recognizes: Headers → Bullets (steps) → Sub-bullets (details)
   * Returns ACs with steps array for smarter test generation
   */
  parseHierarchicalACs(html) {
    const hierarchicalACs = [];

    // First, try to detect hierarchical structure from HTML
    // Look for patterns like: <b>Header</b> followed by <ul><li>bullets</li></ul>

    // Pattern 1: Bold headers with bullet lists
    const sectionPattern =
      /<(?:b|strong)[^>]*>([^<]+)<\/(?:b|strong)>\s*(?:<br\s*\/?>|\s)*(?:<ul[^>]*>([\s\S]*?)<\/ul>|<ol[^>]*>([\s\S]*?)<\/ol>)?/gi;
    let sectionMatch;
    let acNumber = 1;

    while ((sectionMatch = sectionPattern.exec(html)) !== null) {
      const headerText = sectionMatch[1].trim();
      const listContent = sectionMatch[2] || sectionMatch[3] || "";

      // Skip very short headers or pure numbers
      if (headerText.length < 3 || /^\d+$/.test(headerText)) continue;

      const ac = {
        number: acNumber,
        id: `AC${acNumber}`,
        title: headerText,
        text: headerText,
        steps: [],
      };

      // Parse bullets from the list content
      if (listContent) {
        const steps = this.parseBulletsWithSubItems(listContent);
        ac.steps = steps;

        // Update text to include step summary
        if (steps.length > 0) {
          ac.text = `${headerText}: ${steps.map((s) => s.action).join("; ")}`;
        }
      }

      hierarchicalACs.push(ac);
      acNumber++;
    }

    // Pattern 2: If no bold sections found, try Title Case headers followed by bullets
    if (hierarchicalACs.length === 0) {
      const textContent = this.stripHtml(html, true);
      const lines = textContent
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l);

      let currentAC = null;
      let currentStep = null;
      acNumber = 1;

      for (const line of lines) {
        const indentLevel = this.getIndentLevel(line);
        const cleanLine = line.replace(/^[\s•*\d.-]+/, "").trim();

        if (!cleanLine) continue;

        // Detect header: Title Case, ends with colon, or is followed by bullets
        const isHeader =
          this.isTitleCase(cleanLine) ||
          (cleanLine.endsWith(":") && cleanLine.length < 60) ||
          (cleanLine.includes("&") &&
            this.isTitleCase(cleanLine.replace(/&/g, "and")));

        const isBullet =
          /^[•*-]/.test(line.trim()) || /^\d+\./.test(line.trim());
        const isSubBullet = indentLevel > 1 || /^\s{4,}[•*-]/.test(line);

        if (isHeader && !isBullet) {
          // Save previous AC if exists
          if (currentAC && currentAC.steps.length > 0) {
            hierarchicalACs.push(currentAC);
          }

          // Start new AC
          currentAC = {
            number: acNumber,
            id: `AC${acNumber}`,
            title: cleanLine.replace(/:$/, ""),
            text: cleanLine.replace(/:$/, ""),
            steps: [],
          };
          acNumber++;
          currentStep = null;
        } else if (isBullet && currentAC) {
          if (isSubBullet && currentStep) {
            // This is a sub-bullet (detail) under the current step
            currentStep.details.push(cleanLine);
          } else {
            // This is a main bullet (step)
            currentStep = {
              stepNumber: currentAC.steps.length + 1,
              action: cleanLine,
              details: [],
            };
            currentAC.steps.push(currentStep);
          }
        } else if (currentAC && currentStep && indentLevel > 0) {
          // Continuation or sub-item
          currentStep.details.push(cleanLine);
        } else if (!currentAC && cleanLine.length > 10) {
          // First line without explicit header - treat as header
          currentAC = {
            number: acNumber,
            id: `AC${acNumber}`,
            title: cleanLine.replace(/:$/, ""),
            text: cleanLine.replace(/:$/, ""),
            steps: [],
          };
          acNumber++;
        }
      }

      // Don't forget the last AC
      if (currentAC && currentAC.steps.length > 0) {
        hierarchicalACs.push(currentAC);
      }
    }

    // Update text field to include full context for backward compatibility
    hierarchicalACs.forEach((ac) => {
      if (ac.steps.length > 0) {
        const stepsText = ac.steps
          .map((s) => {
            let stepText = s.action;
            if (s.details.length > 0) {
              stepText += ` [${s.details.join(", ")}]`;
            }
            return stepText;
          })
          .join(" | ");
        ac.text = `${ac.title}: ${stepsText}`;
      }
    });

    console.log(
      "[AnalysisPanel] Parsed Hierarchical ACs:",
      hierarchicalACs.length,
      hierarchicalACs,
    );
    return hierarchicalACs;
  }

  /**
   * Parse bullet list HTML into steps with sub-items as details
   */
  parseBulletsWithSubItems(listHtml) {
    const steps = [];

    // Match top-level <li> items
    const liPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let liMatch;
    let stepNumber = 1;

    while ((liMatch = liPattern.exec(listHtml)) !== null) {
      const liContent = liMatch[1];

      // Check if this li contains a nested list
      const nestedListMatch = liContent.match(
        /<(?:ul|ol)[^>]*>([\s\S]*?)<\/(?:ul|ol)>/i,
      );

      let action = liContent;
      const details = [];

      if (nestedListMatch) {
        // Extract the main action (text before nested list)
        action = liContent.substring(0, liContent.indexOf(nestedListMatch[0]));

        // Extract nested items as details
        const nestedLiPattern = /<li[^>]*>([^<]+)<\/li>/gi;
        let nestedMatch;
        while (
          (nestedMatch = nestedLiPattern.exec(nestedListMatch[1])) !== null
        ) {
          details.push(this.stripHtml(nestedMatch[1], false).trim());
        }
      }

      // Clean up the action text
      action = this.stripHtml(action, false).trim();

      if (action.length > 3) {
        steps.push({
          stepNumber: stepNumber,
          action: action,
          details: details,
        });
        stepNumber++;
      }
    }

    return steps;
  }

  /**
   * Detect indent level of a line (for hierarchical parsing)
   */
  getIndentLevel(line) {
    const match = line.match(/^(\s*)/);
    if (!match) return 0;
    const spaces = match[1].length;
    // Consider 2-4 spaces or 1 tab as one indent level
    return Math.floor(spaces / 2);
  }

  /**
   * Check if text is Title Case (e.g., "API Integration & Record Creation")
   */
  isTitleCase(text) {
    if (!text || text.length < 5) return false;
    // Remove common connectors and check if most words start with uppercase
    const words = text
      .replace(/[&-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);
    if (words.length < 2) return false;
    const capitalizedWords = words.filter((w) => /^[A-Z]/.test(w));
    return capitalizedWords.length >= words.length * 0.6; // At least 60% capitalized
  }

  /**
   * Extract sections from HTML based on bold/strong tags (common AC format)
   */
  extractBoldSections(html) {
    const sections = [];
    // Match bold/strong tags and capture the text after them
    const boldPattern = /<(?:b|strong)[^>]*>([^<]+)<\/(?:b|strong)>/gi;
    let match;
    const boldTexts = [];

    while ((match = boldPattern.exec(html)) !== null) {
      const boldText = match[1].trim();
      // Filter out very short bold text (likely not a header)
      if (boldText.length > 3 && boldText.length < 100) {
        boldTexts.push({
          text: boldText,
          index: match.index,
        });
      }
    }

    // For each bold text, extract content until the next bold text
    for (let i = 0; i < boldTexts.length; i++) {
      const current = boldTexts[i];
      const next = boldTexts[i + 1];

      // Get content between this bold and the next
      const startIdx =
        current.index + html.substring(current.index).indexOf(">") + 1;
      const endIdx = next ? next.index : html.length;
      const contentHtml = html.substring(startIdx, endIdx);
      const content = this.stripHtml(contentHtml, false).trim();

      // Only include if it looks like a real section (has some content)
      if (current.text && !current.text.match(/^\d+$/)) {
        sections.push({
          title: current.text,
          content: content.substring(0, 200), // Truncate long content
        });
      }
    }

    return sections;
  }

  /**
   * Split text by Title Case headers (e.g., "Page Entry", "Error Handling")
   */
  splitByTitleCaseHeaders(text) {
    // Common AC section headers pattern
    const sectionHeaders = [
      "Page Entry",
      "Payment Amount",
      "Navigation Controls",
      "API Integration",
      "Record Creation",
      "Success Flow",
      "Error Handling",
      "Data Persistence",
      "Validation",
      "User Interface",
      "Authentication",
      "Authorization",
      "Input Validation",
      "Output",
      "Display",
      "Workflow",
      "Integration",
      "Database",
      "Security",
      "Performance",
    ];

    // Try to split by known headers first
    let remainingText = text;

    for (const header of sectionHeaders) {
      const headerIndex = remainingText.indexOf(header);
      if (headerIndex !== -1) {
        // Found a header, mark it
        remainingText = remainingText.replace(
          header,
          `\n###SECTION###${header}`,
        );
      }
    }

    // Also try to detect Title Case phrases (2-4 capitalized words together)
    const titleCasePattern =
      /(?:^|[.!?\n]\s*)([A-Z][a-z]+(?:\s+(?:[A-Z][a-z]+|&|and)){1,4})(?=\s+[A-Z]|\s+[a-z])/g;
    let match;
    while ((match = titleCasePattern.exec(remainingText)) !== null) {
      const potentialHeader = match[1];
      if (
        potentialHeader.length > 5 &&
        potentialHeader.length < 50 &&
        !remainingText.includes(`###SECTION###${potentialHeader}`)
      ) {
        remainingText = remainingText.replace(
          potentialHeader,
          `\n###SECTION###${potentialHeader}`,
        );
      }
    }

    // Split by section markers
    const parts = remainingText.split("###SECTION###").filter((s) => s.trim());
    return parts.map((p) => p.trim()).filter((p) => p.length > 10);
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

    // Prefer ACs from Risk Analysis (more complete), fall back to parsing
    let acceptanceCriteria = this.getACsFromRiskAnalysis();
    if (acceptanceCriteria.length === 0) {
      acceptanceCriteria = this.parseAcceptanceCriteria();
    }

    console.log(
      "[AnalysisPanel] Using ACs for test generation:",
      acceptanceCriteria.length,
      acceptanceCriteria,
    );

    if (acceptanceCriteria.length === 0) {
      alert(
        "No Acceptance Criteria found. Run Risk Analysis first or ensure story has ACs.",
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
            blastRadiusAnalysis: this.analysisResults.blastRadius,
            options: {
              includeNegative,
              includeEdgeCases,
              includeIntegration,
              namingFormat:
                "TC{nn} PBI-{storyId} AC{acNumber}: [{type}] {description}",
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

      // Load Test Plans and parent Feature for the push UI
      await Promise.all([
        this.loadTestPlans(),
        this.getParentFeature().then((feature) => {
          this.parentFeature = feature;
        }),
      ]);

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

    // Prefer ACs from Risk Analysis for complete descriptions
    const riskACs = this.getACsFromRiskAnalysis();
    const allACs = riskACs.length > 0 ? riskACs : acceptanceCriteria;

    // Build AC lookup from the best available AC source
    const acLookup = {};
    allACs.forEach((ac) => {
      acLookup[ac.id] = ac;
    });
    // Also add any from passed acceptanceCriteria that might be missing
    acceptanceCriteria.forEach((ac) => {
      if (!acLookup[ac.id]) {
        acLookup[ac.id] = ac;
      }
    });

    // Extract ALL unique ACs from test cases (may include ACs not in acceptanceCriteria)
    const allACRefs = new Set();
    testCases.forEach((tc) => {
      const acRef = tc.acceptanceCriteriaRef || tc.acRef || "AC1";
      allACRefs.add(acRef);
    });

    // Also include ACs from acceptanceCriteria that might not have tests
    acceptanceCriteria.forEach((ac) => allACRefs.add(ac.id));

    // Sort AC refs naturally (AC1, AC2, ... AC10, AC11)
    const sortedACRefs = Array.from(allACRefs).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, "")) || 0;
      const numB = parseInt(b.replace(/\D/g, "")) || 0;
      return numA - numB;
    });

    // Group test cases by AC - create groups for ALL referenced ACs
    const groupedByAC = {};
    sortedACRefs.forEach((acRef) => {
      groupedByAC[acRef] = {
        ac: acLookup[acRef] || {
          id: acRef,
          text: `Acceptance Criterion ${acRef.replace("AC", "")}`,
        },
        testCases: [],
      };
    });

    // Assign test cases to their ACs
    testCases.forEach((tc) => {
      const acRef = tc.acceptanceCriteriaRef || tc.acRef || "AC1";
      if (groupedByAC[acRef]) {
        groupedByAC[acRef].testCases.push(tc);
      }
    });

    // Count by type
    const typeCounts = {
      positive: testCases.filter((tc) => tc.type === "positive").length,
      negative: testCases.filter((tc) => tc.type === "negative").length,
      edge: testCases.filter((tc) => tc.type === "edge").length,
      integration: testCases.filter((tc) => tc.type === "integration").length,
    };

    // Store current filter state
    this.currentTestFilter = this.currentTestFilter || "all";

    resultsContainer.innerHTML = `
      <div class="test-cases-summary">
        <h4>Generated Test Cases Summary</h4>
        <div class="test-stats">
          <span class="stat total-stat"><strong id="totalTestCount">${testCases.length}</strong> Total Test Cases</span>
          <button class="stat-filter stat type-positive ${this.currentTestFilter === "positive" ? "active" : ""}" data-filter="positive">
            <span class="filter-count">${typeCounts.positive}</span> Positive
          </button>
          <button class="stat-filter stat type-negative ${this.currentTestFilter === "negative" ? "active" : ""}" data-filter="negative">
            <span class="filter-count">${typeCounts.negative}</span> Negative
          </button>
          <button class="stat-filter stat type-edge ${this.currentTestFilter === "edge" ? "active" : ""}" data-filter="edge">
            <span class="filter-count">${typeCounts.edge}</span> Edge Cases
          </button>
          <button class="stat-filter stat type-integration ${this.currentTestFilter === "integration" ? "active" : ""}" data-filter="integration">
            <span class="filter-count">${typeCounts.integration}</span> Integration
          </button>
          <button class="stat-filter stat stat-all ${this.currentTestFilter === "all" ? "active" : ""}" data-filter="all">
            Show All
          </button>
        </div>
      </div>

      <div class="test-cases-by-ac" id="testCasesByAC">
        ${Object.entries(groupedByAC)
          .map(
            ([acId, data]) => `
          <div class="ac-group" data-ac="${acId}">
            <div class="ac-header-collapsible" data-ac="${acId}">
              <div class="ac-header-left">
                <span class="ac-collapse-icon">▼</span>
                <h5>${acId}: ${this.truncateText(data.ac.text, 80)}</h5>
              </div>
              <span class="ac-test-count">${data.testCases.length} tests</span>
            </div>
            <div class="ac-test-cases" id="ac-tests-${acId}">
              ${
                data.testCases.length > 0
                  ? data.testCases
                      .map(
                        (tc, index) => `
                <div class="test-case-item priority-${tc.priority || "medium"}" data-type="${tc.type}" data-tc-index="${index}" data-ac-ref="${acId}">
                  <div class="test-case-header">
                    <span class="test-type type-${tc.type}">[${tc.type.toUpperCase()}]</span>
                    <span class="test-name">${tc.name}</span>
                    <div class="test-case-actions">
                      ${tc.priority ? `<span class="test-priority priority-${tc.priority}">${tc.priority}</span>` : ""}
                      <button class="btn-delete-test" data-tc-name="${tc.name}" title="Remove test case">✕</button>
                    </div>
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
        <div class="test-plan-selector">
          <h4>📋 Push to Test Plan</h4>
          <div class="test-plan-info">
            ${
              this.parentFeature
                ? `
              <div class="parent-feature">
                <strong>Feature:</strong> ${this.parentFeature.id}: ${this.parentFeature.title}
              </div>
            `
                : `
              <div class="parent-feature warning">
                <strong>⚠️ No parent Feature found</strong> - Test cases will be created under root suite
              </div>
            `
            }
            <div class="story-info">
              <strong>PBI:</strong> ${this.currentStory?.id}: ${this.currentStory?.fields?.["System.Title"] || "Unknown"}
            </div>
            <div class="project-info">
              <strong>Project:</strong> ${this.getStoryProject() || "Default"}
            </div>
          </div>
          <div class="test-plan-dropdown">
            <label for="testPlanSelect">Select Test Plan (from ${this.getStoryProject() || "default"} project):</label>
            <select id="testPlanSelect" class="form-select" onchange="window.analysisPanel?.onTestPlanSelected(this.value)">
              <option value="">-- Select a Test Plan --</option>
              ${this.testPlans
                .map(
                  (tp) => `
                <option value="${tp.id}" ${tp.id === this.selectedTestPlanId ? "selected" : ""}>
                  ${tp.name} ${tp.state ? `(${tp.state})` : ""}
                </option>
              `,
                )
                .join("")}
            </select>
            ${
              this.testPlans.length === 0
                ? `
              <p class="test-plan-warning">No Test Plans found. <button class="btn-link" onclick="window.analysisPanel?.loadTestPlans().then(() => window.analysisPanel?.refreshTestPlanSelector())">Refresh</button></p>
            `
                : ""
            }
          </div>
        </div>
        <div class="test-cases-buttons">
          <button class="btn-generate" onclick="window.analysisPanel?.exportTestCases()">
            📥 Export Test Cases
          </button>
          <button class="btn-push" id="pushToAdoBtn" onclick="window.analysisPanel?.pushTestCasesToAdo()" ${!this.selectedTestPlanId ? "disabled" : ""}>
            ⬆️ Push to Azure DevOps
          </button>
        </div>
        ${
          !this.selectedTestPlanId
            ? `
          <p class="push-warning">⚠️ Select a Test Plan to enable push</p>
        `
            : ""
        }
      </div>
    `;

    // Store reference for export/push
    window.analysisPanel = this;

    // Attach event listeners for new functionality
    this.attachTestCaseEventListeners(acceptanceCriteria);
  }

  /**
   * Handle Test Plan selection
   */
  onTestPlanSelected(planId) {
    this.selectedTestPlanId = planId ? parseInt(planId) : null;
    const pushBtn = document.getElementById("pushToAdoBtn");
    if (pushBtn) {
      pushBtn.disabled = !this.selectedTestPlanId;
    }
    // Update warning message
    const warning = document.querySelector(".push-warning");
    if (warning) {
      warning.style.display = this.selectedTestPlanId ? "none" : "block";
    }
  }

  /**
   * Refresh Test Plan selector dropdown
   */
  refreshTestPlanSelector() {
    const select = document.getElementById("testPlanSelect");
    if (select) {
      select.innerHTML = `
        <option value="">-- Select a Test Plan --</option>
        ${this.testPlans
          .map(
            (tp) => `
          <option value="${tp.id}" ${tp.id === this.selectedTestPlanId ? "selected" : ""}>
            ${tp.name} ${tp.state ? `(${tp.state})` : ""}
          </option>
        `,
          )
          .join("")}
      `;
    }
  }

  /**
   * Attach event listeners for test case filtering, collapsing, and deletion
   */
  attachTestCaseEventListeners(acceptanceCriteria) {
    // Filter buttons
    document.querySelectorAll(".stat-filter").forEach((btn) => {
      btn.addEventListener("click", () => {
        const filterType = btn.dataset.filter;
        this.filterTestCases(filterType);

        // Update active state
        document
          .querySelectorAll(".stat-filter")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentTestFilter = filterType;
      });
    });

    // AC header collapse/expand
    document.querySelectorAll(".ac-header-collapsible").forEach((header) => {
      header.addEventListener("click", () => {
        const acId = header.dataset.ac;
        const testCases = document.getElementById(`ac-tests-${acId}`);
        const icon = header.querySelector(".ac-collapse-icon");

        if (testCases) {
          testCases.classList.toggle("collapsed");
          icon.textContent = testCases.classList.contains("collapsed")
            ? "▶"
            : "▼";
        }
      });
    });

    // Delete test case buttons
    document.querySelectorAll(".btn-delete-test").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const tcName = btn.dataset.tcName;
        this.deleteTestCase(tcName, acceptanceCriteria);
      });
    });
  }

  /**
   * Filter test cases by type
   */
  filterTestCases(filterType) {
    const testItems = document.querySelectorAll(".test-case-item");

    testItems.forEach((item) => {
      const itemType = item.dataset.type;
      if (filterType === "all" || itemType === filterType) {
        item.style.display = "";
      } else {
        item.style.display = "none";
      }
    });

    // Update AC groups visibility - fade if no visible tests
    document.querySelectorAll(".ac-group").forEach((group) => {
      const visibleTests = group.querySelectorAll(
        '.test-case-item:not([style*="display: none"])',
      );

      if (visibleTests.length === 0 && filterType !== "all") {
        group.style.opacity = "0.5";
      } else {
        group.style.opacity = "1";
      }
    });
  }

  /**
   * Delete a test case from the list
   */
  deleteTestCase(tcName, acceptanceCriteria) {
    // Remove from generatedTestCases array
    const index = this.generatedTestCases.findIndex((tc) => tc.name === tcName);
    if (index > -1) {
      this.generatedTestCases.splice(index, 1);
    }

    // Re-render the test cases
    this.renderGeneratedTestCases(acceptanceCriteria);
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
   * Push test cases to Azure DevOps with Test Plan hierarchy
   * Structure: Feature Suite > PBI Suite > Test Cases
   */
  async pushTestCasesToAdo() {
    if (!this.generatedTestCases || this.generatedTestCases.length === 0) {
      alert("No test cases to push. Generate test cases first.");
      return;
    }

    if (!this.selectedTestPlanId) {
      alert("Please select a Test Plan first.");
      return;
    }

    // Disable button and show loading
    const pushBtn = document.getElementById("pushToAdoBtn");
    const originalText = pushBtn?.innerHTML;
    if (pushBtn) {
      pushBtn.disabled = true;
      pushBtn.innerHTML = "⏳ Pushing...";
    }

    try {
      const requestBody = {
        // Test Plan hierarchy data
        testPlanId: this.selectedTestPlanId,
        storyId: this.currentStory.id,
        storyTitle: this.currentStory.fields["System.Title"],
        // Project for Test Plan operations (critical for cross-project scenarios)
        project: this.getStoryProject(),
        // Parent Feature (if exists)
        featureId: this.parentFeature?.id,
        featureTitle: this.parentFeature?.title,
        // Test cases
        testCases: this.generatedTestCases.map((tc) => ({
          title: tc.name,
          steps: tc.steps,
          expectedResult: tc.expectedResult,
          priority: tc.priority,
          type: tc.type,
          acceptanceCriteriaRef: tc.acceptanceCriteriaRef,
        })),
      };

      console.log("Pushing test cases with hierarchy:", {
        testPlanId: requestBody.testPlanId,
        storyId: requestBody.storyId,
        featureId: requestBody.featureId,
        testCaseCount: requestBody.testCases.length,
      });

      const response = await fetch(
        `${API_BASE_URL}/api/ado/create-test-cases`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`,
        );
      }

      const data = await response.json();

      if (data.success) {
        let successMsg = `Successfully created ${data.createdCount || this.generatedTestCases.length} test cases!\n\n`;
        successMsg += `Test Plan: ${selectedPlan?.name}\n`;
        if (data.suite) {
          successMsg += `Suite: ${data.suite.name} (${data.suite.type})`;
        }
        alert(successMsg);
      } else {
        throw new Error(data.error || "Failed to create test cases");
      }
    } catch (error) {
      console.error("Push to ADO error:", error);
      alert(`Error pushing test cases: ${error.message}`);
    } finally {
      // Restore button state
      if (pushBtn) {
        pushBtn.disabled = false;
        pushBtn.innerHTML = originalText || "⬆️ Push to Azure DevOps";
      }
    }
  }
}
