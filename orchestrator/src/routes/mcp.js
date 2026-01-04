import express from 'express';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Get status of all MCPs
router.get('/status', (req, res) => {
  const status = req.mcpManager.getStatus();
  
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    status
  });
});

// Check health of specific MCP
router.get('/health/:mcpName', async (req, res) => {
  try {
    const { mcpName } = req.params;
    
    const result = await req.mcpManager.callDockerMcp(
      mcpName,
      '/health',
      {},
      'GET'  // ← Add this parameter
    );

    res.json({
      success: true,
      mcp: mcpName,
      health: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      mcp: req.params.mcpName,
      error: error.message
    });
  }
});

export default router;
