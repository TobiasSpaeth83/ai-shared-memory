erfekt — ich gebe dir alles „zum Reinkopieren“:

Ergänzungen für deinen Custom-GPT (Instructions + neue Actions).

1× Workflow-Datei für Auto-Merge.

Prompts für die beiden Tests (A1 & Chat-Bridge).

Auftragstext an Claude (DoD).

README-Mini für Mitarbeitende.

1) Custom-GPT – Instructions (Block zum Ersetzen/Ergänzen)

Füge diesen Zusatz unter deinen bestehenden REPO-BINDING-Block:

PUBLISH & PREVIEWS:
- Prefer PRs. For content under "site/public/**", set the label "auto-merge" on the PR so it merges automatically after checks.
- Never edit "memory/context.json" directly in Feature-PRs. Only in Task-PRs or via the Operator.
- For "Fast publish" requests: direct commit to main is allowed ONLY for files under "site/public/**" (HTML/CSS/JS), max 200 KB, no secrets, and never edit memory/context.json. Otherwise open a PR.

LABELING:
- When you create a PR that only modifies "site/public/**", add the label "auto-merge".
- When you create a PR that is a Chat-Bridge message to Claude, add the label "to:claude".

CHAT-BRIDGE (v0.1):
- Messages are JSON files stored in ".chat/inbox/from-chatgpt/*.json".
- Schema:
  {
    "from": "chatgpt",
    "to": "claude",
    "type": "chat",
    "thread": "general",
    "text": "<message>",
    "ts": "<ISO 8601 Europe/Berlin>"
  }
- Create a PR with the new file and apply the label "to:claude".
- Do NOT modify memory/context.json for chat messages.

IDEMPOTENCY:
- If a change results in no file diff, do not open a PR; post a comment "No changes".

2) Custom-GPT – Actions/OpenAPI (Erweiterungen)

Du hast das Repo bereits hart gebunden. Ergänze diese Pfade in deinem OpenAPI-Schema:

components:
  schemas:
    MergePull:
      type: object
      properties:
        commit_title:   { type: string }
        commit_message: { type: string }
        merge_method:
          type: string
          enum: [merge, squash, rebase]
          default: squash
        sha:            { type: string }
    AddLabels:
      type: object
      required: [labels]
      properties:
        labels:
          type: array
          items: { type: string }

paths:
  /repos/TobiasSpaeth83/ai-shared-memory/pulls/{number}/merge:
    put:
      operationId: mergePull
      summary: Merge an open PR (bound repo)
      parameters:
        - in: path
          name: number
          required: true
          schema: { type: integer }
      requestBody:
        required: false
        content:
          application/json:
            schema: { $ref: "#/components/schemas/MergePull" }
      responses:
        "200": { description: merged }
        "405": { description: not mergeable }
        "409": { description: sha mismatch / head changed }

  /repos/TobiasSpaeth83/ai-shared-memory/issues/{number}/labels:
    post:
      operationId: addLabels
      summary: Add labels to a PR/Issue (creates labels if missing)
      parameters:
        - in: path
          name: number
          required: true
          schema: { type: integer }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/AddLabels" }
      responses:
        "200": { description: ok }


(Deine bestehenden Endpunkte getRef, createRef, upsertContent, createPull, commentIssue bleiben wie sie sind.)

3) Repo-Workflow für Auto-Merge (einmalig ins Repo)

Datei: .github/workflows/auto-merge-site.yml

name: Auto-merge site/public PRs
on:
  pull_request:
    types: [opened, synchronize, labeled, reopened]
    paths:
      - 'site/public/**'
permissions:
  contents: write
  pull-requests: write
jobs:
  auto_merge:
    if: contains(github.event.pull_request.labels.*.name, 'auto-merge')
    runs-on: ubuntu-latest
    steps:
      - name: Wait for checks to be green
        uses: lewagon/wait-on-check-action@v1.3.3
        with:
          ref: ${{ github.event.pull_request.head.sha }}
          repo-token: ${{ secrets.GITHUB_TOKEN }}
          wait-interval: 10
          allowed-conclusions: success
      - name: Merge (squash)
        run: gh pr merge ${{ github.event.pull_request.number }} --squash --auto
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}


Repo-Einstellung Allow auto-merge aktivieren (Settings → General → Pull Requests).

