# GitHub App Setup Guide

## 1. Create GitHub App

Go to: GitHub → Settings → Developer settings → GitHub Apps → New GitHub App

### Basic Information
- **App name**: AI Shared Memory Bot
- **Homepage URL**: https://github.com/your-org/ai-shared-memory
- **Description**: Automated task processing via Claude Code

### Permissions (Minimal)
- **Repository permissions**:
  - Contents: Read & Write
  - Pull requests: Read & Write
  - Metadata: Read
  - Actions: Read (optional)
  
### Webhook (Optional)
- **Webhook URL**: `https://<your-domain>/webhooks/github`
- **Webhook secret**: Generate a secure random string
- **Events**: 
  - Pull requests
  - Push

### Installation
- Install only on: `ai-shared-memory` repository

## 2. Save Credentials

After creation, save:
- `GITHUB_APP_ID`: From app settings page
- `GITHUB_INSTALLATION_ID`: From installation page
- `GITHUB_PRIVATE_KEY`: Download and save the private key (.pem file)

## 3. Environment Variables

Create `.env` file (DO NOT COMMIT):
```bash
GITHUB_APP_ID=your_app_id
GITHUB_INSTALLATION_ID=your_installation_id
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
...your key content...
-----END RSA PRIVATE KEY-----"
REPO_ALLOWLIST=your-org/ai-shared-memory
```