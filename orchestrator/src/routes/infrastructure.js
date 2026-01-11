import express from 'express';
import { logger } from '../utils/logger.js';
import { infrastructureData } from '../data/carePaymentApps.js';
import { fileWatcher } from '../services/fileWatcher.js';

const router = express.Router();

// Track when repos were last scanned to prevent excessive rescanning
const repoLastScan = {};
const RESCAN_DEBOUNCE_MS = 30000; // Wait 30 seconds between rescans

// Map repository names to integration-mapper app names
const repoAppMap = {
  'Core': 'Core',
  'Core.Common': 'Core.Common',
  'Payments': 'Payments',
  'PreCare': 'PreCare',
  'ThirdPartyIntegrations': 'ThirdPartyIntegrations'
};

/**
 * Trigger automatic rescan for a repository
 */
async function triggerAutoRescan(repo, mcpManager) {
  // Check if we recently scanned this repo
  const now = Date.now();
  const lastScan = repoLastScan[repo] || 0;

  if (now - lastScan < RESCAN_DEBOUNCE_MS) {
    logger.info(`Skipping rescan of ${repo} - recently scanned (${Math.round((now - lastScan) / 1000)}s ago)`);
    return;
  }

  logger.info(`Triggering automatic rescan of ${repo}...`);

  try {
    if (!mcpManager) {
      logger.warn('MCPManager not available for auto-rescan');
      return;
    }

    const appName = repoAppMap[repo];
    if (!appName) {
      logger.warn(`Unknown repository for auto-rescan: ${repo}`);
      return;
    }

    const scanResult = await mcpManager.callDockerMcp('integrationMapper', '/map-integrations', {
      app: appName,
      includeSchemas: true
    });

    repoLastScan[repo] = now;
    logger.info(`✓ Auto-rescan completed for ${repo}`);

    // TODO: Update cached infrastructure data with new scan results
    // For now, the data is available via the scan endpoint

  } catch (error) {
    logger.error(`Failed to auto-rescan ${repo}:`, error.message);
  }
}

// Store mcpManager reference for file watcher events
let mcpManagerRef = null;

// Set up file watcher event listener
fileWatcher.on('fileChanged', async ({ repo, path, type }) => {
  logger.info(`File change detected in ${repo}: ${type} - ${path}`);

  if (mcpManagerRef) {
    await triggerAutoRescan(repo, mcpManagerRef);
  }
});

// Middleware to capture mcpManager reference
router.use((req, res, next) => {
  if (req.mcpManager && !mcpManagerRef) {
    mcpManagerRef = req.mcpManager;
    logger.info('MCPManager reference captured for auto-rescan functionality');
  }
  next();
});

/**
 * GET /api/infrastructure/status
 * Returns infrastructure data for the 5 CarePayment repositories
 */
router.get('/status', async (req, res) => {
  try {
    // Return CarePayment application architecture data
    // This data represents the 5 repositories and their integrations
    res.json({ data: infrastructureData });
  } catch (error) {
    logger.error('Error fetching infrastructure status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch infrastructure status',
      error: error.message
    });
  }
});

/**
 * GET /api/infrastructure/applications/:appKey
 * Returns detailed information for a specific application
 */
router.get('/applications/:appKey', async (req, res) => {
  try {
    const { appKey } = req.params;
    const app = infrastructureData.applications[appKey];

    if (!app) {
      return res.status(404).json({
        status: 'error',
        message: `Application '${appKey}' not found`
      });
    }

    res.json({ data: app });
  } catch (error) {
    logger.error('Error fetching application details:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch application details',
      error: error.message
    });
  }
});

/**
 * POST /api/infrastructure/scan
 * Trigger a rescan of repository code to update integration data
 */
router.post('/scan', async (req, res) => {
  try {
    const { repo } = req.body;
    const mcpManager = req.mcpManager;

    logger.info(`Scan requested for repo: ${repo || 'all'}`);

    const results = [];

    if (repo && repoAppMap[repo]) {
      // Scan single repository
      try {
        const scanResult = await mcpManager.callDockerMcp('integrationMapper', '/map-integrations', {
          app: repoAppMap[repo],
          includeSchemas: true
        });
        results.push({ repo, status: 'success', data: scanResult });
        logger.info(`Successfully scanned ${repo}`);
      } catch (error) {
        logger.error(`Failed to scan ${repo}:`, error.message);
        results.push({ repo, status: 'error', error: error.message });
      }
    } else {
      // Scan all repositories
      for (const [repoName, appName] of Object.entries(repoAppMap)) {
        try {
          const scanResult = await mcpManager.callDockerMcp('integrationMapper', '/map-integrations', {
            app: appName,
            includeSchemas: true
          });
          results.push({ repo: repoName, status: 'success', data: scanResult });
          logger.info(`Successfully scanned ${repoName}`);
        } catch (error) {
          logger.error(`Failed to scan ${repoName}:`, error.message);
          results.push({ repo: repoName, status: 'error', error: error.message });
        }
      }
    }

    // Update last scan time
    fileWatcher.updateLastScan();

    res.json({
      status: 'success',
      message: `Scan completed for ${repo || 'all repositories'}`,
      timestamp: new Date().toISOString(),
      results
    });
  } catch (error) {
    logger.error('Error triggering scan:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to trigger scan',
      error: error.message
    });
  }
});

/**
 * GET /api/infrastructure/changes
 * Returns infrastructure changes and file system updates
 */
router.get('/changes', async (req, res) => {
  try {
    const changes = fileWatcher.getChanges();

    res.json({
      timestamp: new Date().toISOString(),
      changes: changes.map(c => ({
        file: c.file,
        type: c.type,
        repo: c.repo,
        timestamp: c.timestamp
      })),
      lastScan: fileWatcher.getLastScan().toISOString(),
      watchEnabled: fileWatcher.isEnabled()
    });
  } catch (error) {
    logger.error('Error fetching infrastructure changes:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch infrastructure changes',
      error: error.message
    });
  }
});

export default router;
