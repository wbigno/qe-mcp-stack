const API_BASE_URL = "http://localhost:3000";

/**
 * Multi-select Application Selector with checkbox dropdown
 * Allows selecting multiple repositories for analysis
 */
export class AppSelector {
  constructor(containerId, onChange = null) {
    this.container = document.getElementById(containerId);
    this.onChange = onChange;
    this.apps = [];
    this.selectedApps = new Set();
    this.isOpen = false;

    if (!this.container) {
      console.error(`AppSelector: element with id '${containerId}' not found`);
      return;
    }

    this.render();
    this.loadApps();
    this.setupOutsideClickHandler();
  }

  render() {
    this.container.innerHTML = `
      <div class="app-multi-select">
        <div class="app-select-trigger" tabindex="0">
          <span class="app-select-text">Select Applications...</span>
          <span class="app-select-arrow">▼</span>
        </div>
        <div class="app-select-dropdown">
          <div class="app-select-search">
            <input type="text" placeholder="Search apps..." class="app-search-input">
          </div>
          <div class="app-select-actions">
            <button type="button" class="app-action-btn select-all">Select All</button>
            <button type="button" class="app-action-btn clear-all">Clear All</button>
          </div>
          <div class="app-select-options">
            <div class="app-loading">Loading apps...</div>
          </div>
        </div>
      </div>
    `;

    this.trigger = this.container.querySelector(".app-select-trigger");
    this.dropdown = this.container.querySelector(".app-select-dropdown");
    this.optionsContainer = this.container.querySelector(".app-select-options");
    this.searchInput = this.container.querySelector(".app-search-input");
    this.selectText = this.container.querySelector(".app-select-text");

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Toggle dropdown on trigger click
    this.trigger.addEventListener("click", () => this.toggleDropdown());
    this.trigger.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.toggleDropdown();
      }
    });

    // Search functionality
    this.searchInput.addEventListener("input", (e) =>
      this.filterApps(e.target.value),
    );

    // Select/Clear all buttons
    this.container
      .querySelector(".select-all")
      .addEventListener("click", () => this.selectAll());
    this.container
      .querySelector(".clear-all")
      .addEventListener("click", () => this.clearAll());
  }

  setupOutsideClickHandler() {
    document.addEventListener("click", (e) => {
      if (!this.container.contains(e.target) && this.isOpen) {
        this.closeDropdown();
      }
    });
  }

  toggleDropdown() {
    this.isOpen ? this.closeDropdown() : this.openDropdown();
  }

  openDropdown() {
    this.isOpen = true;
    this.dropdown.classList.add("open");
    this.trigger.classList.add("open");

    // Position dropdown using fixed positioning to escape overflow:hidden parents
    const triggerRect = this.trigger.getBoundingClientRect();
    this.dropdown.style.top = `${triggerRect.bottom + 4}px`;
    this.dropdown.style.left = `${triggerRect.left}px`;
    this.dropdown.style.width = `${triggerRect.width}px`;

    this.searchInput.focus();
  }

  closeDropdown() {
    this.isOpen = false;
    this.dropdown.classList.remove("open");
    this.trigger.classList.remove("open");
    this.searchInput.value = "";
    this.filterApps("");
  }

  async loadApps() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard/config/apps`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.apps && data.apps.length > 0) {
        this.apps = data.apps;
        this.renderOptions();
      } else {
        this.optionsContainer.innerHTML =
          '<div class="app-no-results">No apps available</div>';
      }
    } catch (error) {
      console.error("Error loading apps:", error);
      this.optionsContainer.innerHTML =
        '<div class="app-error">Error loading apps</div>';
    }
  }

  renderOptions(filter = "") {
    const filteredApps = this.apps.filter((app) =>
      app.name.toLowerCase().includes(filter.toLowerCase()),
    );

    if (filteredApps.length === 0) {
      this.optionsContainer.innerHTML =
        '<div class="app-no-results">No matching apps</div>';
      return;
    }

    this.optionsContainer.innerHTML = filteredApps
      .map(
        (app) => `
        <label class="app-option">
          <input type="checkbox" value="${app.name}" ${this.selectedApps.has(app.name) ? "checked" : ""}>
          <span class="app-checkbox"></span>
          <span class="app-name">${app.name}</span>
          ${app.description && app.description !== app.name ? `<span class="app-desc">- ${app.description}</span>` : ""}
        </label>
      `,
      )
      .join("");

    // Add change listeners to checkboxes
    this.optionsContainer
      .querySelectorAll('input[type="checkbox"]')
      .forEach((checkbox) => {
        checkbox.addEventListener("change", (e) => {
          if (e.target.checked) {
            this.selectedApps.add(e.target.value);
          } else {
            this.selectedApps.delete(e.target.value);
          }
          this.updateTriggerText();
          this.notifyChange();
        });
      });
  }

  filterApps(searchTerm) {
    this.renderOptions(searchTerm);
  }

  selectAll() {
    this.apps.forEach((app) => this.selectedApps.add(app.name));
    this.renderOptions(this.searchInput.value);
    this.updateTriggerText();
    this.notifyChange();
  }

  clearAll() {
    this.selectedApps.clear();
    this.renderOptions(this.searchInput.value);
    this.updateTriggerText();
    this.notifyChange();
  }

  updateTriggerText() {
    const count = this.selectedApps.size;
    if (count === 0) {
      this.selectText.textContent = "Select Applications...";
      this.selectText.classList.remove("has-selection");
    } else if (count === 1) {
      this.selectText.textContent = Array.from(this.selectedApps)[0];
      this.selectText.classList.add("has-selection");
    } else {
      this.selectText.textContent = `${count} apps selected`;
      this.selectText.classList.add("has-selection");
    }
  }

  notifyChange() {
    if (this.onChange && typeof this.onChange === "function") {
      this.onChange(this.getSelectedApps());
    }
  }

  // Public API methods
  getSelectedApps() {
    return Array.from(this.selectedApps);
  }

  getSelectedApp() {
    // Backwards compatibility - returns first selected app or empty string
    const apps = this.getSelectedApps();
    return apps.length > 0 ? apps[0] : "";
  }

  setSelectedApps(appNames) {
    this.selectedApps.clear();
    appNames.forEach((name) => {
      if (this.apps.some((app) => app.name === name)) {
        this.selectedApps.add(name);
      }
    });
    this.renderOptions();
    this.updateTriggerText();
  }

  setSelectedApp(appName) {
    // Backwards compatibility
    if (appName) {
      this.setSelectedApps([appName]);
    } else {
      this.clearAll();
    }
  }
}
