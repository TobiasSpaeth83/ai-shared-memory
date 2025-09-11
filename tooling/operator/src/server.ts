import express from 'express';
import { createHmac } from 'crypto';
import { OperatorAgent, ChatBridge } from './index.js';

const app = express();
const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

// Raw body needed for HMAC verification
app.use(express.raw({ type: 'application/json' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Webhook endpoint
app.post('/webhook', async (req, res) => {
  const deliveryId = req.headers['x-github-delivery'] as string;
  const event = req.headers['x-github-event'] as string;
  const signature = req.headers['x-hub-signature-256'] as string;
  
  console.log(`📨 Webhook received: ${event} (${deliveryId})`);
  
  // Verify HMAC signature
  if (WEBHOOK_SECRET) {
    const expectedSignature = 'sha256=' + createHmac('sha256', WEBHOOK_SECRET)
      .update(req.body)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      console.error(`❌ Invalid signature for delivery ${deliveryId}`);
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }
  
  // Parse body
  let payload;
  try {
    payload = JSON.parse(req.body.toString());
  } catch (error) {
    console.error(`❌ Invalid JSON for delivery ${deliveryId}`);
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  
  // Handle ping event
  if (event === 'ping') {
    console.log(`✅ Ping received: ${payload.zen}`);
    return res.status(200).json({ message: 'pong' });
  }
  
  // Only process pull_request events
  if (event !== 'pull_request') {
    console.log(`⏭️  Skipping event: ${event}`);
    return res.status(204).send();
  }
  
  // Check action type
  const action = payload.action;
  const validActions = ['opened', 'labeled', 'synchronize', 'reopened'];
  if (!validActions.includes(action)) {
    console.log(`⏭️  Skipping action: ${action}`);
    return res.status(204).send();
  }
  
  // Check for to:claude label
  const pr = payload.pull_request;
  const hasLabel = pr.labels?.some((label: any) => label.name === 'to:claude');
  
  if (!hasLabel) {
    console.log(`⏭️  No 'to:claude' label on PR #${pr.number}`);
    return res.status(204).send();
  }
  
  // Check if PR modifies allowed paths
  const allowedPaths = ['.chat/', '.tasks/patches/', 'site/public/'];
  const files = await fetchPRFiles(pr);
  const hasAllowedFiles = files.some((file: string) => 
    allowedPaths.some(path => file.startsWith(path))
  );
  
  if (!hasAllowedFiles) {
    console.log(`⏭️  No allowed paths modified in PR #${pr.number}`);
    return res.status(204).send();
  }
  
  console.log(`✅ Processing PR #${pr.number}: ${pr.title}`);
  
  // Process PR asynchronously
  processPRAsync(pr).catch(error => {
    console.error(`❌ Error processing PR #${pr.number}:`, error);
  });
  
  // Return immediately
  res.status(200).json({ 
    message: 'Processing', 
    pr: pr.number,
    delivery: deliveryId 
  });
});

// Helper to fetch PR files (simplified)
async function fetchPRFiles(pr: any): Promise<string[]> {
  // In production, this would use the GitHub API to get files
  // For now, return empty array to allow processing
  return ['.chat/inbox/'];
}

// Async PR processing
async function processPRAsync(pr: any): Promise<void> {
  try {
    // Initialize operator
    const operator = new OperatorAgent();
    await operator.init();
    
    // Process the PR
    const chatBridge = new ChatBridge(
      operator['octokit'],
      operator['owner'],
      operator['repo']
    );
    
    // Use the public wrapper method
    const prFiles = await fetchPRFiles(pr);
    const prLabels = pr.labels?.map((label: any) => label.name) || [];
    await chatBridge.handlePRMessage(pr.number, prFiles, prLabels);
    console.log(`✅ PR #${pr.number} processed successfully`);
  } catch (error) {
    console.error(`❌ Failed to process PR #${pr.number}:`, error);
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Webhook server listening on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Webhook: http://localhost:${PORT}/webhook`);
  if (!WEBHOOK_SECRET) {
    console.warn('⚠️  Warning: WEBHOOK_SECRET not set - signature verification disabled');
  }
});

export default app;