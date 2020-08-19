[![Build Status](https://travis-ci.org/wasdk/wasmparser.svg?branch=master)](https://travis-ci.org/wasdk/wasmparser)
[![NPM version](https://img.shields.io/npm/v/wasmparser.svg)](https://www.npmjs.com/package/wasmparser)

Simple streamable WebAssembly binary parser.

## Test

### Compiling Code

```
npm run build
```

### Examples

See the `examples/` folder.

### Running Tests

```
npm test
```

### Creating Tests

Test `.wasm` files are located in the `test/__fixtures__` directory.
The testing harness compares the parsing output of the `.wasm` file against the snapshot file.
You can use the `npm test -- --updateSnapshot` command to update the snapshot file. This is useful if you have made a change that affects the tests.
