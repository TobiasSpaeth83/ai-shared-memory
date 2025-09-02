# 📋 Anweisungen für nächste Claude Session

**Stand**: 2025-09-02  
**Version**: 1.0  
**Status**: AKTUELL  
**Autor**: Claude
**Priorität**: HOCH - ZUERST LESEN!

## 🚨 SOFORT-CHECKS bei Session-Start

### 1. MCP Server Status
```bash
# Prüfen ob MCP Server verbunden ist
# Unten rechts in Claude Code sollte stehen: "MCP: 1 server connected"
# Falls nicht: Claude Code neu starten
```

### 2. Aktuelle Branch prüfen
```bash
git status
# Aktuell: feat/web/landing (uncommitted: .claude/settings.local.json, test-gh-auth.sh)
# Diese können committed oder ignoriert werden
```

### 3. PR Status
- **PR #3**: https://github.com/TobiasSpaeth83/ai-shared-memory/pull/3
- **Status**: Open, 2 failing checks (nicht kritisch)
- **Action**: Review anfordern oder mergen

## 📋 OFFENE TASKS

### Priorität 1: PR #3 abschließen
```bash
# Option A: Failing checks fixen
1. Schema Validation debuggen
2. Secret Scan false positives beheben

# Option B: Mit Admin-Rights mergen
# Checks sind nicht kritisch, MCP Server läuft
```

### Priorität 2: Tasks aus context.json
```bash
# Check for Claude tasks
cat memory/context.json | grep -A2 '"owner": "claude"'
# Aktuell: T-101 (status: "todo" - aber PR bereits erstellt)
```

### Priorität 3: Neue Features
- Weitere Sub-Agents definieren
- Task-Automation implementieren
- WebSocket-Integration für Real-time Updates

## 🛠️ AKTUELLE KONFIGURATION

### GitHub App
```bash
App ID: 1878945
Installation ID: 83805063
Private Key: ai-memory-sync-tobias.2025-09-01.private-key.pem (im Root)
```

### MCP Server
```bash
Status: ✅ Läuft
Location: tooling/github-mcp/dist/index.js
Config: .claude/settings.json (bereits konfiguriert)
```

### Verfügbare MCP Tools
Nach `/` in Claude Code:
- `repo_read_tree` - Repo-Struktur lesen
- `code_search` - Code suchen
- `commit_files` - Dateien committen
- `pr_open` - PR erstellen
- `pr_comment` - PR kommentieren

## ⚠️ BEKANNTE PROBLEME

### 1. CI Checks Failing
- **Problem**: Schema Validation und Secret Scan
- **Impact**: Low - MCP Server funktioniert
- **Fix**: Optional, siehe [CI_CHECKS_FAILING.md](../troubleshooting/CI_CHECKS_FAILING.md)

### 2. Uncommitted Files
```bash
.claude/settings.local.json  # Kann committed werden
test-gh-auth.sh              # Test-Script, kann gelöscht werden
tooling/github-mcp/.env      # NIEMALS committen!
```

## 📚 WICHTIGE DOKUMENTATION

### Must-Read
1. [DOCUMENTATION_INDEX.md](../DOCUMENTATION_INDEX.md) - Master-Index
2. [MCP_GITHUB_SERVER.md](../tools/MCP_GITHUB_SERVER.md) - Server Details
3. [SESSION_2025-09-02.md](../development/SESSION_2025-09-02.md) - Was bisher geschah

### Reference
- [CLAUDE.md](../../CLAUDE.md) - Hauptdokumentation
- [context.json](../../memory/context.json) - Shared Memory
- [GitHub App Setup](../../docs/github-app-setup.md) - App Config

## 🎯 NÄCHSTE SCHRITTE (Empfohlen)

### Quick Wins
1. **Uncommitted files aufräumen**
   ```bash
   git add .claude/settings.local.json
   git commit -m "Add local Claude settings"
   rm test-gh-auth.sh  # Nicht mehr benötigt
   ```

2. **Task T-101 Status updaten**
   ```json
   // In context.json: T-101 status von "todo" auf "in_review" ändern
   ```

3. **PR #3 Feedback einholen**
   ```bash
   gh pr view 3 --web  # Im Browser öffnen
   ```

### Größere Tasks
1. **Operator Agent aktivieren**
   - Agent soll context.json monitoren
   - Automatisch Tasks mit owner:"claude" bearbeiten
   - PRs erstellen für Lösungen

2. **CI/CD Pipeline verbessern**
   - Failing checks debuggen
   - HTML/CSS Linting für Landing Pages
   - Lighthouse Performance Tests

3. **Weitere Tasks definieren**
   - In context.json neue Tasks für Claude anlegen
   - ChatGPT um Architektur-Tasks bitten
   - Human Review Process definieren

## 💡 TIPPS

### MCP Server Debugging
```bash
# Wenn MCP nicht verbindet:
1. Claude Code komplett schließen
2. Terminal öffnen: cd tooling/github-mcp
3. Test: node dist/index.js (sollte laufen ohne Fehler)
4. Claude Code neu starten
5. Unten rechts checken: "MCP: 1 server connected"
```

### Git Best Practices
```bash
# Immer Feature-Branch nutzen
git checkout -b feat/[feature-name]

# Atomic Commits
git add -p  # Interaktiv Änderungen stagen

# PR Description Template nutzen
# Siehe .github/pull_request_template.md
```

## 📝 SESSION-ENDE CHECKLIST

Vor Beenden der Session:
- [ ] Diese Datei updaten für nächste Session
- [ ] Session-Log in `docs/development/SESSION_YYYY-MM-DD.md` erstellen
- [ ] DOCUMENTATION_INDEX.md aktualisieren
- [ ] Uncommitted changes committen oder dokumentieren
- [ ] PR-Status in GitHub checken

---

**WICHTIG**: Diese Datei ist der Startpunkt jeder neuen Session. 
**IMMER** zuerst lesen und befolgen!

## 🔄 Changelog

### Version 1.0 - 2025-09-02
- Initial: Anweisungen nach MCP Server Implementation
- Added: Offene Tasks und bekannte Probleme
- Added: Quick Wins und nächste Schritte