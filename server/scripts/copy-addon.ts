import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { buildManifest, isDeleteLeftover, normalizeTreeLineEndings, walkFiles, MANIFEST_FILE } from '../src/installer/manifest.js';

const src = resolve(process.cwd(), '../godot/addons/godot_mcp');
const dest = resolve(process.cwd(), 'addon');
const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8')) as { version: string };

const files = walkFiles(src);

// Refuse to package a tree that carries half-deleted files. The installer
// would verify them away, but the source of truth must never contain them.
const leftovers = files.filter((rel) => isDeleteLeftover(rel.split('/').pop() ?? ''));
if (leftovers.length > 0) {
  console.error(`addon source contains delete leftovers; remove them before building:\n  ${leftovers.join('\n  ')}`);
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });

// Ship everything except the dev-only headless test fixtures
// (godot/addons/godot_mcp/test/), which consumers don't need.
// Copied file by file rather than through cpSync's filter: on Windows, Node
// hands that filter extended-length paths (the question-mark prefix), which
// path.relative() cannot match, so the test folder used to ship from there.
let copied = 0;
for (const rel of files) {
  if (rel === 'test' || rel.startsWith('test/')) continue;
  const target = join(dest, ...rel.split('/'));
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(src, ...rel.split('/')), target);
  copied++;
}

// A Windows checkout (core.autocrlf) carries CRLF; the published package is
// built on Linux with LF. Ship LF from anywhere so the package is identical.
const normalized = normalizeTreeLineEndings(dest);

// The installer copies only what the manifest names and verifies every file
// against it, on both the package side and the project side.
const manifest = buildManifest(dest, pkg.version);
writeFileSync(join(dest, MANIFEST_FILE), JSON.stringify(manifest, null, 2) + '\n');
console.log(`addon copied: ${src} → ${dest} (${copied} files in ${MANIFEST_FILE}, ${normalized} normalized to LF)`);
