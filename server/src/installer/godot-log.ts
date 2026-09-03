// Parse what a headless Godot editor prints while loading a project, so the
// compile check can say which script failed and where. Godot's exit code is 0
// even when a plugin fails to compile, so the log is the only signal.

export interface GodotScriptError {
  /** e.g. `Parse Error: Identifier "MCPResourceCommands" not declared in the current scope.` */
  message: string;
  /** `res://...` path from the `at:` line that follows, when present. */
  file?: string;
  line?: number;
}

export interface ParsedGodotLog {
  /** `SCRIPT ERROR:` entries and `Failed to load script` errors, in order. */
  errors: GodotScriptError[];
  /** Other `ERROR:` lines (runtime errors such as a port already in use). Reported, not fatal. */
  otherErrors: string[];
  /** The addon's `_enter_tree` ran to completion. */
  pluginInitialized: boolean;
  /** Godot's version banner, e.g. `4.6.1.stable.official.14d19694e`. */
  engineVersion?: string;
}

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*[A-Za-z]/g;
const AT_RE = /^\s*at:\s.*?\((res:\/\/[^)]+?)(?::(\d+))?\)\s*$/;
const FAILED_LOAD_RE = /^ERROR: Failed to load script "(res:\/\/[^"]+)" with error "([^"]+)"/;
const BANNER_RE = /^Godot Engine v(\S+)/;

export function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, '');
}

export function parseGodotLog(text: string): ParsedGodotLog {
  const lines = stripAnsi(text).split(/\r?\n/);
  const result: ParsedGodotLog = { errors: [], otherErrors: [], pluginInitialized: false };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const banner = line.match(BANNER_RE);
    if (banner) {
      result.engineVersion = banner[1];
      continue;
    }
    if (line.includes('[godot-mcp] Plugin initialized')) {
      result.pluginInitialized = true;
      continue;
    }
    if (line.startsWith('SCRIPT ERROR: ')) {
      const err: GodotScriptError = { message: line.slice('SCRIPT ERROR: '.length).trim() };
      const at = lines[i + 1]?.match(AT_RE);
      if (at) {
        err.file = at[1];
        if (at[2] !== undefined) err.line = Number(at[2]);
        i++;
      }
      result.errors.push(err);
      continue;
    }
    const failedLoad = line.match(FAILED_LOAD_RE);
    if (failedLoad) {
      result.errors.push({ message: `Failed to load script: ${failedLoad[2]}`, file: failedLoad[1] });
      continue;
    }
    if (line.startsWith('ERROR: ')) {
      result.otherErrors.push(line.slice('ERROR: '.length).trim());
    }
  }
  return result;
}

export function formatScriptError(err: GodotScriptError): string {
  const where = err.file ? `\n    at ${err.file}${err.line !== undefined ? `:${err.line}` : ''}` : '';
  return `  ${err.message}${where}`;
}
