# Third Party MCP

## Overview

The Third Party MCP provides integration capabilities with external third-party services and APIs. This MCP acts as a centralized gateway for managing connections to external platforms like payment processors, communication services, and other SaaS integrations.

**Port**: 8101 (HTTP API)
**Swagger UI**: http://localhost:8101/api-docs
**Category**: Integration MCP
**Docker Container**: `qe-third-party-mcp`

## Architecture

```
External Services (Stripe, SendGrid, etc.)
         ↕ HTTP/REST API
    Third Party MCP Server (HTTP)
         ↕ HTTP REST API (port 8101)
         Orchestrator / Claude Desktop
```

The system provides:
1. **External API Abstraction**: Unified interface for third-party services
2. **Connection Management**: Handles authentication and connection pooling
3. **Rate Limiting**: Prevents API quota exhaustion
4. **Error Handling**: Graceful degradation for external service failures

## Features

- 💳 **Payment Integration**: Stripe payment processing and customer management
- 📧 **Email Services**: SendGrid email delivery and template management
- 🔔 **Notifications**: Push notification services (Twilio, Firebase)
- 🔐 **Authentication**: OAuth integration for third-party auth providers
- 📊 **Analytics**: Integration with analytics platforms (Segment, Mixpanel)
- 💚 **Health Monitoring**: Built-in health checks and status endpoints

## Supported Integrations

### Payment Processors
- **Stripe**: Customer management, payments, subscriptions, invoices
- **PayPal**: Payment processing and transaction tracking

### Communication Services
- **SendGrid**: Transactional emails and marketing campaigns
- **Twilio**: SMS and voice communications
- **Firebase**: Push notifications for mobile apps

### Authentication Providers
- **Auth0**: Enterprise authentication and SSO
- **Okta**: Identity and access management
- **Google OAuth**: Social authentication

### Analytics & Monitoring
- **Segment**: Customer data platform
- **Mixpanel**: Product analytics
- **Datadog**: Application performance monitoring

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=8101
NODE_ENV=production

# Stripe Integration
STRIPE_API_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# SendGrid Integration
SENDGRID_API_KEY=SG....
SENDGRID_FROM_EMAIL=noreply@example.com

# Twilio Integration
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890

# OAuth Configuration
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...
```

## API Endpoints

### Stripe Integration

#### GET /api/stripe/customers
Get list of Stripe customers.

**Response:**
```json
{
  "success": true,
  "customers": [
    {
      "id": "cus_ABC123",
      "email": "customer@example.com",
      "name": "John Doe",
      "created": 1234567890
    }
  ]
}
```

#### POST /api/stripe/customers
Create a new Stripe customer.

**Request Body:**
```json
{
  "email": "customer@example.com",
  "name": "John Doe",
  "metadata": {
    "userId": "12345"
  }
}
```

**Response:**
```json
{
  "success": true,
  "customer": {
    "id": "cus_ABC123",
    "email": "customer@example.com",
    "name": "John Doe"
  }
}
```

#### GET /api/stripe/payments
Get payment history.

**Query Parameters:**
- `customer` - Filter by customer ID
- `limit` - Number of results (default: 10)
- `status` - Filter by status (succeeded, pending, failed)

**Response:**
```json
{
  "success": true,
  "payments": [
    {
      "id": "pi_ABC123",
      "amount": 5000,
      "currency": "usd",
      "status": "succeeded",
      "customer": "cus_ABC123",
      "created": 1234567890
    }
  ],
  "hasMore": false
}
```

#### POST /api/stripe/payments
Create a payment intent.

**Request Body:**
```json
{
  "amount": 5000,
  "currency": "usd",
  "customer": "cus_ABC123",
  "description": "Service subscription"
}
```

### SendGrid Integration

#### POST /api/sendgrid/send
Send transactional email.

**Request Body:**
```json
{
  "to": "recipient@example.com",
  "subject": "Welcome to our platform",
  "text": "Plain text content",
  "html": "<h1>HTML content</h1>",
  "templateId": "d-abc123",
  "dynamicData": {
    "name": "John",
    "verificationUrl": "https://example.com/verify"
  }
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "abc123",
  "status": "sent"
}
```

#### GET /api/sendgrid/status/:messageId
Check email delivery status.

**Response:**
```json
{
  "success": true,
  "messageId": "abc123",
  "status": "delivered",
  "events": [
    {
      "event": "delivered",
      "timestamp": 1234567890
    }
  ]
}
```

### Twilio Integration

#### POST /api/twilio/sms
Send SMS message.

**Request Body:**
```json
{
  "to": "+1234567890",
  "body": "Your verification code is: 123456"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "SM123abc",
  "status": "sent"
}
```

### Health Check

#### GET /health
Service health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "third-party-mcp",
  "timestamp": "2026-01-11T12:00:00.000Z",
  "port": 8101,
  "integrations": {
    "stripe": "connected",
    "sendgrid": "connected",
    "twilio": "connected"
  }
}
```

## Usage Examples

### With Claude Desktop

Once the MCP is running and configured, you can use natural language commands:

- "Create a Stripe customer for john@example.com"
- "Send a welcome email to the new user"
- "Check the status of payment pi_ABC123"
- "Send an SMS verification code to +1234567890"

