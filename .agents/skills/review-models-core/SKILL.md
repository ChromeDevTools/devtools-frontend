---
name: review-models-core
description: >-
  Reviews Chrome DevTools frontend changes in path group models-and-core (^front_end/(core|models|entrypoints|generated)/, BUILD\.gn$, \.gni$),
  strictly reflecting review standards, architectural invariants, and security boundaries
  derived from historical code reviews.
---

# Chrome DevTools frontend reviewer skill: models-and-core

This skill provides review guidance for Chrome DevTools frontend changes matching the `models-and-core` path group (^front_end/(core|models|entrypoints|generated)/, BUILD\.gn$, \.gni$). Every rule below recurred in at least 5 CLs from 2 distinct reviewers in historical reviews; cite the rule id in findings.

## Path group `models-and-core` (10 rules)

### `CORE_TRACE_ENGINE_HANDLER_INVARIANTS`: Normalize and precompute trace events in handler finalize passes using Types.Events.is* guards while keeping raw events immutable
- **Severity**: ERROR
- **Why**: Trace handlers (`front_end/models/trace/handlers/`) must normalize synthetic event fields, validate bounds, and group events once during `finalize()` so downstream insights and UI tracks do not repeatedly filter the raw trace array or mutate raw trace event objects.
- **Look for**: In-place property mutation of raw trace events, repeated full-trace `.filter()` scans inside insight calculators instead of handler precomputation, or ad-hoc property checks instead of `Types.Events.is*` (or `Trace.Types.Events.is*`) type guards.
- **Do not flag**: Constructing new synthetic trace event objects owned by the handler during `finalize()`.

### `CORE_SDK_MODEL_AND_TARGET_LIFECYCLE`: Manage SDK model and sub-target state on scoped manager instances using O(1) indexed maps rather than module globals or linear scans
- **Severity**: ERROR
- **Why**: Storing model tracking collections (`Set`/`Map`) at module scope leaks state across multiple `TestUniverse` instances and targets, while failing to track OOPIF/worker sub-targets or scanning DOM trees linearly for frame nodes causes bugs and $O(N)$ bottlenecks.
- **Look for**: Module-level `const tracked = new Map/Set()` in `core/sdk/` or `models/bindings/`, linear DOM tree traversals for frame/node lookups instead of indexed `Map`s, or target listeners that ignore sub-target attachment/detachment.
- **Do not flag**: Immutable module-level `Set` or `Map` lookup tables of constant string literals. Properties marked required (non-optional) in generated `front_end/generated/protocol.ts` CDP types (do not ask for redundant runtime null/undefined checks on them), or `node.shadowRoots()[0]` accesses (elements have at most one shadow root; the array return type is a legacy Shadow DOM v0 artifact).

### `CORE_GN_BUILD_AND_MODULE_LAYERING`: Enforce strict GN bundle visibility, declare complete deps/ts_deps, and never import UI or panel modules from foundation layers
- **Severity**: ERROR
- **Why**: DevTools enforces a strict DAG where `core/` and `models/` (`foundation`) must never depend on `ui/` or `panels/`. In `BUILD.gn`, modules must depend on `:bundle` targets across directories, register new files in `devtools_grd_files.gni` and `foundation_unittests`, and restrict panel `visibility`.
- **Look for**: Imports of `ui/` or `panels/` inside `core/` or `models/`, `visibility = [ "*" ]` on new panel `BUILD.gn` targets, direct internal file imports across module boundaries instead of `:bundle` namespace imports, or missing `foundation_unittests` entries.
- **Do not flag**: Core utility libraries intentionally exposed to the entire codebase with `visibility = [ "*" ]`.

### `CORE_AI_AGENT_CONTEXT_AND_PROMPT_DISCIPLINE`: Keep AI agent prompts, tool schemas, and data formatters deterministic, token-efficient, and decoupled from UI and locale state
- **Severity**: WARNING
- **Why**: AI agent data formatters (`models/ai_assistance/data_formatters/`) must produce deterministic, unlocalized, concise text representations decoupled from UI widgets and trace insight models, while tools must declare explicit permission policies and flatten verbose CDP types.
- **Look for**: Localized `i18nString` calls or verbose boilerplate prose inside AI data formatters, unsorted flag/property lists in prompt serializers, AI tools missing permission policy declarations, or monolithic trace models passed to response widgets.
- **Do not flag**: User-facing UI labels rendered in the AI assistance panel chrome rather than sent to the LLM.

### `CORE_RUNTIME_NEUTRALITY_AND_PLATFORM_UTILS`: Maintain runtime neutrality in foundation modules using Platform.HostRuntime, globalThis, and centralized core/platform utilities
- **Severity**: ERROR
- **Why**: Foundation modules (`core/` and `models/`) run in both browser DevTools and headless Node.js/worker environments (such as trace analysis and MCP servers). Accessing `window`, `navigator.userAgent`, or `document` directly breaks non-browser runtimes, and duplicating MIME/string/deferred utilities causes subtle bugs.
- **Look for**: `navigator.userAgent`, `window.setTimeout`, `window.atob`, manual `new Promise(r => { resolve = r; })` deferreds instead of `Promise.withResolvers()`, or ad-hoc MIME/escaping regexes in `core/` and `models/`.
- **Do not flag**: Browser-only UI components in `front_end/panels/` or `front_end/ui/`.

