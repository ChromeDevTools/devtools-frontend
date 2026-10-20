---
name: devtools/models-and-core/core-gn-build-and-module-layering
rubric: correctness
severity: blocking
---

**Rule.** Enforce strict GN bundle visibility, declare complete deps/ts_deps, and never import UI or panel modules from foundation layers
- **Look for**: Imports of `ui/` or `panels/` inside `core/` or `models/`, `visibility = [ "*" ]` on new panel `BUILD.gn` targets, direct internal file imports across module boundaries instead of `:bundle` namespace imports, or missing `foundation_unittests` entries.
- **Do not flag**: Core utility libraries intentionally exposed to the entire codebase with `visibility = [ "*" ]`.

**Why.** DevTools enforces a strict DAG where `core/` and `models/` (`foundation`) must never depend on `ui/` or `panels/`. In `BUILD.gn`, modules must depend on `:bundle` targets across directories, register new files in `devtools_grd_files.gni` and `foundation_unittests`, and restrict panel `visibility`.

## Examples

Bad:

```ts
devtools_entrypoint("bundle") {
  entrypoint = "my_panel.ts"
  deps = [ ":my_panel" ]
  visibility = [ "*" ]
}
```
