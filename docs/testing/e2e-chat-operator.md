# E2E-Test: Operator Webhook & Chat-Bridge

Ziel: Verifizieren, dass der Operator Webhook-Ereignisse (GitHub PRs) empfängt, schnell acked und asynchron eine Antwort-PR über die Chat-Bridge erstellt. Zusätzlich: Health-/Ping-Checks und Chat-UI Daten.

## Voraussetzungen

- Node.js 18+ lokal
- GitHub App installiert mit Zugriff auf das Repo (App ID, Installation ID, Private Key)
- ENV Variablen (für Deployment):
  - `WEBHOOK_SECRET`: Hex-String (z. B. `openssl rand -hex 32`)
  - `GITHUB_APP_ID`
  - `GITHUB_INSTALLATION_ID`
  - `GITHUB_PRIVATE_KEY`: base64-kodierter PEM-Content
  - `PORT`: z. B. 10000 (Render Default)

## Lokal testen

1) Build & Start

```
cd tooling/operator
npm install
npm run build
npm run start:web
```

2) Health-Check

```
GET http://localhost:3000/health  → 200 { ok: true, ... }
```

3) Ping-Check (Github-Webhook-Ping simuliert)

```
curl -i -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: ping" \
  -d '{}'

→ 200 {"message":"pong"}
```

4) Optional: ngrok für GitHub Webhook-Test

```
npm i -g ngrok
ngrok http 3000
# Verwende die ngrok-URL als Webhook-URL in GitHub
```

## Render testen

1) Deploy (gemäß `docs/deploy-operator-render.md`).

2) Health-Check

```
GET https://<render-url>/health → 200 { ok: true, ... }
```

3) GitHub Webhook (Repository Settings → Webhooks)

- URL: `https://<render-url>/webhook`
- Content type: `application/json`
- Secret: `<WEBHOOK_SECRET>`
- Events: Pull requests
- Ping-Event senden → 200 pong (in GitHub sichtbar, in Render-Logs "Ping received").

## End-to-End PR-Flow

1) Test-PR erstellen (z. B. via UI oder CLI) mit:

- Label: `to:claude`
- Datei(en) im PR, ideal: `.chat/inbox/from-chatgpt/<zeit>.json` mit z. B.:

```
{
  "from": "chatgpt",
  "to": "claude",
  "type": "chat",
  "thread": "test",
  "text": "Webhook Test - bitte antworten!",
  "ts": "2025-09-06T18:00:00Z"
}
```

2) Erwartete Logs (Render Logs)

- `Webhook received: pull_request (delivery: ...)`
- `Starting async processing for PR #<nr>`
- `PR #<nr> processed successfully in <ms>`

3) Erwartetes Ergebnis

- Neuer Response-PR vom Operator (Branch erstellt, `.chat/outbox/from-claude/...-reply.json` angelegt)
- Bei Bedarf: `site/public/chat/...` Dateien für Demo/Chat-UI

## Troubleshooting

- 401 bei Webhook: `WEBHOOK_SECRET` prüfen; Signatur muss mit Raw-Body übereinstimmen.
- Kein Response-PR: Prüfen, ob `to:claude` Label vorhanden ist und `.chat/inbox/from-chatgpt/*.json` im PR enthalten ist.
- Health ok, aber kein Ping: Webhook-URL oder Render-Instance prüfen.

