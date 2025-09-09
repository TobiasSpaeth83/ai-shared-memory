# AI Shared Memory — Projektüberblick & Integrationskonzept

**Stand:** 2025‑09‑06
**Repo:** `TobiasSpaeth83/ai-shared-memory`

---

## 1) Zielbild & Nutzen

**Kurzfristig:** Web‑Research‑Agent („Erster Agent“) + Publishing‑Pfad (Outline → Draft → Artikel/Artefakte).
**Mittelfristig:** Finanzplan‑Agent auf gleicher Plattform (deterministische Engine, Szenarien, Exit‑Checks, Reports).
**Prinzip:** Agents laufen als **Worker/Jobs** (nicht in API‑Routen), mit Persistenz, Idempotenz und harten Qualitäts‑Gates.

**Warum GitHub als Shared Memory?**

* Einheitliche Quelle der Wahrheit: Branches, PRs, Reviews, CI/CD, Deployments.
* Nachvollziehbarkeit & Compliance (Diffs, History, Labels, Checks).
* Einfaches Onboarding (Team, Externe, LLM‑Operatoren).
* Kombinierbar mit „leichtem Dialog“ (direkt via API) **und** „Build/Ship“ (PR‑Flow).

---

## 2) Rollen & Akteure

* **ChatGPT (Architekt):** gibt Aufträge, erstellt Task‑PRs und Chat‑Nachrichten, kuratiert Feedback, schreibt leichte Inhalte.
* **Claude (Operator/Developer):** verarbeitet Aufgaben, implementiert Features/Content, öffnet Feature‑PRs, beantwortet Chat‑Nachrichten.
* **Operator (Tooling):** automatisiert Claude‑Workflows (PR‑Reader, Branch/PR‑Erstellung, Idempotenz, Label‑Gates, optional Webhook/Cron).
* **Team (z. B. Petra):** stellt Tickets/Fragen, reviewt PRs, triggert „Promote to PR“.

---

## 3) Repo‑Konventionen & Bindings

**Hard Binding (Custom GPT):**

* Owner = `TobiasSpaeth83`, Repo = `ai-shared-memory`, Default‑Branch = `main`.
* Pfade wie `site/public/**` sind **im Repo** (kein führender Slash).

**Labels**

* `auto-merge`: PRs mit ausschließlich `site/public/**` werden nach Checks automatisch gemerged.
* `to:claude`: ChatGPT → Claude (Chat‑Bridge Eingang).
* `to:chatgpt`: Claude → ChatGPT (symmetrischer Eingang).

**Struktur (relevant):**

* `site/public/**` → statische Website & Chat‑UI (auto‑deploy).
* `.chat/inbox/from-chatgpt/*.json` → Nachrichten **an Claude**.
* `.chat/outbox/from-claude/*.json` → Antworten **von Claude**.
* `.chat/inbox/from-claude/*.json` / `.chat/outbox/from-chatgpt/*.json` → (optional) Gegenrichtung.
* `.tasks/patches/<taskId>.json` → Task‑Patches (JSON) für Operator.
* `tooling/operator/**` → Operator (PR‑Reader, Branch/PR, Chat‑Bridge).
* `site/public/chat/{index.html,thread.html,app.js,app.css}` → Chat‑Viewer.
* `site/public/chat/data/{thread-index.json,<thread>.json}` → UI‑Daten (von Operator aktualisiert).

---

## 4) Chat‑Bridge v0.1 (Status: **Live**)

**Ablauf (ChatGPT → Claude):**

1. ChatGPT legt PR mit Datei unter `.chat/inbox/from-chatgpt/*.json` (Label `to:claude`).
2. **Operator v1.1.0** verarbeitet PRs direkt (PR‑Reader) **ohne Merge** nach `main` und erzeugt **Reply‑PR** mit `.chat/outbox/from-claude/*.json` (+ optional HTML‑Seite unter `site/public/chat/*`).
3. Preview‑URL wird im Reply‑PR kommentiert.

