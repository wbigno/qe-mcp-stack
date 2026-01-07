// ============================================
// EMPTY STATE COMPONENT
// Shows helpful messages when no data is available
// NO MOCK DATA - REAL DATA ONLY
// ============================================

export class EmptyState {
    /**
     * Create an empty state HTML element
     * @param {string} type - Type of empty state (work-items, defects, tests, quality, general)
     * @param {object} options - Additional options (message, icon, showInstructions)
     */
    static create(type = 'general', options = {}) {
        const configs = {
            'work-items': {
                icon: '📋',
                title: 'No Work Items Loaded',
                message: 'Select a project, team, and sprint above, then click "Apply" to load work items.',
                instructions: [
                    'Choose a project from the dropdown',
                    'Select a team',
                    'Pick a sprint',
                    'Click "Apply" to fetch data'
                ]
            },
            'defects': {
                icon: '🐛',
                title: 'No Defects Loaded',
                message: 'Select a sprint and filters above, then click "Apply" to load defects.',
                instructions: [
                    'Choose a sprint from the dropdown',
                    'Optionally filter by environment or state',
                    'Click "Apply" to fetch defects'
                ]
            },
            'tests': {
                icon: '🧪',
                title: 'No Test Data Loaded',
                message: 'Select a sprint above, then click "Apply" to load test execution data.',
                instructions: [
                    'Choose a sprint from the dropdown',
                    'Click "Apply" to fetch test results'
                ]
            },
            'quality': {
                icon: '📊',
                title: 'No Quality Metrics Available',
                message: 'Select a sprint above, then click "Apply" to load quality metrics.',
                instructions: [
                    'Choose a sprint from the dropdown',
                    'Click "Apply" to fetch metrics'
                ]
            },
            'test-cases': {
                icon: '📝',
                title: 'Generate Test Cases',
                message: 'Enter a story ID and click "Generate Test Cases" to create AI-generated test cases.',
                instructions: [
                    'Enter a valid Azure DevOps story ID',
                    'Click "Generate Test Cases"',
                    'Review and optionally push to ADO'
                ]
            },
            'story-analysis': {
                icon: '🔍',
                title: 'Story Analysis',
                message: 'Enter a story ID and click "Analyze Story" to get AI-powered analysis.',
                instructions: [
                    'Enter a valid Azure DevOps story ID',
                    'Click "Analyze Story"',
                    'Review requirements, risks, and recommendations'
                ]
            },
            'general': {
                icon: 'ℹ️',
                title: 'No Data Available',
                message: options.message || 'Please fill in the form above and click "Apply" to load data.',
                instructions: []
            }
        };

        const config = configs[type] || configs.general;
        const icon = options.icon || config.icon;
        const title = options.title || config.title;
        const message = options.message || config.message;
        const instructions = options.instructions || config.instructions;
        const showInstructions = options.showInstructions !== false && instructions.length > 0;

        const div = document.createElement('div');
        div.className = 'empty-state';
        div.innerHTML = `
            <div class="empty-state-content">
                <div class="empty-state-icon">${icon}</div>
                <h3 class="empty-state-title">${title}</h3>
                <p class="empty-state-message">${message}</p>
                ${showInstructions ? `
                    <div class="empty-state-instructions">
                        <ol>
                            ${instructions.map(instr => `<li>${instr}</li>`).join('')}
                        </ol>
                    </div>
                ` : ''}
            </div>
        `;

        return div;
    }

    /**
     * Create a loading state element
     */
    static createLoading(message = 'Loading...') {
        const div = document.createElement('div');
        div.className = 'loading-state';
        div.innerHTML = `
            <div class="loading-state-content">
                <div class="loading-spinner"></div>
                <p class="loading-message">${message}</p>
            </div>
        `;
        return div;
    }

    /**
     * Create an error state element
     */
    static createError(error, retryCallback = null) {
        const div = document.createElement('div');
        div.className = 'error-state';
        div.innerHTML = `
            <div class="error-state-content">
                <div class="error-state-icon">⚠️</div>
                <h3 class="error-state-title">Error Loading Data</h3>
                <p class="error-state-message">${error}</p>
                ${retryCallback ? '<button class="retry-btn">Retry</button>' : ''}
            </div>
        `;

        if (retryCallback) {
            div.querySelector('.retry-btn').addEventListener('click', retryCallback);
        }

        return div;
    }

    /**
     * Create a cache indicator element
     */
    static createCacheIndicator(metadata, refreshCallback) {
        const div = document.createElement('div');
        div.className = 'cache-indicator';

        const timeAgo = EmptyState.formatTimeAgo(metadata.age);
        const expiresIn = EmptyState.formatTimeAgo(metadata.remaining);

        div.innerHTML = `
            <div class="cache-indicator-content">
                <span class="cache-icon">💾</span>
                <span class="cache-text">
                    Showing cached data from ${timeAgo} ago (expires in ${expiresIn})
                </span>
                ${refreshCallback ? '<button class="cache-refresh-btn">Refresh</button>' : ''}
            </div>
        `;

        if (refreshCallback) {
            div.querySelector('.cache-refresh-btn').addEventListener('click', refreshCallback);
        }

        return div;
    }

    /**
     * Format seconds into human-readable time
     */
    static formatTimeAgo(seconds) {
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ${minutes % 60}m`;
    }
}
