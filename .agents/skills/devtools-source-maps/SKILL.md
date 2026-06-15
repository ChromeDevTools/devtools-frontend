---
name: devtools-source-maps
description: Guidelines for utilizing source maps and structured stack traces in DevTools. Covers DebuggerWorkspaceBinding, StackTrace, SymbolizedError, and related UI widgets.
---

# Utilizing Source Maps & Structured Stack Traces in DevTools

This skill guides you on how to correctly map runtime coordinates to original
source locations and render structured stack traces or symbolized errors in the
DevTools frontend.

---

## 1. Primary Rules
1.  **Never parse raw error stacks manually:** Do not split on newlines or use
    homebrew regex to parse stack traces. Use `DebuggerWorkspaceBinding` helpers
    to structurally parse and translate stack traces.
2.  **Dispose of subscriptions:** Models like `SymbolizedError` subscribe to
    live locations. Always call `.dispose()` when the consumer (e.g., a widget
    or list) is destroyed to avoid memory leaks.
3.  **Prefer pre-built widgets:** Instead of manually formatting or rendering
    call frames, use `StackTracePreviewContent` for raw stacks, and
    `SymbolizedErrorWidget` for complete errors.

---

## 2. Core Abstractions

### A. StackTrace Model (`front_end/models/stack_trace/`)
A structured representation of a call stack (synchronous + asynchronous segments).
*   **`StackTrace`** / **`ParsedErrorStackTrace`** / **`DebuggableStackTrace`**:
    Dispatches a `StackTrace.Events.UPDATED` event when the original sources
    are fully resolved or update.
*   **`Frame`**: Represents a single frame, which contains `uiSourceCode`,
    `url`, line/column info, untranslated `rawName`, translated `name`, and
    inline information.

### B. SymbolizedError Model (`front_end/models/bindings/SymbolizedError.ts`)
A union type representing a fully symbolized error.
*   **`SymbolizedErrorObject`**: Contains error `message`, `stackTrace` (as a
    `ParsedErrorStackTrace`), and an optional `cause` (another
    `SymbolizedError`). Also holds compile/eval `syntaxErrorLocation`.
*   **`UnparsableError`**: Fallback when parsing fails.

---

## 3. Core APIs on DebuggerWorkspaceBinding

### Location Translation
Translates raw coordinates into UI-friendly original source coordinates:
```ts
const uiLocation = await Bindings.DebuggerWorkspaceBinding.instance()
    .rawLocationToUILocation(rawLocation);
```

### StackTrace & Error Generation

*   **From Protocol Stack Trace (Runtime Domain)**:
    ```ts
    const stack = await Bindings.DebuggerWorkspaceBinding.instance()
        .createStackTraceFromProtocolRuntime(protocolStackTrace, target);
    ```
*   **From Debugger Pause details**:
    ```ts
    const stack = await Bindings.DebuggerWorkspaceBinding.instance()
        .createStackTraceFromDebuggerPaused(pausedDetails, target);
    ```
*   **From a Raw Error Stack string**:
    ```ts
    const stack = await Bindings.DebuggerWorkspaceBinding.instance()
        .createStackTraceFromErrorStackLikeString(target, stackString, exceptionDetails);
    ```
*   **From a Remote Error Object**:
    ```ts
    const symbolizedError = await Bindings.DebuggerWorkspaceBinding.instance()
        .createSymbolizedError(remoteObject, exceptionDetails);
    ```

---

## 4. UI Widget Reference

### StackTracePreviewContent
Renders a structured `StackTrace` inside Shadow DOM. Handles expandable UI and
collapsing ignore-listed files.

```ts
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as Workspace from '../../models/workspace/workspace.js';

const preview = new Components.JSPresentationUtils.StackTracePreviewContent();
preview.stackTrace = stackTrace;
preview.options = {
  expandable: true,
  showColumnNumber: true,
  ignoreListManager: Workspace.IgnoreListManager.IgnoreListManager.instance(),
};
this.contentElement.appendChild(preview.element);
```

### SymbolizedErrorWidget
Displays a complete `SymbolizedError` including recursive causal chains
("Caused by: ...") and syntax error locations.

```ts
import * as Panels from '../../panels/panels.js';
import * as Workspace from '../../models/workspace/workspace.js';

const errorWidget = new Panels.Console.SymbolizedErrorWidget();
errorWidget.error = symbolizedError;
errorWidget.ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager
    .instance();
this.contentElement.appendChild(errorWidget.element);
```

---

## 5. Verification Checklist

1.  **Check for Memory Leaks:** Verify `symbolizedError.dispose()` is called
    on consumer widget cleanup.
2.  **Ignore-listing Support:** Ensure widgets have `ignoreListManager` set.
3.  **WASM/Inline Support:** Check that inline and WebAssembly frames map
    correctly via original source maps.
