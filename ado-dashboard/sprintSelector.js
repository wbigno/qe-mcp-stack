const API_BASE_URL = 'http://localhost:3000';

export class SprintSelector {
  constructor(containerId, onChangeCallback) {
    this.container = document.getElementById(containerId);
    this.onChange = onChangeCallback;
    this.selectedProject = null;
    this.selectedTeam = null;
    this.selectedSprint = null;
    this.render();
    this.loadProjects();
  }

  render() {
    this.container.innerHTML = `
      <select id="projectDropdown" disabled>
        <option value="">Loading projects...</option>
      </select>
      <select id="teamDropdown" disabled>
        <option value="">Select project first</option>
      </select>
      <select id="sprintDropdown" disabled>
        <option value="">Select team first</option>
      </select>
    `;

    this.projectDropdown = document.getElementById('projectDropdown');
    this.teamDropdown = document.getElementById('teamDropdown');
    this.sprintDropdown = document.getElementById('sprintDropdown');

    this.attachEventListeners();
  }

  attachEventListeners() {
    this.projectDropdown.addEventListener('change', async (e) => {
      const projectName = e.target.value;
      if (projectName) {
        this.selectedProject = projectName;
        this.selectedTeam = null;
        this.selectedSprint = null;
        this.teamDropdown.value = '';
        this.sprintDropdown.value = '';
        this.sprintDropdown.disabled = true;
        await this.loadTeams(projectName);
      } else {
        this.selectedProject = null;
        this.selectedTeam = null;
        this.selectedSprint = null;
        this.teamDropdown.disabled = true;
        this.sprintDropdown.disabled = true;
      }
      this.notifyChange();
    });

    this.teamDropdown.addEventListener('change', async (e) => {
      const teamName = e.target.value;
      if (teamName && this.selectedProject) {
        this.selectedTeam = teamName;
        this.selectedSprint = null;
        this.sprintDropdown.value = '';
        await this.loadSprints(this.selectedProject, teamName);
      } else {
        this.selectedTeam = null;
        this.selectedSprint = null;
        this.sprintDropdown.disabled = true;
      }
      this.notifyChange();
    });

    this.sprintDropdown.addEventListener('change', (e) => {
      const sprintValue = e.target.value;
      if (sprintValue) {
        // Parse the selected option's data-path attribute or use value
        const selectedOption = this.sprintDropdown.options[this.sprintDropdown.selectedIndex];
        this.selectedSprint = {
          name: selectedOption.text,
          path: selectedOption.getAttribute('data-path') || sprintValue
        };
      } else {
        this.selectedSprint = null;
      }
      this.notifyChange();
    });
  }

  async loadProjects() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ado/iterations/projects`);
      const data = await response.json();

      // Check if response was successful
      if (!response.ok || !data.projects) {
        throw new Error(data.error || data.message || 'Failed to load projects');
      }

      this.populateDropdown(
        this.projectDropdown,
        data.projects,
        'Select Project',
        false
      );
    } catch (error) {
      console.error('Error loading projects:', error);
      this.populateDropdown(
        this.projectDropdown,
        [],
        'Azure DevOps not configured',
        true
      );
    }
  }

  async loadTeams(project) {
    this.teamDropdown.disabled = true;
    this.teamDropdown.innerHTML = '<option value="">Loading teams...</option>';

    try {
      const response = await fetch(`${API_BASE_URL}/api/ado/iterations/teams?project=${encodeURIComponent(project)}`);
      const data = await response.json();

      if (!response.ok || !data.teams) {
        throw new Error(data.error || data.message || 'Failed to load teams');
      }

      this.populateDropdown(
        this.teamDropdown,
        data.teams,
        'Select Team',
        false
      );
    } catch (error) {
      console.error('Error loading teams:', error);
      this.populateDropdown(
        this.teamDropdown,
        [],
        'Error loading teams',
        true
      );
    }
  }

  async loadSprints(project, team) {
    this.sprintDropdown.disabled = true;
    this.sprintDropdown.innerHTML = '<option value="">Loading sprints...</option>';

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/ado/iterations/sprints?project=${encodeURIComponent(project)}&team=${encodeURIComponent(team)}`
      );
      const data = await response.json();

      if (!response.ok || !data.sprints) {
        throw new Error(data.error || data.message || 'Failed to load sprints');
      }

      // Sort sprints by start date (most recent first)
      const sortedSprints = data.sprints.sort((a, b) => {
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        return new Date(b.startDate) - new Date(a.startDate);
      });

      this.populateSprintDropdown(sortedSprints);
    } catch (error) {
      console.error('Error loading sprints:', error);
      this.populateDropdown(
        this.sprintDropdown,
        [],
        'Error loading sprints',
        true
      );
    }
  }

  populateDropdown(dropdown, items, placeholder, disabled) {
    dropdown.innerHTML = `<option value="">${placeholder}</option>`;

    items.forEach(item => {
      const option = document.createElement('option');
      option.value = item.name;
      option.textContent = item.name;
      dropdown.appendChild(option);
    });

    dropdown.disabled = disabled || items.length === 0;
  }

  populateSprintDropdown(sprints) {
    this.sprintDropdown.innerHTML = '<option value="">Select Sprint</option>';

    sprints.forEach(sprint => {
      const option = document.createElement('option');
      option.value = sprint.name;
      option.setAttribute('data-path', sprint.path);

      // Format sprint display with dates if available
      let displayText = sprint.name;
      if (sprint.startDate && sprint.finishDate) {
        const start = new Date(sprint.startDate).toLocaleDateString();
        const end = new Date(sprint.finishDate).toLocaleDateString();
        displayText += ` (${start} - ${end})`;
      }

      option.textContent = displayText;
      this.sprintDropdown.appendChild(option);
    });

    this.sprintDropdown.disabled = sprints.length === 0;
  }

  getSelectedSprintPath() {
    if (!this.selectedProject || !this.selectedTeam || !this.selectedSprint) {
      return null;
    }
    return this.selectedSprint.path;
  }

  notifyChange() {
    if (this.onChange) {
      this.onChange(this.getSelectedSprintPath());
    }
  }
}
