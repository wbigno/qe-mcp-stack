import { PushPreviewModal } from './pushPreviewModal.js';

const API_BASE_URL = 'http://localhost:3000';

export class AnalysisPanel {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentStory = null;
    this.currentApp = null;
    // Store analysis results for push to ADO
    this.analysisResults = {
      risk: null,
      integration: null,
      blastRadius: null
    };
  }

  async showAnalysis(story, app) {
    this.currentStory = story;
    this.currentApp = app;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="analysis-panel">
        <div class="analysis-header">
          <h2>Story Analysis</h2>
          ${this.currentStory ? `
            <div class="story-info">
              <span class="story-id">#${this.currentStory.id}</span>
              <span class="story-title">${this.currentStory.fields?.['System.Title'] || 'Untitled'}</span>
            </div>
            <div class="story-details" style="margin-top: 16px; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px;">
              ${this.currentStory.fields?.['System.Description'] ? `
                <div class="story-field" style="margin-bottom: 12px;">
                  <strong style="color: #e2e8f0;">Description:</strong>
                  <div style="margin-top: 4px; color: #94a3b8; font-size: 14px;">${this.currentStory.fields['System.Description']}</div>
                </div>
              ` : ''}
              ${this.currentStory.fields?.['Microsoft.VSTS.Common.AcceptanceCriteria'] ? `
                <div class="story-field" style="margin-bottom: 12px;">
                  <strong style="color: #e2e8f0;">Acceptance Criteria:</strong>
                  <div style="margin-top: 4px; color: #94a3b8; font-size: 14px;">${this.currentStory.fields['Microsoft.VSTS.Common.AcceptanceCriteria']}</div>
                </div>
              ` : ''}
              ${this.getChildTasksHtml()}
            </div>
          ` : `
            <div class="empty-state-message">
              <div class="empty-state-icon">📋</div>
              <h3>No Story Selected</h3>
              <p>To view analysis for a work item:</p>
              <ol class="empty-state-instructions">
                <li>Go to the <strong>Work Items</strong> tab</li>
                <li>Find the parent item (PBI, Feature, or Bug) you want to analyze</li>
                <li>Click the <strong>📊 View Analysis</strong> button on the parent card</li>
              </ol>
              <p class="empty-state-note">Tip: Use the <strong>🤖 Story Analyzer</strong> tab to generate test cases and requirements analysis with AI.</p>
            </div>
          `}
        </div>

        ${this.currentStory ? `
          <div class="analysis-config">
            <h3>Configuration</h3>
            <div class="form-group">
              <label for="changedFilesInput">Changed Files (one per line):</label>
              <textarea id="changedFilesInput" rows="5" placeholder="Services/BillingService.cs
Controllers/BillingController.cs
Models/Invoice.cs"></textarea>
              <small>Enter the file paths that this story will modify</small>
            </div>
          </div>

          <div class="analysis-sections">
            <div class="analysis-section">
              <div class="section-header">
                <h3>🔥 Blast Radius Analysis</h3>
                <button id="runBlastRadiusBtn" class="btn-secondary">Run Analysis</button>
              </div>
              <div id="blastRadiusContent" class="analysis-content">
                <p class="placeholder">Click "Run Analysis" to analyze the blast radius for changed files</p>
              </div>
            </div>

            <div class="analysis-section">
              <div class="section-header">
                <h3>⚠️ Risk Assessment</h3>
                <button id="runRiskBtn" class="btn-secondary">Run Analysis</button>
              </div>
              <div id="riskAnalysisContent" class="analysis-content">
                <p class="placeholder">Click "Run Analysis" to assess risk factors (Note: Requires full Risk Analyzer implementation)</p>
              </div>
            </div>

            <div class="analysis-section">
              <div class="section-header">
                <h3>🔗 Integration Impact</h3>
                <button id="runIntegrationBtn" class="btn-secondary">Run Analysis</button>
              </div>
              <div id="integrationAnalysisContent" class="analysis-content">
                <p class="placeholder">Click "Run Analysis" to discover integration points (Note: Requires full Integration Mapper implementation)</p>
              </div>
            </div>
          </div>

          <div class="analysis-actions">
            <button id="pushToAdoBtn" class="btn-primary btn-push" disabled>
              <span class="btn-icon">⬆</span>
              Push Analysis to Azure DevOps
            </button>
            <p class="push-info">Run at least one analysis to enable pushing results to ADO</p>
          </div>
        ` : ''}
      </div>
    `;

    if (this.currentStory) {
      this.attachEventListeners();
    }
  }

  attachEventListeners() {
    const runBlastRadiusBtn = document.getElementById('runBlastRadiusBtn');
    const runRiskBtn = document.getElementById('runRiskBtn');
    const runIntegrationBtn = document.getElementById('runIntegrationBtn');
    const pushToAdoBtn = document.getElementById('pushToAdoBtn');

    if (runBlastRadiusBtn) {
      runBlastRadiusBtn.addEventListener('click', () => this.loadBlastRadius());
    }

    if (runRiskBtn) {
      runRiskBtn.addEventListener('click', () => this.loadRiskAnalysis());
    }

    if (runIntegrationBtn) {
      runIntegrationBtn.addEventListener('click', () => this.loadIntegrationAnalysis());
    }

    if (pushToAdoBtn) {
      pushToAdoBtn.addEventListener('click', () => this.showPushPreview());
    }
  }

  /**
   * Check if any analysis has been run and enable/disable push button
   */
  updatePushButtonState() {
    const pushBtn = document.getElementById('pushToAdoBtn');
    if (!pushBtn) return;

    const hasAnyAnalysis = this.analysisResults.risk ||
                           this.analysisResults.integration ||
                           this.analysisResults.blastRadius;

    pushBtn.disabled = !hasAnyAnalysis;

    if (hasAnyAnalysis) {
      const analysisCount = [
        this.analysisResults.risk,
        this.analysisResults.integration,
        this.analysisResults.blastRadius
      ].filter(Boolean).length;

      const pushInfo = document.querySelector('.push-info');
      if (pushInfo) {
        pushInfo.textContent = `${analysisCount} analysis result${analysisCount > 1 ? 's' : ''} ready to push`;
        pushInfo.style.color = '#28a745';
      }
    }
  }

  /**
   * Show the push preview modal
   */
  showPushPreview() {
    const modal = new PushPreviewModal();
    modal.show(this.currentStory, this.analysisResults);
  }

  getChildTasksHtml() {
    if (!this.currentStory || !this.currentStory.relations) {
      return '';
    }

    const childTasks = [];
    for (const relation of this.currentStory.relations) {
      if (relation.rel === 'System.LinkTypes.Hierarchy-Forward') {
        const childIdMatch = relation.url.match(/\/(\d+)$/);
        if (childIdMatch) {
          childTasks.push({ id: parseInt(childIdMatch[1]) });
        }
      }
    }

    if (childTasks.length === 0) {
      return '';
    }

    return `
      <div class="story-field">
        <strong style="color: #e2e8f0;">Child Tasks (${childTasks.length}):</strong>
        <ul style="margin-top: 4px; margin-left: 20px; color: #94a3b8; font-size: 14px;">
          ${childTasks.map(task => `<li>Task #${task.id}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  extractChangedFiles() {
    const textarea = document.getElementById('changedFilesInput');
    if (!textarea) return [];

    const text = textarea.value.trim();
    if (!text) return [];

    return text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  async loadBlastRadius() {
    const container = document.getElementById('blastRadiusContent');
    const changedFiles = this.extractChangedFiles();

    if (changedFiles.length === 0) {
      container.innerHTML = '<div class="error">Please enter at least one file path in the "Changed Files" field</div>';
      return;
    }

    container.innerHTML = '<div class="loading">Analyzing blast radius...</div>';

    try {
      const response = await fetch(`${API_BASE_URL}/api/analysis/blast-radius/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app: this.currentApp,
          changedFiles,
          analysisDepth: 'moderate'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Analysis failed');
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
          <h4>📁 Changed Files (${blast.changedFiles?.length || 0})</h4>
          <ul class="file-list">
            ${(blast.changedFiles || []).map(file => `
              <li>
                <span class="file-name">${file.file}</span>
                ${file.exists ? '<span class="badge success">exists</span>' : '<span class="badge error">not found</span>'}
                ${file.classes ? `<small>${file.classes.length} classes</small>` : ''}
              </li>
            `).join('')}
          </ul>

          <h4>🎯 Affected Components (${blast.impact?.affectedComponents?.length || 0})</h4>
          <ul class="component-list">
            ${(blast.impact?.affectedComponents || []).map(comp => `<li>${comp}</li>`).join('') || '<li class="empty">No components identified</li>'}
          </ul>

          <h4>🧪 Affected Tests (${blast.impact?.affectedTests?.length || 0})</h4>
          <ul class="test-list">
            ${(blast.impact?.affectedTests || []).map(test => `<li>${test}</li>`).join('') || '<li class="empty">No test files identified</li>'}
          </ul>
        </div>

        <div class="recommendations">
          <h4>💡 Recommendations</h4>
          <ul>
            ${(blast.recommendations || []).map(rec => `
              <li class="priority-${rec.priority}">
                <strong>[${rec.category}]</strong> ${rec.recommendation}
                ${rec.files ? `<br><small>Files: ${rec.files.join(', ')}</small>` : ''}
              </li>
            `).join('') || '<li>No specific recommendations</li>'}
          </ul>
        </div>
      `;

    } catch (error) {
      console.error('Blast radius error:', error);
      container.innerHTML = `<div class="error">Error loading blast radius: ${error.message}</div>`;
    }
  }

  async loadRiskAnalysis() {
    const container = document.getElementById('riskAnalysisContent');
    container.innerHTML = '<div class="loading">Analyzing risk factors...</div>';

    try {
      const response = await fetch(`${API_BASE_URL}/api/analysis/risk/analyze-story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app: this.currentApp,
          story: {
            id: this.currentStory.id,
            title: this.currentStory.fields['System.Title'],
            description: this.currentStory.fields['System.Description'] || '',
            acceptanceCriteria: this.currentStory.fields['Microsoft.VSTS.Common.AcceptanceCriteria'] || ''
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Risk analysis failed');
      }

      const risk = data.result.risk;

      // Store analysis result
      this.analysisResults.risk = risk;
      this.updatePushButtonState();

      container.innerHTML = `
        <div class="risk-summary risk-${risk.level}">
          <span class="risk-badge ${risk.level}">${risk.level.toUpperCase()}</span>
          <span class="risk-score">Score: ${risk.score}/100</span>
        </div>

        <div class="risk-factors">
          <h4>Risk Factors:</h4>
          ${Object.entries(risk.factors).map(([name, factor]) => `
            <div class="factor">
              <strong>${name}:</strong> ${factor.score}/100 - ${factor.description}
            </div>
          `).join('')}
        </div>

        <div class="recommendations">
          <h4>Recommendations:</h4>
          <ul>
            ${risk.recommendations.map(rec => `
              <li class="priority-${rec.priority}">
                <strong>[${rec.category}]</strong> ${rec.text}
              </li>
            `).join('')}
          </ul>
        </div>
      `;

    } catch (error) {
      console.error('Risk analysis error:', error);
      container.innerHTML = `
        <div class="warning">
          <p><strong>Note:</strong> Risk Analyzer requires full implementation (Phase 3).</p>
          <p>Error: ${error.message}</p>
        </div>
      `;
    }
  }

  async loadIntegrationAnalysis() {
    const container = document.getElementById('integrationAnalysisContent');
    container.innerHTML = '<div class="loading">Mapping integrations...</div>';

    try {
      const response = await fetch(`${API_BASE_URL}/api/analysis/integrations/map`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app: this.currentApp,
          integrationType: 'all',
          includeDiagram: false
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Integration mapping failed');
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
            ${Object.entries(integrations.summary?.byType || {}).map(([type, count]) => `
              <span class="type-badge ${type}">${type}: ${count}</span>
            `).join('')}
          </div>
        </div>

        <div class="integration-list">
          <h4>Integration Points:</h4>
          <ul>
            ${(integrations.integrations || []).slice(0, 10).map(integration => `
              <li>
                <strong>${integration.type}:</strong> ${integration.url || integration.details?.className || 'Unknown'}
                <br><small>${integration.file || 'No file info'}</small>
              </li>
            `).join('') || '<li class="empty">No integrations found</li>'}
          </ul>
          ${integrations.integrations?.length > 10 ? `<p class="more">...and ${integrations.integrations.length - 10} more</p>` : ''}
        </div>
      `;

    } catch (error) {
      console.error('Integration mapping error:', error);
      container.innerHTML = `
        <div class="warning">
          <p><strong>Note:</strong> Integration Mapper requires full implementation (Phase 4).</p>
          <p>Error: ${error.message}</p>
        </div>
      `;
    }
  }
}