### With HTTP API

```bash
# Create Stripe customer
curl -X POST http://localhost:8101/api/stripe/customers \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "name": "John Doe"
  }'

# Send email via SendGrid
curl -X POST http://localhost:8101/api/sendgrid/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "subject": "Welcome",
    "html": "<h1>Welcome to our platform</h1>"
  }'

# Send SMS via Twilio
curl -X POST http://localhost:8101/api/twilio/sms \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "body": "Your code is: 123456"
  }'

# Check health
curl http://localhost:8101/health
```

## Development

### Install Dependencies
```bash
cd mcps/integration/third-party
npm install
```

### Run in Development Mode
```bash
npm run dev
```

### Run Tests
```bash
npm test
```

### Run in Production
```bash
npm start
```

## Docker

### Build Image
```bash
docker build -t third-party-mcp -f mcps/integration/third-party/Dockerfile .
```

### Run Container
```bash
docker run -p 8101:8101 \
  -e STRIPE_API_KEY=sk_test_... \
  -e SENDGRID_API_KEY=SG... \
  -e TWILIO_ACCOUNT_SID=AC... \
  -e TWILIO_AUTH_TOKEN=... \
  third-party-mcp
```

### Docker Compose
```bash
docker compose up third-party-mcp
```

## Security

### API Key Management
- Store all API keys in environment variables
- Never commit credentials to version control
- Use separate keys for development and production
- Rotate keys regularly

### Rate Limiting
- Implements rate limiting to prevent abuse
- Respects third-party API rate limits
- Queues requests during high traffic

### Data Protection
- No sensitive data stored locally
- All external communication over HTTPS
- Webhook signature verification for callbacks
- Input validation on all endpoints

## Error Handling

The MCP provides comprehensive error handling:

```json
{
  "success": false,
  "error": {
    "code": "STRIPE_API_ERROR",
    "message": "Card was declined",
    "details": {
      "declineCode": "insufficient_funds"
    }
  }
}
```

### Common Error Codes
- `INVALID_API_KEY` - Authentication failed
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `SERVICE_UNAVAILABLE` - External service is down
- `INVALID_REQUEST` - Malformed request data
- `PAYMENT_FAILED` - Payment processing error

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to Stripe API
**Solution**:
```bash
# Verify API key
curl https://api.stripe.com/v1/customers \
  -u ${STRIPE_API_KEY}:

# Check network connectivity
curl -I https://api.stripe.com
```

**Problem**: SendGrid emails not sending
**Solution**:
1. Verify API key permissions
2. Check sender email is verified
3. Review SendGrid activity logs
4. Verify email templates exist

### Rate Limiting

**Problem**: 429 Rate Limit Exceeded errors
**Solution**:
- Implement exponential backoff
- Cache frequently accessed data
- Use webhook events instead of polling
- Consider upgrading third-party plan

### Webhook Issues

**Problem**: Webhooks not being received
**Solution**:
1. Verify webhook URL is publicly accessible
2. Check webhook signature validation
3. Review third-party webhook logs
4. Ensure HTTPS for webhook endpoints

## Monitoring

### Key Metrics
- API request latency
- Third-party service uptime
- Error rates by service
- Rate limit utilization
- Webhook delivery success rate

### Logging
All requests and errors are logged with structured logging:
```json
{
  "timestamp": "2026-01-11T12:00:00.000Z",
  "level": "info",
  "service": "third-party-mcp",
  "integration": "stripe",
  "action": "create_customer",
  "duration": 250,
  "success": true
}
```

## Dependencies

- **Node.js** 18+ (Alpine)
- **express** ^4.18.2 - HTTP server
- **axios** ^1.6.2 - HTTP client for API requests
- **stripe** - Stripe SDK
- **@sendgrid/mail** - SendGrid email SDK
- **twilio** - Twilio communications SDK

## Integration with QE MCP Stack

The Third Party MCP integrates with:
- **Azure DevOps MCP**: Notify teams of payment events
- **Test Generation MCP**: Generate integration tests for payment flows
- **Risk Analyzer MCP**: Assess risk of payment processing changes

## Related Documentation

- [Stripe API Documentation](https://stripe.com/docs/api)
- [SendGrid API Documentation](https://docs.sendgrid.com)
- [Twilio API Documentation](https://www.twilio.com/docs)
- [Orchestrator Health](http://localhost:3000/health)

## Contributing

When making changes to this MCP:

1. Update API endpoint handlers in `src/index.js`
2. Add environment variables to `.env.example`
3. Test locally before Docker build
4. Update this README with new features
5. Add API documentation for new endpoints
6. Update integration tests

## Roadmap

### Planned Integrations
- [ ] Slack notifications
- [ ] GitHub webhooks
- [ ] Jira integration
- [ ] Salesforce CRM
- [ ] AWS Services (S3, SQS, SNS)

### Planned Features
- [ ] Webhook retry logic with exponential backoff
- [ ] Request/response caching layer
- [ ] Circuit breaker pattern for failing services
- [ ] GraphQL API endpoint
- [ ] Real-time status dashboard

## License

MIT
