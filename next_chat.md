# 🚀 NEXT_CHAT.md - Sofort-Einstieg für nächste Claude Session

**KRITISCH**: Diese Datei IMMER als ERSTES lesen bei Session-Start!
**Stand**: 2025-09-02 14:45
**Letzter Commit**: 2504bc8

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

## 📚 PFLICHT-LEKTÜRE in dieser Reihenfolge

### 1️⃣ Projekt-Kontext verstehen (5 Min)
```bash
# Hauptdokumentation - Was ist das Projekt?
cat CLAUDE.md

# Aktueller Projekt-Status - Welche Tasks gibt es?
cat memory/context.json | jq '.'

# Dokumentations-Index - Wo finde ich was?
cat docs/DOCUMENTATION_INDEX.md
```

### 2️⃣ Letzte Session verstehen (3 Min)
```bash
# Was wurde zuletzt gemacht?
cat docs/development/SESSION_2025-09-02.md

# Welche Anweisungen gibt es für heute?
cat docs/guides/Anweisungen_next_chat.md
```

### 3️⃣ Technische Details (wenn relevant)
```bash
# MCP Server Status und Konfiguration
cat docs/tools/MCP_GITHUB_SERVER.md

# Claude Settings - Wie ist Claude konfiguriert?
cat .claude/settings.json

# GitHub App Credentials Status
ls -la *.pem  # Private Key sollte da sein
cat tooling/github-mcp/.env | grep -v KEY  # Credentials (ohne Key anzeigen)
```

## 🔴 AKTUELLER STATUS

### Git/GitHub
- **Branch**: `feat/web/landing` (3 commits ahead of main)
- **PR #3**: https://github.com/TobiasSpaeth83/ai-shared-memory/pull/3
  - Status: Open, Ready for Review
  - Failing Checks: 2 (nicht kritisch - Schema & Secret Scan)
  - Kann gemerged werden mit Admin Override

### MCP Server
- **Status**: ✅ Konfiguriert und lauffähig
- **Location**: `tooling/github-mcp/dist/index.js`
- **Credentials**: Vollständig in `.env` konfiguriert
- **Private Key**: `ai-memory-sync-tobias.2025-09-01.private-key.pem`

### Offene Tasks aus context.json
```json
{
  "id": "T-101",
  "title": "Create landing.html",
  "owner": "claude",
  "status": "todo"  // Eigentlich done, PR erstellt
}
```

## 🎯 SOFORT-TODOS

### Priorität 1: Cleanup & Merge
```bash
# 1. PR #3 Status checken
"/c/Program Files/GitHub CLI/gh.exe" pr view 3

# 2. Optional: Failing Checks fixen
# - Schema Validation debuggen
# - Secret Scan false positives

# 3. Task T-101 Status updaten
# In memory/context.json: status von "todo" auf "completed"
```

### Priorität 2: MCP Server aktivieren
```bash
# Falls MCP nicht verbunden:
1. Claude Code komplett schließen
2. cd tooling/github-mcp && node dist/index.js  # Test
3. Claude Code neu starten
4. Tippe "/" - sollte GitHub Tools zeigen
```

### Priorität 3: Neue Features
- Operator Agent aktivieren (automatische Task-Abarbeitung)
- Weitere Tasks in context.json definieren
- WebSocket für Real-time Updates

## 🛠️ WICHTIGE BEFEHLE

### GitHub CLI (gh)
```bash
# gh ist NICHT global, verwende vollen Pfad:
alias gh='"/c/Program Files/GitHub CLI/gh.exe"'

# PR Management
gh pr list
gh pr view 3
gh pr checks 3
gh pr merge 3  # Nach Review
```

### MCP Server
```bash
# Build & Test
cd tooling/github-mcp
npm run build
node test-token.js  # Token Test

# Server manuell starten (für Debug)
node dist/index.js
```

### Git Workflow
```bash
# Feature Branch Workflow
git checkout -b feat/[name]
git add -A
git commit -m "type: description"
git push -u origin feat/[name]
gh pr create
```

## ⚠️ BEKANNTE PROBLEME & FIXES

### Problem 1: MCP Server verbindet nicht
```bash
# Fix:
1. Claude Code schließen
2. cd tooling/github-mcp
3. npm install  # Falls node_modules fehlt
4. npm run build
5. node dist/index.js  # Sollte ohne Fehler laufen
6. Claude Code neu starten
```

