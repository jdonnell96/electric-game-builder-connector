import { z } from 'zod';
import { defineTool } from '../core/define-tool.js';
import type { AnyToolDefinition } from '../core/types.js';
import { DEFAULT_TEST_TIMEOUT_MS, MAX_TEST_TIMEOUT_MS, formatTestRunResult, runTests } from '../testing/run-tests.js';

const RunTestsSchema = z.discriminatedUnion('action', [
  z.object({
    action: z
      .literal('run')
      .describe('Run a test scene or script in a headless Godot and return every PASS/FAIL check plus the exit code'),
    target: z
      .string()
      .describe('res:// path of the test scene (.tscn) or SceneTree script (.gd) to run, e.g. res://tests/smoke_test.tscn'),
    project_path: z
      .string()
      .optional()
      .describe('Godot project folder. Defaults to the project of the connected editor.'),
    args: z
      .array(z.string())
      .optional()
      .describe('User arguments passed to the test after `--`, e.g. ["--test-save"] to make a harness use a throwaway save file.'),
    timeout_ms: z
      .number()
      .int()
      .positive()
      .max(MAX_TEST_TIMEOUT_MS)
      .optional()
      .describe(`Kill the run after this long (default ${DEFAULT_TEST_TIMEOUT_MS / 1000}s, max ${MAX_TEST_TIMEOUT_MS / 1000}s).`),
    godot: z.string().optional().describe('Godot 4 executable to use. Defaults to GODOT_BIN, PATH, then the usual install folders.'),
  }),
]);

type RunTestsArgs = z.infer<typeof RunTestsSchema>;

export const runTestsTool = defineTool({
  name: 'godot_run_tests',
  annotations: { title: 'Run Tests', readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  description:
    'Prove the game works before showing it: run a headless test scene in a separate Godot process and get back ' +
    'structured results: passed/failed counts, every check with its label and detail, Godot script errors, and the ' +
    'exit code, which is honoured (a non-zero exit fails the run even with no FAIL line). The harness protocol is ' +
    'plain: print "PASS  <label>" or "FAIL  <label>  <detail>" per check and quit with a non-zero code on failure; the ' +
    'starter kits ship such a harness at res://tests/smoke_test.tscn. Runs alongside an open editor and does not need ' +
    'the bridge; the editor is only used to learn the project path. Run it after every milestone and before any ' +
    'screenshot you intend to show.',
  schema: RunTestsSchema,
  async execute(args: RunTestsArgs, { godot }) {
    const projectPath = args.project_path ?? (godot.isConnected ? godot.projectPath ?? undefined : undefined);
    if (!projectPath) {
      throw new Error('No project to test: pass project_path, or connect the Godot editor so the project is known.');
    }
    const result = await runTests({
      projectPath,
      target: args.target,
      args: args.args,
      timeoutMs: args.timeout_ms,
      godot: args.godot,
    });
    return {
      text: formatTestRunResult(result),
      structuredContent: result as unknown as Record<string, unknown>,
    };
  },
});

export const runTestsTools: AnyToolDefinition[] = [runTestsTool as unknown as AnyToolDefinition];
