/**
 * Swagger Aggregation Routes
 * Aggregates Swagger/OpenAPI documentation from all MCPs
 */

import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/swagger/docs
 * Returns list of all available MCP Swagger documentation URLs
 */
router.get('/docs', async (req, res) => {
  try {
    const docs = await req.mcpManager.getAllSwaggerDocs();
    res.json({ success: true, docs });
  } catch (error) {
    logger.error('Error fetching Swagger docs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/swagger/aggregated.json
 * Returns aggregated OpenAPI spec combining all MCPs
 * IMPORTANT: Must be defined BEFORE /:mcpName to avoid matching as a parameter
 */
router.get('/aggregated.json', async (req, res) => {
  try {
    const aggregatedSpec = await req.mcpManager.getAggregatedSwaggerSpec();
    res.json(aggregatedSpec);
  } catch (error) {
    logger.error('Error generating aggregated Swagger spec:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/swagger/:mcpName
 * Returns Swagger documentation for a specific MCP
 */
router.get('/:mcpName', async (req, res) => {
  try {
    const { mcpName } = req.params;
    const docs = await req.mcpManager.getSwaggerDocs(mcpName);
    res.json(docs);
  } catch (error) {
    logger.error(`Error fetching Swagger docs for ${req.params.mcpName}:`, error);
    res.status(error.message.includes('Unknown MCP') ? 404 : 500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
