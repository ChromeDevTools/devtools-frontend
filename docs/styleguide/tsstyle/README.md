# Chromium DevTools TypeScript Style Guide

[goo.gle/devtools-tsstyle](http://goo.gle/devtools-tsstyle) ([go/devtools-tsstyle](http://go/devtools-tsstyle))

By default we assume the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
as the base set of style rules for our TypeScript. Some of the TypeScript style guide limits certain
features based on the Google internal toolchain, we are able to take advantage of certain features
that the Google internal TypeScript developers cannot. This document, therefore, primarily specifies
modifications to the official Google TypeScript style guide.

## Class Members

* Use JavaScript private fields over the TypeScript `private` visibility annotation.
  This ensures that the output JavaScript more closely matches the authored TypeScript.
* Do not use `_` to prefix private fields.
  * TypeScript already knows they are private, and the `#` prior to the field’s name denotes it as private.
  * Note: you will not be able to mix the private visibility modifier with a private field. It will always be private.
* Do not use `_` to prefix private functions.
  * As above, TypeScript already knows they are private.
* Use getters and setters where they make sense.
  * We are transpiling to JavaScript where they remain intact.

## Control flow statements & blocks

* Do not omit curly braces for blocks of code.

## Optimization compatibility

We compile to ESNext in TypeScript. This means that the JavaScript we output is as close to the authored TypeScript as possible.
There is therefore no need to consider transpiling optimizations.

* You may use `const enum` without restriction.

## Decorators

We do not currently support these or plan to add them at this time.

## Imports

* Use `import * as entrypoint from 'path/to/entrypoint/entrypoint.js'` wherever possible
  * This is currently enforced by lint rules.
* Avoid export type. Always export the symbols themselves (which will include the types)
* You are free to use import type, but only do so when importing the symbol would create a circular dependency and when only the types are needed.

## Use of `any`

This is already in the TypeScript style guide, but to reiterate, DevTools code should not use `any` wherever possible. All current instances of any are to manage legacy code, and ideally these will be rewritten or refactored out over time.

## Enums

* Prefer `const enum` whenever possible. `const enum`s are only available at compile time, and at runtime their values are inlined into the code, which helps decrease our bundle size.
  *  This differs from the Google TypeScript Style Guide but they rely on the Closure compiler to optimise the bundle size which we do not.
* Explicitly give enum members a string value: `const enum Foo { A = 'a' }`. This keeps the values much easier to debug than trying to figure which value TypeScript assigned to any member.
* Name enum members in all capitals.

## Other interesting notes

1. [go/typescript-return-only-generics](http://go/typescript-return-only-generics) (Googlers only)