4) Tests – A1 (Auto-Merge) & Chat-Bridge
A1 – Auto-Merge-Test (Copy-&-Paste an deinen Custom-GPT)
Erzeuge einen Feature-PR mit sofortiger Veröffentlichung:
- Datei: site/public/demos/hello-now.html
- Inhalt: gültiges HTML5 mit <h1>Hello Now</h1>, kurzem Absatz und kleinem <style> (mobile).
- Füge dem PR das Label "auto-merge" hinzu.
- Warte auf Checks; der PR soll automatisch gemerged werden.
- Kommentiere mir anschließend die finale URL der Seite.


Erwartung: PR erscheint → Render-Preview erscheint → Checks grün → Workflow merged automatisch → Seite sofort auf main erreichbar.

Chat-Bridge – Grundtest (Copy-&-Paste an deinen Custom-GPT)
Lege eine Chat-Nachricht an Claude an:
- Datei: .chat/inbox/from-chatgpt/2025-09-04-hallo.json
- Inhalt (JSON):
  {
    "from": "chatgpt",
    "to": "claude",
    "type": "chat",
    "thread": "general",
    "text": "Sage ChatGPT hallo.",
    "ts": "2025-09-04T12:05:00+02:00"
  }
- Öffne dafür einen PR gegen main und füge das Label "to:claude" hinzu.


Erwartung: PR mit JSON-Message. Claude’s Watcher erzeugt anschließend einen Feature-PR mit Antwort (siehe Auftrag unten).

5) Auftrag an Claude (für Chat-Bridge & Operator-Ergänzung)

Titel: Chat-Bridge v0.1 & Auto-Merge-Support
Ziel: Nachrichten aus .chat/inbox/from-chatgpt/*.json verarbeiten und antworten; Content-PRs mit Label „auto-merge“ automatisch veröffentlichen.
Tasks (DoD):

Watcher (Operator-Erweiterung oder kleines Script):

Poll .chat/inbox/from-chatgpt/*.json (neue Dateien).

Für jede Nachricht:

Branch chats/<slug> erstellen.

Antwortdatei schreiben: .chat/outbox/from-claude/<timestamp>-reply.json

{ "from":"claude","to":"chatgpt","type":"chat","thread":"general","text":"Hallo ChatGPT 👋","ts":"<ISO>" }


Optional: Demo-Seite site/public/chat/<slug>.html mit „Hallo ChatGPT“ erzeugen.

Feature-PR öffnen (Idempotenz-Footer), Render-Preview-URL als Kommentar posten.

Idempotenz: Hash der eingegangenen Message (Dateiinhalt) im PR-Body oder Commit-Message notieren.

Auto-Merge-Label:

Wenn ein PR nur site/public/** verändert, füge Label auto-merge hinzu (falls noch nicht vorhanden).

Logs:

Strukturierte JSON-Logs mit run_id, message_sha, pr_number.

DoD:

1 Chat-Nachricht verarbeitet → 1 Feature-PR mit Reply-JSON (und optional Chat-Seite).

PR-Kommentar enthält Preview-Link.

Für einen Content-PR wird auto-merge gesetzt und der PR merged nach Checks selbst.

6) README-Mini (einchecken als README-CONTRIBUTORS.md)
# Wie veröffentliche ich Inhalte & wie chatte ich mit Claude?

## Schnell veröffentlichen (Auto-Merge)
1. Sage unserem GPT: „Neue Seite erstellen …“ (Datei unter `site/public/**`).
2. GPT öffnet einen PR und setzt das Label **auto-merge**.
3. Nach grünen Checks merged der PR automatisch. Die Seite ist sofort live.

> Wichtig: Nur statische Inhalte (HTML/CSS/JS), keine Secrets, keine Änderungen an `memory/context.json`.

## Chatten mit Claude (Chat-Bridge v0.1)
- Lege eine Datei in `.chat/inbox/from-chatgpt/<datum>-<slug>.json` mit folgendem JSON an:
  ```json
  { "from":"chatgpt","to":"claude","type":"chat","thread":"general","text":"<deine Nachricht>","ts":"<ISO>" }


Öffne dafür einen PR mit dem Label to:claude.

Claude antwortet per PR mit einer Datei unter .chat/outbox/from-claude/*.json. Optional gibt es eine kleine Demo-Seite unter site/public/chat/.

Prüfen

Jeder PR zeigt einen „View deployment“-Link (Render Preview).

„All checks passed“ ⇒ Merge (bei auto-merge passiert das automatisch).


---

## Fertig.  
Wenn du willst, kann dein Custom-GPT jetzt sofort:

- **A1 testen** (Prompt oben),  
- **Chat-Bridge** anstoßen, und  
- Claude hat einen klaren Auftrag, das Reply-Handling zu übernehmen.
