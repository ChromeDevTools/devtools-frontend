# parse-imports-exports

[![NPM version][npm-image]][npm-url]
[![minzipped size][size-image]][size-url]
[![code style: prettier][prettier-image]][prettier-url]
[![Conventional Commits][conventional-commits-image]][conventional-commits-url]
[![License MIT][license-image]][license-url]

Fast and easy parser for declarations of [import](https://tc39.es/ecma262/#prod-ImportDeclaration)
and [export](https://tc39.es/ecma262/#prod-ExportDeclaration) from the ECMAScript standard,
with [TypeScript](https://www.typescriptlang.org/docs/handbook/2/modules.html) syntax support.

`parse-imports-exports` works for syntactically correct, well-formatted code (for example, by [prettier][prettier-url]).
Single-line and multi-line ECMAScript comments in `import`/`export` statements are supported.

## Basic example

Imagine a module with the following content:

```ts
/**
 * Imports.
 */
// {Qux: [{start: 17, end: 58, names: {baz: {by: 'foo'}}, types: {Bar: {}}}]}
import {foo as baz, type Bar} from 'Qux';

// {Qux: [{start: 80, end: 112, namespace: 'foo', default: 'Foo'}]}
import Foo, * as foo from 'Qux';

// {Qux: [{start: 114, end: 127}]}
const foo = await import('Qux');

// {Qux: [{start: 128, end, 134}]}
const foo = require('Qux');

// {Qux: [{start: 142, end: 175, names: {Baz: {by: 'Foo'}, Bar: {}}}]}
import type {Foo as Baz, Bar} from 'Qux';

// {Qux: [{start: 201, end: 233, namespace: 'Foo'}]}
import type * as Foo from 'Qux';

// {Qux: [{start: 137, end: 141}]}
type Foo = typeof import('Qux');

/**
 * Reexports.
 */
// {Qux: [{start: 254, end: 295, names: {baz: {by: 'foo'}}, types: {Bar: {}}}]}
export {foo as baz, type Bar} from 'Qux';

// {Qux: [{start: 319, end: 346, namespace: 'foo'}]}
export * as foo from 'Qux';

// {Qux: [{start: 365, end: 385}]}
export * from 'Qux';

// {Qux: [{start: 409, end: 450, names: {Baz: {by: 'Foo'}, Bar: {}}}]}
export type {Foo as Baz, Bar} from 'Qux';

// {Qux: [{start: 478, end: 510, namespace: 'Foo'}]}
export type * as Foo from 'Qux';

// {Qux: [{start: 533, end: 558}]}
export type * from 'Qux';

/**
 * Exports.
 */
// {start: 578, end: 596}
export default 42;

// [{start: 614, end: 644, names: {baz: {by: 'foo'}}, types: {Bar: {}}}]
export {foo as baz, type Bar};

// {foo: {start: 668, end: 689, kind: 'const'}}
export const foo = 2;

// [{start: 711, end: 741, names: {Baz: {by: 'Foo'}, Bar: {}}}]
export type {Foo as Baz, Bar};

// {T: {start: 758, end: 781}}
export type T = number;

// {I: [{start: 803, end: 836}]}
export interface I {
  foo: number;
}

// {N: [{start: 858, end: 891}]}
export namespace N {
  foo: number;
}

// {start: 901, end: 915}
module.exports = 42;

// {foo: {start: 917, end: 931, startsWithModule: true}}
module.exports.foo = 2;
```

Let its content be stored as a string in the variable `source`.
Then it can be parsed like this:

```ts
import {parseImportsExports} from 'parse-imports-exports';

const importsExports = parseImportsExports(source);

// Now `importsExports` has the following shape (the `start` and `end` indices, which indicate
// the beginning and end of the corresponding statement in the source, may differ):
const importsExportsShape = {
  /**
   * Imports.
   */
  // import {foo as baz, type Bar} from 'Qux';
  namedImports: {Qux: [{start: 17, end: 58, names: {baz: {by: 'foo'}}, types: {Bar: {}}}]},

  // import Foo, * as foo from 'Qux';
  namespaceImports: {Qux: [{start: 80, end: 112, namespace: 'foo', default: 'Foo'}]},

  // const foo = await import('Qux');
  dynamicImports: {Qux: [{start: 114, end: 127}]},

  // const foo = require('Qux');
  requires: {Qux: [{start: 128, end: 134}]},

  // import type {Foo as Baz, Bar} from 'Qux';
  typeNamedImports: {Qux: [{start: 142, end: 175, names: {Baz: {by: 'Foo'}, Bar: {}}}]},

  // import type * as Foo from 'Qux';
  typeNamespaceImports: {Qux: [{start: 201, end: 233, namespace: 'Foo'}]},

  // type Foo = typeof import('Qux');
  typeDynamicImports: {Qux: [{start: 137, end: 141}]},

  /**
   * Reexports.
   */
  // export {foo as baz, type Bar} from 'Qux';
  namedReexports: {Qux: [{start: 254, end: 295, names: {baz: {by: 'foo'}}, types: {Bar: {}}}]},

  // export * as foo from 'Qux';
  namespaceReexports: {Qux: [{start: 319, end: 346, namespace: 'foo'}]},

  // export * from 'Qux';
  starReexports: {Qux: [{start: 365, end: 385}]},

  // export type {Foo as Baz, Bar} from 'Qux';
  typeNamedReexports: {Qux: [{start: 409, end: 450, names: {Baz: {by: 'Foo'}, Bar: {}}}]},

  // export type * as Foo from 'Qux';
  typeNamespaceReexports: {Qux: [{start: 478, end: 510, namespace: 'Foo'}]},

  // export type * from 'Qux';
  typeStarReexports: {Qux: [{start: 533, end: 558}]},

  /**
   * Exports.
   */
  // export default 42;
  defaultExport: {start: 578, end: 596},

  // export {foo as baz, type Bar};
  namedExports: [{start: 614, end: 644, names: {baz: {by: 'foo'}}, types: {Bar: {}}}],

  // export const foo = 2;
  declarationExports: {foo: {start: 668, end: 689, kind: 'const'}},

  // export type {Foo as Baz, Bar};
  typeNamedExports: [{start: 711, end: 741, names: {Baz: {by: 'Foo'}, Bar: {}}}],

  // export type T = number;
  typeExports: {T: {start: 758, end: 781}},

  // export interface I {foo: number};
  interfaceExports: {I: [{start: 803, end: 836}]},

  // export namespace N {foo: number};
  namespaceExports: {N: [{start: 858, end: 891}]},

  // module.exports = 42;
  commonJsNamespaceExport: {start, end},

  // module.exports.foo = 2;
  commonJsExports: {foo: {start, end, startsWithModule: true}},
};
```

## Install

Requires [node](https://nodejs.org/en/) version 10 or higher:

```sh
npm install parse-imports-exports
```

`parse-imports-exports` works in any environment that supports ES2018
(because package uses [RegExp Named Capture Groups](https://github.com/tc39/proposal-regexp-named-groups)).

## API

`parse-imports-exports` exports one runtime value — the `parseImportsExports` function:

```ts
import {parseImportsExports} from 'parse-imports-exports';

import type {ImportsExports, Options} from 'parse-imports-exports';

const importsExports: ImportsExports = parseImportsExports('some source code (as string)');
// or with optional options:
const importsExports = parseImportsExports('some source code (as string)', options);

// all option fields are optional boolean with default `false` value
const options: Options = {
  /**
   * If `true`, then we ignore `module.exports = ...`/`(module.)exports.foo = ...` expressions
   * during parsing (maybe a little faster).
   * By default (if `false` or skipped option), `module.exports = ...`/`(module.)exports.foo = ...`
   * expressions are parsed.
   */
  ignoreCommonJsExports: false;
  /**
   * If `true`, then we ignore `import(...)` expressions during parsing (maybe a little faster).
   * By default (if `false` or skipped option), `import(...)` expressions are parsed.
   */
  ignoreDynamicImports: false;
  /**
   * If `true`, then we ignore regular expression literals (`/.../`)
   * during parsing (maybe a little faster).
   * By default (if `false` or skipped option), regular expression literals are parsed.
   */
  ignoreRegexpLiterals: false;
  /**
   * If `true`, then we ignore `require(...)` expressions during parsing (maybe a little faster).
   * By default (if `false` or skipped option), `require(...)` expressions are parsed.
   */
  ignoreRequires: false;
  /**
   * If `true`, then we ignore string literals during parsing (maybe a little faster).
   * By default (if `false` or skipped option), string literals are parsed, that is,
   * the text inside them cannot be interpreted as another expression.
   */
  ignoreStringLiterals: false;
};
```

`parse-imports-exports` also exports types included in the API:

```ts
export type {
  /**
   * Parsed JSON presentation of imports, exports and reexports of ECMAScript/TypeScript module.
   */
  ImportsExports,
  /**
   * Kind of exported declaration.
   */
  Kind,
  /**
   * Options of `parseImportsExports` function.
   */
  Options,
};
```

## License

[MIT][license-url]

[conventional-commits-image]: https://img.shields.io/badge/Conventional_Commits-1.0.0-yellow.svg 'The Conventional Commits specification'
[conventional-commits-url]: https://www.conventionalcommits.org/en/v1.0.0/
[license-image]: https://img.shields.io/badge/license-MIT-blue.svg 'The MIT License'
[license-url]: LICENSE
[npm-image]: https://img.shields.io/npm/v/parse-imports-exports.svg 'parse-imports-exports'
[npm-url]: https://www.npmjs.com/package/parse-imports-exports
[prettier-image]: https://img.shields.io/badge/code_style-prettier-ff69b4.svg 'Prettier code formatter'
[prettier-url]: https://prettier.io/
[size-image]: https://img.shields.io/bundlephobia/minzip/parse-imports-exports 'parse-imports-exports'
[size-url]: https://bundlephobia.com/package/parse-imports-exports
