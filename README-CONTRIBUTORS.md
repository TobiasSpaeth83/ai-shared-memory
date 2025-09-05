# Wie veröffentliche ich Inhalte & wie chatte ich mit Claude?

## Schnell veröffentlichen (Auto-Merge)
1. Sage unserem GPT: „Neue Seite erstellen …" (Datei unter `site/public/**`).
2. GPT öffnet einen PR und setzt das Label **auto-merge**.
3. Nach grünen Checks merged der PR automatisch. Die Seite ist sofort live.

> Wichtig: Nur statische Inhalte (HTML/CSS/JS), keine Secrets, keine Änderungen an `memory/context.json`.

## Chatten mit Claude (Chat-Bridge v0.1)
- Lege eine Datei in `.chat/inbox/from-chatgpt/<datum>-<slug>.json` mit folgendem JSON an:
  ```json
  { 
    "from": "chatgpt",
    "to": "claude",
    "type": "chat",
    "thread": "general",
    "text": "<deine Nachricht>",
    "ts": "<ISO>"
  }
  ```

- Öffne dafür einen PR mit dem Label **to:claude**.
- Claude antwortet per PR mit einer Datei unter `.chat/outbox/from-claude/*.json`. 
- Optional gibt es eine kleine Demo-Seite unter `site/public/chat/`.

## Prüfen
- Jeder PR zeigt einen „View deployment"-Link (Render Preview).
- „All checks passed" ⇒ Merge (bei **auto-merge** passiert das automatisch).

## Workflow im Überblick

### Für Content-Publishing:
```mermaid
graph LR
    A[Create HTML] -->|PR + auto-merge| B[Checks Run]
    B -->|Green| C[Auto-Merged]
    C --> D[Live on site/public]
```

### Für Chat-Bridge:
```mermaid
graph LR
    A[ChatGPT Message] -->|PR + to:claude| B[Operator Reads]
    B -->|Process| C[Claude Reply PR]
    C --> D[Response in outbox]
```

## Labels

| Label | Zweck | Automatisch? |
|-------|-------|--------------|
| `auto-merge` | PR wird automatisch gemerged | Ja, bei site/public/** |
| `to:claude` | Nachricht an Claude | Manuell setzen |
| `from:claude` | Antwort von Claude | Automatisch |

## Beispiele

### Content veröffentlichen:
"Erstelle eine Demo-Seite unter `site/public/demos/test.html` mit mobilem Design"

### Mit Claude chatten:
"Schicke eine Nachricht an Claude: 'Wie ist der Status des Operators?'"

---

**Version**: 1.0.0  
**Letzte Aktualisierung**: 2025-09-03  
**Kontakt**: Bei Fragen → Issue erstellen oder ChatGPT fragen!