Alles klar — der Render-Build bricht **im TypeScript-Schritt** ab, nicht mehr beim Install. Zwei konkrete Ursachen:

1. `OperatorAgent` wird in `src/index.ts` **nicht exportiert**, aber in `server.ts`/`cron.ts` aus `./index.js` importiert.
2. `ChatBridge.processMessageFromPR(...)` ist **private**, wird aber von `server.ts`/`cron.ts` aufgerufen.

Hier ist die **kleinste, saubere Fix-Kombi** (4 Mini-Änderungen), damit der Build sofort läuft:

---

## 🔧 Patch 1 — Exporte ergänzen

**Datei:** `tooling/operator/src/index.ts`
**Ziel:** `OperatorAgent` (und optional `ChatBridge`) re-exportieren.

```ts
// tooling/operator/src/index.ts
export { OperatorAgent } from './operator-agent';
export { ChatBridge } from './chat-bridge'; // optional, aber praktisch
```

> Wenn `index.ts` bisher leer war oder nur interne Importe hatte: einfach diese zwei Zeilen ans Ende hinzufügen.

---

## 🔧 Patch 2 — Öffentlichen Wrapper in ChatBridge

**Datei:** `tooling/operator/src/chat-bridge.ts`
**Ziel:** privaten Methodenaufruf kapseln, ohne die Kapselung komplett aufzuheben.

```ts
// tooling/operator/src/chat-bridge.ts
export class ChatBridge {
  // ... bestehender Code ...

  // bestehend:
  // private async processMessageFromPR(prNumber: number, files: GhFile[], labels: string[]) { ... }

  // NEU: öffentlicher Wrapper
  public async handlePRMessage(prNumber: number, files: GhFile[], labels: string[]) {
    return this.processMessageFromPR(prNumber, files, labels);
  }
}
```

> Vorteil: Wir lassen `processMessageFromPR` privat und geben server/cron eine offizielle, öffentliche API.

---

## 🔧 Patch 3 — Server nutzt den öffentlichen Wrapper

**Datei:** `tooling/operator/src/server.ts`
**Änderung:** überall `processMessageFromPR(` → `handlePRMessage(`

```ts
// tooling/operator/src/server.ts
import { OperatorAgent, ChatBridge } from './index';

const chatBridge = new ChatBridge(/* ... */);

// z.B. in deinem pull_request-Handler:
await chatBridge.handlePRMessage(prNumber, files, labels);
```

---

## 🔧 Patch 4 — Cron nutzt den öffentlichen Wrapper

**Datei:** `tooling/operator/src/cron.ts`
**Änderung:** überall `processMessageFromPR(` → `handlePRMessage(`

```ts
// tooling/operator/src/cron.ts
import { OperatorAgent, ChatBridge } from './index';

const chatBridge = new ChatBridge(/* ... */);

await chatBridge.handlePRMessage(prNumber, files, labels);
```

---

## ✅ Danach: Build auf Render erneut

Du kannst vorerst bei der „Schnelllösung“ bleiben:

**Build Command (Render):**

```
npm install --no-audit --no-fund && npm run build
```

Sobald alles läuft, bitte **sauber machen** (deterministisch):

1. Lokal/Claude einen PR erstellen lassen, der **`package-lock.json`** in `tooling/operator/` generiert und committed:

   ```bash
   cd tooling/operator
   npm install
   git add package-lock.json
   git commit -m "chore(operator): add package-lock.json (sync lockfile)"
   ```
2. In Render **Build Command** wieder zurückstellen auf:

   ```
   npm ci && npm run build
   ```

---

## 🧪 Mini-Checkliste nach Deploy

* **Health:** `https://<dein-service>.onrender.com/health` → `{ ok: true }`
* **Logs:** keine TS-Fehler mehr, Server hört auf `PORT`
* **Webhook Ping (GitHub):** 200 OK (Signatur OK)

---

## 📨 Kurzer Auftragstext an Claude (copy-paste)

> **Task T-505: Fix Render Build (Exports + Public Wrapper)**
> Bitte in `tooling/operator`:
>
> 1. `src/index.ts`: `export { OperatorAgent } from './operator-agent'` und `export { ChatBridge } from './chat-bridge'`.
> 2. `src/chat-bridge.ts`: öffentliche Methode `handlePRMessage(...)` hinzufügen, die die bestehende private `processMessageFromPR(...)` aufruft.
> 3. `src/server.ts` & `src/cron.ts`: Aufrufe auf `handlePRMessage(...)` umstellen.
> 4. (Optional) `package-lock.json` unter `tooling/operator/` erzeugen & committen.
>    PR öffnen mit kurzer Begründung („Render build failed: TS2459/TS2341; fixed by proper exports + public wrapper“).

---

Wenn du diese vier Mini-Änderungen mergst, sollte Render **durchbauen**.
Sag kurz Bescheid, sobald du den PR erstellt (oder gemerged) hast – dann gehen wir direkt zum **Webhook-Ping** und dem **Chat-PR-Test** über.
