import { OperatorAgent, ChatBridge } from './index.js';

// Polling interval from env or default to 60 seconds
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '60000');
const ENABLE_CRON = process.env.ENABLE_CRON !== 'false';

// Track processed PR numbers to avoid duplicates
const processedPRs = new Set<number>();

async function pollForPRs(): Promise<void> {
  console.log('🔍 Polling for PRs with to:claude label...');
  
  try {
    const operator = new OperatorAgent();
    await operator.init();
    
    // Get open PRs with to:claude label
    const { data: prs } = await operator['octokit'].request('GET /repos/{owner}/{repo}/pulls', {
      owner: operator['owner'],
      repo: operator['repo'],
      state: 'open'
    });
    
    const labeledPRs = prs.filter((pr: any) => 
      pr.labels.some((label: any) => label.name === 'to:claude')
    );
    
    if (labeledPRs.length === 0) {
      console.log('  📭 No PRs with to:claude label found');
      return;
    }
    
    console.log(`  📬 Found ${labeledPRs.length} PRs to process`);
    
    for (const pr of labeledPRs) {
      // Skip if already processed in this session
      if (processedPRs.has(pr.number)) {
        console.log(`  ⏭️  Already processed PR #${pr.number} in this session`);
        continue;
      }
      
      // Check if PR modifies allowed paths
      const { data: files } = await operator['octokit'].request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
        owner: operator['owner'],
        repo: operator['repo'],
        pull_number: pr.number
      });
      
      const allowedPaths = ['.chat/', '.tasks/patches/', 'site/public/'];
      const hasAllowedFiles = files.some((file: any) =>
        allowedPaths.some(path => file.filename.startsWith(path))
      );
      
      if (!hasAllowedFiles) {
        console.log(`  ⏭️  PR #${pr.number} doesn't modify allowed paths`);
        processedPRs.add(pr.number);
        continue;
      }
      
      console.log(`  🔄 Processing PR #${pr.number}: ${pr.title}`);
      
      try {
        // Process using ChatBridge
        const chatBridge = new ChatBridge(
          operator['octokit'],
          operator['owner'],
          operator['repo']
        );
        
        // Use the public wrapper method
        const prLabels = pr.labels?.map((label: any) => label.name) || [];
        await chatBridge.handlePRMessage(pr.number, files, prLabels);
        processedPRs.add(pr.number);
        console.log(`  ✅ PR #${pr.number} processed successfully`);
        
        // Rate limiting - wait 2 seconds between PRs
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`  ❌ Failed to process PR #${pr.number}:`, error);
      }
    }
    
  } catch (error) {
    console.error('❌ Polling error:', error);
  }
}

async function startCronWorker(): Promise<void> {
  console.log('🚀 Starting Cron Worker');
  console.log(`   Polling interval: ${POLL_INTERVAL}ms`);
  console.log(`   Monitoring: PRs with 'to:claude' label`);
  
  if (!ENABLE_CRON) {
    console.log('⚠️  Cron disabled via ENABLE_CRON=false');
    return;
  }
  
  // Initial poll
  await pollForPRs();
  
  // Set up interval
  setInterval(async () => {
    await pollForPRs();
  }, POLL_INTERVAL);
  
  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n👋 Cron worker shutting down...');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n👋 Cron worker terminated');
    process.exit(0);
  });
}

// Health check endpoint for monitoring
if (process.env.HEALTH_PORT) {
  const express = await import('express');
  const app = express.default();
  const healthPort = parseInt(process.env.HEALTH_PORT);
  
  app.get('/health', (req, res) => {
    res.json({
      ok: true,
      mode: 'cron',
      interval: POLL_INTERVAL,
      processed: Array.from(processedPRs)
    });
  });
  
  app.listen(healthPort, () => {
    console.log(`   Health check: http://localhost:${healthPort}/health`);
  });
}

// Start the worker
startCronWorker().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});