/**
 * File System Watcher for CarePayment Repositories
 * Monitors .cs files for changes and triggers rescans
 */

import chokidar from 'chokidar';
import { logger } from '../utils/logger.js';
import { EventEmitter } from 'events';

// Repository paths - these should match the mounted volumes in docker-compose.yml
const REPO_PATHS = {
  Core: '/mnt/apps/Core',
  'Core.Common': '/mnt/apps/Core.Common',
  Payments: '/mnt/apps/Payments',
  PreCare: '/mnt/apps/PreCare',
  ThirdPartyIntegrations: '/mnt/apps/ThirdPartyIntegrations'
};

class FileWatcher extends EventEmitter {
  constructor() {
    super();
    this.changes = [];
    this.lastScan = new Date();
    this.watcher = null;
    this.enabled = false;
  }

  /**
   * Start watching repositories
   */
  start() {
    if (this.watcher) {
      logger.warn('File watcher already running');
      return;
    }

    try {
      // Build watch patterns for all repos
      const watchPatterns = Object.entries(REPO_PATHS).map(([name, path]) => {
        return `${path}/**/*.cs`; // Watch all C# files
      });

      logger.info(`Starting file watcher for ${Object.keys(REPO_PATHS).length} repositories`);

      this.watcher = chokidar.watch(watchPatterns, {
        ignored: /(^|[\/\\])\../, // Ignore dotfiles
        persistent: true,
        ignoreInitial: true, // Don't fire events for existing files on startup
        awaitWriteFinish: {
          stabilityThreshold: 2000, // Wait 2s after last change
          pollInterval: 100
        }
      });

      this.watcher
        .on('change', (path) => {
          const repo = this.getRepoFromPath(path);
          logger.info(`File changed: ${path} (${repo})`);

          this.changes.push({
            type: 'modified',
            file: path,
            repo,
            timestamp: new Date()
          });

          // Emit change event for other services to listen to
          this.emit('fileChanged', { repo, path, type: 'modified' });
        })
        .on('add', (path) => {
          const repo = this.getRepoFromPath(path);
          logger.info(`File added: ${path} (${repo})`);

          this.changes.push({
            type: 'added',
            file: path,
            repo,
            timestamp: new Date()
          });

          this.emit('fileChanged', { repo, path, type: 'added' });
        })
        .on('unlink', (path) => {
          const repo = this.getRepoFromPath(path);
          logger.info(`File removed: ${path} (${repo})`);

          this.changes.push({
            type: 'removed',
            file: path,
            repo,
            timestamp: new Date()
          });

          this.emit('fileChanged', { repo, path, type: 'removed' });
        })
        .on('error', (error) => {
          logger.error('File watcher error:', error);
        });

      this.enabled = true;
      logger.info('File watcher started successfully');
    } catch (error) {
      logger.error('Failed to start file watcher:', error);
      this.enabled = false;
    }
  }

  /**
   * Stop watching
   */
  async stop() {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      this.enabled = false;
      logger.info('File watcher stopped');
    }
  }

  /**
   * Get changes since last call and clear the buffer
   */
  getChanges() {
    const changes = [...this.changes];
    this.changes = []; // Clear after reading
    return changes;
  }

  /**
   * Get repository name from file path
   */
  getRepoFromPath(filePath) {
    for (const [name, path] of Object.entries(REPO_PATHS)) {
      if (filePath.startsWith(path)) {
        return name;
      }
    }
    return 'unknown';
  }

  /**
   * Check if watcher is enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Get last scan time
   */
  getLastScan() {
    return this.lastScan;
  }

  /**
   * Update last scan time
   */
  updateLastScan() {
    this.lastScan = new Date();
  }
}

// Export singleton instance
export const fileWatcher = new FileWatcher();
