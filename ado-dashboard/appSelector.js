const API_BASE_URL = 'http://localhost:3000';

export class AppSelector {
  constructor(selectId, onChange = null) {
    this.select = document.getElementById(selectId);
    this.onChange = onChange;
    if (!this.select) {
      console.error(`AppSelector: element with id '${selectId}' not found`);
      return;
    }

    // Add change event listener if callback provided
    if (this.onChange && typeof this.onChange === 'function') {
      this.select.addEventListener('change', () => {
        this.onChange(this.select.value);
      });
    }

    this.loadApps();
  }

  async loadApps() {
    this.select.disabled = true;
    this.select.innerHTML = '<option value="">Loading apps...</option>';

    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard/config/apps`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      this.select.innerHTML = '<option value="">Select App</option>';

      if (data.apps && data.apps.length > 0) {
        data.apps.forEach(app => {
          const option = document.createElement('option');
          option.value = app.name;
          option.textContent = `${app.name}${app.description && app.description !== app.name ? ' - ' + app.description : ''}`;
          this.select.appendChild(option);
        });

        this.select.disabled = false;
      } else {
        this.select.innerHTML = '<option value="">No apps available</option>';
        this.select.disabled = true;
      }

    } catch (error) {
      console.error('Error loading apps:', error);
      this.select.innerHTML = '<option value="">Error loading apps</option>';
      this.select.disabled = true;
    }
  }

  getSelectedApp() {
    return this.select.value;
  }

  setSelectedApp(appName) {
    this.select.value = appName;
  }
}
