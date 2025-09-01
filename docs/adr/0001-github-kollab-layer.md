# ADR-0001: GitHub als Kollaborations- & Review-Layer, Plattform als Source of Truth

## Entscheidung
Die operative Wahrheit (Cases/Runs/Artifacts) bleibt in der Plattform (MySQL + S3). GitHub dient als Kollab- und Change-Control-Layer für Code-artige Artefakte (Contracts, ADRs, kleine Manifeste, memory/context.json). Große/binary/volatile Artefakte werden nicht im Repo gespeichert, sondern nur referenziert.

## Begründung
- Reproduzierbarkeit (Idempotenz/Exit-Checks) liegt auf der Plattform
- PR/Review/Checks sind GitHubs Stärke
- Geringere Konfliktwahrscheinlichkeit & bessere PII-Kontrolle

## Auswirkungen
- Required Checks: json-lint, schema-validate, secret-scan, minerva-smoke
- Commit-Footer: Run / Input (sha256) / Tool@ver
- memory/context.json nur via PR + JSON Patch