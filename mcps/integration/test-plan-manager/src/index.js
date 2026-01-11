import express from 'express';

const app = express();
const PORT = process.env.PORT || 8102;

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'test-plan-manager-mcp',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Test plan management endpoints (placeholder)
app.get('/api/test-plans', (req, res) => {
  res.json({ message: 'Test plans endpoint' });
});

app.get('/api/test-suites', (req, res) => {
  res.json({ message: 'Test suites endpoint' });
});

app.get('/api/test-cases', (req, res) => {
  res.json({ message: 'Test cases endpoint' });
});

app.listen(PORT, () => {
  console.log(`Test Plan Manager MCP listening on port ${PORT}`);
});
