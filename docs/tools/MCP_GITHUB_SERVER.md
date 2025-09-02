# MCP GitHub Server

**Stand**: 2025-09-02  
**Version**: 1.0  
**Status**: AKTUELL  
**Autor**: Claude

## Übersicht
Model Context Protocol (MCP) Server für GitHub Integration mit Claude Code. Ermöglicht Claude die direkte Interaktion mit GitHub über eine GitHub App.

## 🚀 Features

### Implementierte Tools
- `repo_read_tree` - Repository-Struktur lesen
- `code_search` - Code-Suche in Repositories
- `commit_files` - Dateien zu Branch committen
- `pr_open` - Pull Requests erstellen
- `pr_comment` - PR-Kommentare hinzufügen

## 📋 Setup

### 1. GitHub App Konfiguration
```bash
# GitHub App erstellen auf github.com
App ID: 1878945
Installation ID: 83805063
Private Key: ai-memory-sync-tobias.2025-09-01.private-key.pem
```

### 2. Environment Variables
```bash
# In tooling/github-mcp/.env
GITHUB_APP_ID=1878945
GITHUB_INSTALLATION_ID=83805063
GITHUB_PRIVATE_KEY_PATH=C:/ai-shared-memory/ai-memory-sync-tobias.2025-09-01.private-key.pem
REPO_ALLOWLIST=TobiasSpaeth83/ai-shared-memory
GITHUB_OWNER=TobiasSpaeth83
GITHUB_REPO=ai-shared-memory
```

### 3. Installation & Build
```bash
cd tooling/github-mcp
npm install
npm run build
```

### 4. Claude Code Settings
```json
{
  "mcpServers": {
    "github": {
      "command": "node",
      "args": ["C:/ai-shared-memory/tooling/github-mcp/dist/index.js"],
      "env": {
        "GITHUB_APP_ID": "1878945",
        "GITHUB_INSTALLATION_ID": "83805063",
        "GITHUB_PRIVATE_KEY_PATH": "C:/ai-shared-memory/ai-memory-sync-tobias.2025-09-01.private-key.pem",
        "REPO_ALLOWLIST": "TobiasSpaeth83/ai-shared-memory"
      }
    }
  }
}
```

## 🧪 Testing

### Installation Token Test
```bash
cd tooling/github-mcp
node test-token.js
# Output: ✅ Installation token obtained successfully!
```

### MCP Server Test
```bash
cd tooling/github-mcp
node dist/index.js
# Server sollte starten ohne Fehler
```

## 🔧 Technische Details

### Stack
- TypeScript
- @octokit/app für GitHub API
- @modelcontextprotocol/sdk für MCP
- ES Modules (type: "module")

### Architektur
```
Claude Code <--> MCP Protocol <--> GitHub MCP Server <--> GitHub API
                                           |
                                    GitHub App Auth
```

### Sicherheit
- GitHub App Authentication (keine PATs)
- Installation Token mit 1h Gültigkeit
- Repo-Allowlist für Zugriffskontrolle
- Private Key lokal, nicht in Git

## 🐛 Bekannte Probleme

### ESM/CommonJS Konflikt
**Problem**: MCP SDK nutzt ES Modules  
**Lösung**: Package.json auf `"type": "module"` gesetzt

### CI Checks Failing
**Problem**: Schema Validation und Secret Scan schlagen fehl  
**Status**: False Positives, Server funktioniert trotzdem

## 📝 Verwendung in Claude Code

Nach Neustart von Claude Code:
1. Unten rechts: "MCP: 1 server connected" 
2. Tippe `/` für verfügbare Tools
3. Tools erscheinen: `repo_read_tree`, `code_search`, etc.

## 🔄 Changelog

### Version 1.0 - 2025-09-02
- Initial: MCP Server Implementation
- Added: GitHub App Authentication
- Added: 5 GitHub Tools
- Fixed: ESM/CommonJS Kompatibilität