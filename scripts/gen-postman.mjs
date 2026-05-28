// Generates docs/postman-collection.json from the live OpenAPI spec.
// Run:  node scripts/gen-postman.mjs

import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import converter from 'openapi-to-postmanv2';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Import the spec (built JS or transpiled TS) — easier path: hit the running server
const SPEC_URL = process.env.SPEC_URL || 'http://localhost:3000/docs/openapi.json';

const res = await fetch(SPEC_URL);
if (!res.ok) {
  console.error(`Failed to fetch spec from ${SPEC_URL}: ${res.status}`);
  process.exit(1);
}
const spec = await res.json();

converter.convert(
  { type: 'json', data: spec },
  { folderStrategy: 'Tags' },
  (err, result) => {
    if (err || !result.result) {
      console.error('conversion failed:', err || result);
      process.exit(1);
    }
    const out = path.join(projectRoot, 'docs', 'postman-collection.json');
    writeFileSync(out, JSON.stringify(result.output[0].data, null, 2));
    console.log(`wrote ${out}`);
  },
);