### `CORE_CDP_AND_EXTENSION_ERROR_HANDLING`: Handle CDP ProtocolResponseWithError and ContentDataOrError explicitly, release RemoteObject handles in finally blocks, and return Promises
- **Severity**: ERROR
- **Why**: CDP agent calls and `requestContentData()` resolve to error-bearing response objects (`getError()`, `ContentData.isError()`) rather than throwing, so wrapping them in `try/catch` is misleading. Furthermore, temporary `RemoteObject` handles must be released in `finally` blocks, and extension APIs must reject with sanitized `Error` instances.
- **Look for**: `try { await ...invoke_*() }` or `try { await request.requestContentData() }` blocks, `Runtime.evaluate` calls creating `RemoteObject`s without `release()` in `finally`, callback-taking SDK methods instead of `Promise`, or `reject(rawObject)` in `ExtensionAPI.ts`.
- **Do not flag**: `try/catch` blocks that wrap subsequent throwing operations like `JSON.parse()`. Properties marked required (non-optional) in generated `front_end/generated/protocol.ts` CDP types (do not ask for redundant runtime null/undefined checks on them), or `node.shadowRoots()[0]` accesses (elements have at most one shadow root; the array return type is a legacy Shadow DOM v0 artifact).

### `CORE_SECURITY_ORIGIN_AND_CAPABILITY_GUARDS`: Enforce security origin validation, enterprise policy guards, and branded UrlString types in the model and host layers
- **Severity**: ERROR
- **Why**: Security origin checks (SOP), workspace access boundaries, and enterprise/geo-restriction capability checks must be enforced in `core/` and `models/` using `SecurityOrigin`, `Common.ParsedURL`, and `Platform.DevToolsPath.UrlString` rather than relying on UI-layer checks or unvalidated source URLs.
- **Look for**: Unbranded `string` URLs in model/agent interfaces instead of `Platform.DevToolsPath.UrlString`, security origin checks performed only in UI views, or resource lookup errors returned before permission checks in `ExtensionServer`.
- **Do not flag**: Internal display-only label strings that are never used for resource resolution or security checks.

### `CORE_SOURCEMAP_AND_WORKSPACE_MAPPING`: Handle source map parsing, inline script offset translation, and scope tree resolution fault-tolerantly
- **Severity**: ERROR
- **Why**: Real-world source maps and inline `<script>` tags frequently contain malformed fields, UTF-8 characters, or non-zero line/column offsets. Source map consumers must translate raw inline script locations to relative locations, use UTF-8-safe URI encoding (`encodeURIComponent` with `try/catch` instead of `btoa`), and guard scope stack traversals.
- **Look for**: `window.btoa` on source map strings containing UTF-8, raw script locations passed to source map lookups without `rawLocationToRelativeLocation`, or unguarded `encodeURIComponent` / `JSON.parse` on external source map payloads.
- **Do not flag**: ASCII-only binary buffer encoding via `Common.Base64.encode`.

### `CORE_SETTINGS_AND_STORAGE_MIGRATION`: Guard settings and storage migrations with try/catch, preserve user preferences across renames, and clean up obsolete flags
- **Severity**: ERROR
- **Why**: Corrupted `localStorage` payloads or legacy setting schemas can throw during `JSON.parse` and break DevTools startup unless caught and reset. When migrating setting keys or storage formats, existing user selections must be migrated rather than overwritten.
- **Look for**: Unprotected `JSON.parse()` in `Settings.ts` or storage classes, setting key renames that discard previously stored user preferences, or experiment removals that leave orphaned `localStorage` keys behind.
- **Do not flag**: In-memory parsing of static constant JSON fixtures.

### `CORE_TRACE_INSIGHT_MODELS_AND_TIMING_TYPES`: Enforce branded timing types (Micro, Milli) in trace models and keep types.ts and insight models free of executable or presentation logic
- **Severity**: ERROR
- **Why**: Mixing microseconds and milliseconds causes 1000x calculation bugs across trace insights; branded types (`Types.Timing.Micro`, `Types.Timing.Milli`) and canonical conversion helpers (such as `Trace.Helpers.Timing.microToMilli` or `Platform.Timing.microSecondsToMilliSeconds`) prevent unit confusion. Placing executable functions in `types.ts` or UI/AI formatting in insight models violates trace architecture.
- **Look for**: Manual `/ 1000` or `* 1000` arithmetic on trace timestamps, executable functions placed in `models/trace/**/types.ts`, or CSS/DOM/AI markdown formatting inside `models/trace/insights/`.
- **Do not flag**: Type guard functions (`is*`) in `Trace.Types.Events` that only perform type predicate checks.
