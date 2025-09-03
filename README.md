# ai-shared-memory

Gemeinsames, leichtgewichtiges Kollaborations-Repo für Bots (Claude/ChatGPT) und Menschen.
**Source of Truth** bleibt die Plattform (MySQL + S3). Hier liegen nur Contracts/ADRs/Manifeste und ein kleines `memory/context.json`.

## Checks
- JSON Lint (jq)
- Schema Validate (AJV)
- Secret Scan (gitleaks)
- Minerva Smoke (optional, via Secrets)

## Konventionen
- PR-only, mindestens 1 Approval
- Commit-Footer mit `Run` / `Input (sha256)` / `Tool@ver`
- Änderungen an `memory/context.json` als JSON Patch (RFC 6902) in der PR-Beschreibung
