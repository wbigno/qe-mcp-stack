/**
 * AI Model Selector Component
 *
 * Persistent header button for on-demand AI model selection.
 * Stores preferences in localStorage and allows switching anytime.
 */

const MODEL_OPTIONS = {
  anthropic: [
    {
      id: 'claude-sonnet-4-20250514',
      name: 'Claude Sonnet 4.5',
      description: 'Balanced performance and reasoning - Recommended',
      tier: 'balanced',
      default: true
    },
    {
      id: 'claude-opus-4-5-20251101',
      name: 'Claude Opus 4.5',
      description: 'Most capable for complex reasoning',
      tier: 'advanced'
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude Haiku 3.5',
      description: 'Fast and efficient - Best for routine tasks',
      tier: 'fast'
    }
  ],
  openai: [
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      description: 'Fast and cost-effective',
      tier: 'fast',
      default: true
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      description: 'Balanced intelligence and speed',
      tier: 'balanced'
    },
    {
      id: 'o1',
      name: 'O1',
      description: 'Advanced reasoning capabilities',
      tier: 'advanced'
    },
    {
      id: 'o1-mini',
      name: 'O1 Mini',
      description: 'Efficient reasoning model',
      tier: 'fast'
    }
  ]
};

class ModelSelector {
  constructor() {
    this.storageKeys = {
      provider: 'ai_selected_provider',
      model: 'ai_selected_model'
    };
  }

  /**
   * Initialize model selector - add header button
   */
  initialize() {
    this.addHeaderButton();
  }

  /**
   * Get current model selection
   */
  getSelection() {
    const provider = localStorage.getItem(this.storageKeys.provider) || 'anthropic';
    const model = localStorage.getItem(this.storageKeys.model) || this.getDefaultModel(provider);

    return { provider, model };
  }

  /**
   * Get default model for provider
   */
  getDefaultModel(provider) {
    const defaultModel = MODEL_OPTIONS[provider].find(m => m.default);
    return defaultModel?.id || MODEL_OPTIONS[provider][0].id;
  }

  /**
   * Get model display info
   */
  getModelInfo(modelId) {
    for (const provider in MODEL_OPTIONS) {
      const model = MODEL_OPTIONS[provider].find(m => m.id === modelId);
      if (model) return model;
    }
    return null;
  }

  /**
   * Add header button to dashboard
   */
  addHeaderButton() {
    const header = document.querySelector('.dashboard-top-header .header-title');

    if (header && !document.getElementById('aiModelSelectorBtn')) {
      const { model } = this.getSelection();
      const modelInfo = this.getModelInfo(model);

      const button = document.createElement('button');
      button.id = 'aiModelSelectorBtn';
      button.className = 'btn btn-sm model-selector-btn';
      button.innerHTML = `
        <span class="model-icon">🤖</span>
        <span class="model-name">${modelInfo?.name || 'Select Model'}</span>
      `;

      button.addEventListener('click', () => {
        this.showModal();
      });

      header.appendChild(button);
    }
  }

  /**
   * Update header button display
   */
  updateHeaderButton() {
    const button = document.getElementById('aiModelSelectorBtn');
    if (button) {
      const { model } = this.getSelection();
      const modelInfo = this.getModelInfo(model);
      button.querySelector('.model-name').textContent = modelInfo?.name || 'Select Model';
    }
  }

  /**
   * Show model selection modal
   */
  showModal() {
    const modal = this.createModalHTML();
    document.body.insertAdjacentHTML('beforeend', modal);

    // Initialize event listeners
    this.attachModalListeners();

    // Show modal with animation
    setTimeout(() => {
      document.getElementById('aiModelModal').classList.add('show');
    }, 10);
  }

