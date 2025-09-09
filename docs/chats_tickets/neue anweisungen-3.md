Perfekt — hier sind die **konkreten Tickets für „Step 1: Always-On Operator“**. Du kannst sie 1:1 an deinen Custom-GPT geben (je Ticket ein Task-PR + optional eine Chat-Nachricht an Claude).
Ich habe dir pro Ticket ein **Task-PR-JSON** (Datei unter `.tasks/patches/<ID>.json`) und eine **optionale Chat-Message** (Datei unter `.chat/inbox/from-chatgpt/...`) vorbereitet.

---

## T-501 — Operator **Server-Mode (Webhook)**

**Ziel**: Der Operator verarbeitet PR-Events in Sekunden (nicht nur lokal), inkl. HMAC-Signatur-Prüfung.

**Änderungen (erwartet)**

* `tooling/operator/src/server.ts` (Express-Webhook `/webhook`, `/health`).
* Re-Use der bestehenden Prozessfunktionen (PR-Reader), kein Rewrite.
* `package.json` Scripts: `"start:web": "node dist/server.js"`.
* Doku: `docs/webhooks.md` (Endpoint, Secrets, Events, Test).

**Akzeptanzkriterien**

* `/health` liefert `{ ok: true }`.
* `/webhook` akzeptiert `pull_request`-Events (opened, labeled, synchronize, reopened).
* **HMAC** (`X-Hub-Signature-256`) wird geprüft (Secret aus `WEBHOOK_SECRET`).
* Owner/Repo/Path **Allowlist** greift (nur `.chat/**`, `.tasks/patches/**`, `site/public/**`).
* Idempotenz & Label-Gates (`to:claude`) werden respektiert.
* Logs markieren Event-ID und Entscheidung (processed/skipped).

**Testplan**

* GitHub „Ping“ → 200 OK, Log mit Delivery-ID.
* PR mit `.chat/inbox/from-chatgpt/*.json` + `to:claude` → **Reply-PR** in < 10 s.

**Task-PR JSON (`.tasks/patches/T-501.json`)**

```json
{
  "id": "T-501",
  "title": "Operator Webhook Server-Mode",
  "owner": "claude",
  "status": "todo",
  "description": "Implementiere einen Express-Webserver für GitHub Webhooks mit HMAC-Verifikation. Route /webhook verarbeitet pull_request Events (opened, labeled, synchronize, reopened) und ruft die bestehende PR-Reader-Logik auf. /health liefert ok.",
  "acceptance": [
    "/health -> { ok: true }",
    "Webhook prüft X-Hub-Signature-256 mit WEBHOOK_SECRET",
    "Nur erlaubte Owner/Repo/Paths werden verarbeitet",
    "Label 'to:claude' ist Gate für Chat-PRs",
    "Idempotenz & Logs vorhanden"
  ],
  "output": {
    "paths": [
      "tooling/operator/src/server.ts",
      "tooling/operator/package.json",
      "docs/webhooks.md"
    ]
  }
}
```

**Optionale Chat-Message (`.chat/inbox/from-chatgpt/2025-09-06-t501.json`)**

```json
{
  "from": "chatgpt",
  "to": "claude",
  "type": "chat",
  "thread": "ops",
  "text": "Bitte T-501 umsetzen: Webhook-Server /webhook + /health inkl. HMAC-Check. Doku in docs/webhooks.md, idempotent.",
  "ts": "2025-09-06T10:00:00+02:00"
}
```

---

## T-502 — **Deployment auf Render** (Web Service)

**Ziel**: Operator läuft dauerhaft als Service.

**Änderungen (erwartet)**

* Deployment-Instruktion `docs/deploy-operator-render.md`.
* Start-Cmd: `npm i && npm run build` / `npm run start:web`.
* ENV: `WEBHOOK_SECRET`, `GITHUB_APP_ID`, `GITHUB_INSTALLATION_ID`, `GITHUB_PRIVATE_KEY` (Base64), `ANTHROPIC_API_KEY` (falls benötigt).
* Healthcheck-URL dokumentiert.

**Akzeptanzkriterien**

* Render-Web-Service läuft und `/health` ist erreichbar.
* Logs zeigen verarbeitete Events.
* Kein Secret im Repo; alles via Service-ENV.

**Task-PR JSON (`.tasks/patches/T-502.json`)**

```json
{
  "id": "T-502",
  "title": "Deploy Operator to Render",
  "owner": "claude",
  "status": "todo",
  "description": "Dokumentiere und automatisiere das Deployment des Operator-Webhooks als Render Web Service (Root tooling/operator).",
  "acceptance": [
    "Dokumentation unter docs/deploy-operator-render.md",
    "ENV-Liste mit Beschreibung und Sicherheits-Hinweisen",
    "Healthcheck-URL dokumentiert",
    "Start/Build Kommandos geprüft"
  ],
  "output": {
    "paths": [
      "docs/deploy-operator-render.md"
    ]
  }
}
```

**Optionale Chat-Message (`.chat/inbox/from-chatgpt/2025-09-06-t502.json`)**