**Auto‑Merge für Chat‑Inbox (Fallback):**

* Workflow `auto-merge-chat.yml` merged Chat‑PRs mit Label `to:claude` automatisch nach Checks → Main‑Poller kann reagieren, falls PR‑Reader pausiert.

**Chat‑UI:**

* Threads‑Übersicht (`/chat/threads/index.html`) & Thread‑Seiten (`/chat/thread.html?t=<name>`), 15‑Sekunden Auto‑Refresh.
* Daten‑JSONs werden vom Operator bei jeder Verarbeitung aktualisiert.

---

## 5) Content‑Publishing (A1) — Auto‑Merge

**Zweck:** Schnelle Veröffentlichung reiner statischer Inhalte.
**Flow:** PR mit Änderungen **nur** unter `site/public/**` + Label `auto-merge` → Checks grün → GitHub Auto‑Merge (squash) → Seite live.
**Anwendung:** Blogs/Seiten/Previews, z. B. `site/public/blog/warum-deterministische-finanzplanung.html`.

---

## 6) Tasks & Operator‑Pipeline

**Task‑PR (ChatGPT):**

* Branch von `main` → `.tasks/patches/<taskId>.json` (JSON Patch / Auftrag).
* **Kein** Direkt‑Edit von `memory/context.json` in Feature‑PRs (nur Task‑PRs oder Operator).

**Operator (Claude):**

* Liest Tasks/Chat‑PRs → erstellt Feature‑Branch → implementiert → öffnet Feature‑PR (Idempotenz‑Footer, Rate‑Limit, 1 Task gleichzeitig).
* Kommentiert Preview; setzt/löscht Labels nach Prozessstand.

---

## 7) Datenformate (kompakt)

**Chat Message JSON (Inbox/Outbox):**

```json
{
  "from": "chatgpt|claude",
  "to": "claude|chatgpt",
  "type": "chat|review_request|…",
  "thread": "general|web|ops|…",
  "text": "…",
  "ts": "ISO 8601 Europe/Zagreb",
  "session_id": "optional",
  "turn": 1,
  "max_turns": 6,
  "next_actor": "claude|chatgpt"
}
```

**UI Thread‑Daten:**

```json
{
  "messages": [ { "from":"…", "to":"…", "text":"…", "ts":"…" } ]
}
```

**Thread‑Index:**

```json
{ "threads": [ { "name": "general", "count": 2 } ] }
```

---

## 8) Betriebsmodi des Operators

**Lokal (Dev):** Start via Claude Code/Node (schnelle Iteration).
**Service (Empfehlung für Prod):**

* **Webhook‑Service:** Reagiert in Sekunden auf PR‑Events (`to:claude`).
* **Cron‑Worker (Fallback):** Pollt PRs alle 30–60 s (keine offenen Enden bei Webhook‑Störungen).
* **Secrets:** GitHub App (APP\_ID, INSTALLATION\_ID, PRIVATE\_KEY), API‑Keys (Anthropic/OpenAI), optional Realtime (URL/SECRET).

**Sicherheit & Leitplanken:**

* Owner/Repo‑Allowlist, Path‑Allowlist (`.chat/**`, `site/public/**`, `.tasks/patches/**`).
* Label‑Gates (`to:claude`, `auto-merge`).
* Idempotenz (Message‑Hash), Budget‑/Rate‑Limits, Max‑Turns in Sessions, „Pause“‑Label zum Hard‑Stop.

---

## 9) Realtime (optional)

**Heute:** 15‑Sekunden‑Polling im Chat‑UI (simpel, robust).
**Optional:** SSE‑Service (`services/realtime/**`) + Operator‑Hooks (`/emit`) → Live‑Updates in 1–2 s.

* Events: `message.new`, `reply.new`, `data.updated` (Topic `thread:<name>`).
* Auth: Bearer Secret; Clients read‑only.

---

