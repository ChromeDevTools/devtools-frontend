# Chromium DevTools support checklist for JavaScript language features

[goo.gle/v8-checklist](https://goo.gle/v8-checklist)

Implementation for new language features (NLF) are often intrusive and affect many parts of
[V8](https://v8.dev). This sometimes causes the debugger to not work seamlessly with the NLF
out of the box. We generally make the distinction between _Basic functionality_ and _Extended
functionality_ when talking about debugger support:

- Basic functionality is required for every NLF in order to launch. The debugger must not crash
  or act in a confusing way when interacting with the NLF. For example, stepping into a `Proxy`
  trap handler should be possible.
- Extended functionality is often just nice-to-have, but in some cases required for launch.
  This includes debugging capabilities specific to the language feature. For example, catch
  prediction should work as expected for `Promise`s.

This document attempts to list all relevant aspects of V8’s JavaScript debugger that constitute
basic functionality (checkout [this document](https://goo.gle/devtools-wasm-checklist) for V8's
WebAssembly debugger features). Items on the list may not apply to every language feature,
depending on its nature.

*** note
**IMPORTANT:** Please take a look at the [DevTools UI feature checklist](./ui.md) prior
to changing or extending the DevTools user interface (UI).
***

[TOC]

## Console printing

DevTools offers a REPL through the Console panel. Logging a value should print reasonable output.

### Affected

All NLFs that affect how values should be printed in a REPL, such as NLFs that introduce new primitives, new `RegExp` flags, etc.

### How to test

Open DevTools, select the Console panel, and enter a source snippet with the NLF. The printed result should look alright.

### Reading material

[Example CL that adds printing support for a new `RegExp` flag](https://chromium-review.googlesource.com/c/v8/v8/+/2848460)


## Syntax highlighting and pretty-printing

DevTools provides syntax highlighting and pretty-printing for JavaScript sources.

### Affected

All NLFs that introduce new syntax.

### How to test

Open DevTools, select the Sources panel, and create a new source snippet with the NLF. The syntax highlighting of the source
should look alright. This is handled by [CodeMirror](https://codemirror.net/) inside of Chromium DevTools.

Clicking on the pretty-printing button on the bottom left ("{}") should yield reasonable results. The formatting relies on the
[acorn](https://github.com/acornjs/acorn) parser, which needs to support the NLF in question for this to work.


## Stack traces

Stack traces is the most often used way for developers to debug issues. Aside from the default `Error.stack` string, we also
offer a way for user code to override how to format the `stack` property, and collect a more detailed structured stack trace
for DevTools.

Sometimes, due to the way a feature is implemented, there may be stack frames that show up on the stack trace when they should
not, or vice versa.

For runtime exceptions, we look for the closest code position that has a source position attached. That source position is used
as expression position for the exception. For syntax errors, we should report the correct location of the syntax error via
[`MessageHandler::ReportMessage()`](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/execution/messages.h;l=174-176;drc=4e40b002b46c019d18eae68b5e5a342605609d95).

Note that `Error.stack` is only collected for `Error` objects, at the time the `Error` object is constructed. This may be different
than the stack trace passed to DevTools via [`JSMessageObject`](https://source.chromium.org/chromium/chromium/src/+/main:v8/src/objects/js-objects.h;l=1264-1345;drc=82dff63dbf9db05e9274e11d9128af7b9f51ceaa).

Independently from V8, DevTools offers a way to show async stack traces by stitching together stack traces collected at the
location where the callback is passed, and the actual location of the exception inside the callback.

### Affected

NLFs that can cause an exception to be thrown, or can call into another function that throws.

### How to test

When throwing inside the NLF, or with it on the stack, the stack trace including source positions should make sense. Also check
the structured stack trace when the exception is not caught and logged into Chrome's DevTools console.

Repeat with the "Disable async stack traces" checkbox in the Preferences checked.

### Test cases

Test cases for stack traces is mandatory, if there is any way the NLF can interact with throwing exceptions. For examples look
for `mjsunit` tests with `stack-trace` in their names.

For async stack traces, please look at Blink LayoutTests such as [this one](https://chromium.googlesource.com/chromium/src/+/3daa588ce613845e298cbd667fa6f5787f95d574/third\_party/WebKit/LayoutTests/inspector/sources/debugger-async/async-await/async-callstack-async-await.html).

### Reading material

[Design doc for debugging support for tail-calls](https://docs.google.com/a/google.com/document/d/1Bk4QahtaT-XzrMlHTkm0SVol3LoKXTrC9E7INxJBHrE/edit?usp=drive\_web)


## Catch prediction

Aside from offering stack traces, V8's debugger supports DevTools' pause-on-exception feature. This comes in two flavors:
pause on all exceptions, and pause on uncaught exceptions. In both cases, we break at the throw site (not at the `catch`,
or any rethrow via `try`-`finally`).

For the former, this is as easy as breaking in the debugger on `Isolate::Throw()`. For the latter, we have to predict whether
the thrown exception will be caught or otherwise handled (for example by a `Promise`'s catch handler).

### Affected

NLFs that can cause an exception to be thrown, or can call into another function that throws.

### How to test

When pause-on-exception is enabled, and throwing inside the NLF or with it on the stack, the script should pause as expected.

Repeat with the "pause on caught exception" checkbox checked.

### Test cases

Test cases for exception prediction is mandatory, if there is any way the NLF can interact with exceptions, be it by throwing
exceptions, or by relying on `try`-`catch` or `try`-`finally` in its implementation. Look for `mjsunit` tests that contain the
string `setBreakOnException` or `setBreakOnUncaughtException`.

### Reading material

[Design doc for exception prediction for async-await](https://docs.google.com/a/google.com/document/d/1ef1drN6RTRN7iDB8FXJg\_JJZFNObCFbM1UjZWK\_ORUE/edit?usp=drive\_web)


## Breakpoints

One of the most important features is setting break points. The semantics should be obvious.

Break locations are function calls, return sites, and statements. Special care are necessary for loops: for example, in `for`-loops
we do want to be able to break separately at the loop entry, condition evaluation, and increment.

When setting a break point at an arbitrary source position, we actually check for the closest breakable source position, and move
the break point there. Consecutive debug break events at the same source position are ignored by the debugger.

### Affected

NLFs that change generated code, and especially once that introduce new break locations.

### How to test

Open DevTools and set break points in parts of script related to the NLF, then run the script.

### Test cases

Look for `mjsunit` tests with `debug-break` in their names.


## Stepping

Stepping is the logical consequence to breakpoints, and is based on the same mechanism in the debugger. We differentiate between

* Step out, which takes us to the next break location in the caller.
* Step next, which takes us to the next break location while ignoring calls into other functions. Note that this includes recursive
  calls. Step next at a return site is equivalent to a step out.
* Step in, which takes us to the next break location including calls into another function.
* Step frame, which takes us to another function, either a callee or a caller. This is used for framework blackboxing, where the V8
  inspector is not interested in stepping in the current function, and wants to be notified once we arrive at another function

### Affected

NLFs that are affect breakpoints

### How to test

Break inside the part of script related to the NLF, and try stepping in, next, and out.

### Test cases

Look for `mjsunit` tests with `debug-step` in their names.

### Reading material

[Design doc on stepping in async-await](https://docs.google.com/a/google.com/document/d/1nj3nMlQVEFlq57dA-K8wFxdOB5ovvNuwNbWxBhcBOKE/edit?usp=drive\_web)


## Frame inspector

The frame inspector in V8 offers a way to a way to introspect frames on the call stack at the debug break. For the top-most frame,
the break location is that of the debug break. For frames below the break location is the call site leading to the frame above.

For each frame, we can

- inspect the scope chain at the break location with the scope iterator,
- find out whether it's called as constructor,
- find out whether we are at a return position,
- get the function being called,
- get the receiver,
- get the arguments, and
- get the number of stack-allocated locals.

For optimized code, we use the deoptimizer to get hold of receiver, arguments and stack locals, but this is often not possible, and we
get the `optimzed_out` sentinel value.

### Affected

NLFs that affect the way V8 calls functions.

### How to test

When paused inside the function affected by the NLF, the Call Stack view in the DevTools' Source panel should show useful information.

### Test cases

Take a look at `test/mjsunit/wasm/frame-inspection.js`.


## Scope iterator

The scope iterator in V8 offers a way to introspect the scope chain at the break location. It includes not only the scopes outside of
the current function, but also scopes inside it, for example inner block scopes, catch scopes, with scopes, etc.

For each scope inside the current function, we can materialize an object representing local variables belonging to it. For scopes
outside the current function this is not possible.

We can use the scope iterator to alter the value of local variables, unless we are inside an optimized frame.

### Affected

NLFs that introduce new scopes.

### How to test

When paused in DevTools inside the scope introduced by the NLF, the "Scope" view on the Sources panel should show useful information.
Scopes that are introduced by the NLF for desugaring purposes may better be hidden.

### Test cases

Take a look at `test/mjsunit/debug-scopes.js`.

### Reading material

[CL that introduces hidden scopes](https://chromium.googlesource.com/v8/v8/+/672983830f36222d90748ff588831b6dae565c38)


## Debug evaluate

With debug-evaluate, V8 offers a way to evaluate scripts at a break, attempting to behave as if the script code was executed
right at the break location. It is based on the frame inspector and the scope iterator.

It works by creating a context chain that not only references contexts on the current context chain, but also contains the
materialized stack, including arguments object and the receiver. The script is then compiled and executed inside this context chain.

There are some limitations, and special attention has to be paid to variable name shadowing.

Side-effect-free debug-evaluate statically determines whether a function should throw. You should check whether to update the
whitelist in `src/debug/debug-evaluate.cc`.

### Affected

NLFs that are also affected by the scope iterator and frame inspector.

### How to test

Use the DevTools console to run scripts at a debug break. In particular the preview shown in the DevTools console by default indicates
whether the side-effect detection works correctly (i.e. whether you updated the whitelist correctly).

### Test cases

Look for mjsunit tests with "debug-evaluate" in their names.

### Reading material

This [tea-and-crumpets](https://drive.google.com/file/d/0BwPS\_JpKyELWTXV4NGZzS085NVE/view) [presentation](https://docs.google.com/a/google.com/presentation/d/18-c04ri-Whcp1dbteVTqLtK2wqlUzFgfU4kp8KgyF3I/edit?usp=drive\_web)

Debug-evaluate without side effect [doc](https://docs.google.com/document/d/1l\_JzDbOZ6Cn1k0c5vnyEXHe7B2Xxm7lROs1vYR3nR2I/edit) and [presentation](https://docs.google.com/presentation/d/1u9lDBPMRo-mSQ6mmO03ZmpIiQ-haKyd9O4aFF0nomWs/edit)


## Code Coverage

Code coverage gathers execution counts and exposes them to developers through the Inspector protocol.

### Affected

NLFs that contain control flow (e.g branches, loops, etc.).

### How to test

Run `d8` with `--lcov` and check whether the produced coverage information is correct. E.g. like this:

```
./d8 --lcov=cov.info test.js
genhtml cov.info -o coverage
```

Then navigate your browser to `coverage/index.html`.

### Test cases

`test/mjsunit/code-coverage-block.js`

### Reading material

Design doc: [go/v8-designdoc-block-code-coverage](http://go/v8-designdoc-block-code-coverage)


## Heap profiler

The heap profiler is a tool usually used to find out what is taking so much memory, and find potential memory leaks. It is an object graph visitor.

### Affected

NLFs that change object layouts or introduce new object types

### How to test

Take a heap Snapshot in DevTools' Profiler panel and inspect the result. Objects related to the NLF should fan out to all objects it references to.

### Test cases

Take a look at `test/cctest/test-heap-profiler.cc`.


## LiveEdit

LiveEdit is a feature that allows for script content to be replaced during its execution. While it has many limitations, the most often use case
of editing the function we are paused in and restarting said function usually works.

### Affected

NLFs that affect code execution

### How to test

Open DevTools and break inside the part of script affected by the NLF. In the Source panel's Call Stack view, right-click the top-most frame and select
Restart Frame.

### Test cases

Look for `mjsunit` tests with `liveedit` in their names.
