# Webhook Documentation

## Overview
GitHub webhooks for automated AI agent task processing in the ai-shared-memory system.

## Endpoint
`POST /webhooks/github`

## Security

### HMAC Signature Validation
All webhook requests must include a valid HMAC-SHA256 signature:

```javascript
const crypto = require('crypto');

function validateSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

// Validate in middleware
if (!validateSignature(req.body, req.headers['x-hub-signature-256'], GITHUB_WEBHOOK_SECRET)) {
  return res.status(401).json({ error: 'Invalid signature' });
}
```

## Supported Events

### pull_request
- **Actions**: opened, synchronize, reopened, closed
- **Filter**: PRs affecting `memory/context.json` or with labels `owner:claude`, `task:*`

### issues
- **Actions**: opened, edited, labeled
- **Filter**: Issues with `owner:claude` label

### issue_comment
- **Actions**: created
- **Filter**: Comments mentioning `@claude` or on claude-owned issues

## Payload Examples

### Pull Request Event
```json
{
  "action": "opened",
  "pull_request": {
    "number": 123,
    "title": "feat: Implement feature X",
    "body": "Description...",
    "head": {
      "sha": "abc123def456"
    },
    "base": {
      "ref": "main"
    },
    "user": {
      "login": "claude-bot"
    }
  },
  "repository": {
    "full_name": "TobiasSpaeth83/ai-shared-memory"
  }
}
```

## Job Queue Integration

### Job Creation
```javascript
// Process webhook and create job
async function handleWebhook(event) {
  const job = {
    type: 'claude_task',
    payload: {
      repo: event.repository.full_name,
      pr_number: event.pull_request?.number,
      head_sha: event.pull_request?.head.sha,
      action: event.action,
      hint: 'tasks.owner=claude'
    },
    dedupe_key: `pr:${event.pull_request?.number}:${event.pull_request?.head.sha}`,
    created_at: new Date().toISOString()
  };
  
  await jobs.insert(job);
  return { status: 'accepted', job_id: job.id };
}
```

## Idempotency

### Deduplication Strategy
Each webhook includes unique identifiers to prevent duplicate processing:

- **X-GitHub-Delivery**: Unique UUID for each webhook delivery
- **X-GitHub-Event**: Event type (pull_request, issues, etc.)
- **Dedupe Key**: Composite key for job queue

```javascript
// Store processed deliveries
const processedDeliveries = new Set();

function isProcessed(deliveryId) {
  if (processedDeliveries.has(deliveryId)) {
    return true;
  }
  processedDeliveries.add(deliveryId);
  // Also persist to database for durability
  return false;
}
```

## Processing Flow

```mermaid
graph TD
    A[GitHub Event] -->|Webhook| B[/webhooks/github]
    B -->|Validate HMAC| C{Valid?}
    C -->|No| D[401 Unauthorized]
    C -->|Yes| E[Check Idempotency]
    E -->|Duplicate| F[200 OK - Already Processed]
    E -->|New| G[Create Job]
    G -->|Enqueue| H[Job Queue]
    H -->|Worker| I[Operator Agent]
    I -->|Process| J[Create PR/Update]
    B -->|Response| K[202 Accepted]
```

## Response Codes

- **202 Accepted**: Webhook received and queued for processing
- **200 OK**: Duplicate webhook (already processed)
- **401 Unauthorized**: Invalid HMAC signature
- **400 Bad Request**: Malformed payload
- **500 Internal Server Error**: Server error (GitHub will retry)

## Error Handling

### Retry Logic
- **4xx errors**: Client error - do not retry
- **5xx errors**: Server error - retry with exponential backoff
  - Retry 1: After 10 seconds
  - Retry 2: After 60 seconds
  - Retry 3: After 10 minutes
  - Max retries: 3

### Timeout
- Request timeout: 10 seconds
- Processing timeout: 5 minutes (async via job queue)

## Implementation Notes

