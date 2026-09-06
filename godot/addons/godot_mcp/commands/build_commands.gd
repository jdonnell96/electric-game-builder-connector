@tool
extends MCPBaseCommand
class_name MCPBuildCommands

## Triggers the same headless Godot operations bridge/src/godot.ts's
## checkProject/runTests/exportWeb/exportDesktop already run today as separate
## `godot --headless ...` subprocesses — ported here so they can be triggered
## from inside the already-open editor instead of a local Node app. Every
## command here returns raw exit codes and stdout/stderr text; it deliberately
## does NOT parse CHECK/PASS/FAIL lines or Godot's script-error format itself
## (that parsing already exists and is well-tested in TypeScript — parseGodotLog,
## parseTestLog in the Node server / bridge — so it runs against this raw
## output wherever the caller lives, instead of being re-implemented in GDScript).
##
## Re-invokes the SAME binary already running this editor (OS.get_executable_path())
## rather than porting bridge/src/godot.ts's separate binary-discovery logic — the
## running editor's own binary is already a proven-working Godot 4 executable.

const CHECK_SCRIPT_RES := "res://addons/godot_mcp/build/check_scripts.gd"

const WEB_PRESET := """[preset.0]

name=\"Web\"
platform=\"Web\"
runnable=true
advanced_options=false
dedicated_server=false
custom_features=\"\"
export_filter=\"all_resources\"
include_filter=\"\"
exclude_filter=\"tests/*\"
export_path=\"build/web/index.html\"
patches=PackedStringArray()
encryption_include_filters=\"\"
encryption_exclude_filters=\"\"
seed=0
encrypt_pck=false
encrypt_directory=false
script_export_mode=2

[preset.0.options]

custom_template/debug=\"\"
custom_template/release=\"\"
variant/extensions_support=false
variant/thread_support=false
vram_texture_compression/for_desktop=true
vram_texture_compression/for_mobile=false
html/export_icon=true
html/custom_html_shell=\"\"
html/head_include=\"\"
html/canvas_resize_policy=2
html/focus_canvas_on_start=true
html/experimental_virtual_keyboard=false
progressive_web_app/enabled=false
"""

const WINDOWS_PRESET := """[preset.0]

name=\"Windows Desktop\"
platform=\"Windows Desktop\"
runnable=true
advanced_options=false
dedicated_server=false
custom_features=\"\"
export_filter=\"all_resources\"
include_filter=\"\"
exclude_filter=\"tests/*\"
export_path=\"build/windows/game.exe\"
patches=PackedStringArray()
encryption_include_filters=\"\"
encryption_exclude_filters=\"\"
seed=0
encrypt_pck=false
encrypt_directory=false
script_export_mode=2

[preset.0.options]

custom_template/debug=\"\"
custom_template/release=\"\"
debug/export_console_wrapper=0
binary_format/embed_pck=true
texture_format/s3tc_bptc=true
texture_format/etc2_astc=false
binary_format/architecture=\"x86_64\"
application/modify_resources=true
application/icon=\"\"
application/console_wrapper_icon=\"\"
application/icon_interpolation=4
application/file_version=\"1.0.0.0\"
application/product_version=\"1.0.0.0\"
application/company_name=\"\"
application/product_name=\"\"
application/file_description=\"\"
application/copyright=\"\"
application/trademarks=\"\"
application/export_angle=0
application/export_d3d12=0
application/d3d12_agility_sdk_multiarch=true
ssh_remote_deploy/enabled=false
"""


func get_commands() -> Dictionary:
	return {
		"run_check": run_check,
		"run_tests": run_tests,
		"run_export_web": run_export_web,
		"run_export_desktop": run_export_desktop,
	}


# Runs a Godot subprocess on a background Thread and polls for completion via
# process_frame instead of calling OS.execute() directly on the main thread —
# a check/export can take tens of seconds to minutes (project.godot's own
# export presets run up to 300s worth of work in the Node version), and
# OS.execute() blocks whichever thread calls it, which would otherwise freeze
# the whole editor UI for the duration.
func _run_process(args: PackedStringArray) -> Dictionary:
	var godot_path := OS.get_executable_path()
	var output := []
	# Primitive locals (int/bool) reassigned from inside a lambda are not
	# something to rely on being visible to the outer scope — a Dictionary
	# entry is: Dictionary is a reference type, so mutating state["exit_code"]
	# inside the thread's closure is guaranteed visible when polled from here.
	# `output` itself stays a plain local since Array is already a reference
	# type on its own — OS.execute mutates the same underlying data either way.
	var state := {"exit_code": -1, "done": false}

	var thread := Thread.new()
	thread.start(func():
		state["exit_code"] = OS.execute(godot_path, args, output, true, false)
		state["done"] = true
	)
	while not state["done"]:
		await Engine.get_main_loop().process_frame
	thread.wait_to_finish()

	var text: String = ("\n".join(output) if output.size() > 0 else "")
	# Raw subprocess output carries two kinds of bytes that JSON.stringify()
	# (the engine's own encoder, used by send_response() to serialize this
	# Dictionary) does not reliably re-escape inside a string value — a
	# client's JSON.parse then rejects the whole message outright with "Bad
	# control character in string literal": (1) \r from Godot's CRLF output
	# on Windows — safe to fold into \n, since every parser downstream of this
	# (bridge/src/godot.ts's parseGodotLog, the TS parseTestLog) already
	# splits on \r?\n; (2) ANSI color/SGR escape codes from Godot's own
	# colored console output — meaningless outside a real terminal anyway, so
	# stripped rather than preserved. The pattern must include the literal
	# ESC byte itself (built via char(27), not typed as a raw byte in this
	# source file) — matching only the visible "[...m" text would strip the
	# bracket sequence but leave the actual ESC control byte behind, which is
	# exactly the kind of unescaped control character that breaks JSON parsing.
	text = text.replace("\r\n", "\n").replace("\r", "\n")
	var ansi_re := RegEx.new()
	ansi_re.compile(char(27) + "\\[[0-9;]*m")
	text = ansi_re.sub(text, "", true)
	return {"exit_code": state["exit_code"], "output": text}


