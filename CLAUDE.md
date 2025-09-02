# 🤖 CLAUDE.md - AI Shared Memory Project

**Letzte Aktualisierung**: 2025-09-02  
**Version**: 2.0  
**Projekt**: AI Shared Memory - Kollaborative AI-Entwicklungsplattform

## 🎯 PROJEKT-GRUNDLAGEN

### Zweck
Multi-AI-Kollaboration über GitHub mit Shared Memory (context.json) für koordinierte Aufgabenbearbeitung zwischen Claude, ChatGPT und Menschen.

### Architektur
```
Claude Code <--> MCP Server <--> GitHub API <--> Repository
                                      ↕
                              Shared Memory (context.json)
                                      ↕
                                  ChatGPT/Human
```

## 🚀 WICHTIGE BEFEHLE

### MCP Server
```bash
# Build & Start
cd tooling/github-mcp
npm install && npm run build
node dist/index.js

# Test Installation Token
node test-token.js
```

### GitHub CLI
```bash
# PR erstellen/verwalten
"/c/Program Files/GitHub CLI/gh.exe" pr create
"/c/Program Files/GitHub CLI/gh.exe" pr checks <PR-NUMBER>
"/c/Program Files/GitHub CLI/gh.exe" pr view
```

### Git Workflow
```bash
git checkout -b feat/[feature-name]
git add -A
git commit -m "Detailed message with Task ID"
git push -u origin feat/[feature-name]
```

## 📋 AKTUELLE ENTWICKLUNGS-SCHWERPUNKTE

### Aktive Tasks
- **T-101**: Landing Page ✅ (PR #3 erstellt)
- MCP Server Integration ✅ (läuft)
- CI/CD Workflows ✅ (2 failing, nicht kritisch)

### Nächste Prioritäten
1. PR #3 mergen
2. Weitere Tasks in context.json definieren
3. Operator-Agent mit Task-Abarbeitung testen
4. CI Checks fixen (optional)

## ⚠️ KRITISCHE WARNUNGEN

### NIEMALS
- ❌ Private Keys committen (liegt in Root: `ai-memory-sync-tobias.2025-09-01.private-key.pem`)
- ❌ Direkt zu main pushen (immer PR-Workflow)
- ❌ .env Dateien committen
- ❌ GitHub App Credentials teilen

### IMMER
- ✅ Vor Session: `/docs/guides/Anweisungen_next_chat.md` lesen
- ✅ Tasks aus `memory/context.json` mit owner:"claude" bearbeiten
- ✅ PRs für alle Änderungen erstellen
- ✅ Dokumentation nach Schema in `/docs/DOCUMENTATION_INDEX.md` pflegen

## 📚 DOKUMENTATIONS-REGELN

### Struktur
```
docs/
├── DOCUMENTATION_INDEX.md    # Master-Index (WAHRHEIT)
├── tools/                    # Feature-Dokumentationen
├── troubleshooting/          # Probleme & Lösungen
├── development/              # Session-Logs
├── guides/                   # Anleitungen
│   └── Anweisungen_next_chat.md  # PFLICHT vor jeder Session
└── archive/                  # Alte Dokumente
```

### Dokumentations-Workflow
1. **Bei Session-Start**: 
   - `docs/guides/Anweisungen_next_chat.md` lesen
   - `docs/DOCUMENTATION_INDEX.md` prüfen
   - `memory/context.json` auf Tasks checken

2. **Bei Session-Ende**:
   - Session in `docs/development/SESSION_YYYY-MM-DD.md` dokumentieren
   - `Anweisungen_next_chat.md` für nächste Session updaten
   - Index aktualisieren
   - Alles committen

### Pflicht-Header für Dokumente
```markdown
**Stand**: YYYY-MM-DD  
**Version**: X.Y  
**Status**: DRAFT | AKTUELL | OBSOLET | ARCHIVIERT
**Autor**: Name/Claude
```

## 🔧 KONFIGURATION

### GitHub App
- **App ID**: 1878945
- **Installation ID**: 83805063
- **Private Key**: `ai-memory-sync-tobias.2025-09-01.private-key.pem`

### MCP Server
- **Location**: `tooling/github-mcp/`
- **Config**: `.claude/settings.json`
- **Status**: ✅ Läuft (nach Claude Code Neustart)

### Agents
- **Operator**: Koordination & PR-Erstellung
- **Frontend**: Web-Entwicklung
- **Backend**: API & Services

## 🔍 QUICK LINKS

### Hauptdateien
- [DOCUMENTATION_INDEX.md](docs/DOCUMENTATION_INDEX.md) - Master-Index
- [context.json](memory/context.json) - Shared Memory
- [Anweisungen_next_chat.md](docs/guides/Anweisungen_next_chat.md) - Nächste Session

### Tools & Configs
- [MCP Server Docs](docs/tools/MCP_GITHUB_SERVER.md)
- [Claude Settings](.claude/settings.json)
- [GitHub Workflows](.github/workflows/)

## 📊 PROJEKT-STATUS

### Metriken
- **MCP Server**: ✅ Operational
- **GitHub Integration**: ✅ Connected
- **CI/CD**: ⚠️ 2 Checks failing (nicht kritisch)
- **Dokumentation**: ✅ 100% Coverage

### Offene Punkte
1. CI Checks fixen (Schema Validation, Secret Scan)
2. PR #3 Review & Merge
3. Weitere Claude-Tasks definieren

---

**HINWEIS**: Dies ist die Haupt-Referenz. Details in spezifischen Docs unter `/docs/`. 
**WICHTIG**: Immer erst `/docs/guides/Anweisungen_next_chat.md` lesen!