import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getServerVersion } from '../version.js';
const DEFAULT_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const LOG_DIR = path.join(os.homedir(), '.godot-mcp');
const LOG_FILE = path.join(LOG_DIR, 'usage.log');
function isEnabled() {
    const envValue = process.env.GODOT_MCP_USAGE_LOG;
    if (envValue === undefined)
        return true; // default on
    return envValue === '1' || envValue.toLowerCase() === 'true';
}
function getMaxSizeBytes() {
    const envValue = process.env.GODOT_MCP_USAGE_LOG_MAX_SIZE;
    if (!envValue)
        return DEFAULT_MAX_SIZE_BYTES;
    const parsed = parseInt(envValue, 10);
    return isNaN(parsed) ? DEFAULT_MAX_SIZE_BYTES : parsed;
}
function ensureLogDir() {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }
}
function rotateIfNeeded() {
    if (!fs.existsSync(LOG_FILE))
        return;
    const stats = fs.statSync(LOG_FILE);
    if (stats.size < getMaxSizeBytes())
        return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedPath = path.join(LOG_DIR, `usage-${timestamp}.log`);
    fs.renameSync(LOG_FILE, rotatedPath);
}
function writeEntry(entry) {
    try {
        ensureLogDir();
        rotateIfNeeded();
        const line = JSON.stringify(entry) + '\n';
        fs.appendFileSync(LOG_FILE, line, 'utf-8');
    }
    catch {
        // Silently fail - usage logging should never break the tool
    }
}
export function logToolUsage(tool, args, success, durationMs, responseBytes, errorType, errorCode) {
    if (!isEnabled())
        return;
    const entry = {
        ts: new Date().toISOString(),
        mcp_version: getServerVersion(),
        tool,
        success,
        duration_ms: Math.round(durationMs),
        response_bytes: responseBytes,
    };
    if (typeof args.action === 'string') {
        entry.action = args.action;
    }
    if (errorType) {
        entry.error_type = errorType;
    }
    if (errorCode) {
        entry.error_code = errorCode;
    }
    writeEntry(entry);
}
function isZodError(err) {
    if (!err || typeof err !== 'object')
        return false;
    return 'issues' in err && Array.isArray(err.issues);
}
export function categorizeError(error) {
    if (!error)
        return 'unknown';
    if (isZodError(error))
        return 'validation';
    if (error instanceof Error) {
        const name = error.name;
        if (name === 'GodotConnectionError')
            return 'connection';
        if (name === 'GodotTimeoutError')
            return 'timeout';
        if (name === 'GodotCommandError')
            return 'command';
        return 'error';
    }
    return 'unknown';
}
/**
 * Extract the bridge error code (e.g. NOT_RUNNING, INVALID_PARAMS) from a
 * GodotCommandError so the usage log can tell "called at the wrong time"
 * apart from "the tool is broken". Returns undefined for other errors.
 */
export function extractErrorCode(error) {
    if (!(error instanceof Error) || error.name !== 'GodotCommandError')
        return undefined;
    const code = error.code;
    return typeof code === 'string' && code.length > 0 ? code : undefined;
}
//# sourceMappingURL=usage-logger.js.map