import express from 'express';

const app = express();
const PORT = process.env.PORT || 8203;

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'migration-analyzer-mcp',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Migration analysis endpoints (placeholder)
app.get('/api/migration/status', (req, res) => {
  res.json({ message: 'Migration status endpoint' });
});

app.get('/api/migration/compatibility', (req, res) => {
  res.json({ message: 'Migration compatibility endpoint' });
});

app.get('/api/migration/dependencies', (req, res) => {
  res.json({ message: 'Migration dependencies endpoint' });
});

app.listen(PORT, () => {
  console.log(`Migration Analyzer MCP listening on port ${PORT}`);
});