  /**
   * Create modal HTML
   */
  createModalHTML() {
    const { provider: savedProvider, model: savedModel } = this.getSelection();

    return `
      <div id="aiModelModal" class="ai-modal">
        <div class="ai-modal-overlay" id="aiModalOverlay"></div>
        <div class="ai-modal-content">
          <div class="ai-modal-header">
            <h2>🤖 Select AI Model</h2>
            <p>Choose the AI model for your current work. You can change this anytime.</p>
          </div>

          <div class="ai-modal-body">
            <!-- Provider Selection -->
            <div class="provider-selection">
              <label class="provider-option ${savedProvider === 'anthropic' ? 'selected' : ''}">
                <input type="radio" name="provider" value="anthropic"
                       ${savedProvider === 'anthropic' ? 'checked' : ''}>
                <div class="provider-card">
                  <div class="provider-logo">🔮</div>
                  <div class="provider-name">Anthropic Claude</div>
                  <div class="provider-desc">Advanced reasoning and analysis</div>
                </div>
              </label>

              <label class="provider-option ${savedProvider === 'openai' ? 'selected' : ''}">
                <input type="radio" name="provider" value="openai"
                       ${savedProvider === 'openai' ? 'checked' : ''}>
                <div class="provider-card">
                  <div class="provider-logo">🚀</div>
                  <div class="provider-name">OpenAI GPT</div>
                  <div class="provider-desc">Versatile language models</div>
                </div>
              </label>
            </div>

            <!-- Model Selection (Anthropic) -->
            <div id="anthropicModels" class="model-selection"
                 style="display: ${savedProvider === 'anthropic' ? 'block' : 'none'}">
              <h3>Claude Models</h3>
              ${this.renderModelOptions('anthropic', savedModel)}
            </div>

            <!-- Model Selection (OpenAI) -->
            <div id="openaiModels" class="model-selection"
                 style="display: ${savedProvider === 'openai' ? 'block' : 'none'}">
              <h3>OpenAI Models</h3>
              ${this.renderModelOptions('openai', savedModel)}
            </div>
          </div>

          <div class="ai-modal-footer">
            <button id="cancelModelBtn" class="btn btn-secondary">Cancel</button>
            <button id="confirmModelBtn" class="btn btn-primary">Confirm Selection</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render model options for a provider
   */
  renderModelOptions(provider, selectedModel) {
    return MODEL_OPTIONS[provider].map(model => `
      <label class="model-option ${selectedModel === model.id ? 'selected' : ''}">
        <input type="radio" name="model" value="${model.id}"
               data-provider="${provider}"
               ${selectedModel === model.id ? 'checked' : ''}>
        <div class="model-card tier-${model.tier}">
          <div class="model-header">
            <div class="model-name">${model.name}</div>
            <div class="model-tier-badge">${model.tier.toUpperCase()}</div>
          </div>
          <div class="model-desc">${model.description}</div>
        </div>
      </label>
    `).join('');
  }

  /**
   * Attach event listeners to modal
   */
  attachModalListeners() {
    const modal = document.getElementById('aiModelModal');

    // Provider radio buttons
    document.querySelectorAll('input[name="provider"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const provider = e.target.value;

        // Update selected state
        document.querySelectorAll('.provider-option').forEach(opt => {
          opt.classList.remove('selected');
        });
        e.target.closest('.provider-option').classList.add('selected');

        // Show/hide model sections
        document.getElementById('anthropicModels').style.display =
          provider === 'anthropic' ? 'block' : 'none';
        document.getElementById('openaiModels').style.display =
          provider === 'openai' ? 'block' : 'none';

        // Auto-select first model for new provider
        const firstModel = MODEL_OPTIONS[provider].find(m => m.default) || MODEL_OPTIONS[provider][0];
        const modelRadio = document.querySelector(`input[name="model"][value="${firstModel.id}"]`);
        if (modelRadio) {
          modelRadio.checked = true;
          document.querySelectorAll('.model-option').forEach(opt => {
            opt.classList.remove('selected');
          });
          modelRadio.closest('.model-option').classList.add('selected');
        }
      });
    });

    // Model radio buttons
    document.querySelectorAll('input[name="model"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        document.querySelectorAll('.model-option').forEach(opt => {
          opt.classList.remove('selected');
        });
        e.target.closest('.model-option').classList.add('selected');
      });
    });

    // Cancel button
    document.getElementById('cancelModelBtn').addEventListener('click', () => {
      this.closeModal();
    });

    // Overlay click to close
    document.getElementById('aiModalOverlay').addEventListener('click', () => {
      this.closeModal();
    });

    // Confirm button
    document.getElementById('confirmModelBtn').addEventListener('click', () => {
      this.saveSelection();
      this.updateHeaderButton();
      this.closeModal();
    });

    // ESC key to close
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  /**
   * Save selection to localStorage
   */
  saveSelection() {
    const provider = document.querySelector('input[name="provider"]:checked')?.value;
    const model = document.querySelector('input[name="model"]:checked')?.value;

    if (provider && model) {
      localStorage.setItem(this.storageKeys.provider, provider);
      localStorage.setItem(this.storageKeys.model, model);

      console.log(`✓ AI Model selected: ${provider} / ${model}`);
    }
  }

  /**
   * Close modal
   */
  closeModal() {
    const modal = document.getElementById('aiModelModal');
    if (modal) {
      modal.classList.remove('show');

      setTimeout(() => {
        modal.remove();
      }, 300);
    }
  }
}

// Export singleton instance
export const modelSelector = new ModelSelector();
