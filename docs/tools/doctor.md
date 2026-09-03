# Doctor Tools

Environment diagnosis with no game open: who is on the game debugger port 6007 and the bridge port 6550, running editors and servers, whether the addon in the project is installed, complete, enabled, version-matched and compiles, and whether export templates are present. Every finding names its fix.

## Tools

- [godot_doctor](#godot_doctor)

---

## godot_doctor

Diagnose the godot-mcp setup with no game open, and name the fix for each problem: who is listening on and connected to the game debugger port 6007 (a foreign peer there makes every exec, screenshot, game_time and runtime_state call time out with no error anywhere), who holds the MCP bridge port 6550, how many editors and servers are running, whether the addon in the project is installed, complete, enabled, at the server's version, and compiles in a headless Godot, and whether export templates are installed for that Godot. Run it first whenever runtime tools time out or the connection drops. Does not need the bridge; works while disconnected.

### Actions

#### `run`

Run every environment check and return a numbered list of findings, each with its fix

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project_path` | string | No | Godot project folder to inspect. Defaults to the project of the connected editor, then the running editor's --path, then the current directory. |
| `skip_compile_check` | boolean | No | Skip the headless compile of the installed addon (saves about 4 seconds). |

### Examples

```json
// run
{
  "action": "run"
}
```

---

