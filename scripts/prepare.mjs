// Runs `npm install && npm run build` inside server/, but by invoking npm
// via its own absolute path (process.env.npm_execpath, which npm always sets
// for lifecycle scripts) run through the current Node binary
// (process.execPath), rather than shelling out to the bare word "npm".
// A bare "npm --prefix server install && npm --prefix server run build"
// string, run through cmd.exe on Windows for a nested npm-install-triggered
// lifecycle script, was observed failing with
// "'npm' is not recognized as an internal or external command" even though
// the outer npm invocation obviously succeeded — some nested-shell PATH
// contexts don't carry npm's own shim forward the way a top-level terminal
// does. Two already-known absolute paths sidestep that entirely, on any OS.
import { spawnSync } from 'node:child_process';

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error('npm_execpath is not set; expected to run as an npm lifecycle script.');
  process.exit(1);
}

function run(args) {
  const result = spawnSync(process.execPath, [npmCli, ...args], { cwd: 'server', stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(['install']);
run(['run', 'build']);
