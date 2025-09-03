# 📖 Claude AI - Dokumentations-Regeln für AI Shared Memory

**Stand**: 2025-09-02  
**Version**: 1.0  
**Status**: AKTUELL  
**Autor**: Claude (adaptiert von Minerva-Projekt)

## 🎯 GRUNDPRINZIPIEN

1. **Ordnung vor Feature** - Erst dokumentieren, dann entwickeln
2. **Ein Index für alles** - DOCUMENTATION_INDEX.md ist die Wahrheit
3. **Keine Duplikate** - Update statt neu erstellen
4. **Archivierung statt Löschung** - Alles wird archiviert
5. **Anweisungen_next_chat.md** - PFLICHT nach jeder Session

## 📝 DOKUMENTATIONS-WORKFLOW

### Bei Session-Start:
```yaml
1. ZUERST: docs/guides/Anweisungen_next_chat.md lesen
2. Check: docs/DOCUMENTATION_INDEX.md durchgehen
3. Check: memory/context.json auf Tasks prüfen
4. Check: Gibt es obsolete Dokumente zum Archivieren?
```

### Bei neuer Dokumentation:
```yaml
1. Prüfen: Existiert bereits ein Dokument dazu?
   JA → UPDATE des bestehenden Dokuments
   NEIN → Weiter mit Schritt 2
   
2. Ort bestimmen:
   - MCP/Tools → docs/tools/
   - Probleme → docs/troubleshooting/
   - Anleitungen → docs/guides/
   - Session-Logs → docs/development/
   - Alte Docs → docs/archive/YYYY-MM/
   
3. Namensgebung:
   - FEATURE_BESCHREIBUNG.md für Hauptdokumente
   - feature-details.md für Subdokumente
   - SESSION_YYYY-MM-DD.md für Entwicklungs-Logs
   - Anweisungen_next_chat.md IMMER gleich
   
4. Index aktualisieren:
   - docs/DOCUMENTATION_INDEX.md updaten
   - Kategorie zuordnen
   - Version und Status setzen
```

### Bei Session-Ende:
```yaml
1. Session dokumentieren:
   - docs/development/SESSION_YYYY-MM-DD.md erstellen
   - Verlauf, Ergebnisse, Probleme dokumentieren
   
2. Anweisungen updaten:
   - docs/guides/Anweisungen_next_chat.md aktualisieren
   - Offene Punkte klar benennen
   - Nächste Schritte definieren
   
3. Index pflegen:
   - DOCUMENTATION_INDEX.md aktualisieren
   - Neue Docs eintragen
   - Status updaten
   
4. Committen:
   - git add docs/
   - git commit -m "docs: Update documentation for session YYYY-MM-DD"
```

## 📂 DOKUMENTATIONS-STRUKTUR

### Pflicht-Ordner:
```
docs/
├── tools/                          # Feature-Dokumentationen
│   └── MCP_GITHUB_SERVER.md       # MCP Server Docs
├── troubleshooting/                # Probleme & Lösungen
│   └── CI_CHECKS_FAILING.md       # CI Problem Docs
├── development/                    # Entwicklungs-Logs
│   └── SESSION_YYYY-MM-DD.md      # Session-Protokolle
├── guides/                         # Anleitungen
│   ├── Anweisungen_next_chat.md   # PFLICHT - Nächste Session
│   └── CLAUDE_DOCUMENTATION_RULES.md # Diese Datei
├── archive/                        # Archivierte Dokumente
│   └── YYYY-MM/                   # Nach Monat sortiert
└── DOCUMENTATION_INDEX.md          # Master-Index
```

### Dokumenten-Header (PFLICHT):
```markdown
# Titel

**Stand**: YYYY-MM-DD  
**Version**: X.Y  
**Status**: DRAFT | AKTUELL | OBSOLET | ARCHIVIERT
**Autor**: Name/Claude

## Übersicht
[Kurze Beschreibung des Inhalts]
```

## 🔄 UPDATE-REGELN

### Wann UPDATE statt NEU:
- Feature-Erweiterung → UPDATE
- Bug-Fix Dokumentation → UPDATE  
- Neue MCP Tools → UPDATE
- Session-Logs → IMMER NEU
- Anweisungen_next_chat → IMMER UPDATE

### Update-Prozess:
```yaml
1. Original-Dokument lesen
2. Changelog am Ende hinzufügen
3. Version hochzählen (X.Y → X.Y+1)
4. Stand-Datum aktualisieren
5. Index aktualisieren
```

