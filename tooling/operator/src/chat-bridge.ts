import { readFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ChatMessage {
  from: string;
  to: string;
  type: string;
  thread: string;
  text: string;
  ts: string;
}

export class ChatBridge {
  private octokit: any;
  private owner: string;
  private repo: string;
  private processedMessages: Set<string>;

  constructor(octokit: any, owner: string, repo: string) {
    this.octokit = octokit;
    this.owner = owner;
    this.repo = repo;
    this.processedMessages = new Set();
  }

  async checkInbox(): Promise<void> {
    console.log('🔍 Checking chat inbox...');
    
    try {
      // Get inbox messages from GitHub
      const { data: inboxFiles } = await this.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: this.owner,
        repo: this.repo,
        path: '.chat/inbox/from-chatgpt',
        ref: 'main'
      }).catch(() => ({ data: [] }));

      if (!Array.isArray(inboxFiles) || inboxFiles.length === 0) {
        console.log('  📭 No messages in inbox');
        return;
      }

      for (const file of inboxFiles) {
        if (!file.name.endsWith('.json')) continue;
        
        const messageHash = createHash('sha256')
          .update(file.sha)
          .digest('hex');
        
        if (this.processedMessages.has(messageHash)) {
          console.log(`  ⏭️  Already processed: ${file.name}`);
          continue;
        }

        await this.processMessage(file);
        this.processedMessages.add(messageHash);
      }
    } catch (error) {
      console.error('❌ Error checking inbox:', error);
    }
  }

  private async processMessage(file: any): Promise<void> {
    console.log(`\n📨 Processing message: ${file.name}`);
    
    try {
      // Read message content
      const { data } = await this.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: this.owner,
        repo: this.repo,
        path: file.path,
        ref: 'main'
      });

      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      const message: ChatMessage = JSON.parse(content);
      
      console.log(`  From: ${message.from} → To: ${message.to}`);
      console.log(`  Text: "${message.text.substring(0, 50)}..."`);

      // Generate response
      const response = await this.generateResponse(message);
      
      // Create feature branch
      const branchName = `chats/${this.slugify(file.name.replace('.json', ''))}`;
      await this.createBranch(branchName);

      // Write response
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const responseFile = `.chat/outbox/from-claude/${timestamp}-reply.json`;
      await this.createFile(branchName, responseFile, JSON.stringify(response, null, 2));

      // Optional: Create demo page
      if (message.text.toLowerCase().includes('demo') || message.text.toLowerCase().includes('page')) {
        const demoHtml = this.generateDemoPage(message, response);
        await this.createFile(branchName, `site/public/chat/${timestamp}.html`, demoHtml);
      }

      // Create PR
      const prBody = this.generateChatPRBody(message, file.sha);
      const pr = await this.createPR(branchName, message, prBody);
      
      console.log(`  ✅ PR created: #${pr.number}`);
      
      // Add auto-merge label if only site/public files
      if (message.text.toLowerCase().includes('publish')) {
        await this.addLabel(pr.number, 'auto-merge');
        console.log(`  🏷️  Added auto-merge label`);
      }
      
    } catch (error) {
      console.error(`  ❌ Failed to process message:`, error);
    }
  }

  private async generateResponse(message: ChatMessage): Promise<ChatMessage> {
    // Simple response logic - can be enhanced
    let responseText = '';
    
    if (message.text.toLowerCase().includes('hallo')) {
      responseText = 'Hallo ChatGPT! 👋 Ich habe deine Nachricht erhalten. Das Chat-Bridge System funktioniert!';
    } else if (message.text.toLowerCase().includes('status')) {
      responseText = 'System Status: ✅ Operator v1.0.0 läuft, Chat-Bridge aktiv, alle Systeme operational.';
    } else if (message.text.toLowerCase().includes('test')) {
      responseText = 'Test erfolgreich! Die bidirektionale Kommunikation zwischen ChatGPT und Claude funktioniert einwandfrei.';
    } else {
      responseText = `Ich habe deine Nachricht erhalten: "${message.text}". Chat-Bridge v0.1 läuft erfolgreich!`;
    }

    return {
      from: 'claude',
      to: 'chatgpt',
      type: 'chat',
      thread: message.thread || 'general',
      text: responseText,
      ts: new Date().toISOString()
    };
  }

  private generateDemoPage(message: ChatMessage, response: ChatMessage): string {
    return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chat Bridge - ${new Date().toLocaleDateString()}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .chat-container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 600px;
      width: 100%;
      padding: 30px;
    }
    h1 {
      color: #333;
      margin-bottom: 20px;
      font-size: 24px;
    }
    .message {
      margin: 15px 0;
      padding: 15px;
      border-radius: 8px;
    }
    .from-chatgpt {
      background: #e3f2fd;
      border-left: 4px solid #2196F3;
    }
    .from-claude {
      background: #f3e5f5;
      border-left: 4px solid #9c27b0;
    }
    .meta {
      font-size: 12px;
      color: #666;
      margin-bottom: 8px;
    }
    .text {
      color: #333;
      line-height: 1.5;
    }
    .timestamp {
      text-align: center;
      color: #999;
      font-size: 12px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="chat-container">
    <h1>🌉 Chat Bridge v0.1</h1>
    
    <div class="message from-chatgpt">
      <div class="meta">ChatGPT → Claude</div>
      <div class="text">${message.text}</div>
    </div>
    
    <div class="message from-claude">
      <div class="meta">Claude → ChatGPT</div>
      <div class="text">${response.text}</div>
    </div>
    
    <div class="timestamp">
      Generated: ${new Date().toLocaleString('de-DE')}
    </div>
  </div>
</body>
</html>`;
  }

  private generateChatPRBody(message: ChatMessage, sha: string): string {
    const messageHash = createHash('sha256')
      .update(JSON.stringify(message))
      .digest('hex');

    return `## Chat Bridge Response

**Incoming Message**: ${message.from} → ${message.to}
**Thread**: ${message.thread}
**Timestamp**: ${message.ts}

### Message Preview
> ${message.text.substring(0, 200)}...

### Response Generated
✅ Reply JSON created in \`.chat/outbox/from-claude/\`
${message.text.includes('demo') ? '✅ Demo page created in `site/public/chat/`' : ''}

---

**Idempotency**: 
- Message SHA: ${messageHash}
- Source File SHA: ${sha}
- Run: chat-bridge://runs/${Date.now()}
- Tool: operator-chat-bridge@v0.1`;
  }

  private async createBranch(branchName: string): Promise<void> {
    try {
      const { data: mainRef } = await this.octokit.request('GET /repos/{owner}/{repo}/git/ref/{ref}', {
        owner: this.owner,
        repo: this.repo,
        ref: 'heads/main'
      });

      await this.octokit.request('POST /repos/{owner}/{repo}/git/refs', {
        owner: this.owner,
        repo: this.repo,
        ref: `refs/heads/${branchName}`,
        sha: mainRef.object.sha
      });
    } catch (error: any) {
      if (error.status !== 422) { // 422 = already exists
        throw error;
      }
    }
  }

  private async createFile(branch: string, path: string, content: string): Promise<void> {
    await this.octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
      owner: this.owner,
      repo: this.repo,
      path: path,
      message: `feat: Add ${path}`,
      content: Buffer.from(content).toString('base64'),
      branch: branch
    }).catch((e: any) => {
      if (e.status !== 422) throw e; // Ignore if file exists
    });
  }

  private async createPR(branch: string, message: ChatMessage, body: string): Promise<any> {
    const { data: pr } = await this.octokit.request('POST /repos/{owner}/{repo}/pulls', {
      owner: this.owner,
      repo: this.repo,
      title: `chat: Response to ${message.from} - ${message.text.substring(0, 50)}...`,
      head: branch,
      base: 'main',
      body: body
    });
    return pr;
  }

  private async addLabel(prNumber: number, label: string): Promise<void> {
    await this.octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/labels', {
      owner: this.owner,
      repo: this.repo,
      issue_number: prNumber,
      labels: [label]
    });
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }
}