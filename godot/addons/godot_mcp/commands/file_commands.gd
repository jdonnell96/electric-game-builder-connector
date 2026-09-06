@tool
extends MCPBaseCommand
class_name MCPFileCommands

## Generic project file read/write — the piece the addon never needed while it
## only had to live-edit an already-open scene. An AI agent building a game
## from a description needs to create and edit .gd scripts (and any other
## project file) directly, the same way Electric Game Builder's local `bridge`
## app's write_file/edit_file/list_files tools already do against a project
## directory on disk (see bridge/src/agent.ts, bridge/src/projects.ts) — this
## is that same contract, ported to GDScript so it can run from inside the
## open editor and be reachable over the addon's WebSocket.

# Skipped the same way projects.ts's SKIP_DIRS does (build output, VCS,
# import cache), plus our own addon's folder specifically — user-added addons
# should still show up, this one is the connector itself, not game content.
const SKIP_DIR_NAMES := [".godot", "build", "node_modules", ".git"]
const SKIP_PATHS := ["res://addons/godot_mcp"]


func get_commands() -> Dictionary:
	return {
		"list_files": list_files,
		"read_file": read_file,
		"write_file": write_file,
		"edit_file": edit_file,
	}


# Resolves a caller-supplied res:// path safely: rejects anything that isn't
# res://-rooted and anything containing a ".." segment (path traversal), the
# same guard bridge/src/projects.ts's resolveResPath applies before ever
# touching the filesystem. Returns the normalized res:// string, or an error
# Dictionary the caller should return unchanged.
func _resolve(path: String) -> Variant:
	if not path.begins_with("res://"):
		return _error("INVALID_PATH", "Path must start with res://: %s" % path)
	for segment in path.substr(6).split("/"):
		if segment == "..":
			return _error("INVALID_PATH", "Path may not contain '..': %s" % path)
	return path


func _is_skipped(path: String) -> bool:
	for skip in SKIP_PATHS:
		if path == skip or path.begins_with(skip + "/"):
			return true
	for part in path.split("/"):
		if part in SKIP_DIR_NAMES:
			return true
	return false


func list_files(_params: Dictionary) -> Dictionary:
	var files: Array[Dictionary] = []
	_walk("res://", files)
	return _success({"files": files})


func _walk(dir_path: String, out: Array[Dictionary]) -> void:
	if _is_skipped(dir_path):
		return
	var dir := DirAccess.open(dir_path)
	if dir == null:
		return
	dir.list_dir_begin()
	var name := dir.get_next()
	while name != "":
		if name.begins_with("."):
			name = dir.get_next()
			continue
		var full := dir_path.path_join(name)
		if dir.current_is_dir():
			_walk(full, out)
		elif not name.ends_with(".import") and not name.ends_with(".uid") and not _is_skipped(full):
			out.append({"path": full, "size": FileAccess.get_file_as_bytes(full).size()})
		name = dir.get_next()
	dir.list_dir_end()


func read_file(params: Dictionary) -> Dictionary:
	var resolved: Variant = _resolve(params.get("path", ""))
	if resolved is Dictionary:
		return resolved
	var path: String = resolved

	if not FileAccess.file_exists(path):
		return _error("FILE_NOT_FOUND", "File not found: %s" % path)

	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		return _error("READ_FAILED", "Could not open for reading: %s (%s)" % [path, error_string(FileAccess.get_open_error())])
	var content := file.get_as_text()
	file.close()
	return _success({"path": path, "content": content})


func write_file(params: Dictionary) -> Dictionary:
	var resolved: Variant = _resolve(params.get("path", ""))
	if resolved is Dictionary:
		return resolved
	var path: String = resolved
	if _is_skipped(path):
		return _error("FORBIDDEN", "Cannot write inside the connector's own addon folder: %s" % path)

	var content: String = params.get("content", "")
	var dir_path := path.get_base_dir()
	if not dir_path.is_empty() and not DirAccess.dir_exists_absolute(dir_path):
		var err := DirAccess.make_dir_recursive_absolute(dir_path)
		if err != OK:
			return _error("MKDIR_FAILED", "Could not create %s: %s" % [dir_path, error_string(err)])

	var file := FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		return _error("WRITE_FAILED", "Could not open for writing: %s (%s)" % [path, error_string(FileAccess.get_open_error())])
	file.store_string(content)
	file.close()
	return _success({"path": path, "bytes": content.to_utf8_buffer().size()})


# Exact-match-once substring replace — the same contract as bridge/src/agent.ts's
# edit_file tool (and the same schema in packages/agent-core/src/tools.ts), kept
# identical so the prompt wording and tool description carry over unchanged.
func edit_file(params: Dictionary) -> Dictionary:
	var resolved: Variant = _resolve(params.get("path", ""))
	if resolved is Dictionary:
		return resolved
	var path: String = resolved
	if _is_skipped(path):
		return _error("FORBIDDEN", "Cannot edit inside the connector's own addon folder: %s" % path)

	var old_string: String = params.get("old_string", "")
	var new_string: String = params.get("new_string", "")
	if old_string.is_empty():
		return _error("INVALID_PARAMS", "old_string is required")

	if not FileAccess.file_exists(path):
		return _error("FILE_NOT_FOUND", "File not found: %s" % path)

	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		return _error("READ_FAILED", "Could not open for reading: %s (%s)" % [path, error_string(FileAccess.get_open_error())])
	var content := file.get_as_text()
	file.close()

	var count := content.count(old_string)
	if count == 0:
		return _error("NO_MATCH", "old_string not found in %s" % path)
	if count > 1:
		return _error("AMBIGUOUS_MATCH", "old_string matches %d times in %s; it must match exactly once" % [count, path])

	var updated := content.replace(old_string, new_string)
	var out := FileAccess.open(path, FileAccess.WRITE)
	if out == null:
		return _error("WRITE_FAILED", "Could not open for writing: %s (%s)" % [path, error_string(FileAccess.get_open_error())])
	out.store_string(updated)
	out.close()
	return _success({"path": path})
