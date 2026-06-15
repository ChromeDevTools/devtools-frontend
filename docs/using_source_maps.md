# Utilizing Source Maps in DevTools

This document describes how to utilize source maps and translate raw runtime
locations into original source locations inside the DevTools frontend.

DevTools provides a set of high-level abstractions and UI widgets to parse,
symbolize, and render stack traces and errors. Prefer these tools
over manual coordinate translation or raw string parsing.

---

## Central Coordinate Translation: DebuggerWorkspaceBinding

The `DebuggerWorkspaceBinding` class (located in `front_end/models/bindings/`)
acts as the central coordinator for mapping compiled/raw runtime coordinates
to workspace/UI locations. It manages various source mappings (such as source
maps, compiler mappings, and language plugins).

### Translating Raw Locations

To convert a single raw debugger location (with a script ID, line number, and
column number) into an original source location, use:

```ts
const uiLocation = await DebuggerWorkspaceBinding.instance()
    .rawLocationToUILocation(rawLocation);
```

Since source maps may need to be loaded or parsed, this method returns a
`Promise` resolving to `Workspace.UISourceCode.UILocation | null`.

---

## Structured Stack Trace Abstractions

The project organizes stack traces and errors around two primary models:

### 1. StackTrace

Located in `front_end/models/stack_trace/`, a `StackTrace` represents a
structured stack trace. It is composed of:
- **`syncFragment`** (`Fragment`): The synchronous part of the call stack.
- **`asyncFragments`** (`AsyncFragment[]`): Asynchronous call stack segments,
  each with a description (e.g., "Promise.then") and its own frames.

Each frame (`Frame`) contains properties like `url`, `uiSourceCode`, `name`
(translated name), `rawName` (untranslated name), `line`, `column`, and flags
indicating if the frame `isInline`, `isWasm`, or has `missingDebugInfo`.

#### Creating a StackTrace

`DebuggerWorkspaceBinding` provides several helpers depending on your source
format:

*   **From CDP Protocol Stack Trace**:
    ```ts
    const stackTrace = await DebuggerWorkspaceBinding.instance()
        .createStackTraceFromProtocolRuntime(protocolStackTrace, target);
    ```
*   **From Debugger Pause Event**:
    ```ts
    const stackTrace = await DebuggerWorkspaceBinding.instance()
        .createStackTraceFromDebuggerPaused(pausedDetails, target);
    ```
*   **From an Error-Like Stack String**:
    ```ts
    const stackTrace = await DebuggerWorkspaceBinding.instance()
        .createStackTraceFromErrorStackLikeString(target, stackString, exceptionDetails);
    ```

---

### 2. SymbolizedError

Located in `front_end/models/bindings/SymbolizedError.ts`, `SymbolizedError` is
a union type of `SymbolizedErrorObject` and `UnparsableError`. It represents a
fully parsed and symbolized Error object.

*   **`SymbolizedErrorObject`**: Contains the parsed error message (`message`),
    the parsed `ParsedErrorStackTrace` (`stackTrace`), and an optional `cause`
    (`SymbolizedError`), which allows recursive representation of chained
    errors. It also handles special cases like compile-time or eval-time
    `SyntaxError`s, exposing a `syntaxErrorLocation` pointing directly to where
    the parse failed.
*   **`UnparsableError`**: A fallback representation for stack traces that
    cannot be structurally parsed.

#### Creating a SymbolizedError

To resolve a `RemoteObject` (of subtype `error` or type `string`) into a
symbolized representation:

```ts
const symbolizedError = await DebuggerWorkspaceBinding.instance()
    .createSymbolizedError(remoteObject, exceptionDetails);
```

> **Memory Management Note:** Both `StackTrace` and `SymbolizedError` models
> listen to live location updates and must be properly `dispose()`d when no
> longer used to prevent memory leaks.

---

## UI Widgets

To render the above models in the DevTools UI, you should use the following
pre-built widgets instead of constructing your own custom tables or lists:

### 1. StackTracePreviewContent

Located in `front_end/ui/legacy/components/utils/JSPresentationUtils.ts`, this
widget renders a structured `StackTrace` inside a shadow DOM. It automatically
handles collapsible sections (expanded/collapsed) and ignore-listed files or
folders.

#### Usage:

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
```

---

### 2. SymbolizedErrorWidget

Located in `front_end/panels/console/SymbolizedErrorWidget.ts`, this widget is
designed to display a complete `SymbolizedError`, including its parsed message,
any nested `cause` errors (rendered recursively with "Caused by:"), and links for
syntax error locations.

#### Usage:

```ts
import * as Panels from '../../panels/panels.js';
import * as Workspace from '../../models/workspace/workspace.js';

const errorWidget = new Panels.Console.SymbolizedErrorWidget();
errorWidget.error = symbolizedError;
errorWidget.ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager
    .instance();
```

---

## Reaching Out

If none of the existing methods, abstractions, or widgets cover your specific
use-case, or if you need additional capabilities for coordinate/stack trace
symbolization, please **reach out to the DevTools team**. Do not roll your
own coordinate mapping or raw string parsing logic.
