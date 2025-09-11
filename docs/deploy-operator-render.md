# Deploy Operator to Render

**Last Updated**: 2025-09-06  
**Version**: 1.0.0  
**Deployment Target**: Render.com Web Service

## Overview
This guide walks through deploying the Operator webhook server to Render for 24/7 availability.

## Prerequisites

- Render account (free tier works)
- GitHub repository connected to Render
- GitHub App credentials ready
- Webhook secret generated

## Step-by-Step Deployment

### 1. Create New Web Service

1. Log in to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository:
   - Repository: `TobiasSpaeth83/ai-shared-memory`
   - Branch: `main`

### 2. Configure Service Settings

**Basic Settings**:
- **Name**: `ai-operator-webhook`
- **Region**: Choose closest to you (e.g., Frankfurt for EU)
- **Root Directory**: `tooling/operator`
- **Environment**: `Node`
- **Build Command**: 
  ```bash
  npm install && npm run build
  ```
- **Start Command**:
  ```bash
  npm run start:web
  ```

**Instance Type**:
- Free tier is sufficient for testing
- For production: Starter ($7/month) recommended

### 3. Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Required variables:

| Key | Value | Description |
|-----|-------|-------------|
| `WEBHOOK_SECRET` | `your-generated-secret` | From webhook setup |
| `GITHUB_APP_ID` | `1878945` | GitHub App ID |
| `GITHUB_INSTALLATION_ID` | `83805063` | Installation ID |
| `GITHUB_PRIVATE_KEY` | `base64-encoded-key` | See encoding instructions below |
| `PORT` | `10000` | Render's default port |
| `NODE_ENV` | `production` | Production mode |

### 4. Encode Private Key

The GitHub App private key must be base64 encoded:

```bash
# On Linux/Mac
base64 -w 0 ai-memory-sync-tobias.2025-09-01.private-key.pem

# On Windows (Git Bash)
base64 ai-memory-sync-tobias.2025-09-01.private-key.pem | tr -d '\n'

# Or use Node.js
node -e "console.log(Buffer.from(require('fs').readFileSync('ai-memory-sync-tobias.2025-09-01.private-key.pem')).toString('base64'))"
```

Copy the entire output (one long line) and paste as `GITHUB_PRIVATE_KEY` value.

### 5. Health Check Configuration

In Render settings:
- **Health Check Path**: `/health`
- **Port**: `10000`

### 6. Deploy

1. Click **"Create Web Service"**
2. Wait for build and deployment (3-5 minutes)
3. Check logs for: `🚀 Webhook server listening on port 10000`

### 7. Get Your Service URL

After deployment, Render provides a URL like:
```
https://ai-operator-webhook.onrender.com
```

Your webhook endpoint will be:
```
https://ai-operator-webhook.onrender.com/webhook
```

## Verification

### Test Health Endpoint
```bash
curl https://ai-operator-webhook.onrender.com/health
# Expected: {"ok":true,"timestamp":"..."}
```

### Check Logs
1. In Render dashboard, click on your service
2. Go to "Logs" tab
3. Look for:
   - `🚀 Webhook server listening on port 10000`
   - `Health: http://localhost:10000/health`
   - `Webhook: http://localhost:10000/webhook`

### Configure GitHub Webhook
Use your Render URL in GitHub webhook settings:
1. Go to repository settings → Webhooks
2. Add webhook with URL: `https://ai-operator-webhook.onrender.com/webhook`
3. Use the same `WEBHOOK_SECRET` you configured in Render

## Troubleshooting

### Service Won't Start

**Check Build Logs**:
```
npm ERR! Missing script: "start:web"
```
**Fix**: Ensure `package.json` has the script:
```json
"scripts": {
  "start:web": "node dist/server.js"
}
```

### Health Check Failing

**Symptoms**: Service keeps restarting
**Fix**: Verify:
1. Health check path is `/health`
2. Server responds on the PORT env var
3. Response is 200 OK

### HMAC Validation Failures

**Error**: `❌ Invalid signature`
**Fix**:
1. Verify `WEBHOOK_SECRET` matches exactly (no extra spaces)
2. Check webhook secret in GitHub matches Render env var
3. Ensure no quotes around the secret in Render

### Private Key Issues

**Error**: `Error reading private key`
**Fix**:
1. Re-encode the private key file
2. Ensure the entire base64 string is copied (it's very long!)
3. No line breaks in the environment variable value

### Port Binding Issues

**Error**: `Error: listen EADDRINUSE`
**Fix**: Use `process.env.PORT` not hardcoded port:
```javascript
const PORT = process.env.PORT || 3000;
```

## Monitoring

### Render Dashboard
- **Metrics**: CPU, Memory, Response time
- **Logs**: Real-time and historical
- **Alerts**: Set up email alerts for failures

### Recommended Monitoring Setup
1. Enable email alerts in Render
2. Set up uptime monitoring (e.g., UptimeRobot)
3. Monitor `/health` endpoint every 5 minutes
4. Alert if health check fails 2+ times

## Auto-Deploy Configuration

Enable auto-deploy from GitHub:
1. In Render service settings
2. Go to "Settings" → "Build & Deploy"
3. Enable "Auto-Deploy" for main branch
4. Now pushes to main automatically redeploy

## Scaling Considerations

### Free Tier Limitations
- Spins down after 15 minutes of inactivity
- First request after spin-down takes 30-50 seconds
- 512 MB RAM, shared CPU

### Upgrade for Production
**Starter Plan ($7/month)**:
- Always on (no spin-down)
- 512 MB RAM guaranteed
- Better CPU allocation
- Custom domains supported

### High-Traffic Optimizations
If processing many PRs:
1. Upgrade to Standard tier
2. Enable autoscaling (2-5 instances)
3. Add Redis for job queue
4. Implement rate limiting

## Backup Deployment Options

### Alternative: Railway
```yaml
# railway.toml
[build]
builder = "nixpacks"
buildCommand = "npm install && npm run build"

[deploy]
startCommand = "npm run start:web"
healthcheckPath = "/health"
```

### Alternative: Fly.io
```toml
# fly.toml
app = "ai-operator-webhook"

[env]
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true

[[services.ports]]
  port = 443
  handlers = ["tls", "http"]
```

## Security Checklist

- [ ] WEBHOOK_SECRET is strong (32+ characters)
- [ ] Private key is properly encoded
- [ ] HTTPS enforced (Render does this automatically)
- [ ] Environment variables marked as secret in Render
- [ ] No secrets in logs
- [ ] GitHub webhook uses SSL verification

## Cost Summary

**Free Tier**:
- ✅ Good for testing and low traffic
- ⚠️ Spins down after inactivity
- 750 hours/month (enough for one service)

**Paid Options**:
- Starter: $7/month (always on, better performance)
- Standard: $25/month (more resources, autoscaling)
- Pro: $85/month (high performance, premium support)

## Next Steps

1. ✅ Service deployed and running
2. ✅ Health check passing
3. → Configure GitHub webhook (see `docs/webhooks-operator.md`)
4. → Test with real PR
5. → Set up monitoring
6. → Optional: Configure cron fallback

---

**Support**: 
- Render docs: https://render.com/docs
- Render status: https://status.render.com
- Our webhook docs: `docs/webhooks-operator.md`