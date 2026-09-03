import { describe, it, expect } from 'vitest';
import { formatScriptError, parseGodotLog, stripAnsi } from '../../installer/godot-log.js';

// Verbatim from Godot 4.6.1 opening a project whose addon copy was missing
// commands/resource_commands.gd (the 4.1.11 npx-cache corruption).
const BROKEN_LOG = `Godot Engine v4.6.1.stable.official.14d19694e - https://godotengine.org

[   0% ] \x1b[90m\x1b[1mfirst_scan_filesystem\x1b[22m | Started Project initialization (5 steps)\x1b[39m\x1b[0m
[  66% ] \x1b[90m\x1b[1mfirst_scan_filesystem\x1b[22m | Initializing plugins...\x1b[39m\x1b[0m
SCRIPT ERROR: Parse Error: Identifier "MCPResourceCommands" not declared in the current scope.
   at: GDScript::reload (res://addons/godot_mcp/command_router.gd:19)
SCRIPT ERROR: Compile Error: Failed to compile depended scripts.
   at: GDScript::reload (res://addons/godot_mcp/plugin.gd:0)
ERROR: Failed to load script "res://addons/godot_mcp/plugin.gd" with error "Compilation failed".
   at: load (modules/gdscript/gdscript.cpp:2907)
SCRIPT ERROR: Invalid call. Nonexistent function 'new' in base 'GDScript'.
   at: _enter_tree (res://addons/godot_mcp/plugin.gd:28)
   GDScript backtrace (most recent call first):
       [0] _enter_tree (res://addons/godot_mcp/plugin.gd:28)
[  83% ] \x1b[90m\x1b[1mfirst_scan_filesystem\x1b[22m | Starting file scan...\x1b[39m\x1b[0m
[godot-mcp] Plugin disabled
`;

const CLEAN_LOG = `Godot Engine v4.6.1.stable.official.14d19694e - https://godotengine.org

[  66% ] \x1b[90m\x1b[1mfirst_scan_filesystem\x1b[22m | Initializing plugins...\x1b[39m\x1b[0m
[godot-mcp] Added MCPGameBridge autoload
[godot-mcp] Plugin initialized
[godot-mcp] Server listening on 127.0.0.1:61234 [Localhost]
[godot-mcp] Plugin disabled
`;

const PORT_BUSY_LOG = `Godot Engine v4.6.1.stable.official.14d19694e - https://godotengine.org
[godot-mcp] Plugin initialized
ERROR: [godot-mcp] Failed to start server on 127.0.0.1:6550: Already in use
   at: push_error (core/variant/variant_utility.cpp:1024)
`;

describe('parseGodotLog', () => {
  it('extracts each script error with its file and line, in order', () => {
    const parsed = parseGodotLog(BROKEN_LOG);
    expect(parsed.engineVersion).toBe('4.6.1.stable.official.14d19694e');
    expect(parsed.pluginInitialized).toBe(false);
    expect(parsed.errors).toEqual([
      {
        message: 'Parse Error: Identifier "MCPResourceCommands" not declared in the current scope.',
        file: 'res://addons/godot_mcp/command_router.gd',
        line: 19,
      },
      {
        message: 'Compile Error: Failed to compile depended scripts.',
        file: 'res://addons/godot_mcp/plugin.gd',
        line: 0,
      },
      {
        message: 'Failed to load script: Compilation failed',
        file: 'res://addons/godot_mcp/plugin.gd',
      },
      {
        message: "Invalid call. Nonexistent function 'new' in base 'GDScript'.",
        file: 'res://addons/godot_mcp/plugin.gd',
        line: 28,
      },
    ]);
    expect(parsed.otherErrors).toEqual([]);
  });

  it('recognises a clean plugin load', () => {
    const parsed = parseGodotLog(CLEAN_LOG);
    expect(parsed.errors).toEqual([]);
    expect(parsed.pluginInitialized).toBe(true);
  });

  it('keeps runtime errors separate from script errors', () => {
    const parsed = parseGodotLog(PORT_BUSY_LOG);
    expect(parsed.errors).toEqual([]);
    expect(parsed.pluginInitialized).toBe(true);
    expect(parsed.otherErrors).toEqual(['[godot-mcp] Failed to start server on 127.0.0.1:6550: Already in use']);
  });

  it('copes with CRLF line endings and a script error with no at: line', () => {
    const parsed = parseGodotLog('SCRIPT ERROR: Something odd.\r\nnext line\r\n');
    expect(parsed.errors).toEqual([{ message: 'Something odd.' }]);
  });
});

describe('stripAnsi', () => {
  it('removes colour codes', () => {
    expect(stripAnsi('\x1b[90m\x1b[1mfirst\x1b[22m | x\x1b[39m\x1b[0m')).toBe('first | x');
  });
});

describe('formatScriptError', () => {
  it('prints the message and location on two indented lines', () => {
    expect(formatScriptError({ message: 'Parse Error: x', file: 'res://a.gd', line: 3 })).toBe(
      '  Parse Error: x\n    at res://a.gd:3',
    );
    expect(formatScriptError({ message: 'Parse Error: x' })).toBe('  Parse Error: x');
  });
});
