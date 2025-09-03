import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { App } from '@octokit/app';
import { Octokit } from '@octokit/rest';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

interface GitHubConfig {
  appId: string;
  installationId: string;
  privateKey: string;
  repoAllowlist?: string[];
}

class GitHubMCPServer {
  private server: Server;
  private app: App;
  private octokit?: any;
  private config: GitHubConfig;

  constructor() {
    this.config = this.loadConfig();
    this.app = new App({
      appId: this.config.appId,
      privateKey: this.config.privateKey,
    });
    this.server = new Server(
      {
        name: 'github-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private loadConfig(): GitHubConfig {
    const appId = process.env.GITHUB_APP_ID;
    const installationId = process.env.GITHUB_INSTALLATION_ID;
    const privateKey = process.env.GITHUB_PRIVATE_KEY;

    if (!appId || !installationId || !privateKey) {
      throw new Error('Missing required GitHub App configuration');
    }

    const repoAllowlist = process.env.REPO_ALLOWLIST?.split(',').map(r => r.trim());

    return {
      appId,
      installationId,
      privateKey,
      repoAllowlist,
    };
  }

  private async getOctokit(): Promise<any> {
    if (!this.octokit) {
      this.octokit = await this.app.getInstallationOctokit(parseInt(this.config.installationId));
    }
    return this.octokit;
  }

  private checkRepoAllowlist(owner: string, repo: string): void {
    if (this.config.repoAllowlist && this.config.repoAllowlist.length > 0) {
      const fullName = `${owner}/${repo}`;
      if (!this.config.repoAllowlist.includes(fullName)) {
        throw new Error(`Repository ${fullName} not in allowlist`);
      }
    }
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getTools(),
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        const result = await this.callTool(name, args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private getTools(): Tool[] {
    return [
      {
        name: 'repo_read_tree',
        description: 'Read repository tree structure',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner' },
            repo: { type: 'string', description: 'Repository name' },
            sha: { type: 'string', description: 'Tree SHA or branch name' },
            path: { type: 'string', description: 'Path within repository' },
          },
          required: ['owner', 'repo'],
        },
      },
      {
        name: 'code_search',
        description: 'Search for code in repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner' },
            repo: { type: 'string', description: 'Repository name' },
            query: { type: 'string', description: 'Search query' },
          },
          required: ['owner', 'repo', 'query'],
        },
      },
      {
        name: 'commit_files',
        description: 'Commit files to a branch',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner' },
            repo: { type: 'string', description: 'Repository name' },
            branch: { type: 'string', description: 'Branch name' },
            files: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  path: { type: 'string' },
                  content: { type: 'string' },
                  encoding: { type: 'string', enum: ['utf-8', 'base64'] },
                },
                required: ['path', 'content'],
              },
            },
            message: { type: 'string', description: 'Commit message' },
          },
          required: ['owner', 'repo', 'branch', 'files', 'message'],
        },
      },
      {
        name: 'pr_open',
        description: 'Open a pull request',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner' },
            repo: { type: 'string', description: 'Repository name' },
            base: { type: 'string', description: 'Base branch' },
            head: { type: 'string', description: 'Head branch' },
            title: { type: 'string', description: 'PR title' },
            body: { type: 'string', description: 'PR body' },
            draft: { type: 'boolean', description: 'Create as draft PR' },
          },
          required: ['owner', 'repo', 'base', 'head', 'title', 'body'],
        },
      },
      {
        name: 'pr_comment',
        description: 'Add comment to pull request',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner' },
            repo: { type: 'string', description: 'Repository name' },
            number: { type: 'number', description: 'PR number' },
            body: { type: 'string', description: 'Comment body' },
          },
          required: ['owner', 'repo', 'number', 'body'],
        },
      },
    ];
  }

  private async callTool(name: string, args: any): Promise<any> {
    const octokit = await this.getOctokit();

    switch (name) {
      case 'repo_read_tree':
        return this.readTree(octokit, args);
      case 'code_search':
        return this.searchCode(octokit, args);
      case 'commit_files':
        return this.commitFiles(octokit, args);
      case 'pr_open':
        return this.openPR(octokit, args);
      case 'pr_comment':
        return this.commentPR(octokit, args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async readTree(octokit: any, args: any) {
    const { owner, repo, sha = 'main', path = '' } = args;
    this.checkRepoAllowlist(owner, repo);

    const response = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: sha,
    });

    return response.data;
  }

  private async searchCode(octokit: any, args: any) {
    const { owner, repo, query } = args;
    this.checkRepoAllowlist(owner, repo);

    const response = await octokit.search.code({
      q: `${query} repo:${owner}/${repo}`,
    });

    return response.data;
  }

  private async commitFiles(octokit: any, args: any) {
    const { owner, repo, branch, files, message } = args;
    this.checkRepoAllowlist(owner, repo);

    // Get current commit SHA
    const { data: ref } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });

    const commitSha = ref.object.sha;
    const { data: commit } = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: commitSha,
    });

    const treeSha = commit.tree.sha;

    // Create blobs for files
    const blobs = await Promise.all(
      files.map(async (file: any) => {
        const { data: blob } = await octokit.git.createBlob({
          owner,
          repo,
          content: file.encoding === 'base64' ? file.content : Buffer.from(file.content).toString('base64'),
          encoding: 'base64',
        });
        return {
          path: file.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: blob.sha,
        };
      })
    );

    // Create tree
    const { data: tree } = await octokit.git.createTree({
      owner,
      repo,
      tree: blobs,
      base_tree: treeSha,
    });

    // Create commit
    const { data: newCommit } = await octokit.git.createCommit({
      owner,
      repo,
      message,
      tree: tree.sha,
      parents: [commitSha],
    });

    // Update reference
    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommit.sha,
    });

    return { commit: newCommit.sha, message: 'Files committed successfully' };
  }

  private async openPR(octokit: any, args: any) {
    const { owner, repo, base, head, title, body, draft = false } = args;
    this.checkRepoAllowlist(owner, repo);

    // Add idempotency footer
    const runId = `run-${Date.now()}`;
    const enhancedBody = `${body}

---
Run: minerva://runs/${runId}
Tool: github-mcp@1.0.0
`;

    const response = await octokit.pulls.create({
      owner,
      repo,
      title,
      head,
      base,
      body: enhancedBody,
      draft,
    });

    return {
      number: response.data.number,
      url: response.data.html_url,
      state: response.data.state,
    };
  }

  private async commentPR(octokit: any, args: any) {
    const { owner, repo, number, body } = args;
    this.checkRepoAllowlist(owner, repo);

    const response = await octokit.issues.createComment({
      owner,
      repo,
      issue_number: number,
      body,
    });

    return {
      id: response.data.id,
      url: response.data.html_url,
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('GitHub MCP Server started');
  }
}

// Start server
const server = new GitHubMCPServer();
server.start().catch(console.error);