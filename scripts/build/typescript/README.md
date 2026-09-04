# GN TypeScript Build System

> [!NOTE]
> **Migrating an existing target to TypeScript Split Compilation?**
> See [MIGRATION.md](MIGRATION.md) for the 4-phase migration plan, tier breakdown, compatibility matrix, and step-by-step developer migration guide.

This directory contains the GN and Ninja build integration for compiling TypeScript and JavaScript sources in DevTools.

The DevTools build system uses a high-performance, parallelized TypeScript architecture (`ts_library` and `devtools_entrypoint`) powered by `--isolatedDeclarations` and Ninja restat caching.

---

## Developer Usage Guide

### Importing the Build Rules

To define TypeScript targets in your `BUILD.gn` file, import `typescript.gni` (and `devtools_entrypoint.gni` if defining module entrypoints):

```gn
import("//scripts/build/typescript/typescript.gni")
import("//scripts/build/ninja/devtools_entrypoint.gni")
```

---

### Defining a TypeScript Library (`ts_library`)

The `ts_library` rule defines a compilation unit containing TypeScript (`.ts`) and/or JavaScript (`.js`) source files.

```gn
ts_library("my_feature") {
  sources = [
    "FeatureHelper.ts",
    "FeatureManager.ts",
  ]

  ts_deps = [
    "../../core/common:bundle",
    "../../core/i18n:bundle",
  ]

  deps = [
    ":generate_feature_strings",
  ]
}
```

#### Parameters

- **`sources`** (`list(string)`, required):
  List of `.ts` and/or `.js` source files belonging to this library.

- **`ts_deps`** (`list(string)`, optional):
  Dependencies that are TypeScript targets (`ts_library`, `devtools_entrypoint`, or `devtools_pre_built`). These dependencies generate TypeScript project references and provide `.d.ts` declaration headers for type checking.

- **`deps`** (`list(string)`, optional):
  Non-TypeScript build dependencies such as asset generators, copy actions, or CSS compilation targets that must complete before compiling this library.

- **`testonly`** (`boolean`, optional):
  Set to `true` for unit tests and test helpers (`testonly = true`). Compiling with `testonly = true` automatically includes type definitions for Mocha, Chai, Sinon, and Node.

- **`runs_in`** (`string`, optional):
  Specifies the execution environment for scripts/tools running in Node.js. Allowed values are `"node_cjs"` (CommonJS) and `"node_esm"` (ES Modules).

- **`additional_type_definitions`** (`list(string)`, optional):
  List of additional `.d.ts` definition files required for type-checking this target (e.g. `test/e2e/types.d.ts`).

- **`rootdir`** (`string`, optional):
  Custom root directory for resolving source paths if sources reside in a subfolder. Defaults to `"."`.

- **`visibility`** (`list(string)`, optional):
  Standard GN visibility list restricting which targets can depend on this library.

#### Examples

##### Basic Library
```gn
ts_library("utils") {
  sources = [
    "formatters.ts",
    "parsers.ts",
  ]
}
```

##### Library with TypeScript Dependencies & Assets
```gn
ts_library("data_grid") {
  sources = [
    "DataGrid.ts",
    "DataGridController.ts",
  ]

  ts_deps = [
    "../../core/common:bundle",
    "../../ui/legacy:bundle",
  ]

  deps = [
    ":generate_css",
  ]
}
```

##### Unit Test Library
```gn
ts_library("unittests") {
  testonly = true
  sources = [
    "DataGrid.test.ts",
  ]

  ts_deps = [
    ":data_grid",
    "../../testing",
  ]
}
```

---

### Defining an Entrypoint (`devtools_entrypoint`)

The `devtools_entrypoint` rule defines the public facade of a module (usually named `bundle`). It re-exports symbols from internal `ts_library` targets and handles bundling (via `esbuild`) in release/bundled builds.

```gn
devtools_entrypoint("bundle") {
  entrypoint = "my_feature.ts"

  ts_deps = [
    ":my_feature",
  ]
}
```

#### Parameters

- **`entrypoint`** (`string`, required):
  The entrypoint file (e.g., `common.ts` or `my_feature.ts`) that exports the public API of the module.

- **`ts_deps`** (`list(string)`, optional):
  Dependencies on the module's internal `ts_library` targets or other entrypoints.

- **`deps`** (`list(string)`, optional):
  Non-TypeScript dependencies required for this entrypoint.

- **`visibility`** (`list(string)`, optional):
  GN visibility list defining which downstream modules may depend on this entrypoint.

---

## Architecture Overview

### Core Principles

In the legacy architecture, each TypeScript library invoked a heavy Python runner (`ts_library.py`) which performed combined type checking, `.d.ts` declaration emit, and JavaScript transpilation in a single serial step. This serialized the dependency graph and caused extensive rebuild cascades across DevTools whenever upstream files changed.

