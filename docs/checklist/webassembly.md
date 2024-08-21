# Chromium DevTools checklist for WebAssembly features

[https://goo.gle/devtools-wasm-checklist](https://goo.gle/devtools-wasm-checklist)

Implementation of new WebAssembly features should take into account the developer experience in Chromium from the
get-go to ensure a great first impression when it is shipped to developers. This document attempts to list all the
relevant aspects of the developer tools that constitute basic functionality, which should be available when the new
features launch (see [shipping criteria for WebAssembly
features](https://v8.dev/docs/wasm-shipping-checklist#when-is-a-webassembly-feature-ready-to-be-shipped)).

It intentionally doesn't cover extended functionality, which is optional but often desirable, and in some cases
also required for a launch. This includes debugging capabilities specific to the feature in question.

This document is the WebAssembly counterpart to the [Chromium DevTools support checklist for JavaScript language
features](https://goo.gle/v8-checklist), which is specifically about JavaScript language features,

*** note
**IMPORTANT:** Please take a look at the [DevTools UI feature checklist](./ui.md) prior
to changing or extending the DevTools user interface (UI).
***

[TOC]

## Breakpoints and stepping

Chromium DevTools handles breakpoints and stepping via the Liftoff tier in V8.

### Affected

All features that introduce new instructions or change the semantics of existing instructions. These will need to be
explicitly supported in the Liftoff compiler.

### How to test

[User journeys for breakpoints and stepping](https://docs.google.com/document/d/1XBlUbyYfPsn1OuCpq2F-O7E3zvsfa94ZFsiIcnq2w7I#bookmark=id.gxratadmkb83)

Create a `.wasm` file with a function inside that uses the new feature and serve it from a (local) test page, open Chromium DevTools,
select the Sources panel and locate your `.wasm` file in the Page tree. Now try to set a breakpoint in the function with the new
instruction(s), make sure this breakpoint is hit when the function is run the next time, and also very important, check that this also
works upon reload when the relevant code runs during startup. Likewise try to step into the function, through it and out of the function.


## Scope view

The Scope view is part of the Sources panel of the Chromium DevTools, which shows when paused on a breakpoint or during stepping.

### Affected

All features that affect instructions or introduce new instructions or types.

### How to test

[User journeys for the scope view](https://docs.google.com/document/d/1XBlUbyYfPsn1OuCpq2F-O7E3zvsfa94ZFsiIcnq2w7I#bookmark=id.9ki5pf2b90dj)

Create a `.wasm` file with a function inside that uses the new feature and serve it from a (local) test page, open Chromium DevTools,
select the Sources panel and locate your `.wasm` file in the Page tree. Set a breakpoint inside the function with the new / changed
instruction(s) and hit the breakpoint by invoking the function. Now when paused on the function make sure that the Scope view shows
reasonable / correct information.


## Syntax highlighting

Chromium DevTools provides syntax highlighting for WebAssembly disassembly.

### Affected

All features that affect the disassembly in any way, specifically features that introduce new instructions, new types, or change the
disassembly of existing instructions.

### How to test

[User journeys for syntax highlighting](https://docs.google.com/document/d/1XBlUbyYfPsn1OuCpq2F-O7E3zvsfa94ZFsiIcnq2w7I#bookmark=id.sfk1pjqn7d2d)

Create a `.wasm` file that uses the new feature and serve it from a (local) test page, open Chromium DevTools, select the Source panel and
locate your `.wasm` file in the Page tree. The syntax highlighting of the disassembly should look alright. The syntax highlighting is handled
by [CodeMirror](https://codemirror.net/), inside of Chromium DevTools.


## Performance profiling

Chromium DevTools allows developers to take performance traces of their applications via the Performance panel.

### Affected

All features that introduce new instructions or affect the way that WebAssembly functions are executed.

### How to test

[User journeys for performance profiling](https://docs.google.com/document/d/1XBlUbyYfPsn1OuCpq2F-O7E3zvsfa94ZFsiIcnq2w7I/#bookmark=id.huv4j7664qhx)

Create a `.wasm` file with a function inside that uses the new feature and serve it from a (local) test page, open Chromium DevTools, select
the Performance panel. Now run the function a with some significant payload for a reasonable amount of time and take a performance profile.
