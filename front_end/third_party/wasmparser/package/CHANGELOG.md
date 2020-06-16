## [2.2.2](https://github.com/wasdk/wasmparser/compare/v2.2.1...v2.2.2) (2020-06-16)


### Bug Fixes

* `grow_memory` -> `memory.grow` ([4bf7233](https://github.com/wasdk/wasmparser/commit/4bf7233ba7a50e77831a91a0bcac151b8fdd62e0))

## [2.2.1](https://github.com/wasdk/wasmparser/compare/v2.2.0...v2.2.1) (2020-06-11)


### Bug Fixes

* make `dist/esm` output ES2015 compatible ([f2c16cf](https://github.com/wasdk/wasmparser/commit/f2c16cff1db35fe2bb014e9ab2cafd472d068d82))

# [2.2.0](https://github.com/wasdk/wasmparser/compare/v2.1.0...v2.2.0) (2020-06-10)


### Features

* add support for inline export notation ([c730a88](https://github.com/wasdk/wasmparser/commit/c730a883e888182c155faaf71c4c3972887c9823)), closes [#56](https://github.com/wasdk/wasmparser/issues/56)

# [2.1.0](https://github.com/wasdk/wasmparser/compare/v2.0.0...v2.1.0) (2020-06-10)


### Features

* use abbreviated syntax for all imports ([39ee77c](https://github.com/wasdk/wasmparser/commit/39ee77ce42f579fc7e0e21c73d0eb9158cc20753)), closes [#56](https://github.com/wasdk/wasmparser/issues/56)

# [2.0.0](https://github.com/wasdk/wasmparser/compare/v1.0.0...v2.0.0) (2020-06-10)


### Bug Fixes

* print data section entries in a single line ([e2aa667](https://github.com/wasdk/wasmparser/commit/e2aa667a534f22cb62bdf348f91c01d26ca054a0))


### Features

* remove type section from disassembly ([d61d67d](https://github.com/wasdk/wasmparser/commit/d61d67d6ed0f51651e8bca292d5eb5f3a54626fa)), closes [#56](https://github.com/wasdk/wasmparser/issues/56)


### BREAKING CHANGES

* Disassembly output will no longer print all the
types in the beginning by default.

The type section can be reconstructed from the implicit type
information in the remainder of the disassembly, and is generally
just cognitive overhead for developers, especially in the browser
DevTools (see https://crbug.com/1092763 for relevant downstream
issue in Chromium DevTools). Relying on the implicit type information
is far more readable for humans and also avoids the need to dump all
the types in the beginning, which take up precious space since both
Chromium and Firefox DevTools limit the number of lines that are
displayed for large Wasm modules.

This adds a `skipTypes` option to `WasmDisassembler` instances, which
can be used to restore the old behavior. By default this option is set
to `true`.

This includes a fix to `call_indirect` and `return_call_indirect`,
where we had previously refered to the type by name, and now we
use the abbreviated form for printing types as well [1].

[1]: https://webassembly.github.io/spec/core/text/modules.html#abbreviations
