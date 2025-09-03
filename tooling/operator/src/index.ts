import { App } from '@octokit/app';
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../github-mcp/.env') });

interface Task {
  id: string;
  title: string;
  owner: string;
  status: string;
  description?: string;
  pr_number?: number;
  created_at?: string;
  completed_at?: string;
}

interface Context {
  version: string;
  last_updated: string;
  last_updated_by: string;
  tasks: Task[];
  rev?: string;
  sha?: string; // GitHub SHA for optimistic locking
}

class OperatorAgent {
  private app: App;
  private octokit: any;
  private owner: string;
  private repo: string;
  private dryRun: boolean;

  constructor() {
    const appId = process.env.GITHUB_APP_ID;
    const privateKeyPath = process.env.GITHUB_PRIVATE_KEY_PATH;
    const installationId = process.env.GITHUB_INSTALLATION_ID;
    
    if (!appId || !privateKeyPath || !installationId) {
      throw new Error('Missing required GitHub App configuration');
    }

    const privateKey = readFileSync(privateKeyPath, 'utf8');
    
    this.app = new App({
      appId: appId,
      privateKey: privateKey,
    });

    this.owner = process.env.GITHUB_OWNER || 'TobiasSpaeth83';
    this.repo = process.env.GITHUB_REPO || 'ai-shared-memory';
    this.dryRun = process.argv.includes('--dry-run');
  }

  async init() {
    const installationId = process.env.GITHUB_INSTALLATION_ID;
    this.octokit = await this.app.getInstallationOctokit(parseInt(installationId!));
    console.log('✅ Operator Agent initialized');
    
    if (this.dryRun) {
      console.log('🔧 Running in DRY RUN mode - no changes will be made');
    }
  }

  async readContext(): Promise<Context & { sha: string }> {
    try {
      const { data } = await this.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: this.owner,
        repo: this.repo,
        path: 'memory/context.json',
        ref: 'main'
      });

      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      const context = JSON.parse(content);
      
      // Add revision hash and GitHub SHA
      context.rev = createHash('sha256').update(content).digest('hex');
      context.sha = data.sha; // GitHub's SHA for updates
      