func _project_dir() -> String:
	return ProjectSettings.globalize_path("res://")


# Import the project (builds the class cache), then load every script with
# autoloads present — mirrors bridge/src/godot.ts's checkProject() exactly,
# as two sequential subprocess calls.
func run_check(_params: Dictionary) -> Dictionary:
	var project_dir := _project_dir()
	var imported := await _run_process(PackedStringArray(["--headless", "--path", project_dir, "--import"]))
	var check_script := ProjectSettings.globalize_path(CHECK_SCRIPT_RES)
	var checked := await _run_process(PackedStringArray(["--headless", "--path", project_dir, "--script", check_script]))
	return _success({"import": imported, "check": checked})


# Mirrors bridge/src/godot.ts's runTests() / buildGodotTestArgs(): a .gd target
# runs via --script, anything else (a .tscn scene) is passed directly; extra
# args go after a bare --.
func run_tests(params: Dictionary) -> Dictionary:
	var target: String = params.get("target", "res://tests/smoke_test.tscn")
	var extra_args: Array = params.get("args", ["--test-save"])

	if not target.begins_with("res://"):
		return _error("INVALID_PARAMS", "target must be a res:// path to a .tscn scene or .gd script")

	var args := PackedStringArray(["--headless", "--path", _project_dir()])
	if target.ends_with(".gd"):
		args.append("--script")
		args.append(target)
	else:
		args.append(target)
	if extra_args.size() > 0:
		args.append("--")
		for a in extra_args:
			args.append(str(a))

	var result := await _run_process(args)
	return _success(result)


func _ensure_preset(preset_text: String, platform_marker: String) -> void:
	var presets_path := "res://export_presets.cfg"
	if FileAccess.file_exists(presets_path):
		var existing := FileAccess.get_file_as_string(presets_path)
		if existing.find(platform_marker) != -1:
			return
		var preset_re := RegEx.new()
		preset_re.compile("(?m)^\\[preset\\.(\\d+)\\]")
		var indices: Array[int] = []
		for m in preset_re.search_all(existing):
			indices.append(int(m.get_string(1)))
		var next_index: int = (indices.max() + 1) if indices.size() > 0 else 0
		var appended := preset_text.replace("preset.0", "preset.%d" % next_index)
		var file := FileAccess.open(presets_path, FileAccess.WRITE)
		file.store_string(existing.strip_edges(false, true) + "\n\n" + appended)
		file.close()
		return

	var file := FileAccess.open(presets_path, FileAccess.WRITE)
	file.store_string(preset_text)
	file.close()


func run_export_web(_params: Dictionary) -> Dictionary:
	_ensure_preset(WEB_PRESET, "platform=\"Web\"")
	var project_dir := _project_dir()
	DirAccess.make_dir_recursive_absolute(project_dir.path_join("build/web"))

	var run := await _run_process(PackedStringArray(["--headless", "--path", project_dir, "--export-release", "Web", "build/web/index.html"]))

	var index_path := "res://build/web/index.html"
	var wasm_path := "res://build/web/index.wasm"
	var pck_path := "res://build/web/index.pck"
	var produced := FileAccess.file_exists(index_path)
	var size_bytes := 0
	if produced and FileAccess.file_exists(wasm_path) and FileAccess.file_exists(pck_path):
		size_bytes = FileAccess.get_file_as_bytes(wasm_path).size() + FileAccess.get_file_as_bytes(pck_path).size()

	return _success({"produced": produced, "size_bytes": size_bytes, "run": run})


func run_export_desktop(_params: Dictionary) -> Dictionary:
	_ensure_preset(WINDOWS_PRESET, "platform=\"Windows Desktop\"")
	var project_dir := _project_dir()
	DirAccess.make_dir_recursive_absolute(project_dir.path_join("build/windows"))

	var run := await _run_process(PackedStringArray(["--headless", "--path", project_dir, "--export-release", "Windows Desktop", "build/windows/game.exe"]))

	var exe_path := "res://build/windows/game.exe"
	var produced := FileAccess.file_exists(exe_path)
	var size_bytes := FileAccess.get_file_as_bytes(exe_path).size() if produced else 0

	return _success({"produced": produced, "size_bytes": size_bytes, "run": run})
