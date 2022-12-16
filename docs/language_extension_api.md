# Language Extensions and the Language Extension API

_Note: language extensions are currently experimental and only supported for WebAssembly targets._

This document describes language extensions, language extension plugins, and the associated extension API. Language
extensions provide DevTools with capabilities that serve a similar purpose as
sourcemaps, but support a more general set of features[^1]. In addition to regular line mapping, they facilitate
reasoning about inlined functions and complex variable transformations. This enables debugging of compiled targets in
terms of the original source, for example for C++ compiled to WebAssembly. Currently only WebAssembly targets are
supported.

Language extensions are regular Chrome DevTools extensions that register one or more language plugins which implement
the language extension API that is described in detail below. When a new script is loaded, registered plugins are
consulted to find one that supports the particular script type. The script is associated to the found plugin and the
association is fixed, meaning that DevTools will make all subsequent "debugging" queries to that plugin.

In the following, we describe the Chrome extension APIs offered by DevTools for language extensions. For a precise
definition of the interface, consult the TypeScript [definition file](../extension-api/ExtensionAPI.d.ts). All APIs are
async and are expected to return promises.

[^1] In particular, sourcemaps support can be implemented in a language extension.

## Registration
Plugins are registered by calling `chrome.devtools.languageServices.registerLanguageExtensionPlugin`, and unregistered
by calling `chrome.devtools.languageServices.unregisterLanguageExtensionPlugin`. Along with the plugin instance itself
and a name, the registration also includes the supported script type, defined by the `language` (currently the only
supported one is `"WebAssembly"`) and the `symbol_type`, an array of the types of debug symbols supported by the plugin.
(the currently available values are `"EmbeddedDWARF"` and `"ExternalDWARF"`).

When a new script or "raw module" is loaded that is matched to a plugin, DevTools will call the plugin's `addRawModule`
function, passing a new module identifier, an optional URL to an external symbols file, and the raw module itself. The
raw module is passed as an object with the property `url` containing the script url and optionally a `code` property
containing the script contents (since only WebAssembly is supported currently, the contents will be an ArrayBuffer of
the WebAssembly bytecode). For WebAssembly, the external symbols file URL is the "separate DWARF" URL contained in the
wasm module. The `addRawModules` function is expected to return an array of source file URLs. In case the module's debug
information is incomplete, this can be reported by returning the URLs of missing or incomplete symbol files which
DevTools will present to the user (as an object with a single `missingSymbolFiles` property containing an array of
URLs).

When a script is unloaded, DevTools will call `removeRawModule` passing the raw module identifier.

## Mapping Lines

Two plugin methods provide mapping between locations in the source files and in the raw module,
`sourceLocationToRawLocation` and `rawLocationToSourceLocation`. A "source location" is an object with the properties
`rawModuleId`, `sourceFileURL`, `lineNumber`, and `columnNumber` with the natural semantics and zero-based line and
column numbers. Note that the former function does not return a single raw location but a range of locations. A range of
raw locations is given by an object with the properties `rawModuleId`, `startOffset`, and `endOffset`, where the offsets
denotes wasm bytecode positions (the end is exclusive). A "raw location" as it is expected by the second function is an
object with the properties `rawModuleId`, `codeOffset`, and `inlineFrameIndex` where the code offset denotes the wasm
bytecode position. The `inlineFrameIndex` is used to identify the virtual call frame if the bytecode position belongs to
a source function that was inlined into the caller(s). The inlined calls form a virtual call stack with the zeroth frame
denoting the innermost function.

In order to identify which lines of a source file it can possibly set breakpoints in, DevTools will call the
`getMappedLines` function passing the raw module identifier and the source file URL. The function returns an array of
zero-based line numbers.

## Dealing with Inlined Functions

As was already alluded to above, language extensions provide information on inlined function calls. This allows DevTools
to reconstruct the call stack in terms of the source language, even if actual call instructions where elided during
compilation. This is necessary in two situations: displaying and navigating the call stack when paused, and stepping
through the code.

The `getFunctionInfo` function is called when forming the call stack. For a given raw location, it returns an array of
function details, which contain a single property, `name`, with one element for every inlined function call plus the
actual containing function of the location. The zero-th element refers to the innermost function. Alternatively, the
function can also return information on missing symbol files in case this is only detected lazily (as above, as an
object with a single `missingSymbolFiles` property containing an array of URLs)

Two functions are necessary to help with stepping, `getInlinedFunctionRanges` and `getInlinedCalleesRanges`. Both take a
single raw location as argument and return a raw location range. The former function is used to "step out" of an inline
function and returns all location ranges that pertain to the inline function, for the debugger to continue past the
inner functions code. The second function is used when "stepping over" inlined calls. It returns all raw location ranges
for all inline callees for the function (or inline frame) that the given raw location is in.

## Variables and Expressions

When paused, DevTools will populate the Scope View with all variables in the current scope using the
`listVariablesInScope` which takes a raw location argument. It returns an array of variable details, which is an object
with the string properties `scope`, `name`, `type`, and optionally `nestedName` which is an array of nested namespace
names incase the variable has a fully qualified name.

The scope property returns the name of the scope that the variable lives in. Additional information on a scope can be
provided by name via the `getScopeInfo` function, which returns an object with string properties `type`, `typeName`, and
optionally `icon` which contains a data URL encoding an icon for DevTools to show for the scope entry. The scope type is
expected to be identical to the scope name, whereas `typeName` is expected to contain a human readable name or
description for the scope.

In order to display the value of variables or the result of an expression, DevTools will call the `evaluate` function,
whose arguments are the expression, the context raw location, and a `stopId` which is an opaque identifier denoting the
current evaluation context (which is, roughly, the current pause iteration and the selected call frame). The function
returns either `null` if the expression can't be evaluated, or a remote object for the result (as described
[below](#remote-objects)). The `stopId` identifier is a safety measure necessary because remote objects return content
lazily. It helps to avoid reading stale data when the debugger continues or the user selects a different call frame.

## Remote Objects

Language extension remote objects resemble CDP remote objects. They contain the same fields `type`, `className`,
`value`, `description`, and `objectId` with identical semantics: The type can be one of `"object"`, `"undefined"`,
`"string"`, `"number"`, `"boolean"`, `"bigint"`, `"array"`, or `"null"`, the class name, value, and description are what
is shown in the scope view, and the object identifier is used in the other two methods below. The additional
`hasChildren` property indicates whether the remote object describes a value with children (e.g., elements, pointees, or
class members). Lastly, the properties `linearMemoryAddress` and `linearMemorySize` reveal the value's address and size
in the wasm linear memory, respectively. With the exception of `type` and `hasChildren`, all properties are optional.

To work with remote objects returned by the `evaluate` function, plugins implement the `getProperties` and
`releaseObject` functions which both take a remote object identifier as argument. The latter function releases an
object, indicating that the plugin can free associated resources. The former function will return the children of a
remote object in the form of an array of `name`, `value` objects where the name is the member name and the value is a
remote object describing the member.

## Accessing State

For plugins to evaluate expressions, access to the current state of the paused WebAssembly execution is required (e.g.,
to the wasm linear memory). The DevTools extension API offers four functions for this: `getWasmLinearMemory`,
`getWasmLocal`, `getWasmGlobal`, and `getWasmOp`. Besides the obvious parameters (address and length, or index), these
functions take a `stopId` argument which must be the same value passed during a call to `evaluate`. The calls will fail
if the identifier is unknown or was invalidated (e.g., when the debugger has continued execution). The first function
returns an ArrayBuffer containing the requested memory contents, and the latter three return a wasm value, i.e., an
object with the wasm `type` and `value`.
