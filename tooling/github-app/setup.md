# GitHub App Setup Guide

## Schritt 1: GitHub App erstellen (10 Min)

1. **Navigiere zu:** https://github.com/settings/apps
2. **Klicke:** "New GitHub App"

### Formular ausfüllen:

**Grundeinstellungen:**
- **GitHub App name:** AI-Memory-Sync-Tobias
- **Description:** Shared memory sync for AI agents
- **Homepage URL:** https://github.com/TobiasSpaeth83/ai-shared-memory

**Webhook:**
- **Webhook URL:** [LEER LASSEN]
- **Webhook Active:** ☐ DEAKTIVIERT

**Permissions (Repository permissions):**
- ✅ **Contents:** Read & Write
- ✅ **Issues:** Read & Write  
- ✅ **Pull requests:** Read & Write
- ✅ **Actions:** Read
- ✅ **Metadata:** Read

**Installation:**
- **Where can this app be installed:** Only on this account

### Nach Erstellung:

⚠️ **WICHTIG:** 
1. Klicke "Generate a private key" → `.pem` Datei wird heruntergeladen
2. Speichere die `.pem` Datei als: `tooling/github-app/private-key.pem`

**Notiere dir:**
- [ ] **App ID:** _____________________ (steht oben, z.B. 987654)
- [ ] **Client ID:** _____________________ (falls angezeigt)

## Schritt 2: App installieren

1. **In der GitHub App Seite:** Klicke "Install App"
2. **Wähle:** `ai-shared-memory` Repository
3. **Klicke:** "Install"
4. **Notiere dir die Installation ID:** _____________________ 
   (findest du in der URL nach `/installations/`)

## Schritt 3: Konfiguration vervollständigen

1. Kopiere `config.template.json` zu `config.json`:
   ```bash
   cp tooling/github-app/config.template.json tooling/github-app/config.json
   ```

2. Fülle die Werte in `config.json` aus:
   - `app_id`: Deine App ID von Schritt 1
   - `client_id`: Deine Client ID von Schritt 1
   - `installation_id`: Deine Installation ID von Schritt 2

3. Verschiebe die `.pem` Datei:
   ```bash
   mv ~/Downloads/*.pem tooling/github-app/private-key.pem
   ```

## Schritt 4: Teste die Installation

```bash
# Installiere Dependencies (falls noch nicht geschehen)
cd tooling/github-app
npm install @octokit/app

# Teste die Verbindung
node test-connection.js
```

## Schritt 5: Sage ChatGPT "GO"

Wenn alle Schritte erfolgreich waren, kannst du ChatGPT mitteilen:
- App ID: [DEINE_APP_ID]
- Installation ID: [DEINE_INSTALLATION_ID]
- Status: ✅ GitHub App erfolgreich erstellt und installiert

## Troubleshooting

- **Problem:** Private Key nicht gefunden
  - **Lösung:** Stelle sicher, dass die `.pem` Datei in `tooling/github-app/` liegt

- **Problem:** Keine Berechtigung
  - **Lösung:** Überprüfe die Permissions in der GitHub App Einstellung

- **Problem:** Installation ID nicht sichtbar
  - **Lösung:** Nach Installation findest du sie in: Settings → Installations → Configure