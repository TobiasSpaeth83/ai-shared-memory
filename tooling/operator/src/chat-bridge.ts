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
  [key: string]: any; // Allow additional properties like _file
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
      // First check PRs with to:claude label
      const { data: prs } = await this.octokit.request('GET /repos/{owner}/{repo}/pulls', {
        owner: this.owner,
        repo: this.repo,
        state: 'open'
      });

      const chatPRs = prs.filter((pr: any) => 
        pr.labels.some((label: any) => label.name === 'to:claude')
      );

      if (chatPRs.length > 0) {
        console.log(`  📬 Found ${chatPRs.length} PRs with to:claude label`);
        for (const pr of chatPRs) {
          await this.processMessageFromPR(pr);
        }
      }

      // Then check inbox messages from main
      const { data: inboxFiles } = await this.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: this.owner,
        repo: this.repo,
        path: '.chat/inbox/from-chatgpt',
        ref: 'main'
      }).catch(() => ({ data: [] }));

      if (!Array.isArray(inboxFiles) || inboxFiles.length === 0) {
        console.log('  📭 No messages in main inbox');
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

      // Generate thread overview pages
      await this.generateThreadOverviews();
      
      // Generate data JSONs for Chat-UI
      await this.generateChatDataJSON();
    } catch (error) {
      console.error('❌ Error checking inbox:', error);
    }
  }

  private async processMessageFromPR(pr: any): Promise<void> {
    console.log(`\n📨 Processing PR #${pr.number}: ${pr.title}`);
    
    try {
      // Get files in the PR
      const { data: files } = await this.octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
        owner: this.owner,
        repo: this.repo,
        pull_number: pr.number
      });

      // Find chat message files
      const chatFiles = files.filter((file: any) => 
        file.filename.startsWith('.chat/inbox/from-chatgpt/') && 
        file.filename.endsWith('.json')
      );

      if (chatFiles.length === 0) {
        console.log(`  📭 No chat messages in PR #${pr.number}`);
        return;
      }

      for (const file of chatFiles) {
        console.log(`  📄 Found message file: ${file.filename}`);
        
        // Get file content from PR branch
        const { data } = await this.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
          owner: this.owner,
          repo: this.repo,
          path: file.filename,
          ref: pr.head.ref
        });

        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        const message: ChatMessage = JSON.parse(content);
        
        console.log(`  From: ${message.from} → To: ${message.to}`);
        console.log(`  Text: "${message.text.substring(0, 50)}..."`);

        // Generate response
        const response = await this.generateResponse(message);
        
        // Create response branch
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const branchName = `chats/response-${timestamp}`;
        await this.createBranch(branchName);

        // Write response
        const responseFile = `.chat/outbox/from-claude/${timestamp}-reply.json`;
        await this.createFile(branchName, responseFile, JSON.stringify(response, null, 2));

        // Optional: Create demo page
        if (message.text.toLowerCase().includes('demo') || message.text.toLowerCase().includes('page')) {
          const demoHtml = this.generateDemoPage(message, response);
          await this.createFile(branchName, `site/public/chat/${timestamp}.html`, demoHtml);
        }

        // Create response PR
        const prBody = this.generateChatPRBody(message, data.sha);
        const responsePr = await this.createPR(branchName, message, prBody);
        
        console.log(`  ✅ Response PR created: #${responsePr.number}`);
        
        // Add auto-merge label if appropriate
        if (message.text.toLowerCase().includes('publish')) {
          await this.addLabel(responsePr.number, 'auto-merge');
          console.log(`  🏷️  Added auto-merge label`);
        }

        // Remove to:claude label from original PR
        await this.removeLabel(pr.number, 'to:claude');
        console.log(`  🏷️  Removed to:claude label from PR #${pr.number}`);
      }
      
    } catch (error) {
      console.error(`  ❌ Failed to process PR #${pr.number}:`, error);
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

  private async removeLabel(prNumber: number, label: string): Promise<void> {
    await this.octokit.request('DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}', {
      owner: this.owner,
      repo: this.repo,
      issue_number: prNumber,
      name: label
    }).catch((e: any) => {
      if (e.status !== 404) throw e; // Ignore if label doesn't exist
    });
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }

  private async generateThreadOverviews(): Promise<void> {
    console.log('\n📊 Generating thread overview pages...');
    
    try {
      // Collect all messages from inbox and outbox
      const allMessages: ChatMessage[] = [];
      
      // Read inbox messages
      const { data: inboxFiles } = await this.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: this.owner,
        repo: this.repo,
        path: '.chat/inbox/from-chatgpt',
        ref: 'main'
      }).catch(() => ({ data: [] }));

      for (const file of Array.isArray(inboxFiles) ? inboxFiles : []) {
        if (!file.name.endsWith('.json')) continue;
        
        const { data } = await this.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
          owner: this.owner,
          repo: this.repo,
          path: file.path,
          ref: 'main'
        });
        
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        const message: ChatMessage = JSON.parse(content);
        message['_file'] = file.name;
        allMessages.push(message);
      }

      // Read outbox messages  
      const { data: outboxFiles } = await this.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: this.owner,
        repo: this.repo,
        path: '.chat/outbox/from-claude',
        ref: 'main'
      }).catch(() => ({ data: [] }));

      for (const file of Array.isArray(outboxFiles) ? outboxFiles : []) {
        if (!file.name.endsWith('.json')) continue;
        
        const { data } = await this.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
          owner: this.owner,
          repo: this.repo,
          path: file.path,
          ref: 'main'
        });
        
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        const message: ChatMessage = JSON.parse(content);
        message['_file'] = file.name;
        allMessages.push(message);
      }

      // Group messages by thread
      const threads: { [key: string]: ChatMessage[] } = {};
      for (const msg of allMessages) {
        const thread = msg.thread || 'general';
        if (!threads[thread]) threads[thread] = [];
        threads[thread].push(msg);
      }

      // Create branch for thread overviews
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const branchName = `feat/chat-thread-overviews-${timestamp}`;
      await this.createBranch(branchName);

      // Generate overview page for each thread
      for (const [thread, messages] of Object.entries(threads)) {
        // Sort messages by timestamp
        messages.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
        
        const html = this.generateThreadOverviewPage(thread, messages);
        const filePath = `site/public/chat/threads/${thread}.html`;
        
        await this.createFile(branchName, filePath, html);
        console.log(`  ✅ Created thread overview: ${filePath}`);
      }

      // Create index page with all threads
      const indexHtml = this.generateThreadIndexPage(threads);
      await this.createFile(branchName, 'site/public/chat/threads/index.html', indexHtml);
      console.log(`  ✅ Created thread index page`);

      // Create PR
      const prBody = this.generateThreadOverviewPRBody(Object.keys(threads));
      const { data: pr } = await this.octokit.request('POST /repos/{owner}/{repo}/pulls', {
        owner: this.owner,
        repo: this.repo,
        title: `feat: Add chat thread overview pages`,
        head: branchName,
        base: 'main',
        body: prBody
      });
      
      console.log(`  ✅ PR created: #${pr.number}`);
      console.log(`  🔗 Preview URL: https://github.com/${this.owner}/${this.repo}/pull/${pr.number}/files`);
      
      // Add auto-merge label
      await this.addLabel(pr.number, 'auto-merge');
      console.log(`  🏷️  Added auto-merge label`);
      
    } catch (error) {
      console.error('  ❌ Failed to generate thread overviews:', error);
    }
  }

  private generateThreadOverviewPage(thread: string, messages: ChatMessage[]): string {
    const messageRows = messages.map(msg => {
      const fileName = msg['_file'] || 'unknown';
      const messageId = fileName.replace('.json', '');
      const detailPath = msg.from === 'chatgpt' 
        ? `/chat/${messageId}.html`
        : `/chat/${messageId}.html`;
      
      return `
        <tr>
          <td class="timestamp">${new Date(msg.ts).toLocaleString('de-DE')}</td>
          <td class="from ${msg.from}">${msg.from}</td>
          <td class="to">${msg.to}</td>
          <td class="excerpt">${msg.text.substring(0, 80)}...</td>
          <td class="link"><a href="${detailPath}" target="_blank">Details →</a></td>
        </tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thread: ${thread} - Chat Bridge</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 1200px;
      margin: 0 auto;
      padding: 30px;
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 28px;
    }
    .thread-info {
      color: #666;
      margin-bottom: 30px;
      font-size: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    thead {
      background: #f8f9fa;
    }
    th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #495057;
      border-bottom: 2px solid #dee2e6;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #dee2e6;
    }
    .timestamp {
      white-space: nowrap;
      color: #6c757d;
      font-size: 13px;
    }
    .from.chatgpt {
      color: #2196F3;
      font-weight: 500;
    }
    .from.claude {
      color: #9c27b0;
      font-weight: 500;
    }
    .excerpt {
      color: #495057;
      max-width: 400px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .link a {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }
    .link a:hover {
      text-decoration: underline;
    }
    .nav {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #dee2e6;
    }
    .nav a {
      color: #667eea;
      text-decoration: none;
      margin-right: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🌉 Thread: ${thread}</h1>
    <div class="thread-info">
      ${messages.length} Nachrichten • ${new Date(messages[0].ts).toLocaleDateString('de-DE')} - ${new Date(messages[messages.length-1].ts).toLocaleDateString('de-DE')}
    </div>
    
    <table>
      <thead>
        <tr>
          <th>Zeitstempel</th>
          <th>Von</th>
          <th>An</th>
          <th>Nachricht</th>
          <th>Link</th>
        </tr>
      </thead>
      <tbody>
        ${messageRows}
      </tbody>
    </table>
    
    <div class="nav">
      <a href="/chat/threads/">← Alle Threads</a>
      <a href="https://github.com/${this.owner}/${this.repo}/tree/main/.chat">📁 Chat Repository</a>
    </div>
  </div>
</body>
</html>`;
  }

  private generateThreadIndexPage(threads: { [key: string]: ChatMessage[] }): string {
    const threadCards = Object.entries(threads).map(([thread, messages]) => {
      const lastMessage = messages[messages.length - 1];
      return `
        <div class="thread-card">
          <h3><a href="/chat/threads/${thread}.html">${thread}</a></h3>
          <div class="stats">${messages.length} Nachrichten</div>
          <div class="last-message">
            <span class="from ${lastMessage.from}">${lastMessage.from}</span>: 
            ${lastMessage.text.substring(0, 100)}...
          </div>
          <div class="timestamp">Letzte Nachricht: ${new Date(lastMessage.ts).toLocaleString('de-DE')}</div>
        </div>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chat Threads - Chat Bridge</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      color: white;
      margin-bottom: 30px;
      font-size: 32px;
      text-align: center;
    }
    .threads-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
    }
    .thread-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      transition: transform 0.2s;
    }
    .thread-card:hover {
      transform: translateY(-5px);
    }
    .thread-card h3 {
      margin-bottom: 10px;
    }
    .thread-card h3 a {
      color: #333;
      text-decoration: none;
      font-size: 20px;
    }
    .stats {
      color: #6c757d;
      font-size: 14px;
      margin-bottom: 15px;
    }
    .last-message {
      color: #495057;
      font-size: 14px;
      margin-bottom: 10px;
      line-height: 1.4;
    }
    .from.chatgpt {
      color: #2196F3;
      font-weight: 500;
    }
    .from.claude {
      color: #9c27b0;
      font-weight: 500;
    }
    .timestamp {
      color: #6c757d;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🌉 Chat Bridge - Thread Übersicht</h1>
    <div class="threads-grid">
      ${threadCards}
    </div>
  </div>
</body>
</html>`;
  }

  private generateThreadOverviewPRBody(threads: string[]): string {
    const timestamp = Date.now();
    const hash = createHash('sha256')
      .update(`thread-overviews-${timestamp}`)
      .digest('hex');

    return `## Chat-Bridge Thread Overview Pages

### Features
- ✅ Thread overview pages under \`site/public/chat/threads/<thread>.html\`
- ✅ Chronological message list with from/to, timestamp, text excerpt
- ✅ Links to individual message detail pages
- ✅ Index page with all threads

### Generated Threads
${threads.map(t => `- \`${t}\``).join('\n')}

### Preview URLs
- Index: \`site/public/chat/threads/index.html\`
- Threads: \`site/public/chat/threads/<thread>.html\`

---

**Idempotency**: 
- Hash: ${hash}
- Run: chat-bridge://thread-overviews/${timestamp}
- Tool: operator-chat-bridge@v0.2`;
  }

  private async generateChatDataJSON(): Promise<void> {
    console.log('\n📊 Generating Chat-UI data JSONs...');
    
    try {
      // Collect all messages from inbox and outbox
      const allMessages: ChatMessage[] = [];
      
      // Read inbox messages
      const { data: inboxFiles } = await this.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: this.owner,
        repo: this.repo,
        path: '.chat/inbox/from-chatgpt',
        ref: 'main'
      }).catch(() => ({ data: [] }));

      for (const file of Array.isArray(inboxFiles) ? inboxFiles : []) {
        if (!file.name.endsWith('.json')) continue;
        
        const { data } = await this.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
          owner: this.owner,
          repo: this.repo,
          path: file.path,
          ref: 'main'
        });
        
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        const message: ChatMessage = JSON.parse(content);
        allMessages.push(message);
      }

      // Read outbox messages  
      const { data: outboxFiles } = await this.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner: this.owner,
        repo: this.repo,
        path: '.chat/outbox/from-claude',
        ref: 'main'
      }).catch(() => ({ data: [] }));

      for (const file of Array.isArray(outboxFiles) ? outboxFiles : []) {
        if (!file.name.endsWith('.json')) continue;
        
        const { data } = await this.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
          owner: this.owner,
          repo: this.repo,
          path: file.path,
          ref: 'main'
        });
        
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        const message: ChatMessage = JSON.parse(content);
        allMessages.push(message);
      }

      if (allMessages.length === 0) {
        console.log('  📭 No messages to process for data JSONs');
        return;
      }

      // Group messages by thread
      const threads: { [key: string]: ChatMessage[] } = {};
      for (const msg of allMessages) {
        const thread = msg.thread || 'general';
        if (!threads[thread]) threads[thread] = [];
        threads[thread].push(msg);
      }

      // Create branch for data updates
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const branchName = `chore/chat-data-update-${timestamp}`;
      await this.createBranch(branchName);

      let filesChanged = false;
      const threadList: { name: string; count: number }[] = [];

      // Generate JSON for each thread
      for (const [thread, messages] of Object.entries(threads)) {
        // Sort messages chronologically
        messages.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
        
        // Create simplified message format for UI
        const uiMessages = messages.map(msg => ({
          from: msg.from,
          to: msg.to,
          text: msg.text,
          ts: msg.ts
        }));
        
        const dataJson = JSON.stringify({ messages: uiMessages }, null, 2);
        const filePath = `site/public/chat/data/${thread}.json`;
        
        // Calculate hash for idempotency
        const contentHash = createHash('sha256').update(dataJson).digest('hex');
        
        // Check if file exists and if content changed
        const existingFile = await this.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
          owner: this.owner,
          repo: this.repo,
          path: filePath,
          ref: 'main'
        }).catch(() => null);

        if (existingFile) {
          const existingContent = Buffer.from(existingFile.data.content, 'base64').toString('utf-8');
          const existingHash = createHash('sha256').update(existingContent).digest('hex');
          
          if (existingHash === contentHash) {
            console.log(`  ⏭️  No changes for thread: ${thread}`);
            threadList.push({ name: thread, count: messages.length });
            continue;
          }
        }
        
        await this.createFile(branchName, filePath, dataJson);
        console.log(`  ✅ Updated data for thread: ${thread} (${messages.length} messages)`);
        threadList.push({ name: thread, count: messages.length });
        filesChanged = true;
      }

      // Generate thread index
      const indexJson = JSON.stringify({ threads: threadList }, null, 2);
      await this.createFile(branchName, 'site/public/chat/data/thread-index.json', indexJson);
      console.log(`  ✅ Updated thread index (${threadList.length} threads)`);
      filesChanged = true;

      if (!filesChanged) {
        console.log('  ⏭️  No data changes needed');
        return;
      }

      // Create PR with auto-merge
      const prBody = this.generateChatDataPRBody(threadList);
      const { data: pr } = await this.octokit.request('POST /repos/{owner}/{repo}/pulls', {
        owner: this.owner,
        repo: this.repo,
        title: `chore(chat-data): Update chat UI data`,
        head: branchName,
        base: 'main',
        body: prBody
      });
      
      console.log(`  ✅ PR created: #${pr.number}`);
      console.log(`  🔗 Preview: site/public/chat/index.html`);
      
      // Add auto-merge label
      await this.addLabel(pr.number, 'auto-merge');
      console.log(`  🏷️  Added auto-merge label`);
      
    } catch (error) {
      console.error('  ❌ Failed to generate chat data JSONs:', error);
    }
  }

  private generateChatDataPRBody(threads: { name: string; count: number }[]): string {
    const timestamp = Date.now();
    const hash = createHash('sha256')
      .update(`chat-data-${timestamp}`)
      .digest('hex');

    const totalMessages = threads.reduce((sum, t) => sum + t.count, 0);

    return `## Chat-UI Data Update

### Updated Threads
${threads.map(t => `- \`${t.name}\`: ${t.count} messages`).join('\n')}

### Statistics
- Total Threads: ${threads.length}
- Total Messages: ${totalMessages}

### Preview URLs
- Chat UI: \`site/public/chat/index.html\`
- Thread View: \`site/public/chat/thread.html?t=<thread>\`

### Features
- ✅ Auto-refresh every 15 seconds
- ✅ Mobile-responsive design
- ✅ Chronological message ordering
- ✅ Thread navigation

---

**Idempotency**: 
- Hash: ${hash}
- Run: chat-data://update/${timestamp}
- Tool: operator-chat-bridge@v0.3`;
  }
}