The split compilation architecture (`ts_library_split` and `devtools_entrypoint_split`) decouples compilation into distinct, highly parallelized phases:

```
[Source .ts files]
       |
       +---> [target_name-dts] ------------------------> [*.d.ts output]
       |     (tsc --isolatedDeclarations --noCheck)              |
       |                                                         | (Pruned by restat)
       +---> [target_name_checked] <-----------------------------+
             (tsc -p tsconfig.json -> *.js, *.js.map)
```

### The 4 Sub-Targets

For every `ts_library` (and `devtools_entrypoint`) target `target_name`:

1. **`${target_name}-dts`** (`action` running `run_with_restat.py`):
   Emits TypeScript declaration files (`.d.ts`) directly via `tsc` using `--declaration`, `--emitDeclarationOnly`, `--isolatedDeclarations`, `--noCheck`, and `--noResolve`.
   - **Zero Upstream Dependencies**: Because `--isolatedDeclarations` guarantees all exported declarations are locally resolvable, declaration emit requires no upstream dependencies or type checking.
   - **Instant Execution**: Runs concurrently across all targets in milliseconds.

2. **`${target_name}_tsconfig_ref`** (`generated_file`):
   Generates a lightweight `${target_name}-tsconfig.ref.json` reference descriptor consumed by downstream tsconfigs.

3. **`${target_name}_tsconfig`** (`generated_file`):
   Generates a locally scoped `${target_name}-tsconfig.json` compilation descriptor containing compiler options (`disableSourceOfProjectReferenceRedirect = true`), source files, and project references to upstream `*-tsconfig.ref.json` stubs.

4. **`${target_name}_checked` (or`${target_name}-prebundle-js` for`devtools_entrypoint`)** (`action` running `run_with_restat.py`):
   Performs full JavaScript transpilation (`.js`, `.js.map`) and semantic type-checking using `tsc -p ${target_name}-tsconfig.json` against upstream `.d.ts` declaration headers.

5. **`${target_name}`** (`group` / `bundle`):
   Assembles compile-time public dependencies (`public_deps = [ ":${target_name}-dts", ":${target_name}_tsconfig_ref" ] + ts_deps`) and runtime data dependencies (`data_deps = [ ":${target_name}_checked" ]`).

---

### Ninja Restat Caching & Pruned Cascades

TypeScript compilation actions are wrapped with `run_with_restat.py` to enable Ninja restat pruning:

- When an implementation change modifies `.js` files but leaves public `.d.ts` declaration output byte-identical, `run_with_restat.py` preserves the `.d.ts` file timestamp.
- Ninja recognizes the declaration files are unchanged and immediately prunes downstream rebuild cascades.

---

### Dependency Wiring Diagram

The diagram below illustrates the exact GN sub-target wiring when `module_b` depends on `module_a` (`ts_deps = [ "../a:module_a" ]`):

```
+-----------------------------------------------------------------------+
|                              module_a                                 |
|                                                                       |
|  [1] module_a-dts (Action)                                            |
|      sources -> module_a/*.d.ts (via --isolatedDeclarations)          |
|         ^                                                             |
|         |                                                             |
|  [2] module_a_tsconfig_ref (generated_file)                           |
|      -> module_a-tsconfig.ref.json                                    |
|         ^                                                             |
|         | (public_deps)                                               |
|  [group("module_a")] --------------------------------+                |
|         | (data_deps)                                |                |
|         v                                            |                |
|  [3] module_a_tsconfig (generated_file)              | (ts_deps)      |
|      -> module_a-tsconfig.json                       |                |
|         ^                                            |                |
|         |                                            |                |
|  [4] module_a_checked (Action)                       |                |
|      module_a/*.ts -> module_a/*.js                  |                |
+------------------------------------------------------|----------------+
                                                       |
                                                       v
+-----------------------------------------------------------------------+
|                              module_b                                 |
|                                                                       |
|  [1] module_b-dts (Action)                                            |
|      sources -> module_b/*.d.ts (no wait for module_a!)               |
|                                                                       |
|  [2] module_b_tsconfig_ref (generated_file)                           |
|      -> module_b-tsconfig.ref.json                                    |
|                                                                       |
|  [3] module_b_tsconfig (generated_file)                               |
|      references = [ "../a/module_a-tsconfig.ref.json" ]               |
|         ^                                                             |
|         |                                                             |
|  [4] module_b_checked (Action: tsc -p module_b-tsconfig.json)         |
|      deps = [ :module_b-dts, :module_b_tsconfig, "../a:module_a" ]    |
|      Resolves module_a types from module_a/*.d.ts                     |
|                                                                       |
|  [group("module_b")]                                                  |
|      public_deps = [ :module_b-dts, :module_b_tsconfig_ref,           |
|                      "../a:module_a" ]                                |
|      data_deps   = [ :module_b_checked ]                              |
+-----------------------------------------------------------------------+
```
