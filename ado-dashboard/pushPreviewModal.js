/**
 * PushPreviewModal - Shows preview of changes before pushing to Azure DevOps
 *
 * Features:
 * - Preview tags and field updates before writing
 * - Preview comment content
 * - Requires explicit user confirmation
 * - Shows current vs new values
 * - Handles success/error feedback
 */

export class PushPreviewModal {
  constructor() {
    this.analysisData = null;
    this.story = null;
  }

  /**
   * Show the modal with analysis data
   * @param {Object} story - The ADO story object
   * @param {Object} analysisData - Contains risk, integration, blastRadius analysis results
   */
  show(story, analysisData) {
    this.story = story;
    this.analysisData = analysisData;

    // Create modal element
    const modal = this.createModalElement();
    document.body.appendChild(modal);

    // Populate preview
    this.populatePreview();

    // Attach event listeners
    this.attachEventListeners(modal);

    // Show modal with animation
    setTimeout(() => modal.classList.add('show'), 10);
  }

  /**
   * Create the modal HTML structure
   */
  createModalElement() {
    const modal = document.createElement('div');
    modal.className = 'push-modal';
    modal.id = 'pushPreviewModal';

    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>Preview ADO Update</h2>
          <button class="modal-close" id="closeModalBtn">&times;</button>
        </div>

        <div class="modal-body">
          <div class="story-info">
            <h3>Story: ${this.story.fields['System.Title']}</h3>
            <p class="story-id">ID: ${this.story.id}</p>
          </div>

          <div class="preview-warning">
            <strong>Important:</strong> Review these changes carefully before confirming.
            Changes will be written to Azure DevOps immediately upon confirmation.
          </div>

          <div class="preview-section">
            <h4>Tags to Add/Update</h4>
            <div id="tagsPreview" class="preview-content">
              <div class="loading">Generating tags...</div>
            </div>
          </div>

          <div class="preview-section">
            <h4>Comment to Add</h4>
            <div id="commentPreview" class="preview-content comment-preview">
              <div class="loading">Generating comment...</div>
            </div>
          </div>

          <div class="preview-section">
            <h4>Field Updates</h4>
            <div id="fieldsPreview" class="preview-content">
              <div class="loading">Calculating changes...</div>
            </div>
          </div>

          <div id="previewStatus" class="preview-status" style="display: none;"></div>
        </div>

        <div class="modal-footer">
          <button id="confirmPushBtn" class="btn-primary" disabled>
            <span class="btn-icon">✓</span>
            Confirm & Push to ADO
          </button>
          <button id="cancelPushBtn" class="btn-secondary">
            <span class="btn-icon">✗</span>
            Cancel
          </button>
        </div>
      </div>
    `;

    return modal;
  }

  /**
   * Populate the preview with generated content
   */
  async populatePreview() {
    try {
      // Generate tags
      const tags = this.generateTags();
      this.displayTagsPreview(tags);

      // Generate comment
      const comment = this.generateComment();
      this.displayCommentPreview(comment);

      // Generate field updates
      const fieldUpdates = this.generateFieldUpdates(tags);

      // Call preview API to see what will actually change
      await this.fetchPreview(fieldUpdates);

      // Enable confirm button once preview is loaded
      document.getElementById('confirmPushBtn').disabled = false;

    } catch (error) {
      console.error('Error populating preview:', error);
      this.showError('Failed to generate preview: ' + error.message);
    }
  }

  /**
   * Generate tags based on analysis results
   */
  generateTags() {
    const tags = [];

    // Risk level tag
    if (this.analysisData.risk) {
      const riskLevel = this.analysisData.risk.level || 'unknown';
      tags.push(`Risk: ${riskLevel.toUpperCase()}`);
    }

    // Integration count tag
    if (this.analysisData.integration) {
      const integrationCount = this.analysisData.integration.summary?.total || 0;
      if (integrationCount > 0) {
        tags.push(`Integrations: ${integrationCount}`);
      }
    }

    // Blast radius tag
    if (this.analysisData.blastRadius) {
      const affectedCount = this.analysisData.blastRadius.impact?.affectedComponents?.length || 0;
      if (affectedCount > 0) {
        tags.push(`Blast Radius: ${affectedCount} components`);
      }
    }

    // Analysis completed tag
    tags.push('QE-Analysis-Complete');

    return tags;
  }

  /**
   * Generate comment with analysis summary
   */
  generateComment() {
    let comment = '## Automated Analysis Results\n\n';
    comment += `**Analysis Date:** ${new Date().toLocaleString()}\n\n`;

    // Risk Analysis section
    if (this.analysisData.risk) {
      const risk = this.analysisData.risk;
      comment += `### Risk Assessment\n`;
      comment += `- **Risk Level:** ${risk.level?.toUpperCase() || 'Unknown'} (Score: ${risk.score || 0}/100)\n`;

      if (risk.factors) {
        comment += `- **Key Risk Factors:**\n`;
        const topFactors = Object.entries(risk.factors)
          .sort((a, b) => b[1].score - a[1].score)
          .slice(0, 3);

        topFactors.forEach(([name, factor]) => {
          comment += `  - ${name}: ${factor.score}/100 - ${factor.description}\n`;
        });
      }

      if (risk.recommendations && risk.recommendations.length > 0) {
        comment += `\n**Recommendations:**\n`;
        risk.recommendations.slice(0, 5).forEach(rec => {
          comment += `- [${rec.priority}] ${rec.text}\n`;
        });
      }
      comment += '\n';
    }