### Server-Sent Events (SSE)
Real-time updates are streamed to clients via SSE:

```javascript
// SSE endpoint
app.get('/runs/:id/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Send events
  function sendEvent(type, data) {
    res.write(`event: ${type}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  // Example events
  sendEvent('status', { phase: 'running' });
  sendEvent('log', { level: 'info', msg: 'Processing task...' });
  sendEvent('pr', { number: 123, action: 'opened' });
});
```

### Database Schema
```sql
CREATE TABLE webhook_deliveries (
  id VARCHAR(36) PRIMARY KEY,
  event_type VARCHAR(50),
  payload JSON,
  processed_at TIMESTAMP,
  job_id VARCHAR(36),
  INDEX idx_processed (processed_at)
);

CREATE TABLE jobs (
  id VARCHAR(36) PRIMARY KEY,
  type VARCHAR(50),
  payload JSON,
  dedupe_key VARCHAR(255) UNIQUE,
  status ENUM('queued', 'running', 'completed', 'failed'),
  created_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_dedupe (dedupe_key)
);
```

## Configuration

### Environment Variables
```bash
# Required
GITHUB_WEBHOOK_SECRET=your-webhook-secret
GITHUB_APP_ID=1878945
GITHUB_INSTALLATION_ID=83805063
GITHUB_PRIVATE_KEY_PATH=/path/to/private-key.pem

# Optional
WEBHOOK_PORT=3000
WEBHOOK_PATH=/webhooks/github
MAX_RETRY_COUNT=3
JOB_TIMEOUT_SECONDS=300
```

### GitHub Webhook Settings
1. Navigate to Repository Settings → Webhooks
2. Add webhook:
   - **Payload URL**: `https://your-domain.com/webhooks/github`
   - **Content type**: `application/json`
   - **Secret**: Generate with `openssl rand -hex 32`
   - **Events**: Select individual events (pull_request, issues, issue_comment)

## Monitoring & Alerting

### Metrics to Track
- Webhook delivery success rate
- Job processing time (P50, P95, P99)
- Queue depth
- Error rate by type

### Alert Conditions
- 3+ consecutive HMAC failures → Potential security issue
- 5+ consecutive 5xx errors → Service degradation
- Queue depth > 100 → Processing bottleneck
- Job timeout rate > 5% → Performance issue

## Security Best Practices

1. **Always validate HMAC** - Never process unsigned webhooks
2. **Use HTTPS** - Ensure webhook endpoint uses TLS
3. **Rotate secrets** - Change webhook secret quarterly
4. **Rate limiting** - Max 100 webhooks/minute per repository
5. **Input validation** - Sanitize all payload data
6. **Audit logging** - Log all webhook deliveries with correlation IDs

## Testing

### Local Testing with ngrok
```bash
# Start local server
npm run webhook-server

# Expose via ngrok
ngrok http 3000

# Configure GitHub webhook with ngrok URL
# https://abc123.ngrok.io/webhooks/github
```

### Test Payload
```bash
# Send test webhook
curl -X POST http://localhost:3000/webhooks/github \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: pull_request" \
  -H "X-GitHub-Delivery: test-$(date +%s)" \
  -H "X-Hub-Signature-256: sha256=$(echo -n '$PAYLOAD' | openssl dgst -sha256 -hmac $SECRET)" \
  -d '@test-payload.json'
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check webhook secret matches environment variable
   - Ensure signature validation uses raw body (not parsed JSON)

2. **Duplicate processing**
   - Verify dedupe_key is unique per meaningful change
   - Check database constraints on dedupe_key

3. **Missing events**
   - Verify webhook events are selected in GitHub settings
   - Check webhook delivery history in GitHub UI

4. **Timeout errors**
   - Return 202 immediately, process asynchronously
   - Increase timeout limits if needed

---

**Last Updated**: 2025-09-03  
**Version**: 1.0.0  
**Author**: Claude (following ChatGPT architect specifications)