```json
{
  "from": "chatgpt",
  "to": "claude",
  "type": "chat",
  "thread": "ops",
  "text": "Bitte T-502: Operator auf Render deployen und Dokumentation ergänzen. ENV-Variablen auflisten.",
  "ts": "2025-09-06T10:02:00+02:00"
}
```

---

## T-503 — **GitHub Webhook** einrichten & verifizieren

**Ziel**: GitHub sendet PR-Events zuverlässig an den Operator.

**Änderungen (erwartet)**

* Update `docs/webhooks.md`: Schritt-für-Schritt Setup im Repo („Settings → Webhooks“), Events: *Pull requests*.
* Secret setzen und mit Render-ENV synchronisieren.
* Self-Test: Ping-Event zeigt 200 OK + Log.
* Optional: Screenshot/Beispiel-Payload in Docs.

**Akzeptanzkriterien**

* Webhook in Repo aktiv, „Recent Deliveries“ zeigen 2xx.
* Dummy-PR mit `to:claude` triggert Verarbeitung (Reply-PR erscheint).
* Fehlerfälle (falsche Signatur) werden 401 abgewiesen (Log sichtbar).

**Task-PR JSON (`.tasks/patches/T-503.json`)**

```json
{
  "id": "T-503",
  "title": "Configure GitHub Webhook for Operator",
  "owner": "claude",
  "status": "todo",
  "description": "Richte den Webhook für pull_request-Events ein, verifiziere HMAC und dokumentiere die Schritte.",
  "acceptance": [
    "Webhook aktiv mit Secret",
    "Ping 200 OK, Delivery protokolliert",
    "PR mit to:claude wird verarbeitet",
    "401 bei invalidem Signature-Test"
  ],
  "output": {
    "paths": [
      "docs/webhooks.md"
    ]
  }
}
```

**Optionale Chat-Message (`.chat/inbox/from-chatgpt/2025-09-06-t503.json`)**

```json
{
  "from": "chatgpt",
  "to": "claude",
  "type": "chat",
  "thread": "ops",
  "text": "Bitte T-503: GitHub Webhook im Repo einrichten, Secret synchronisieren, Ping testen, Doku updaten.",
  "ts": "2025-09-06T10:04:00+02:00"
}
```

---

## T-504 — **Cron-Fallback** (Polling alle 30–60 s) — *P1/Optional*

**Ziel**: Falls Webhooks ausfallen, werden `to:claude`-PRs trotzdem zeitnah abgearbeitet.

**Änderungen (erwartet)**

* `tooling/operator/src/cron.ts` (Poll-Loop) + Script `"start:cron"`.
* Doku: `docs/cron-fallback.md` (Runbook, Limits).
* Option: Render „Background Worker“ oder GitHub Actions `schedule`.

**Akzeptanzkriterien**

* Cron verarbeitet offene `to:claude`-PRs binnen ≤60 s (wenn Webhook aus).
* Rate-Limit & Idempotenz greifen, keine Doppelverarbeitung.

**Task-PR JSON (`.tasks/patches/T-504.json`)**

```json
{
  "id": "T-504",
  "title": "Cron Fallback for Operator",
  "owner": "claude",
  "status": "todo",
  "description": "Implementiere einen Poll-Worker, der periodisch PRs mit Label 'to:claude' verarbeitet, falls der Webhook ausfällt.",
  "acceptance": [
    "start:cron Script verfügbar",
    "Polling-Intervall konfigurierbar (ENV)",
    "Keine Doppelverarbeitung (Idempotenz)",
    "Dokumentation des Fallbacks"
  ],
  "output": {
    "paths": [
      "tooling/operator/src/cron.ts",
      "tooling/operator/package.json",
      "docs/cron-fallback.md"
    ]
  }
}
```

**Optionale Chat-Message (`.chat/inbox/from-chatgpt/2025-09-06-t504.json`)**

```json
{
  "from": "chatgpt",
  "to": "claude",
  "type": "chat",
  "thread": "ops",
  "text": "Bitte T-504: Cron-Fallback implementieren (PR-Polling bis Webhook läuft stabil).",
  "ts": "2025-09-06T10:06:00+02:00"
}
```

---

### Hinweise (für Claude/Operator)

* **Security**:

  * Webhook **nur** `pull_request` verarbeiten; andere Events 204/skip.
  * HMAC prüfen, bei Fehler 401 + Log.
  * **Allowlist** Owner/Repo/Paths/Labels.
  * Keine Secrets in Logs.

* **Idempotenz**:

  * Message-Hash (Dateiinhalt + Pfad + ts) im PR-Body/Fußnote festhalten und vergleichen.

* **Observability**:

  * Jede Delivery-ID loggen; Outcome: processed|skipped + Reason.
  * `/health` einfach; später `/metrics` möglich.

---

### Was du jetzt tun kannst

* Nimm Ticket **T-501** + **T-502** + **T-503** (Pflicht) und **T-504** (optional) und gib sie deinem Custom-GPT (erst Task-PRs anlegen, dann Chat-Messages an Claude hinzufügen).
* Sobald **T-503** durch ist, kannst du „**Claude, erstelle Landingpage**“ als nächsten inhaltlichen Test fahren — er reagiert dann **ohne** dein lokales Setup.
