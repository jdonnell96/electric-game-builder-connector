# Run Tests Tools

Prove the game works: run a headless test scene in a separate Godot process and get back every PASS/FAIL check, script errors, and the exit code. The harness protocol is a printed "PASS  <label>" or "FAIL  <label>  <detail>" per check plus a non-zero exit on failure.

## Tools

- [godot_run_tests](#godot_run_tests)

---

## godot_run_tests

Prove the game works before showing it: run a headless test scene in a separate Godot process and get back structured results: passed/failed counts, every check with its label and detail, Godot script errors, and the exit code, which is honoured (a non-zero exit fails the run even with no FAIL line). The harness protocol is plain: print "PASS  <label>" or "FAIL  <label>  <detail>" per check and quit with a non-zero code on failure; the starter kits ship such a harness at res://tests/smoke_test.tscn. Runs alongside an open editor and does not need the bridge; the editor is only used to learn the project path. Run it after every milestone and before any screenshot you intend to show.

### Actions

#### `run`

Run a test scene or script in a headless Godot and return every PASS/FAIL check plus the exit code

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `target` | string | Yes | res:// path of the test scene (.tscn) or SceneTree script (.gd) to run, e.g. res://tests/smoke_test.tscn |
| `project_path` | string | No | Godot project folder. Defaults to the project of the connected editor. |
| `args` | string[] | No | User arguments passed to the test after `--`, e.g. ["--test-save"] to make a harness use a throwaway save file. |
| `timeout_ms` | integer | No | Kill the run after this long (default 180s, max 600s). |
| `godot` | string | No | Godot 4 executable to use. Defaults to GODOT_BIN, PATH, then the usual install folders. |

### Examples

```json
// run
{
  "action": "run",
  "target": "example"
}
```

---