      return context;
    } catch (error) {
      console.error('❌ Failed to read context.json:', error);
      throw error;
    }
  }

  async processTask(task: Task) {
    console.log(`\n📋 Processing task ${task.id}: ${task.title}`);
    
    const branchName = `feat/${this.slugify(task.title)}`;
    console.log(`  → Creating branch: ${branchName}`);

    if (this.dryRun) {
      console.log('  ⚠️  DRY RUN: Would create branch and PR');
      return;
    }

    try {
      // Get main branch ref
      const { data: mainRef } = await this.octokit.request('GET /repos/{owner}/{repo}/git/ref/{ref}', {
        owner: this.owner,
        repo: this.repo,
        ref: 'heads/main'
      });

      // Create new branch
      await this.octokit.request('POST /repos/{owner}/{repo}/git/refs', {
        owner: this.owner,
        repo: this.repo,
        ref: `refs/heads/${branchName}`,
        sha: mainRef.object.sha
      });

      console.log(`  ✅ Branch created: ${branchName}`);

      // Generate example content based on task
      const files = this.generateTaskFiles(task);
      
      // Create commits for each file
      for (const file of files) {
        await this.createFile(branchName, file.path, file.content, `feat: ${task.title} - add ${file.path}`);
      }

      // Create PR
      const prBody = this.generatePRBody(task);
      const { data: pr } = await this.octokit.request('POST /repos/{owner}/{repo}/pulls', {
        owner: this.owner,
        repo: this.repo,
        title: `feat: ${task.title}`,
        head: branchName,
        base: 'main',
        body: prBody
      });

      console.log(`  ✅ PR created: #${pr.number} - ${pr.html_url}`);
      
      // Update task status
      await this.updateTaskStatus(task, 'in_progress', pr.number);
      
    } catch (error: any) {
      if (error.status === 422 && error.message?.includes('Reference already exists')) {
        console.log(`  ⚠️  Branch ${branchName} already exists, skipping`);
      } else {
        console.error(`  ❌ Error processing task:`, error.message);
      }
    }
  }

  private generateTaskFiles(task: Task): Array<{path: string, content: string}> {
    // Generate example files based on task
    const files = [];
    
    if (task.title.toLowerCase().includes('webhook')) {
      files.push({
        path: 'docs/webhooks.md',
        content: this.generateWebhookDoc()
      });
    } else {
      // Default: create a simple implementation file
      files.push({
        path: `implementations/${task.id.toLowerCase()}.md`,
        content: `# ${task.title}\n\n${task.description || ''}\n\nImplementation for task ${task.id}.`
      });
    }
    
    return files;
  }

  private generateWebhookDoc(): string {
    return `# Webhook Documentation

## Overview
GitHub webhooks for AI agent task processing.

## Endpoint
\`POST /webhooks/github\`

## Payload Example
\`\`\`json
{
  "action": "opened",
  "pull_request": {
    "number": 123,
    "title": "feat: implement feature",
    "body": "Description..."
  }
}
\`\`\`

## Security
- Validate GitHub signature using HMAC-SHA256
- Use webhook secret from environment
- Rate limiting: 100 requests per minute

## Idempotency
Each webhook includes:
- Unique delivery ID (X-GitHub-Delivery)
- Event type (X-GitHub-Event)
- Store processed IDs to prevent duplicates

## Processing Flow
1. Receive webhook
2. Validate signature
3. Check idempotency
4. Create job in queue
5. Return 202 Accepted
6. Process asynchronously

## Error Handling
- 4xx: Client error (do not retry)
- 5xx: Server error (retry with exponential backoff)
- Timeout: 10 seconds

## Implementation Notes
- Use Server-Sent Events (SSE) for real-time updates
- Store job status in database
- Log all webhook events for audit
`;
  }

  private async createFile(branch: string, filePath: string, content: string, message: string, sha?: string) {
    try {
      // First check if file exists to get SHA
      let currentSha = sha;
      if (!currentSha) {
        try {
          const { data: existingFile } = await this.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: this.owner,
            repo: this.repo,
            path: filePath,
            ref: branch
          });
          currentSha = existingFile.sha;
        } catch (e) {
          // File doesn't exist, that's ok for new files
        }
      }

      const params: any = {
        owner: this.owner,
        repo: this.repo,
        path: filePath,
        message: message,
        content: Buffer.from(content).toString('base64'),
        branch: branch
      };
      
      if (currentSha) {
        params.sha = currentSha;
      }

      await this.octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', params);
      console.log(`  ✅ File created/updated: ${filePath}`);
    } catch (error: any) {
      if (error.status === 409) {
        console.log(`  ⚠️  Conflict detected for ${filePath}, will create conflict resolution PR`);
      } else {
        console.error(`  ❌ Failed to create file ${filePath}:`, error.message);
      }
      throw error;
    }
  }

  private generatePRBody(task: Task): string {
    const inputHash = createHash('sha256')
      .update(JSON.stringify(task))
      .digest('hex');

    return `## Summary
Implementation for task ${task.id}: ${task.title}

${task.description || ''}

## Task Details
- ID: ${task.id}
- Owner: ${task.owner}
- Created: ${task.created_at || new Date().toISOString()}

## Changes
- Implementation files added
- Documentation updated

## Testing
- [ ] Manual testing completed
- [ ] CI checks passing

---

Run: minerva://runs/${Date.now()}
Input: sha256:${inputHash}
Tool: github-mcp@1.0.0`;
  }

  private async updateTaskStatus(task: Task, status: string, prNumber?: number) {
    console.log(`  → Updating task ${task.id} status to: ${status}`);
    
    if (this.dryRun) {
      console.log('  ⚠️  DRY RUN: Would update task status');
      return;
    }

    try {
      // Read current context
      const context = await this.readContext();
      
      // Find and update task
      const taskIndex = context.tasks.findIndex(t => t.id === task.id);
      if (taskIndex !== -1) {
        context.tasks[taskIndex].status = status;
        if (prNumber) {
          context.tasks[taskIndex].pr_number = prNumber;
        }
        if (status === 'completed') {
          context.tasks[taskIndex].completed_at = new Date().toISOString();
        }
      }

      // Update metadata
      context.last_updated = new Date().toISOString();
      context.last_updated_by = 'operator-agent';

      // Create patch PR
      const patchBranch = `patch/update-task-${task.id}-${Date.now()}`;
      const patchMessage = `chore: update task ${task.id} status to ${status}`;

      // Create branch from main
      const { data: mainRef } = await this.octokit.request('GET /repos/{owner}/{repo}/git/ref/{ref}', {
        owner: this.owner,
        repo: this.repo,
        ref: 'heads/main'
      });

      await this.octokit.request('POST /repos/{owner}/{repo}/git/refs', {
        owner: this.owner,
        repo: this.repo,
        ref: `refs/heads/${patchBranch}`,
        sha: mainRef.object.sha
      });

      // Check if there are actual changes
      const originalContext = await this.readContext();
      const updatedContent = JSON.stringify(context, null, 2);
      const originalContent = JSON.stringify(originalContext, null, 2);
      
      if (updatedContent === originalContent) {
        console.log(`  ⚠️  No changes needed for task ${task.id}, skipping update`);
        return;
      }

      // Update context.json with SHA for conflict prevention
      await this.createFile(
        patchBranch, 
        'memory/context.json', 
        updatedContent,
        patchMessage,
        context.sha // Pass SHA for optimistic locking
      );

      // Create patch PR
      const { data: patchPR } = await this.octokit.request('POST /repos/{owner}/{repo}/pulls', {
        owner: this.owner,
        repo: this.repo,
        title: patchMessage,
        head: patchBranch,
        base: 'main',
        body: `Automatic status update for task ${task.id}\n\n---\nRun: minerva://runs/${Date.now()}\nTool: operator-agent@1.0.0`
      });

      console.log(`  ✅ Status update PR created: #${patchPR.number}`);
      
    } catch (error) {
      console.error(`  ❌ Failed to update task status:`, error);
    }
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }

  async run() {
    console.log('🚀 Operator Agent starting...');
    console.log(`📍 Repository: ${this.owner}/${this.repo}\n`);

    try {
      // Read context
      const context = await this.readContext();
      console.log(`📄 Context loaded (rev: ${context.rev?.substring(0, 8)}...)`);
      
      // Find tasks to process
      const claudeTasks = context.tasks.filter(
        t => t.owner === 'claude' && t.status === 'todo'
      );
      
      console.log(`📊 Found ${claudeTasks.length} tasks to process`);
      
      if (claudeTasks.length === 0) {
        console.log('✅ No pending tasks found');
        return;
      }

      // Process tasks (max 1 at a time as per requirements)
      const taskToProcess = claudeTasks[0];
      await this.processTask(taskToProcess);
      
      console.log('\n✅ Operator Agent completed');
      
    } catch (error) {
      console.error('❌ Operator Agent failed:', error);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const operator = new OperatorAgent();
  await operator.init();
  await operator.run();
}

main().catch(console.error);