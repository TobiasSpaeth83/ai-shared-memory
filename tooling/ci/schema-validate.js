import Ajv from 'ajv';
import { globby } from 'globby';
import fs from 'fs/promises';

const ajv = new Ajv({ allErrors: true, strict: false });

async function validateDir(pattern, schemaHint) {
  const files = await globby(pattern);
  let ok = true;
  for (const f of files) {
    const raw = await fs.readFile(f, 'utf8');
    const json = JSON.parse(raw);
    // Minimal: wir prüfen nur syntaktisch & presence von "type"/"properties" bei Schemas
    if (schemaHint === 'schema') {
      if (!(json.type || json.properties || json.$schema)) {
        console.error(`Schema-Lint: ${f} sieht nicht wie ein Schema aus`);
        ok = false;
      }
    } else {
      // Für inputs könntest du hier optional eine konkrete Schema-Datei referenzieren
    }
  }
  return ok;
}

const ok1 = await validateDir('contracts/**/*.json', 'schema');
const ok2 = await validateDir('schemas/**/*.json', 'schema');
if (!ok1 || !ok2) process.exit(1);
console.log('Schema-Validate: OK');