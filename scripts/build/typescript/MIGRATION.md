# TypeScript Split Compilation Migration Guide

This document outlines the 4-phase migration plan, tier breakdown, compatibility matrix, and step-by-step developer guidelines for transitioning DevTools modules to the high-performance TypeScript Split Compilation build architecture.

---

## 1. The 4-Phase Migration Plan

The migration of the DevTools codebase to TypeScript Split Compilation proceeds in 4 distinct phases:

### Phase 0: Adapter Layer & Infrastructure (Current)
- Implement `ts_library_split.gni`, `devtools_entrypoint_split.gni`, and `run_with_restat.py`.
- Add bidirectional adapter layer (`*-tsconfig.ref.json` emission across legacy build tools).
- Expose `split_compilation` switch in `ts_library` and `devtools_entrypoint` templates.
- Add multi-tier end-to-end and bidirectional test fixtures (`split_simple_dep`, `split_entrypoint`, `split_prebuilt`, `split_bidirectional`).

### Phase 1: GN Syntax Modernization (`ts_deps`)
- Update `BUILD.gn` files across the codebase to split dependencies:
  - `ts_deps`: All dependencies that are TypeScript libraries, entrypoints, or prebuilt modules.
  - `deps`: Non-TypeScript build actions, copies, or asset generators.
- Clean up redundant dependencies and verify all target graph relationships.

### Phase 2: Incremental Bottom-Up Migration (Tiers 1–7)
Migrate modules tier-by-tier from leaf dependencies up to top-level panels and test suites:

- **Tier 1: Leaf Utilities & Third-Party Wrappers**
  - `front_end/core/root`
  - `front_end/core/platform`
  - `front_end/third_party/*`
- **Tier 2: Core Foundation Models**
  - `front_end/core/common`
  - `front_end/core/i18n`
  - `front_end/core/sdk`
  - `front_end/core/host`
  - `front_end/core/protocol_client`
- **Tier 3: Domain Models**
  - `front_end/models/bindings`
  - `front_end/models/workspace`
  - `front_end/models/text_utils`
  - `front_end/models/trace`
  - `front_end/models/timeline_model`
  - `front_end/models/issues_manager`
  - Remaining `front_end/models/*`
- **Tier 4: UI Foundation & Components**
  - `front_end/ui/legacy`
  - `front_end/ui/components/*`
  - `front_end/ui/lit/*`
  - `front_end/ui/visual_logging/*`
- **Tier 5: Panels & Tools**
  - `front_end/panels/elements`
  - `front_end/panels/timeline`
  - `front_end/panels/sources`
  - `front_end/panels/network`
  - `front_end/panels/console`
  - Remaining `front_end/panels/*`
- **Tier 6: DevTools Entrypoints & Top-Level Targets**
  - `front_end/entrypoints/*` (e.g. `devtools_app`, `shell`, `worker`)
  - `front_end/BUILD.gn`
- **Tier 7: Test Suites & Test Harnesses**
  - `test/unittests/*`
  - `test/e2e/*`
  - `test/conductor/*`

### Phase 3: Global Default Switch & Legacy Cleanup
- Change default in `ts_library` and `devtools_entrypoint` templates to `split_compilation = true`.
- Remove legacy implementation files:
  - `scripts/build/typescript/ts_library.py`
  - `scripts/build/ninja/generate-tsconfig.js`
  - `legacy_ts_library` in `scripts/build/typescript/typescript.gni`
  - `legacy_devtools_entrypoint` in `scripts/build/ninja/devtools_entrypoint.gni`
- Remove all `split_compilation = true` overrides across `BUILD.gn` files.

---

## 2. Bidirectional Compatibility & Adapter Layer

To enable seamless, incremental migration of hundreds of DevTools modules without requiring a flag-day switch, a bidirectional adapter layer connects legacy and split compilation targets.

### Compatibility Matrix

| Dependent Target | Dependency Target | How It Works |
| :--- | :--- | :--- |
| **Legacy** | **Legacy** | Standard legacy project reference resolution via `*-tsconfig.ref.json` / `*-tsconfig.json`. |
| **Legacy** | **Split** | Legacy `ts_library` accepts `ts_deps`, generates references to split compilation's `*-tsconfig.ref.json`, and type-checks against split compilation's emitted `.d.ts`. |
| **Split** | **Legacy** | Split `ts_library_split` specifies `ts_deps = [ "//legacy_target" ]`. Legacy target emits `*-tsconfig.ref.json` and `.d.ts`; split compilation type-checker resolves against them. |
| **Split** | **Split** | Fully decoupled `--isolatedDeclarations` emit and restat caching. |