## 10) Hybrid‑Modell: Direkt‑API **plus** GitHub‑Flow

**Dialog‑Only (leicht):** Kleiner Chat‑Broker ruft parallel ChatGPT & Claude (API) und gibt Antworten + Synthese zurück; optional Logging in DB/Notion.
**Promote to PR:** Wenn aus Dialog eine Umsetzung werden soll → Button erzeugt Task‑PR/Chat‑PR → Operator übernimmt (Build/Ship, Review, Deploy).
**Vorteil:** Nutzer immer gleiche Oberfläche; nur bei „baubar/prüfbar“ wechselt man in den PR‑Prozess.

---

## 11) Quickstart‑Checks (für neuen Chat/Projekt)

1. **Repo Binding prüfen** (Owner/Repo/Branch, Labels vorhanden).
2. **Auto‑Merge A1:** PR mit `site/public/**` + `auto-merge` → wird nach Checks gemerged.
3. **Chat‑Bridge:** PR mit `.chat/inbox/from-chatgpt/*.json` + `to:claude` → Operator Reply‑PR mit Preview.
4. **Thread‑UI:** `/chat/threads/index.html` und `/chat/thread.html?t=general` laden und Verlauf sehen.
5. **(Optional) Operator als Service:** Webhook‑Service + Cron‑Worker auf Render/Fly aktivieren.

---

## 12) Roadmap (kurz)

* **SSE Live‑Layer** (Realtime Service + Operator Hooks).
* **Ping‑Pong Sessions** (Handshake‑Felder `session_id`, `turn`, `max_turns`, `next_actor`, Guardrails).
* **Symmetrische Richtung** `to:chatgpt` (Inbox/Outbox & UI).
* **Direct‑API Chat‑Broker** (Ask‑Both, Synthese, Promote‑to‑PR).
* **Finanzplan‑Agent**: deterministische Engine (pure TS), Exit‑Checks (Bilanzidentität, DSCR/ICR), ScenarioAgent, Report‑Export.
* **Security/Härtung**: Webhook‑Signaturen, Secrets‑Rotation, CI‑Policies, Rate‑Limits.

---

## 13) Troubleshooting (häufige Punkte)

* **Operator reagiert nicht:** PR nur im Branch, Operator nur „Main‑Poller“ aktiv → PR mergen **oder** PR‑Reader‑Modus sicherstellen.
* **Auto‑Merge hängt:** Workflow darf nicht auf „alle Checks warten“ inkl. sich selbst; nur **Auto‑Merge einschalten** und beenden.
* **Keine Vorschau:** Render‑Preview‑Kommentar fehlt → Operator kommentieren lassen; Branch‑Deploy auf Render prüfen.
* **Duplikate:** Gleiche `ts` + Text → Idempotenz greift; neuen `ts` setzen.

---

## 14) Anhang — Mini‑Prompts (für Team)

**A1 (Publish schnell):** „Erzeuge PR für `site/public/demos/hello.html` mit H1+Absatz; Label `auto-merge`; kommentiere Preview & Main‑URL.“
**Chat an Claude:** „`.chat/inbox/from-chatgpt/2025‑09‑06‑frage.json` mit *thread=general*, *text=…*, Label `to:claude`, PR öffnen.“
**Inbox lesen (ChatGPT):** „Liste offene PRs mit Label `to:chatgpt` + Auszug + Links.“
**Antwort an Claude:** „Erzeuge Outbox‑JSON `.chat/outbox/from-chatgpt/*.json`, PR mit Label `to:claude`.“

---

**Kurzform Merksatz:**
**Dialog?** Direkt & leicht.
**Bauen/Shippen?** PR‑Flow über Operator.
**UI?** `site/public/**` (Auto‑Merge).
**Chat?** `.chat/inbox/**` + Labels.
**Sicherheit?** Allowlist, Labels, Idempotenz, Secrets.
**Skalierung?** Webhook‑Service + Cron‑Fallback + (optional) SSE.
