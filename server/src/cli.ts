#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { installAddon } from './installer/install.js';
import { formatCompileCheck, runAddonCompileCheck } from './installer/compile-check.js';
import { getServerVersion } from './version.js';

function parseCliArgs() {
  try {
    return parseArgs({
      options: {
        'install-addon': { type: 'boolean', short: 'i' },
        force: { type: 'boolean', short: 'f' },
        godot: { type: 'string' },
        'skip-check': { type: 'boolean' },
        doctor: { type: 'boolean' },
        'run-tests': { type: 'string' },
        json: { type: 'boolean' },
        'read-only': { type: 'boolean' },
        version: { type: 'boolean', short: 'v' },
        help: { type: 'boolean', short: 'h' },
      },
      allowPositionals: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    console.error('Run godot-mcp --help for usage.');
    process.exit(1);
  }
}

const { values, positionals } = parseCliArgs();

if (values.help) {
  console.log(`godot-mcp - MCP server for Godot Engine

Usage:
  godot-mcp                              Start the MCP server
  godot-mcp --read-only                  Start with observation tools only
  godot-mcp --install-addon <path>       Install addon to a Godot project and
                                         verify it compiles in a headless Godot
  godot-mcp --doctor [path]              Check ports 6007/6550, editors, servers,
                                         the addon in a project, export templates
  godot-mcp --run-tests <res://scene> [path] [-- args...]
                                         Run a test scene headlessly and report
                                         every PASS/FAIL check; exit 1 on failure
  godot-mcp --version                    Show version
  godot-mcp --help                       Show this help

Options:
  -i, --install-addon    Install the Godot addon to the specified project path
  -f, --force            Force install even if it would downgrade the addon or
                         overwrite locally modified addon files
      --godot <path>     Godot 4 executable for the compile check (otherwise
                         GODOT_BIN, PATH and common install folders are searched)
      --skip-check       Install (or doctor) without the compile check
      --doctor [path]    Diagnose this machine; the project defaults to the one
                         the running editor has open, then the current folder.
                         Exit code 1 when anything fails.
      --json             With --doctor or --run-tests: print the report as JSON
      --run-tests <res://path>
                         Test scene (.tscn) or script (.gd) to run in a headless
                         Godot. The project is the next positional argument, or
                         the current folder. Arguments after -- go to the test
                         (e.g. -- --test-save).
      --read-only        Register only read-only tools (no scene/node/animation
                         edits, no game control, no input injection, no exec).
                         GODOT_MCP_READ_ONLY=1 does the same.
  -v, --version          Show version number
  -h, --help             Show help
`);
  process.exit(0);
}

if (values.version) {
  console.log(getServerVersion());
  process.exit(0);
}

if (values.doctor) {
  const { runDoctor, formatDoctorReport } = await import('./doctor/run.js');
  const report = await runDoctor({
    projectPath: positionals[0],
    godot: values.godot,
    skipCompileCheck: values['skip-check'],
  });
  console.log(values.json ? JSON.stringify(report, null, 2) : formatDoctorReport(report));
  process.exit(report.exitCode);
}

if (values['run-tests']) {
  const { runTests, formatTestRunResult } = await import('./testing/run-tests.js');
  const { existsSync } = await import('node:fs');
  // First positional is the project when it is a folder; everything else goes to the test.
  const [first, ...rest] = positionals;
  const projectPath = first && existsSync(first) ? first : process.cwd();
  const testArgs = first && existsSync(first) ? rest : positionals;
  try {
    const result = await runTests({ projectPath, target: values['run-tests'], args: testArgs, godot: values.godot });
    console.log(values.json ? JSON.stringify(result, null, 2) : formatTestRunResult(result));
    process.exit(result.ok ? 0 : 1);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (values['install-addon']) {
  const projectPath = positionals[0];
  if (!projectPath) {
    console.error('Error: Project path required');
    console.error('Usage: godot-mcp --install-addon <path-to-godot-project>');
    process.exit(1);
  }

  const result = await installAddon(projectPath, { force: values.force });
  if (!result.success) {
    console.error('Error:', result.message);
    process.exit(1);
  }
  console.log(result.message);

  // The check runs even when the install was skipped as up to date: an addon
  // that is already in place is exactly the one worth proving still compiles.
  let checkFailed = false;
  if (!values['skip-check'] && result.targetDir) {
    console.log('');
    const check = await runAddonCompileCheck(result.targetDir, { godot: values.godot });
    console.log(formatCompileCheck(check));
    checkFailed = check.status === 'failed';
  }

  if (!result.skipped && !checkFailed) {
    console.log('\nNext steps:');
    console.log('  1. Open the Godot project');
    console.log('  2. Go to Project > Project Settings > Plugins');
    console.log('  3. Enable "Godot MCP"');
    console.log('  4. Restart your AI assistant to reconnect');
  }
  process.exit(checkFailed ? 1 : 0);
} else {
  // Only start the MCP server if no CLI command was specified
  // Dynamic import avoids loading MCP SDK for CLI commands (fixes npx stdin issue)
  if (values['read-only']) {
    process.env.GODOT_MCP_READ_ONLY = '1';
  }
  const { main } = await import('./index.js');
  main().catch((error) => {
    console.error('[godot-mcp] Fatal error:', error);
    process.exit(1);
  });
}