### Adapter Mechanisms

1. **Dual Config Emission (`*-tsconfig.ref.json`)**:
   `ts_library.py`, `generate-tsconfig.js`, `generate_css.gni`, and `devtools_pre_built` emit `*-tsconfig.ref.json` alongside `*-tsconfig.json`.
2. **Dynamic Project Reference Resolution**:
   References automatically point to `*-tsconfig.ref.json` stubs when available, with fallback to `*-tsconfig.json` for legacy static assets.
3. **GN Syntax Forward Compatibility (`ts_deps`)**:
   `legacy_ts_library` and `legacy_devtools_entrypoint` accept `ts_deps` (unioning with `deps`), allowing GN files to be modernized before flipping compiler modes.
4. **Prebuilt Library Support**:
   `devtools_pre_built` generates `*-tsconfig.ref.json` and exposes `${target_name}_tsconfig_ref` and `${target_name}-dts` aliases so split compilation targets can depend directly on prebuilt libraries.

---

## 3. Step-by-Step Developer Guide for Migrating a Module

When migrating a module from legacy compilation to split compilation, follow these steps:

### Step 1: Update the Module's `BUILD.gn`

1. Set `split_compilation = true` on both `ts_library` and `devtools_entrypoint`:
   ```gn
   ts_library("my_module") {
     split_compilation = true
     sources = [
       "MyClass.ts",
       "MyHelper.ts",
     ]
     ts_deps = [
       "../../core/common:bundle",
       "../../core/i18n:bundle",
     ]
   }

   devtools_entrypoint("bundle") {
     split_compilation = true
     entrypoint = "my_module.ts"
     ts_deps = [ ":my_module" ]
   }
   ```
2. Ensure all TypeScript dependencies are placed in `ts_deps` rather than `deps`.

### Step 2: Compile and Inspect Isolated Declarations Diagnostics

Run autoninja on your target:
```bash
autoninja -C out/Default front_end/panels/my_module:bundle
```

If any exported code lacks explicit types, `tsc` will report `--isolatedDeclarations` (TS9000-series) errors.

### Step 3: Fix `--isolatedDeclarations` Diagnostics

`--isolatedDeclarations` requires explicit types on all public API boundaries so declaration files can be generated without type inference:

#### 1. Explicit Return Types on Exported Functions and Methods
```ts
// BAD:
export function computeTotal(items: number[]) {
  return items.reduce((a, b) => a + b, 0);
}

// GOOD:
export function computeTotal(items: number[]): number {
  return items.reduce((a, b) => a + b, 0);
}
```

#### 2. Explicit Type Annotations on Exported Constants and Variables
```ts
// BAD:
export const DEFAULT_CONFIG = {
  retries: 3,
  timeoutMs: 1000,
};

// GOOD:
export interface Config {
  retries: number;
  timeoutMs: number;
}

export const DEFAULT_CONFIG: Config = {
  retries: 3,
  timeoutMs: 1000,
};
```

#### 3. Export Types Used in Public Signatures
If an exported function or method accepts or returns an interface/type, that interface/type must also be exported:
```ts
// BAD:
interface InternalOptions {
  verbose: boolean;
}
export function runTask(opts: InternalOptions): void {}

// GOOD:
export interface TaskOptions {
  verbose: boolean;
}
export function runTask(opts: TaskOptions): void {}
```

#### 4. Class Property and Static Field Types
Public and protected class properties must have explicit type annotations:
```ts
// BAD:
export class MyView {
  element = document.createElement('div');
  static readonly defaultTimeout = 5000;
}

// GOOD:
export class MyView {
  element: HTMLElement = document.createElement('div');
  static readonly defaultTimeout: number = 5000;
}
```

#### 5. Type Assertions and Literal Types
Use `as const` or explicit type assertions where TypeScript cannot infer literal union or tuple types:
```ts
// BAD:
export const EVENT_NAMES = ['click', 'hover'];

// GOOD:
export const EVENT_NAMES: readonly ['click', 'hover'] = ['click', 'hover'] as const;
```

---

### Step 4: Verification Steps

1. **Build the Target**:
   ```bash
   autoninja -C out/Default front_end/panels/my_module:bundle
   ```

2. **Run Unit Tests**:
   ```bash
   npm run test -- front_end/panels/my_module
   ```

3. **Run Linter**:
   ```bash
   npm run lint -- front_end/panels/my_module
   ```

4. **Format GN Files**:
   ```bash
   gn format front_end/panels/my_module/BUILD.gn
   ```
