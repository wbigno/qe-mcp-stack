import express from 'express';

const app = express();
const PORT = process.env.PORT || 8302;

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'test-selector-mcp',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Test selection endpoints (placeholder)
app.post('/api/select-tests', (req, res) => {
  res.json({ message: 'Select tests based on code changes' });
});

app.get('/api/test-coverage', (req, res) => {
  res.json({ message: 'Test coverage analysis endpoint' });
});

app.get('/api/test-impact', (req, res) => {
  res.json({ message: 'Test impact analysis endpoint' });
});

app.listen(PORT, () => {
  console.log(`Test Selector MCP listening on port ${PORT}`);
});
