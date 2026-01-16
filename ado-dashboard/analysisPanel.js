import { PushPreviewModal } from "./pushPreviewModal.js";
import { AppSelector } from "./appSelector.js";

const API_BASE_URL = "http://localhost:3000";

export class AnalysisPanel {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentStory = null;
    this.currentApps = []; // Now supports multiple apps
    this.availableApps = [];
    this.analysisAppSelector = null; // Multi-select app selector instance
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
    // Phase 3: Store test case comparison results
    this.testCaseComparison = null;
    this.approvedTestCases = new Set(); // Track which test cases are approved for push
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

  async showAnalysis(story, apps) {
    this.currentStory = story;
    // Support both single app (backwards compat) and array of apps
    this.currentApps = Array.isArray(apps) ? apps : apps ? [apps] : [];
    // Parse Technical Details when story is loaded
    if (story) {
      this.parseAndExtractDetails(story);
    }
    this.render();
  }

  /**
   * Parse Technical Details and Impacts fields to extract useful information
   */
  parseAndExtractDetails(story) {
    const technicalDetails = story.fields?.["Custom.TechnicalDetails"] || "";
    const impacts = story.fields?.["CarepaymentScrum.Impacts"] || "";

    // Reset extracted data
    this.extractedData = {
      filePaths: [],
      priorStoryIds: [],
      implementationNotes: [],
      methods: [],
      apis: [],
      components: [],
    };
    this.priorStories = [];

    // Parse Impacts field first (primary source for blast radius)
    if (impacts) {
      this.parseImpactsField(impacts);
    }

    if (!technicalDetails && !impacts) return;

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
   * Parse the Impacts field (CarepaymentScrum.Impacts) to extract blast radius data
   * Extracts: file paths, methods, APIs, components
   */
  parseImpactsField(impacts) {
    if (!impacts) return;

    console.log("[AnalysisPanel] RAW Impacts field:", impacts);

    // Strip HTML tags for text analysis, preserving structure (br -> newlines)
    const textContent = this.stripHtml(impacts, true);

    console.log(
      "[AnalysisPanel] Parsed Impacts field (stripped):",
      textContent.substring(0, 1000),
    );

    // Extract file paths (various patterns)
    const filePatterns = [
      // Windows-style paths with backslashes and file extensions (most common in ADO)
      /(?:^|[\s,;:\n])([\w.-]+(?:\\[\w.-]+)+\.(?:cs|js|ts|tsx|jsx|py|java|go|rb|php|vue|svelte|json|xml|yaml|yml|sql|razor|cshtml))/gim,
      // Unix-style paths with forward slashes and file extensions
      /(?:^|[\s,;:\n])([\w.-]+(?:\/[\w.-]+)+\.(?:cs|js|ts|tsx|jsx|py|java|go|rb|php|vue|svelte|json|xml|yaml|yml|sql|razor|cshtml))/gim,
      // C# style namespace paths (like CarePayment.Services.Billing)
      /(?:^|[\s,;:(])((?:[A-Z][\w]*\.)+[A-Z][\w]*(?:\.cs)?)/gm,
      // Path-like references after keywords
      /(?:file|path|modify|update|change|touch|edit)[:\s]+[`"']?([\w\-./\\]+\.\w+)[`"']?/gim,
      // src/lib/app style paths (both slash types)
      /(?:^|[\s,;:(])((?:src|lib|app|services|controllers|models|components|utils|helpers|api|routes|tests|spec|Core|Common|Payments)[/\\][\w\-./\\]+)/gim,
    ];

    for (const pattern of filePatterns) {
      let match;
      while ((match = pattern.exec(textContent)) !== null) {
        const filePath = match[1].trim();
        if (
          filePath &&
          filePath.length > 3 &&
          !this.extractedData.filePaths.includes(filePath)
        ) {
          this.extractedData.filePaths.push(filePath);
        }
      }
    }

    // Extract method/function names
    const methodPatterns = [
      // Method names with parentheses
      /(?:method|function|func|def|procedure)[:\s]+[`"']?([\w]+)\s*\(/gim,
      // C# method signatures
      /(?:public|private|protected|internal|async)?\s*(?:static|virtual|override|abstract)?\s*(?:Task<[\w<>]+>|void|[\w<>]+)\s+([\w]+)\s*\(/gm,
      // JavaScript/TypeScript function patterns
      /(?:async\s+)?(?:function\s+)?([\w]+)\s*(?:=\s*(?:async\s*)?\(|<[^>]*>\s*\(|\()/gm,
      // Direct method references
      /(?:call|invoke|execute|run)[:\s]+[`"']?([\w.]+)\(\)/gim,
    ];

    for (const pattern of methodPatterns) {
      let match;
      while ((match = pattern.exec(textContent)) !== null) {
        const method = match[1].trim();
        if (
          method &&
          method.length > 2 &&
          !this.extractedData.methods.includes(method)
        ) {
          // Filter out common keywords
          const keywords = [
            "if",
            "else",
            "for",
            "while",
            "switch",
            "case",
            "return",
            "new",
            "this",
            "var",
            "let",
            "const",
          ];
          if (!keywords.includes(method.toLowerCase())) {
            this.extractedData.methods.push(method);
          }
        }
      }
    }

    // Extract API endpoints
    const apiPatterns = [
      // REST API paths
      /(?:api|endpoint|route|path)[:\s]+[`"']?(\/[\w\-/{}:]+)[`"']?/gim,
      // URL patterns
      /(?:GET|POST|PUT|DELETE|PATCH)\s+[`"']?(\/[\w\-/{}:?&=]+)[`"']?/gim,
      // API endpoints in paths
      /(\/api\/[\w\-/{}:]+)/gim,
      // Controller action routes
      /\[(?:Http(?:Get|Post|Put|Delete|Patch)|Route)\s*\(\s*["']([^"']+)["']\s*\)\]/gim,
    ];

    for (const pattern of apiPatterns) {
      let match;
      while ((match = pattern.exec(textContent)) !== null) {
        const api = match[1].trim();
        if (api && api.length > 1 && !this.extractedData.apis.includes(api)) {
          this.extractedData.apis.push(api);
        }
      }
    }

    // Extract component/class/service names
    const componentPatterns = [
      // Service/Controller/Component names
      /(?:^|[\s,;:(])([A-Z][\w]*(?:Service|Controller|Repository|Handler|Manager|Provider|Factory|Helper|Util|Component|Module|Processor|Validator|Mapper))/gm,
      // Class names
      /(?:class|interface|struct|enum)\s+([A-Z][\w]+)/gm,
      // Named references
      /(?:component|service|class|module|namespace)[:\s]+[`"']?([A-Z][\w.]+)[`"']?/gim,
    ];

    for (const pattern of componentPatterns) {
      let match;
      while ((match = pattern.exec(textContent)) !== null) {
        const component = match[1].trim();
        if (
          component &&
          component.length > 3 &&
          !this.extractedData.components.includes(component)
        ) {
          this.extractedData.components.push(component);
        }
      }
    }

    console.log("[AnalysisPanel] Extracted from Impacts:", {
      filePaths: this.extractedData.filePaths.length,
      methods: this.extractedData.methods.length,
      apis: this.extractedData.apis.length,
      components: this.extractedData.components.length,
    });
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
    const hasExtractedMethods = this.extractedData.methods?.length > 0;
    const hasExtractedApis = this.extractedData.apis?.length > 0;
    const hasExtractedComponents = this.extractedData.components?.length > 0;
    const hasAnyExtractedData =
      hasExtractedFiles ||
      hasExtractedStories ||
      hasExtractedMethods ||
      hasExtractedApis ||
      hasExtractedComponents;

    // Reset app selector when re-rendering (DOM gets destroyed)
    this.analysisAppSelector = null;

    this.container.innerHTML = `
      <div class="analysis-panel">
        ${
          this.currentStory
            ? this.renderStoryAnalysisView(
                hasExtractedFiles,
                hasExtractedStories,
                hasExtractedMethods,
                hasExtractedApis,
                hasExtractedComponents,
                hasAnyExtractedData,
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
    return `
      <div class="panel analyzer-panel">
        <h2>🔍 Story Analysis</h2>
        <p class="panel-description">Analyze blast radius, risk assessment, and integration impact for any work item</p>

        <div class="analyzer-form">
          <div class="form-group app-filter-group">
            <label class="required">Application(s)</label>
            <div id="analysisAppSelect" class="app-selector-container"></div>
            <small>Select one or more applications for comprehensive code analysis</small>
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

  renderStoryAnalysisView(
    hasExtractedFiles,
    hasExtractedStories,
    hasExtractedMethods,
    hasExtractedApis,
    hasExtractedComponents,
    hasAnyExtractedData,
  ) {
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
        hasAnyExtractedData
          ? `
        <div class="extracted-info-section">
          <h3>📊 Extracted Information</h3>
          <p class="section-description">Automatically extracted from Technical Details and Impacts fields</p>

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
            this.extractedData.methods?.length > 0
              ? `
            <div class="extracted-block">
              <h4>⚙️ Methods/Functions (${this.extractedData.methods.length})</h4>
              <div class="file-chips">
                ${this.extractedData.methods
                  .slice(0, 15)
                  .map(
                    (method) =>
                      `<span class="file-chip method-chip">${method}()</span>`,
                  )
                  .join("")}
              </div>
            </div>
          `
              : ""
          }

          ${
            this.extractedData.apis?.length > 0
              ? `
            <div class="extracted-block">
              <h4>🌐 API Endpoints (${this.extractedData.apis.length})</h4>
              <div class="file-chips">
                ${this.extractedData.apis
                  .slice(0, 10)
                  .map(
                    (api) => `<span class="file-chip api-chip">${api}</span>`,
                  )
                  .join("")}
              </div>
            </div>
          `
              : ""
          }

          ${
            this.extractedData.components?.length > 0
              ? `
            <div class="extracted-block">
              <h4>🧩 Components/Services (${this.extractedData.components.length})</h4>
              <div class="file-chips">
                ${this.extractedData.components
                  .slice(0, 15)
                  .map(
                    (comp) =>
                      `<span class="file-chip component-chip">${comp}</span>`,
                  )
                  .join("")}
              </div>
            </div>
          `
              : ""
          }

          ${
            this.extractedData.implementationNotes?.length > 0
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
            <button id="runBlastRadiusBtn" class="btn-secondary" ${!(hasExtractedFiles || hasExtractedComponents) ? "disabled" : ""}>
              ${hasExtractedFiles || hasExtractedComponents ? "Auto-Analyze" : "Run Analysis"}
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
            <button id="runIntegrationBtn" class="btn-secondary" ${this.currentApps.length === 0 ? "disabled title='Select app(s) first'" : ""}>Run Analysis</button>
          </div>
          <div id="integrationAnalysisContent" class="analysis-content section-collapsible-content" data-section="integration-impact">
            <p class="placeholder">${this.currentApps.length > 0 ? 'Click "Run Analysis" to discover integration points.' : "⚠️ Application selection required for integration analysis."}</p>
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
    const appSelectContainer = document.getElementById("analysisAppSelect");

    // Initialize multi-select app selector
    if (appSelectContainer && !this.analysisAppSelector) {
      this.analysisAppSelector = new AppSelector(
        "analysisAppSelect",
        (_apps) => {
          // Update button state when apps change
          updateButtonState();
        },
      );
    }

    // Enable/disable load button based on app selection
    const updateButtonState = () => {
      const hasApps = this.analysisAppSelector?.getSelectedApps()?.length > 0;
      const hasStoryId = storyInput?.value?.trim();
      if (loadStoryBtn) {
        loadStoryBtn.disabled = !hasApps || !hasStoryId;
      }
    };

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
    const loadingSpinner = document.getElementById("loadStoryLoading");
    const loadText = document.getElementById("loadStoryText");
    const errorDiv = document.getElementById("loadStoryError");
    const loadBtn = document.getElementById("loadStoryForAnalysisBtn");

    const storyId = input?.value?.trim();
    const selectedApps = this.analysisAppSelector?.getSelectedApps() || [];

    if (selectedApps.length === 0) {
      errorDiv.textContent = "Please select at least one Application";
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

      // Load the story into the analysis panel with selected apps
      this.showAnalysis(data.workItem, selectedApps);
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
        this.currentApps = [];
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
    // Combine file paths and components for blast radius analysis
    const allPaths = [...(this.extractedData.filePaths || [])];

    // Add components as potential file paths (e.g., "BillingService" -> could be a service file)
    if (this.extractedData.components?.length > 0) {
      this.extractedData.components.forEach((comp) => {
        if (!allPaths.includes(comp)) {
          allPaths.push(comp);
        }
      });
    }

    if (allPaths.length > 0) {
      return allPaths;
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

  /**
   * Get all extracted impact data for comprehensive analysis
   */
  getExtractedImpactData() {
    return {
      filePaths: this.extractedData.filePaths || [],
      methods: this.extractedData.methods || [],
      apis: this.extractedData.apis || [],
      components: this.extractedData.components || [],
    };
  }

  async loadBlastRadius() {
    const container = document.getElementById("blastRadiusContent");
    const changedFiles = this.extractChangedFiles();
    const impactData = this.getExtractedImpactData();

    if (changedFiles.length === 0) {
      container.innerHTML =
        '<div class="error">No file paths or components detected. Please add files manually or ensure Impacts/Technical Details contains relevant information.</div>';
      return;
    }

    const totalItems =
      changedFiles.length +
      (impactData.methods?.length || 0) +
      (impactData.apis?.length || 0);
    container.innerHTML = `<div class="loading">Analyzing blast radius for ${totalItems} items (${changedFiles.length} files/components, ${impactData.methods?.length || 0} methods, ${impactData.apis?.length || 0} APIs)...</div>`;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/analysis/blast-radius/analyze`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apps: this.currentApps,
            changedFiles,
            methods: impactData.methods,
            apis: impactData.apis,
            components: impactData.components,
            analysisDepth: "moderate",
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("[AnalysisPanel] Blast radius raw response:", data);

      if (!data.success) {
        throw new Error(data.error || "Analysis failed");
      }

      const blast = data.result;
      console.log("[AnalysisPanel] Blast radius result:", blast);

      // Handle case where blast is a raw string (AI response)
      if (!blast || typeof blast === "string") {
        container.innerHTML = `<div class="blast-result"><pre style="white-space: pre-wrap;">${blast || "No analysis available"}</pre></div>`;
        return;
      }

      // Store analysis result
      this.analysisResults.blastRadius = blast;
      this.updatePushButtonState();

      // Handle multi-app response structure (byApp array)
      if (blast.byApp && Array.isArray(blast.byApp)) {
        // Aggregate results from all apps
        let maxRiskScore = 0;
        let maxRiskLevel = "low";
        let allRecommendations = [];
        let allAffectedComponents = [];
        let allAffectedTests = [];
        let allFileInsights = {};

        blast.byApp.forEach((appResult) => {
          if (appResult.success && appResult.result) {
            const r = appResult.result;
            if (r.risk?.score > maxRiskScore) {
              maxRiskScore = r.risk.score;
              maxRiskLevel = r.risk.level || "low";
            }
            if (r.recommendations) {
              allRecommendations.push(
                ...r.recommendations.map((rec) => ({
                  ...rec,
                  app: appResult.app,
                })),
              );
            }
            if (r.impact?.affectedComponents) {
              allAffectedComponents.push(...r.impact.affectedComponents);
            }
            if (r.impact?.affectedTests) {
              allAffectedTests.push(...r.impact.affectedTests);
            }
            // Collect file insights
            if (r.fileInsights) {
              Object.entries(r.fileInsights).forEach(([filePath, insights]) => {
                allFileInsights[filePath] = { ...insights, app: appResult.app };
              });
            }
          }
        });

        // Deduplicate
        allAffectedComponents = [...new Set(allAffectedComponents)];
        allAffectedTests = [...new Set(allAffectedTests)];

        // Build file insights HTML
        const fileInsightsHtml =
          Object.entries(allFileInsights).length > 0
            ? Object.entries(allFileInsights)
                .map(([filePath, insights]) => {
                  const fileName = filePath.split(/[/\\]/).pop();
                  return `
                <div class="file-insight-card">
                  <div class="file-insight-header">
                    <span class="file-name">${fileName}</span>
                    ${insights.componentType ? `<span class="component-type">${insights.componentType}</span>` : ""}
                  </div>
                  <div class="file-insight-path">${filePath}</div>

                  ${
                    insights.functionality?.length > 0
                      ? `
                    <div class="insight-section">
                      <strong>📋 Functionality:</strong>
                      <ul class="insight-list">
                        ${insights.functionality.map((f) => `<li>${f}</li>`).join("")}
                      </ul>
                    </div>
                  `
                      : ""
                  }

                  ${
                    insights.imports?.length > 0
                      ? `
                    <div class="insight-section">
                      <strong>📥 Imports/Dependencies (${insights.imports.length}):</strong>
                      <div class="insight-chips">
                        ${insights.imports
                          .slice(0, 10)
                          .map(
                            (i) =>
                              `<span class="insight-chip import-chip">${i.name}</span>`,
                          )
                          .join("")}
                        ${insights.imports.length > 10 ? `<span class="insight-chip more">+${insights.imports.length - 10} more</span>` : ""}
                      </div>
                    </div>
                  `
                      : ""
                  }

                  ${
                    insights.apiCalls?.length > 0
                      ? `
                    <div class="insight-section">
                      <strong>🌐 API Calls:</strong>
                      <div class="insight-chips">
                        ${insights.apiCalls.map((api) => `<span class="insight-chip api-chip">${api}</span>`).join("")}
                      </div>
                    </div>
                  `
                      : ""
                  }

                  ${
                    insights.events?.length > 0
                      ? `
                    <div class="insight-section">
                      <strong>📡 Events:</strong>
                      <div class="insight-chips">
                        ${insights.events.map((e) => `<span class="insight-chip event-chip">${e.type}: ${e.name}</span>`).join("")}
                      </div>
                    </div>
                  `
                      : ""
                  }

                  ${
                    insights.storeActions?.length > 0
                      ? `
                    <div class="insight-section">
                      <strong>🗄️ Store Actions:</strong>
                      <div class="insight-chips">
                        ${insights.storeActions.map((a) => `<span class="insight-chip store-chip">${a}</span>`).join("")}
                      </div>
                    </div>
                  `
                      : ""
                  }
                </div>
              `;
                })
                .join("")
            : '<p class="empty">No file insights available</p>';

        container.innerHTML = `
          <div class="blast-summary risk-${maxRiskLevel}">
            <div class="metric">
              <span class="label">Overall Risk Level:</span>
              <span class="risk-badge ${maxRiskLevel}">${maxRiskLevel.toUpperCase()}</span>
            </div>
            <div class="metric">
              <span class="label">Risk Score:</span>
              <span class="value">${maxRiskScore}/100</span>
            </div>
            <div class="metric">
              <span class="label">Apps Analyzed:</span>
              <span class="value">${blast.byApp.length}</span>
            </div>
          </div>

          <div class="impact-details">
            <h4>🔍 File Analysis & Insights</h4>
            <div class="file-insights-container">
              ${fileInsightsHtml}
            </div>

            <h4>📦 Results by Application</h4>
            <div class="app-results">
              ${blast.byApp
                .map((appResult) => {
                  const r = appResult.result || {};
                  const risk = r.risk || {};
                  const foundFiles = (r.changedFiles || []).filter(
                    (f) => f.exists,
                  ).length;
                  const totalFiles = (r.changedFiles || []).length;
                  return `
                  <div class="app-result-card">
                    <div class="app-result-header">
                      <span class="app-name">${appResult.app}</span>
                      <span class="risk-badge ${risk.level || "unknown"}">${(risk.level || "N/A").toUpperCase()}</span>
                    </div>
                    <div class="app-result-details">
                      <small>Files: ${foundFiles}/${totalFiles} found | Score: ${risk.score || 0}</small>
                      ${risk.description ? `<p class="risk-desc">${risk.description}</p>` : ""}
                    </div>
                  </div>
                `;
                })
                .join("")}
            </div>

            <h4>🎯 Affected Components (${allAffectedComponents.length})</h4>
            <ul class="component-list">
              ${allAffectedComponents.map((comp) => `<li>${comp}</li>`).join("") || '<li class="empty">No components identified</li>'}
            </ul>

            <h4>🧪 Affected Tests (${allAffectedTests.length})</h4>
            <ul class="test-list">
              ${allAffectedTests.map((test) => `<li>${test}</li>`).join("") || '<li class="empty">No test files identified</li>'}
            </ul>
          </div>

          <div class="recommendations">
            <h4>💡 Recommendations</h4>
            <ul>
              ${
                allRecommendations.length > 0
                  ? allRecommendations
                      .map(
                        (rec) => `
                    <li class="priority-${rec.priority || "medium"}">
                      <strong>[${rec.app}]</strong> ${rec.recommendation || rec}
                    </li>
                  `,
                      )
                      .join("")
                  : "<li>No specific recommendations</li>"
              }
            </ul>
          </div>
        `;
        return;
      }

      // Legacy single-app response handling
      if (!blast.risk) {
        container.innerHTML = `<div class="error">Invalid blast radius response structure</div>`;
        return;
      }

      const riskLevel = blast.risk.level || "unknown";
      const riskScore = blast.risk.score || 0;
      const riskDesc = blast.risk.description || "No description";

      container.innerHTML = `
        <div class="blast-summary risk-${riskLevel}">
          <div class="metric">
            <span class="label">Risk Level:</span>
            <span class="risk-badge ${riskLevel}">${riskLevel.toUpperCase()}</span>
          </div>
          <div class="metric">
            <span class="label">Risk Score:</span>
            <span class="value">${riskScore}/100</span>
          </div>
        </div>

        <div class="risk-description">
          <p>${riskDesc}</p>
        </div>

        <div class="impact-details">
          <h4>📁 Analyzed Files (${blast.changedFiles?.length || 0})</h4>
          <ul class="file-list">
            ${(blast.changedFiles || [])
              .map(
                (file) => `
              <li>
                <span class="file-name">${file.file || file.path || file}</span>
                ${file.exists ? '<span class="badge success">exists</span>' : '<span class="badge error">not found</span>'}
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
            apps: this.currentApps,
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

    if (!this.currentApps || this.currentApps.length === 0) {
      container.innerHTML =
        '<div class="warning">Please select at least one application to run integration analysis.</div>';
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
            apps: this.currentApps,
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
            apps: this.currentApps,
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

      // Phase 3: Compare generated test cases with existing ones in ADO
      await this.compareWithExistingTestCases();

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
   * Phase 3: Compare generated test cases with existing ones in ADO
   * Returns comparison with NEW, UPDATE, or EXISTS status for each test case
   */
  async compareWithExistingTestCases() {
    if (!this.generatedTestCases || !this.currentStory) {
      console.log("No test cases or story to compare");
      return;
    }

    try {
      console.log(
        `Comparing ${this.generatedTestCases.length} generated test cases with existing ones for story ${this.currentStory.id}`,
      );

      const response = await fetch(
        `${API_BASE_URL}/api/ado/work-item/${this.currentStory.id}/compare-test-cases`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            generatedTestCases: this.generatedTestCases.map((tc) => ({
              title: tc.name || tc.title,
              steps: tc.steps || [],
              priority: tc.priority,
              expectedResult: tc.expectedResult,
            })),
          }),
        },
      );

      if (!response.ok) {
        console.warn(
          "Test case comparison not available:",
          response.statusText,
        );
        this.testCaseComparison = null;
        return;
      }

      const data = await response.json();

      if (data.success) {
        this.testCaseComparison = data;
        console.log("Test case comparison result:", {
          existingCount: data.existingTestCases?.length || 0,
          newCount: data.summary?.newCount || 0,
          updateCount: data.summary?.updateCount || 0,
          existsCount: data.summary?.existsCount || 0,
        });

        // Pre-select NEW and UPDATE test cases for approval
        this.approvedTestCases = new Set();
        data.comparisons?.forEach((comp, idx) => {
          if (comp.status === "NEW" || comp.status === "UPDATE") {
            this.approvedTestCases.add(idx);
          }
        });
      } else {
        console.warn("Test case comparison failed:", data.error);
        this.testCaseComparison = null;
      }
    } catch (error) {
      console.warn("Could not compare test cases:", error.message);
      this.testCaseComparison = null;
    }
  }

  /**
   * Get comparison status for a generated test case by index
   */
  getTestCaseComparisonStatus(tcIndex) {
    if (
      !this.testCaseComparison ||
      !this.testCaseComparison.comparisons ||
      tcIndex >= this.testCaseComparison.comparisons.length
    ) {
      return { status: "NEW", similarity: 0, existing: null };
    }
    return this.testCaseComparison.comparisons[tcIndex];
  }

  /**
   * Toggle approval status for a test case
   */
  toggleTestCaseApproval(tcIndex) {
    if (this.approvedTestCases.has(tcIndex)) {
      this.approvedTestCases.delete(tcIndex);
    } else {
      this.approvedTestCases.add(tcIndex);
    }
    // Update the checkbox UI
    const checkbox = document.querySelector(
      `input.tc-approval-checkbox[data-tc-index="${tcIndex}"]`,
    );
    if (checkbox) {
      checkbox.checked = this.approvedTestCases.has(tcIndex);
    }
    // Update push button count
    this.updateApprovedCount();
  }

  /**
   * Update the approved count display
   */
  updateApprovedCount() {
    const countSpan = document.getElementById("approvedTestCaseCount");
    if (countSpan) {
      const newCount =
        this.testCaseComparison?.comparisons?.filter(
          (c, i) => c.status === "NEW" && this.approvedTestCases.has(i),
        ).length || 0;
      const updateCount =
        this.testCaseComparison?.comparisons?.filter(
          (c, i) => c.status === "UPDATE" && this.approvedTestCases.has(i),
        ).length || 0;
      countSpan.textContent = `${newCount} new, ${updateCount} updates`;
    }
  }

  /**
   * Select all test cases for approval
   */
  selectAllTestCases() {
    this.generatedTestCases?.forEach((_, idx) => {
      const comp = this.getTestCaseComparisonStatus(idx);
      if (comp.status !== "EXISTS") {
        this.approvedTestCases.add(idx);
      }
    });
    this.updateApprovalCheckboxes();
    this.updateApprovedCount();
  }

  /**
   * Deselect all test cases
   */
  deselectAllTestCases() {
    this.approvedTestCases.clear();
    this.updateApprovalCheckboxes();
    this.updateApprovedCount();
  }

  /**
   * Update all approval checkboxes to match state
   */
  updateApprovalCheckboxes() {
    document.querySelectorAll("input.tc-approval-checkbox").forEach((cb) => {
      const idx = parseInt(cb.dataset.tcIndex);
      cb.checked = this.approvedTestCases.has(idx);
    });
  }

  /**
   * Render generated test cases grouped by AC
   */
  renderGeneratedTestCases(acceptanceCriteria) {
    const resultsContainer = document.getElementById(
      "generatedTestCasesResults",
    );
    if (!resultsContainer || !this.generatedTestCases) return;

    // Store acceptanceCriteria for use in event handlers that need to re-render
    this.currentAcceptanceCriteria =
      acceptanceCriteria || this.currentAcceptanceCriteria || [];

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

    // Phase 3: Count by comparison status
    const comparisonCounts = {
      new: 0,
      update: 0,
      exists: 0,
    };
    if (this.testCaseComparison?.comparisons) {
      this.testCaseComparison.comparisons.forEach((comp) => {
        if (comp.status === "NEW") comparisonCounts.new++;
        else if (comp.status === "UPDATE") comparisonCounts.update++;
        else if (comp.status === "EXISTS") comparisonCounts.exists++;
      });
    }

    // Build global index lookup (tc name -> global index)
    const tcGlobalIndex = {};
    testCases.forEach((tc, idx) => {
      tcGlobalIndex[tc.name] = idx;
    });

    // Store current filter state
    this.currentTestFilter = this.currentTestFilter || "all";

    // Phase 3: Comparison summary section
    const comparisonSummaryHtml = this.testCaseComparison
      ? `
      <div class="comparison-summary">
        <h5>📊 Comparison with Existing Test Cases</h5>
        <div class="comparison-stats">
          <span class="comp-stat comp-new"><span class="comp-count">${comparisonCounts.new}</span> New</span>
          <span class="comp-stat comp-update"><span class="comp-count">${comparisonCounts.update}</span> Updates</span>
          <span class="comp-stat comp-exists"><span class="comp-count">${comparisonCounts.exists}</span> Already Exist</span>
        </div>
        ${
          this.testCaseComparison.existingTestCases?.length > 0
            ? `<div class="existing-count">Found ${this.testCaseComparison.existingTestCases.length} existing test cases linked to this story</div>`
            : `<div class="existing-count">No existing test cases found - all will be created as new</div>`
        }
        <div class="approval-actions">
          <button class="btn-select-all" onclick="window.analysisPanel?.selectAllTestCases()">✓ Select All</button>
          <button class="btn-deselect-all" onclick="window.analysisPanel?.deselectAllTestCases()">✗ Deselect All</button>
          <span class="approved-count">Selected: <span id="approvedTestCaseCount">${comparisonCounts.new} new, ${comparisonCounts.update} updates</span></span>
        </div>
      </div>
    `
      : "";

    resultsContainer.innerHTML = `
      <div class="test-cases-summary">
        <h4>Generated Test Cases Summary</h4>
        ${comparisonSummaryHtml}
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
                      .map((tc, index) => {
                        const globalIdx = tcGlobalIndex[tc.name];
                        const comp =
                          this.getTestCaseComparisonStatus(globalIdx);
                        const statusClass =
                          comp.status === "NEW"
                            ? "status-new"
                            : comp.status === "UPDATE"
                              ? "status-update"
                              : "status-exists";
                        const statusIcon =
                          comp.status === "NEW"
                            ? "🆕"
                            : comp.status === "UPDATE"
                              ? "🔄"
                              : "✅";
                        const isApproved =
                          this.approvedTestCases.has(globalIdx);
                        const showCheckbox = comp.status !== "EXISTS";

                        return `
                <div class="test-case-item priority-${tc.priority || "medium"} ${statusClass}" data-type="${tc.type}" data-tc-index="${globalIdx}" data-ac-ref="${acId}" data-tc-name="${tc.name}">
                  <div class="test-case-header">
                    ${
                      showCheckbox
                        ? `<input type="checkbox" class="tc-approval-checkbox" data-tc-index="${globalIdx}" ${isApproved ? "checked" : ""} title="Select for push to ADO" />`
                        : ""
                    }
                    <span class="test-status-badge ${statusClass}" title="${comp.status}${comp.similarity ? ` (${comp.similarity}% similar)` : ""}">${statusIcon} ${comp.status}</span>
                    <span class="test-type type-${tc.type}">[${tc.type.toUpperCase()}]</span>
                    <span class="test-name">${tc.name}</span>
                    <div class="test-case-actions">
                      ${tc.priority ? `<span class="test-priority priority-${tc.priority}">${tc.priority}</span>` : ""}
                      <button class="btn-delete-test" data-tc-name="${tc.name}" title="Remove test case">✕</button>
                    </div>
                  </div>
                  ${
                    comp.status === "UPDATE" && comp.existing
                      ? `
                  <div class="update-info">
                    <span class="similarity-badge">${comp.similarity}% similar to existing</span>
                    <span class="existing-tc-ref">Existing: #${comp.existing.id}</span>
                  </div>
                  `
                      : ""
                  }`;
                      })
                      .join("") +
                    data.testCases
                      .map((tc, index) => {
                        const globalIdx = tcGlobalIndex[tc.name];
                        return `
                  <div class="test-steps-editable">
                    <div class="steps-header">
                      <strong>Steps:</strong>
                      <button class="btn-add-step" data-tc-name="${tc.name}" title="Add step">+ Add Step</button>
                    </div>
                    <ol class="editable-steps-list" data-tc-name="${tc.name}">
                      ${
                        tc.steps && tc.steps.length > 0
                          ? tc.steps
                              .map(
                                (step, stepIdx) => `
                        <li class="editable-step-item" data-step-index="${stepIdx}">
                          <div class="step-row">
                            <span class="step-number">${stepIdx + 1}.</span>
                            <input type="text" class="step-action-input"
                              value="${(step.action || step || "").replace(/"/g, "&quot;")}"
                              data-tc-name="${tc.name}"
                              data-step-index="${stepIdx}"
                              placeholder="Step action..." />
                            <button class="btn-delete-step" data-tc-name="${tc.name}" data-step-index="${stepIdx}" title="Remove step">✕</button>
                          </div>
                        </li>
                      `,
                              )
                              .join("")
                          : `<li class="no-steps-placeholder">No steps defined. Click "Add Step" to add one.</li>`
                      }
                    </ol>
                  </div>
                  <div class="expected-result-editable">
                    <strong>Expected Result:</strong>
                    <textarea class="expected-result-input"
                      data-tc-name="${tc.name}"
                      placeholder="Enter expected result..."
                      rows="2">${tc.expectedResult || ""}</textarea>
                  </div>
                </div>
              `;
                      })
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

    // Step action input change handlers
    document.querySelectorAll(".step-action-input").forEach((input) => {
      input.addEventListener("change", (_e) => {
        const tcName = input.dataset.tcName;
        const stepIndex = parseInt(input.dataset.stepIndex);
        this.updateStepAction(tcName, stepIndex, input.value);
      });
    });

    // Add step buttons
    document.querySelectorAll(".btn-add-step").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const tcName = btn.dataset.tcName;
        this.addStepToTestCase(tcName);
      });
    });

    // Delete step buttons
    document.querySelectorAll(".btn-delete-step").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const tcName = btn.dataset.tcName;
        const stepIndex = parseInt(btn.dataset.stepIndex);
        this.deleteStepFromTestCase(tcName, stepIndex);
      });
    });

    // Expected result textarea change handlers
    document.querySelectorAll(".expected-result-input").forEach((textarea) => {
      textarea.addEventListener("change", (_e) => {
        const tcName = textarea.dataset.tcName;
        this.updateExpectedResult(tcName, textarea.value);
      });
    });

    // Phase 3: Approval checkbox event listeners
    document.querySelectorAll(".tc-approval-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        e.stopPropagation();
        const tcIndex = parseInt(checkbox.dataset.tcIndex);
        this.toggleTestCaseApproval(tcIndex);
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
   * Update a step's action text
   */
  updateStepAction(tcName, stepIndex, newValue) {
    const tc = this.generatedTestCases.find((tc) => tc.name === tcName);
    if (tc && tc.steps && tc.steps[stepIndex] !== undefined) {
      // Steps can be either strings or objects with action/expectedResult
      if (typeof tc.steps[stepIndex] === "string") {
        tc.steps[stepIndex] = newValue;
      } else {
        tc.steps[stepIndex].action = newValue;
      }
      console.log(`Updated step ${stepIndex + 1} for "${tcName}"`);
    }
  }

  /**
   * Add a new step to a test case
   */
  addStepToTestCase(tcName) {
    const tc = this.generatedTestCases.find((tc) => tc.name === tcName);
    if (tc) {
      if (!tc.steps) {
        tc.steps = [];
      }
      // Add a new step with empty action
      const newStepNumber = tc.steps.length + 1;
      tc.steps.push({
        action: `Step ${newStepNumber}`,
        expectedResult: tc.expectedResult || "Verify expected behavior",
        stepNumber: newStepNumber,
      });
      console.log(`Added new step ${newStepNumber} to "${tcName}"`);
      // Re-render to show the new step
      this.renderGeneratedTestCases(this.currentAcceptanceCriteria);
    }
  }

  /**
   * Delete a step from a test case
   */
  deleteStepFromTestCase(tcName, stepIndex) {
    const tc = this.generatedTestCases.find((tc) => tc.name === tcName);
    if (tc && tc.steps && tc.steps.length > stepIndex) {
      tc.steps.splice(stepIndex, 1);
      // Update step numbers
      tc.steps.forEach((step, idx) => {
        if (typeof step === "object") {
          step.stepNumber = idx + 1;
        }
      });
      console.log(`Deleted step ${stepIndex + 1} from "${tcName}"`);
      // Re-render to update the steps list
      this.renderGeneratedTestCases(this.currentAcceptanceCriteria);
    }
  }

  /**
   * Update a test case's expected result
   */
  updateExpectedResult(tcName, newValue) {
    const tc = this.generatedTestCases.find((tc) => tc.name === tcName);
    if (tc) {
      tc.expectedResult = newValue;
      console.log(`Updated expected result for "${tcName}"`);
    }
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
   * Phase 3: Only push approved test cases, handle NEW and UPDATE separately
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

    // Phase 3: Filter to only approved test cases
    const approvedIndices = Array.from(this.approvedTestCases);
    if (approvedIndices.length === 0) {
      alert(
        "No test cases selected for push. Please select at least one test case.",
      );
      return;
    }

    // Separate NEW and UPDATE test cases
    const newTestCases = [];
    const updateTestCases = [];

    approvedIndices.forEach((idx) => {
      const tc = this.generatedTestCases[idx];
      const comp = this.getTestCaseComparisonStatus(idx);

      if (comp.status === "NEW") {
        newTestCases.push({
          title: tc.name,
          steps: tc.steps,
          expectedResult: tc.expectedResult,
          priority: tc.priority,
          type: tc.type,
          acceptanceCriteriaRef: tc.acceptanceCriteriaRef,
        });
      } else if (comp.status === "UPDATE" && comp.existing) {
        updateTestCases.push({
          existingId: comp.existing.id,
          title: tc.name,
          steps: tc.steps,
          expectedResult: tc.expectedResult,
          priority: tc.priority,
          type: tc.type,
        });
      }
    });

    console.log(
      `Approved: ${approvedIndices.length}, New: ${newTestCases.length}, Updates: ${updateTestCases.length}`,
    );

    // Disable button and show loading
    const pushBtn = document.getElementById("pushToAdoBtn");
    const originalText = pushBtn?.innerHTML;
    if (pushBtn) {
      pushBtn.disabled = true;
      pushBtn.innerHTML = "⏳ Pushing...";
    }

    try {
      let createdCount = 0;
      let updatedCount = 0;
      const errors = [];

      // Phase 3: Create NEW test cases
      if (newTestCases.length > 0) {
        const createResponse = await fetch(
          `${API_BASE_URL}/api/ado/create-test-cases`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              testPlanId: this.selectedTestPlanId,
              storyId: this.currentStory.id,
              storyTitle: this.currentStory.fields["System.Title"],
              project: this.getStoryProject(),
              featureId: this.parentFeature?.id,
              featureTitle: this.parentFeature?.title,
              testCases: newTestCases,
            }),
          },
        );

        if (createResponse.ok) {
          const createData = await createResponse.json();
          if (createData.success) {
            createdCount = createData.createdCount || newTestCases.length;
          } else {
            errors.push(`Create failed: ${createData.error}`);
          }
        } else {
          errors.push(`Create request failed: ${createResponse.statusText}`);
        }
      }

      // Phase 3: Update existing test cases
      for (const tc of updateTestCases) {
        try {
          const updateResponse = await fetch(
            `${API_BASE_URL}/api/ado/test-cases/${tc.existingId}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: tc.title,
                steps: tc.steps,
                priority: tc.priority,
              }),
            },
          );

          if (updateResponse.ok) {
            const updateData = await updateResponse.json();
            if (updateData.success) {
              updatedCount++;
            } else {
              errors.push(`Update #${tc.existingId}: ${updateData.error}`);
            }
          } else {
            errors.push(
              `Update #${tc.existingId} failed: ${updateResponse.statusText}`,
            );
          }
        } catch (e) {
          errors.push(`Update #${tc.existingId}: ${e.message}`);
        }
      }

      // Build result message
      const selectedPlan = this.testPlans.find(
        (tp) => tp.id === this.selectedTestPlanId,
      );
      let successMsg = "";

      if (createdCount > 0 || updatedCount > 0) {
        successMsg = `Successfully pushed test cases!\n\n`;
        if (createdCount > 0) {
          successMsg += `✅ Created: ${createdCount} new test cases\n`;
        }
        if (updatedCount > 0) {
          successMsg += `🔄 Updated: ${updatedCount} existing test cases\n`;
        }
        successMsg += `\nTest Plan: ${selectedPlan?.name || this.selectedTestPlanId}`;
      }

      if (errors.length > 0) {
        successMsg +=
          `\n\n⚠️ ${errors.length} error(s):\n` + errors.slice(0, 3).join("\n");
        if (errors.length > 3) {
          successMsg += `\n... and ${errors.length - 3} more`;
        }
      }

      if (successMsg) {
        alert(successMsg);
      } else if (errors.length > 0) {
        throw new Error(errors.join(", "));
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
