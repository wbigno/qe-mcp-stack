import { readFileSync } from 'fs';

export function loadAppsConfig() {
  try {
    const configPath = '/app/config/apps.json';
    const configData = readFileSync(configPath, 'utf-8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('Error loading apps config:', error);
    return {
      applications: [],
      settings: {}
    };
  }
}