    // Integration Analysis section
    if (this.analysisData.integration) {
      const integration = this.analysisData.integration;
      comment += `### Integration Impact\n`;
      comment += `- **Total Integrations:** ${integration.summary?.total || 0}\n`;

      if (integration.summary?.byType) {
        comment += `- **By Type:**\n`;
        Object.entries(integration.summary.byType).forEach(([type, count]) => {
          comment += `  - ${type}: ${count}\n`;
        });
      }
      comment += '\n';
    }

    // Blast Radius section
    if (this.analysisData.blastRadius) {
      const blast = this.analysisData.blastRadius;
      comment += `### Blast Radius Analysis\n`;
      comment += `- **Risk Level:** ${blast.risk?.level?.toUpperCase() || 'Unknown'}\n`;
      comment += `- **Affected Components:** ${blast.impact?.affectedComponents?.length || 0}\n`;
      comment += `- **Affected Tests:** ${blast.impact?.affectedTests?.length || 0}\n`;

      if (blast.recommendations && blast.recommendations.length > 0) {
        comment += `\n**Testing Recommendations:**\n`;
        blast.recommendations.slice(0, 3).forEach(rec => {
          comment += `- [${rec.priority}] ${rec.recommendation}\n`;
        });
      }
      comment += '\n';
    }

    comment += '\n---\n';
    comment += '*Generated by QE MCP Stack - Automated Analysis System*';

