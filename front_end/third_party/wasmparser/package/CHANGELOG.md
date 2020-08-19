## [3.1.1](https://github.com/wasdk/wasmparser/compare/v3.1.0...v3.1.1) (2020-08-19)


### Bug Fixes

* **threads:** add atomic.fence ([a9fd605](https://github.com/wasdk/wasmparser/commit/a9fd605d175fe91f4991321cd43d0db7868f01df)), closes [/github.com/WebAssembly/wabt/commit/d041025854ba2b00b3df9f308914c8aba05dcda9#diff-25d902c24283ab8cfbac54dfa101ad31](https://github.com//github.com/WebAssembly/wabt/commit/d041025854ba2b00b3df9f308914c8aba05dcda9/issues/diff-25d902c24283ab8cfbac54dfa101ad31)

# [3.1.0](https://github.com/wasdk/wasmparser/compare/v3.0.0...v3.1.0) (2020-07-13)


### Bug Fixes

* make chunked parsing work for element entries ([34d35d0](https://github.com/wasdk/wasmparser/commit/34d35d0820da552963d619ee473877be4e1fbcca)), closes [#22](https://github.com/wasdk/wasmparser/issues/22)


### Features

* add tests for chunked disassembly ([4976b44](https://github.com/wasdk/wasmparser/commit/4976b4404c3e6fcf48481ac205d8b6fc611b2b29))

# [3.0.0](https://github.com/wasdk/wasmparser/compare/v2.2.5...v3.0.0) (2020-06-24)


* revert!: add option to truncate disassembly ([2eb0025](https://github.com/wasdk/wasmparser/commit/2eb002523493efbe286f3661696fa8f4fd31d402)), closes [#30](https://github.com/wasdk/wasmparser/issues/30)


### BREAKING CHANGES

* dropping the `WasmDisassembler#maxLines`
feature that was introduced earlier.

The `WasmDisassembler#maxLines` feature doesn't interact well
with the chunked disassembly machinery, in particular the
logic in `getResult()` to avoid breaking def-use chains for
labels didn't play well with the `maxLines` feature at all
(it would remove `;; -- text is truncated due to size --`
marker when the line limit was reached).

Since there's already support for chunked disassembly built
into wasmparser by design, that should be used instead.

## [2.2.5](https://github.com/wasdk/wasmparser/compare/v2.2.4...v2.2.5) (2020-06-23)


### Bug Fixes

* imports need to use .js suffix to work correctly ([64a7f77](https://github.com/wasdk/wasmparser/commit/64a7f776e896e3c5aea8371456d84d0052b577be))

## [2.2.4](https://github.com/wasdk/wasmparser/compare/v2.2.3...v2.2.4) (2020-06-23)


### Bug Fixes

* rename atomic.notify and *.atomic.wait ([9d10a22](https://github.com/wasdk/wasmparser/commit/9d10a22193e66ac3e953a3722c1c3bf673c00914)), closes [WebAssembly/threads#149](https://github.com/WebAssembly/threads/issues/149)

## [2.2.3](https://github.com/wasdk/wasmparser/compare/v2.2.2...v2.2.3) (2020-06-21)


### Bug Fixes

* correct import from "WasmParser" in "WasmDis.ts" ([8abb34b](https://github.com/wasdk/wasmparser/commit/8abb34b59ec0820259587db07cac95a94a54958e))

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