### Changelog-Format:
```markdown
## 🔄 Changelog

### Version X.Y - YYYY-MM-DD
- Added: Neue Features
- Changed: Änderungen
- Fixed: Behobene Probleme
- Removed: Entfernte Features
```

## 🗄️ ARCHIVIERUNGS-REGELN

### Wann archivieren:
- Problem gelöst und dokumentiert → Nach 30 Tagen
- Feature deprecated → Sofort
- Alte Session-Logs → Nach 30 Tagen
- Obsolete Guides → Nach Review

### Archivierungs-Prozess:
```bash
# 1. Archiv-Ordner erstellen (falls nicht vorhanden)
mkdir -p docs/archive/2025-09

# 2. Dokument verschieben
mv docs/tools/OBSOLETE_DOC.md docs/archive/2025-09/

# 3. Index aktualisieren
# In DOCUMENTATION_INDEX.md als ARCHIVIERT markieren
```

### Niemals archivieren:
- DOCUMENTATION_INDEX.md
- CLAUDE.md
- Anweisungen_next_chat.md
- CLAUDE_DOCUMENTATION_RULES.md
- Aktuelle Tool-Dokumentationen

## 📋 SPEZIAL: Anweisungen_next_chat.md

### PFLICHT-Inhalte:
```markdown
1. SOFORT-CHECKS bei Session-Start
   - MCP Server Status
   - Git Branch Status
   - Offene PRs

2. OFFENE TASKS
   - Priorität 1: Kritische Fixes
   - Priorität 2: Tasks aus context.json
   - Priorität 3: Nice-to-have

3. AKTUELLE KONFIGURATION
   - GitHub App Credentials
   - MCP Server Status
   - Verfügbare Tools

4. BEKANNTE PROBLEME
   - Was ist kaputt?
   - Workarounds

5. NÄCHSTE SCHRITTE
   - Quick Wins
   - Größere Tasks
```

### Update-Zeitpunkt:
- IMMER am Session-Ende
- Bei kritischen Änderungen sofort
- Nach PR Merge
- Nach größeren Implementierungen

## 🚨 KRITISCHE REGELN

### NIEMALS:
- ❌ Dokumente ohne Index-Update erstellen
- ❌ Anweisungen_next_chat.md vergessen zu updaten
- ❌ Session ohne Dokumentation beenden
- ❌ Credentials in Dokumentation schreiben
- ❌ CLAUDE.md ohne Backup ändern

### IMMER:
- ✅ Anweisungen_next_chat.md als ERSTES lesen
- ✅ DOCUMENTATION_INDEX.md als Referenz nutzen
- ✅ Header mit Metadaten in jedem Dokument
- ✅ Changelog bei wichtigen Updates
- ✅ Session-Log erstellen

## 📊 QUALITÄTS-CHECKS

### Vor Session-Ende prüfen:
- [ ] Anweisungen_next_chat.md aktualisiert?
- [ ] Session-Log erstellt?
- [ ] Alle neuen Dokumente im Index?
- [ ] Obsolete Dokumente archiviert?
- [ ] CLAUDE.md aktualisiert wenn nötig?
- [ ] Alles committed?

## 🔍 SUCH-STRATEGIE

### Dokument finden:
```bash
1. Check DOCUMENTATION_INDEX.md
2. grep -r "suchbegriff" docs/
3. find docs -name "*keyword*"
4. Check archive/ wenn nicht gefunden
```

### Prioritäts-Reihenfolge:
1. docs/guides/Anweisungen_next_chat.md (IMMER ZUERST!)
2. docs/DOCUMENTATION_INDEX.md
3. CLAUDE.md
4. memory/context.json
5. Spezifische Docs nach Bedarf

## 🆘 NOTFALL-PROZESS

### Bei Dokumentations-Chaos:
```bash
1. Backup erstellen
   cp -r docs/ docs.backup/

2. Index neu generieren
   find docs -name "*.md" | sort > temp_index.txt

3. Duplikate identifizieren
   find docs -name "*.md" -exec basename {} \; | sort | uniq -d

4. Anweisungen_next_chat.md wiederherstellen
   # Dies ist das wichtigste Dokument!

5. Session-Log mit Chaos-Behebung erstellen
```

---

**Diese Regeln sind verbindlich für alle Claude AI Sessions im AI Shared Memory Projekt.**
**Bei Unsicherheit: Erst Anweisungen_next_chat.md lesen, dann handeln!**

## 🔄 Changelog

### Version 1.0 - 2025-09-02
- Initial: Adaptiert von Minerva-Projekt
- Added: Spezial-Sektion für Anweisungen_next_chat.md
- Added: AI Shared Memory spezifische Anpassungen