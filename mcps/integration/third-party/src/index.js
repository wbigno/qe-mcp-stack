import express from 'express';

const app = express();
const PORT = process.env.PORT || 8101;

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'third-party-mcp',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Third-party integrations endpoints (placeholder)
app.get('/api/stripe/customers', (req, res) => {
  res.json({ message: 'Stripe customers endpoint' });
});

app.get('/api/stripe/payments', (req, res) => {
  res.json({ message: 'Stripe payments endpoint' });
});

app.listen(PORT, () => {
  console.log(`Third-party MCP listening on port ${PORT}`);
});
