# 🚀 NEXT_CHAT.md - Sofort-Einstieg für nächste Claude Session

**KRITISCH**: Diese Datei IMMER als ERSTES lesen bei Session-Start!
**Stand**: 2025-09-06 18:30
**Letzter Commit**: Webhook Implementation gemerged

## ⚡ SOFORT-BEFEHLE bei Session-Start

```bash
# 1. Wo bin ich?
pwd
git status
git branch

# 2. Was ist der aktuelle Stand?
cat next_chat.md  # Diese Datei!

# 3. MCP Server Check
# In Claude Code unten rechts sollte stehen: "MCP: 1 server connected"
# Falls nicht → Claude Code neu starten!
```

## 🔴 AKTUELLER STATUS (2025-09-06)

### ✅ ERLEDIGTE FEATURES
- **MCP Server**: Vollständig konfiguriert und getestet
- **Operator v1.0.0**: Task-Processing implementiert
- **Chat-Bridge v0.3**: Bidirektionale Kommunikation ChatGPT ↔ Claude
- **Chat-UI**: Statisches Interface mit Auto-Refresh unter `/chat/`
- **Webhook Server**: Express Server mit HMAC (T-501) ✅
- **Deployment Docs**: Render Guide (T-502) ✅
- **Webhook Config**: Setup Guide (T-503) ✅
- **Cron Fallback**: Polling als Backup (T-504) ✅

### 🚀 NÄCHSTE SCHRITTE

#### 1. Webhook Deployment auf Render
```bash
# Dokumentation vorhanden:
cat docs/deploy-operator-render.md

# Was zu tun ist:
1. Render Account erstellen/einloggen
2. Neuen Web Service anlegen
3. ENV Variablen setzen (siehe Doku)
4. Deploy und Health Check prüfen
```

#### 2. GitHub Webhook einrichten
```bash
# Dokumentation vorhanden:
cat docs/webhooks-operator.md

# Schritte:
1. Webhook Secret generieren: openssl rand -hex 32
2. In GitHub Settings → Webhooks → Add webhook
3. URL: https://[deine-render-url].onrender.com/webhook
4. Events: Pull requests only
5. Secret eintragen
```

#### 3. End-to-End Test
```bash
# Test-PR mit Chat-Message erstellen:
cat > .chat/inbox/from-chatgpt/webhook-test.json << 'EOF'
{
  "from": "chatgpt",
  "to": "claude",
  "type": "chat",
  "thread": "test",
  "text": "Webhook Test - bitte antworten!",
  "ts": "2025-09-06T18:00:00Z"
}
EOF

# PR erstellen mit Label "to:claude"
# Operator sollte automatisch antworten!
```

### 📊 Projekt-Fortschritt

**Implementierte Komponenten**:
- ✅ MCP-GitHub Integration
- ✅ Operator Agent (Pull & Push Mode)
- ✅ Chat-Bridge für AI-Kommunikation
- ✅ Static Chat-UI mit Auto-Refresh
- ✅ Webhook Server für Real-time Processing
- ✅ Cron Fallback für Redundanz
- ✅ Vollständige Dokumentation

**Noch offen**:
- ⏳ Webhook auf Render deployen
- ⏳ GitHub Webhook konfigurieren
- ⏳ Production Testing
- ⏳ Monitoring Setup

## 📚 WICHTIGE DATEIEN

### Neue Dokumentation (LESEN!)
```bash
# Webhook & Deployment
cat docs/webhooks-operator.md      # Webhook Setup Guide
cat docs/deploy-operator-render.md  # Render Deployment
cat docs/cron-fallback.md          # Backup Polling

# Chat-UI
ls site/public/chat/                # Static Chat Interface
```

### Operator Code
```bash
# Neue Server-Komponenten
cat tooling/operator/src/server.ts  # Webhook Server
cat tooling/operator/src/cron.ts    # Cron Worker
cat tooling/operator/src/chat-bridge.ts  # Enhanced mit PR reading

# Package updates
cat tooling/operator/package.json   # New scripts: start:web, start:cron
```

## 🛠️ BEFEHLE FÜR OPERATOR

### Lokaler Test
```bash
cd tooling/operator
npm install
npm run build

# Webhook Server starten
npm run start:web
# → http://localhost:3000/health

# Oder Cron Worker
npm run start:cron
```

### Webhook Test mit ngrok
```bash
# ngrok installieren
npm install -g ngrok

# Lokalen Server exposen
ngrok http 3000
# → Nutze ngrok URL für GitHub Webhook Test
```

## 📋 AKTUELLE TASKS & PRs

### Offene PRs
```bash
# Check aktuelle PRs
"/c/Program Files/GitHub CLI/gh.exe" pr list

# Wichtige gemergete PRs:
# - PR #21: Static Chat-UI ✅
# - PR #22: Webhook Tasks (T-501 bis T-504) ✅
# - PR #23: Webhook Implementation ✅
```

### Tasks in Pipeline
- Webhook Deployment auf Render
- GitHub Webhook Configuration
- Production Testing mit echten Chat-Messages
- Monitoring & Alerting Setup

## ⚠️ WICHTIGE HINWEISE

### Credentials & Secrets
```bash
# GitHub App Credentials
App ID: 1878945
Installation ID: 83805063
Private Key: ai-memory-sync-tobias.2025-09-01.private-key.pem

# NIEMALS committen:
- *.pem files
- .env files
- WEBHOOK_SECRET
```

### ENV Variables für Deployment
```env
WEBHOOK_SECRET=<generate with: openssl rand -hex 32>
GITHUB_APP_ID=1878945
GITHUB_INSTALLATION_ID=83805063
GITHUB_PRIVATE_KEY=<base64 encoded private key>
PORT=10000  # Render default
NODE_ENV=production
```

## 🔥 QUICK START für nächste Session

```bash
# 1. Git Status
git pull origin main
git status

# 2. Operator Status
cd tooling/operator
npm run build
npm run start:web  # Test lokal

# 3. Check Deployment Docs
cat docs/deploy-operator-render.md | head -50

# 4. PR Status
"/c/Program Files/GitHub CLI/gh.exe" pr list --limit 5
```

## 📝 SESSION-ENDE CHECKLISTE

Bei Session-Ende IMMER:
- [ ] Session-Log erstellen: `docs/development/SESSION_2025-09-06.md`
- [ ] Diese Datei updaten: `next_chat.md`
- [ ] Wichtige Änderungen committen
- [ ] PR erstellen wenn nötig

## 🎯 MISSION STATUS

**Projekt**: AI Shared Memory - Always-On Operator
**Phase**: Webhook Deployment Ready
**Nächster Milestone**: Production Deployment auf Render

Der Operator ist **feature-complete** und bereit für 24/7 Betrieb! 
Nächster Schritt: Deployment und Webhook-Konfiguration für automatische PR-Verarbeitung.

---

**WICHTIG FÜR NÄCHSTE SESSION**:
1. Diese Datei (`next_chat.md`) zuerst lesen ✅
2. Webhook Deployment Status prüfen
3. Falls deployed: End-to-End Test durchführen
4. Chat-UI unter `/chat/` checken für Messages

**Der Operator wartet auf sein Deployment! 🚀**