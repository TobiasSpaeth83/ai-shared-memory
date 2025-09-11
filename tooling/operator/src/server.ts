import express from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { OperatorAgent, ChatBridge } from './index.js';

const app = express();
const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

// Store raw body for HMAC verification
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

// Verify GitHub webhook signature
function verifySignature(req: any): boolean {
  try {
    if (!WEBHOOK_SECRET) return true; // Skip if no secret configured
    
    const signature = req.headers['x-hub-signature-256'] || '';
    if (!signature) return false;
    
    const hmac = createHmac('sha256', WEBHOOK_SECRET);
    const digest = `sha256=${hmac.update(req.rawBody).digest('hex')}`;
    
    // Use timing-safe comparison to prevent timing attacks
    return timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return false;
  }
}

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ 
    ok: true, 
    timestamp: new Date().toISOString(),
    mode: 'webhook',
    uptime: process.uptime()
  });
});

// Main webhook endpoint with fast ACK
app.post('/webhook', (req, res) => {
  try {
    const deliveryId = req.headers['x-github-delivery'] as string;
    const event = req.headers['x-github-event'] as string;
    
    // Log cold start if applicable
    if (process.uptime() < 5) {
      console.log('🔥 Cold start detected, warming up...');
    }
    
    console.log(`📨 Webhook received: ${event} (delivery: ${deliveryId})`);
    
    // Only process pull_request events
    if (event !== 'pull_request') {
      console.log(`⏭️  Skipping event: ${event}`);
      return res.status(204).end();
    }
    
    // Verify signature
    if (!verifySignature(req)) {
      console.error(`❌ Invalid signature for delivery ${deliveryId}`);
      return res.status(401).send('Invalid signature');
    }
    
    // Parse payload
    let payload;
    try {
      payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (parseError) {
      console.error(`❌ Invalid JSON for delivery ${deliveryId}:`, parseError);
      return res.status(400).send('Invalid JSON');
    }
    
    // Quick validation
    const action = payload.action;
    const validActions = ['opened', 'labeled', 'synchronize', 'reopened'];
    if (!validActions.includes(action)) {
      console.log(`⏭️  Skipping action: ${action}`);
      return res.status(204).end();
    }
    
    // Check for to:claude label
    const pr = payload.pull_request;
    const hasLabel = pr?.labels?.some((label: any) => label.name === 'to:claude');
    
    if (!hasLabel) {
      console.log(`⏭️  No 'to:claude' label on PR #${pr?.number}`);
      return res.status(204).end();
    }
    
    // === IMMEDIATE ACK - Return 200 OK right away ===
    res.status(200).json({ 
      status: 'accepted',
      delivery: deliveryId,
      pr: pr.number 
    });
    
    // === ASYNC PROCESSING - Non-blocking ===
    setImmediate(async () => {
      const startTime = Date.now();
      try {
        console.log(`🔄 Starting async processing for PR #${pr.number}`);
        
        // Check allowed paths
        const allowedPaths = ['.chat/', '.tasks/patches/', 'site/public/'];
        const hasAllowedPath = true; // Simplified for now, would check files via API
        
        if (!hasAllowedPath) {
          console.log(`⏭️  PR #${pr.number} doesn't modify allowed paths`);
          return;
        }
        
        // Initialize operator and process
        const operator = new OperatorAgent();
        await operator.init();
        
        const chatBridge = new ChatBridge(
          operator['octokit'],
          operator['owner'],
          operator['repo']
        );
        
        // Process the PR
        const prLabels = pr.labels?.map((label: any) => label.name) || [];
        await chatBridge.handlePRMessage(pr.number, [], prLabels);
        
        const duration = Date.now() - startTime;
        console.log(`✅ PR #${pr.number} processed successfully in ${duration}ms`);
        
      } catch (asyncError) {
        const duration = Date.now() - startTime;
        console.error(`❌ Async processing failed for PR #${pr.number} after ${duration}ms:`, asyncError);
        // Log but don't crash - webhook already ACK'd
      }
    });
    
  } catch (error) {
    // Outer catch - ensure we always return 200 to GitHub
    console.error('❌ Webhook handler error:', error);
    try {
      if (!res.headersSent) {
        res.status(200).json({ status: 'error logged' });
      }
    } catch (sendError) {
      // Even sending response failed, just log
      console.error('❌ Failed to send response:', sendError);
    }
  }
});

// Handle ping events
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
  const event = req.headers['x-github-event'] as string;
  
  if (event === 'ping') {
    console.log('🏓 Ping received');
    return res.status(200).json({ message: 'pong' });
  }
  
  next();
});

// Start server with error handling
const server = app.listen(PORT, () => {
  console.log(`🚀 Webhook server listening on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Webhook: http://localhost:${PORT}/webhook`);
  console.log(`   Mode: Fast ACK with async processing`);
  
  if (!WEBHOOK_SECRET) {
    console.warn('⚠️  Warning: WEBHOOK_SECRET not set - signature verification disabled');
  } else {
    console.log('✅ HMAC signature verification enabled');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, closing server gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n👋 SIGINT received, shutting down...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export default app;