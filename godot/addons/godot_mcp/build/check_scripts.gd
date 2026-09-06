extends SceneTree
## Loads every GDScript in the project so parse and compile errors surface in
## one process, after autoloads exist (_initialize runs once the tree is up)
## and with the class cache built by a prior --import.
## Prints CHECK OK/FAIL lines and exits 1 when anything fails.
##
## Verbatim copy of Electric-Game-Builder/bridge/scripts/check_scripts.gd —
## bundled here so MCPBuildCommands can invoke it via an absolute path against
## whatever project the editor has open, the same way bridge/src/godot.ts's
## checkProject() invokes its own copy against a bridge-managed project.

func _initialize() -> void:
	var files: Array[String] = []
	_collect("res://", files)
	var failed := 0
	for path in files:
		var script: Variant = load(path)
		# load() already parsed and compiled it; reload() would refuse scripts that
		# have live instances (the autoloads themselves).
		var ok: bool = script != null and script is GDScript and (script as GDScript).can_instantiate()
		print("CHECK %s %s" % ["OK" if ok else "FAIL", path])
		if not ok:
			failed += 1
	print("check_scripts: %d scripts, %d failed" % [files.size(), failed])
	quit(1 if failed > 0 else 0)

func _collect(dir_path: String, out: Array[String]) -> void:
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
			if name != "addons" and name != "build":
				_collect(full, out)
		elif name.ends_with(".gd"):
			out.append(full)
		name = dir.get_next()
	dir.list_dir_end()