### Problem 2: gh Command not found
```bash
# Fix: Immer vollen Pfad verwenden
"/c/Program Files/GitHub CLI/gh.exe" [command]
# Oder Alias setzen (siehe oben)
```

### Problem 3: CI Checks failing
```bash
# Nicht kritisch! MCP Server läuft trotzdem
# Details: cat docs/troubleshooting/CI_CHECKS_FAILING.md
```

## 📂 PROJEKT-STRUKTUR ÜBERSICHT

```
ai-shared-memory/
├── 📝 CLAUDE.md                    # Hauptdoku
├── 📝 next_chat.md                 # DIESE DATEI!
├── 📂 .claude/
│   ├── settings.json              # MCP Config ✅
│   └── agents/                    # Sub-Agents ✅
├── 📂 docs/
│   ├── DOCUMENTATION_INDEX.md     # Master-Index
│   ├── guides/
│   │   └── Anweisungen_next_chat.md  # Detaillierte Anweisungen
│   ├── tools/
│   │   └── MCP_GITHUB_SERVER.md   # Server Docs
│   └── development/
│       └── SESSION_2025-09-02.md  # Letzte Session
├── 📂 memory/
│   └── context.json               # Shared Memory (Tasks!)
├── 📂 tooling/
│   └── github-mcp/                # MCP Server ✅
│       ├── dist/index.js          # Compiled Server
│       ├── .env                   # Credentials (NICHT committen!)
│       └── test-token.js          # Test Script
├── 📂 web/
│   ├── landing.html               # Task T-101 ✅
│   ├── style.css                  # ✅
│   └── script.js                  # ✅
└── 🔑 *.private-key.pem           # GitHub App Key (NICHT committen!)
```

## 🔥 QUICK START COMMANDS

```bash
# Kopiere diese Commands für schnellen Start:

# 1. Status Check
pwd && git status && git branch

# 2. Projekt verstehen
cat CLAUDE.md | head -50

# 3. Tasks checken
cat memory/context.json | grep -A3 '"owner": "claude"'

# 4. MCP Test (optional)
cd tooling/github-mcp && node test-token.js && cd ../..

# 5. PR Status
"/c/Program Files/GitHub CLI/gh.exe" pr view 3
```

## 📝 DOKUMENTATIONS-PFLICHT

### Bei Session-Ende IMMER:
1. **Session-Log erstellen**: `docs/development/SESSION_YYYY-MM-DD.md`
2. **Diese Datei updaten**: `next_chat.md` mit neuem Status
3. **Anweisungen updaten**: `docs/guides/Anweisungen_next_chat.md`
4. **Index pflegen**: `docs/DOCUMENTATION_INDEX.md`
5. **Committen**: Alle Änderungen

### Dokumentations-Regeln
```bash
# Vollständige Regeln hier:
cat docs/guides/CLAUDE_DOCUMENTATION_RULES.md
```

## 🎯 MISSION STATEMENT

**Projekt**: AI Shared Memory - Multi-AI Kollaboration via GitHub
**Rolle**: Claude als Primary Developer mit MCP Server Integration
**Ziel**: Tasks aus context.json automatisiert abarbeiten und PRs erstellen

## ✅ CHECKLISTE für produktiven Start

- [ ] next_chat.md gelesen (diese Datei)
- [ ] CLAUDE.md verstanden
- [ ] memory/context.json auf Tasks geprüft
- [ ] MCP Server Status gecheckt (unten rechts in Claude Code)
- [ ] Git Branch Status klar
- [ ] PR #3 Status bekannt
- [ ] Offene Tasks identifiziert

## 🚨 NOTFALL-KONTAKTE

- **Repository**: https://github.com/TobiasSpaeth83/ai-shared-memory
- **PR #3**: https://github.com/TobiasSpaeth83/ai-shared-memory/pull/3
- **GitHub App ID**: 1878945
- **Installation ID**: 83805063

---

**REMEMBER**: 
1. Diese Datei (`next_chat.md`) IMMER zuerst lesen
2. MCP Server muss verbunden sein (Claude Code Neustart wenn nicht)
3. Alle Änderungen via PR (nie direkt zu main)
4. Dokumentation ist Pflicht (Schema beachten)

**VIEL ERFOLG! Die Infrastruktur steht, jetzt kann entwickelt werden! 🚀**