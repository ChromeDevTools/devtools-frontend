# Web IDL definitions of the web platform

This package contains Web IDL scraped from the latest versions of web platform specifications in [webref](https://github.com/w3c/webref), with fixes applied to ensure all definitions can be parsed and are internally consistent.

# API

The async `listAll()` method resolves with an object where the keys are spec shortnames, and the values are objects with async `text()` and `parse()` methods to get the raw text and the result of parsing that with `WebIDL2.parse`, respectively. Example:

```js
const idl = require('@webref/idl');

const files = await idl.listAll();
for (const [shortname, file] of Object.entries(files)) {
  const text = await file.text();
  const ast = await file.parse();
  // do something with text or ast
}
```

As a shorthand, the async `parseAll()` method resolves with an object where the keys are spec shortnames and the values are the result of parsing the IDL with `WebIDL2.parse`. Example:

```js
const idl = require('@webref/idl');

const parsedFiles = await idl.parseAll();
for (const [shortname, ast] of Object.entries(parsedFiles)) {
  // do something with the ast
}
```

# Guarantees

The following guarantees are provided by this package:
- All IDL files can be parsed by the version of [webidl2.js](https://github.com/w3c/webidl2.js/) used in `peerDependencies` in `package.json`.
- `WebIDL2.validate` passes with the exception of the "no-nointerfaceobject" rule about `[LegacyNoInterfaceObject]`, which is in wide use.
- All types are defined by some specification.
- All extended attributes are defined by some specification.
- No duplicate top-level definitions or members.
- No missing or mismatched types in inheritance chains.
- No conflicts when applying mixins and partials.

The following guarantees are *not* provided:
- Extended attribute *values* are not validated.
- Generally no other guarantees except the ones enforced by tests.
