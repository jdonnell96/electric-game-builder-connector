import { z } from 'zod';
import { defineTool } from '../core/define-tool.js';
import type { AnyToolDefinition } from '../core/types.js';
import { formatDoctorReport, runDoctor } from '../doctor/run.js';

const DoctorSchema = z.discriminatedUnion('action', [
  z.object({
    action: z
      .literal('run')
      .describe('Run every environment check and return a numbered list of findings, each with its fix'),
    project_path: z
      .string()
      .optional()
      .describe(
        'Godot project folder to inspect. Defaults to the project of the connected editor, then the ' +
        'running editor\'s --path, then the current directory.',
      ),
    skip_compile_check: z
      .boolean()
      .optional()
      .describe('Skip the headless compile of the installed addon (saves about 4 seconds).'),
  }),
]);

type DoctorArgs = z.infer<typeof DoctorSchema>;

export const doctor = defineTool({
  name: 'godot_doctor',
  annotations: { title: 'Doctor', readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  description:
    'Diagnose the godot-mcp setup with no game open, and name the fix for each problem: who is listening ' +
    'on and connected to the game debugger port 6007 (a foreign peer there makes every exec, screenshot, ' +
    'game_time and runtime_state call time out with no error anywhere), who holds the MCP bridge port 6550, ' +
    'how many editors and servers are running, whether the addon in the project is installed, complete, ' +
    'enabled, at the server\'s version, and compiles in a headless Godot, and whether export templates are ' +
    'installed for that Godot. Run it first whenever runtime tools time out or the connection drops. ' +
    'Does not need the bridge; works while disconnected.',
  schema: DoctorSchema,
  async execute(args: DoctorArgs, { godot }) {
    const projectPath = args.project_path ?? (godot.isConnected ? godot.projectPath ?? undefined : undefined);
    const report = await runDoctor({ projectPath, skipCompileCheck: args.skip_compile_check });
    return {
      text: formatDoctorReport(report),
      structuredContent: report as unknown as Record<string, unknown>,
    };
  },
});

export const doctorTools: AnyToolDefinition[] = [doctor as unknown as AnyToolDefinition];
