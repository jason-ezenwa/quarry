// The package root declares "type": "module" for the ESM build; this
// overrides dist/cjs back to CommonJS so Node doesn't misread it as ESM.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const distCjsDir = path.join(import.meta.dirname, '..', 'dist', 'cjs');

mkdirSync(distCjsDir, { recursive: true });

writeFileSync(
  path.join(distCjsDir, 'package.json'),
  `${JSON.stringify({ type: 'commonjs' })}\n`,
);