    return comment;
  }

  /**
   * Generate field updates object
   */
  generateFieldUpdates(tags) {
    const updates = {};

    // Get current tags and merge with new tags
    const currentTags = this.story.fields['System.Tags'] || '';
    const existingTags = currentTags ? currentTags.split(';').map(t => t.trim()).filter(t => t) : [];

    // Filter out old analysis tags
    const filteredTags = existingTags.filter(tag =>
      !tag.startsWith('Risk:') &&
      !tag.startsWith('Integrations:') &&
      !tag.startsWith('Blast Radius:') &&
      tag !== 'QE-Analysis-Complete'
    );

    // Combine with new tags
    const allTags = [...filteredTags, ...tags];
    updates['System.Tags'] = allTags.join('; ');

    return updates;
  }

  /**
   * Display tags preview
   */
  displayTagsPreview(tags) {
    const container = document.getElementById('tagsPreview');

    if (tags.length === 0) {
      container.innerHTML = '<p class="empty-state">No tags to add</p>';
      return;
    }

    container.innerHTML = `
      <div class="tags-list">
        ${tags.map(tag => `
          <span class="tag-badge ${this.getTagClass(tag)}">${tag}</span>
        `).join('')}
      </div>
      <p class="tag-note">These tags will be merged with existing tags on the story.</p>
    `;
  }

  /**
   * Display comment preview
   */
  displayCommentPreview(comment) {
    const container = document.getElementById('commentPreview');

    container.innerHTML = `
      <div class="comment-text">${this.formatComment(comment)}</div>
    `;
  }

  /**
   * Fetch preview from API
   */
  async fetchPreview(fieldUpdates) {
    const container = document.getElementById('fieldsPreview');

    try {
      const response = await fetch(`${API_BASE_URL}/api/ado/update-story/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId: this.story.id,
          updates: fieldUpdates
        })
      });

      if (!response.ok) {
        throw new Error(`Preview API returned ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.preview) {
        this.displayFieldsPreview(data.preview);
      } else {
        throw new Error('Invalid preview response');
      }

    } catch (error) {
      console.error('Preview API error:', error);
      container.innerHTML = `<div class="error">Failed to fetch preview: ${error.message}</div>`;
    }
  }

  /**
   * Display fields preview
   */
  displayFieldsPreview(preview) {
    const container = document.getElementById('fieldsPreview');

    if (preview.changes.length === 0) {
      container.innerHTML = '<p class="empty-state">No field changes detected</p>';
      return;
    }

    container.innerHTML = `
      <div class="changes-table">
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>Current Value</th>
              <th>New Value</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${preview.changes.map(change => `
              <tr>
                <td><strong>${change.fieldName}</strong></td>
                <td class="current-value">${this.truncate(change.currentValue, 50)}</td>
                <td class="new-value">${this.truncate(change.newValue, 50)}</td>
                <td><span class="change-type ${change.changeType}">${change.changeType}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Execute the push to ADO
   */
  async executePush() {
    const confirmBtn = document.getElementById('confirmPushBtn');
    const cancelBtn = document.getElementById('cancelPushBtn');
    const statusDiv = document.getElementById('previewStatus');

    try {
      // Disable buttons
      confirmBtn.disabled = true;
      cancelBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="spinner"></span> Pushing...';

      statusDiv.style.display = 'block';
      statusDiv.className = 'preview-status info';
      statusDiv.textContent = 'Updating Azure DevOps...';

      // Generate updates
      const tags = this.generateTags();
      const comment = this.generateComment();
      const fieldUpdates = this.generateFieldUpdates(tags);

      // Step 1: Update tags and fields
      const updateResponse = await fetch(`${API_BASE_URL}/api/ado/update-story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId: this.story.id,
          updates: fieldUpdates,
          confirmed: true
        })
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.message || 'Failed to update story');
      }

      // Step 2: Add comment
      statusDiv.textContent = 'Adding comment...';

      const commentResponse = await fetch(`${API_BASE_URL}/api/ado/add-comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId: this.story.id,
          comment: comment
        })
      });

      if (!commentResponse.ok) {
        const errorData = await commentResponse.json();
        throw new Error(errorData.message || 'Failed to add comment');
      }

      // Success!
      statusDiv.className = 'preview-status success';
      statusDiv.innerHTML = `
        <strong>✓ Success!</strong> Analysis has been pushed to Azure DevOps.<br>
        <small>Story #${this.story.id} has been updated with tags and analysis comment.</small>
      `;

      confirmBtn.innerHTML = '<span class="btn-icon">✓</span> Completed';

      // Auto-close after 2 seconds
      setTimeout(() => {
        this.close();
      }, 2000);

    } catch (error) {
      console.error('Push to ADO error:', error);

      statusDiv.className = 'preview-status error';
      statusDiv.innerHTML = `
        <strong>✗ Error:</strong> ${error.message}<br>
        <small>Please try again or contact support if the problem persists.</small>
      `;

      confirmBtn.disabled = false;
      cancelBtn.disabled = false;
      confirmBtn.innerHTML = '<span class="btn-icon">✓</span> Retry';
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners(modal) {
    const confirmBtn = document.getElementById('confirmPushBtn');
    const cancelBtn = document.getElementById('cancelPushBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const overlay = modal.querySelector('.modal-overlay');

    confirmBtn.addEventListener('click', () => {
      this.executePush();
    });

    cancelBtn.addEventListener('click', () => {
      this.close();
    });

    closeBtn.addEventListener('click', () => {
      this.close();
    });

    overlay.addEventListener('click', () => {
      this.close();
    });

    // ESC key to close
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.close();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  /**
   * Close the modal
   */
  close() {
    const modal = document.getElementById('pushPreviewModal');
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.remove();
      }, 300);
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    const statusDiv = document.getElementById('previewStatus');
    statusDiv.style.display = 'block';
    statusDiv.className = 'preview-status error';
    statusDiv.innerHTML = `<strong>Error:</strong> ${message}`;
  }

  /**
   * Helper: Get CSS class for tag
   */
  getTagClass(tag) {
    if (tag.includes('Risk: CRITICAL') || tag.includes('Risk: HIGH')) return 'tag-high';
    if (tag.includes('Risk: MEDIUM')) return 'tag-medium';
    if (tag.includes('Risk: LOW')) return 'tag-low';
    return 'tag-default';
  }

  /**
   * Helper: Format comment with markdown-like rendering
   */
  formatComment(comment) {
    return comment
      .replace(/### (.*)/g, '<h4>$1</h4>')
      .replace(/## (.*)/g, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  /**
   * Helper: Truncate long strings
   */
  truncate(str, maxLength) {
    if (!str) return '(empty)';
    const text = String(str);
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}
