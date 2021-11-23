# [5.4.0](https://github.com/wasdk/wasmparser/compare/v5.3.0...v5.4.0) (2021-10-12)


### Bug Fixes

* prevent negative name subsection entry length ([c9eeec7](https://github.com/wasdk/wasmparser/commit/c9eeec7a26d45cf436422a0f20c16dcf14c511bd))


### Features

* add tests for negative name subsection length ([b5d8d83](https://github.com/wasdk/wasmparser/commit/b5d8d83811785c8b3a0877e5e52c01cad4b4951e))

# [5.3.0](https://github.com/wasdk/wasmparser/compare/v5.2.0...v5.3.0) (2021-09-20)


### Bug Fixes

* escape export name strings §6.3.3 ([1c0d874](https://github.com/wasdk/wasmparser/commit/1c0d874bde1544c03661ccfa63575be321eb6f73))


### Features

* add tests for escaped export name strings ([8c27bdf](https://github.com/wasdk/wasmparser/commit/8c27bdf516ab91d63595d0b283e57a9e7762d4fc))
* update GC proposal support to "milestone 4" ([5d63bb6](https://github.com/wasdk/wasmparser/commit/5d63bb6b441ff064abf13559ca308b16c222c18f))

# [5.2.0](https://github.com/wasdk/wasmparser/compare/v5.1.1...v5.2.0) (2021-05-31)


### Features

* implement br_on_non_null too ([e5415ae](https://github.com/wasdk/wasmparser/commit/e5415aed971a6fa1919498dbce5ac537dbf00582))
* implement more instructions ([08c1f87](https://github.com/wasdk/wasmparser/commit/08c1f877d81cb2b7d603b8998e22840deebd1072))

## [5.1.1](https://github.com/wasdk/wasmparser/compare/v5.1.0...v5.1.1) (2021-04-26)


### Bug Fixes

* missing initializer in devtools name generator for exceptions ([a35948b](https://github.com/wasdk/wasmparser/commit/a35948b999aaa375da426714c54e6c86febe4854))

# [5.1.0](https://github.com/wasdk/wasmparser/compare/v5.0.2...v5.1.0) (2021-04-15)


### Features

* add support for "exception handling" proposal ([8dbd8c8](https://github.com/wasdk/wasmparser/commit/8dbd8c8964eae722f011851b35914c1c5b61f9f5))

## [5.0.2](https://github.com/wasdk/wasmparser/compare/v5.0.1...v5.0.2) (2021-03-25)


### Bug Fixes

* **simd:** update wabt.js and remove/unskip simd tests ([#95](https://github.com/wasdk/wasmparser/issues/95)) ([ce582b7](https://github.com/wasdk/wasmparser/commit/ce582b7bfcce15812ac7dd37bcf5aa03933622d5))

## [5.0.1](https://github.com/wasdk/wasmparser/compare/v5.0.0...v5.0.1) (2021-03-04)


### Bug Fixes

* **simd:** update SIMD opcodes ([648fff5](https://github.com/wasdk/wasmparser/commit/648fff52d2a186fb6bee97dc1f37b97640e26fbf))

# [5.0.0](https://github.com/wasdk/wasmparser/compare/v4.0.0...v5.0.0) (2021-02-24)


### Features

* add support for WasmGC proposal ([5d4e5a0](https://github.com/wasdk/wasmparser/commit/5d4e5a0a21f9fc4958c8c1a834c2af49dafd8641))


### BREAKING CHANGES

* IFunctionType is replaced by the more general ITypeEntry.
* Type is now a class; the former enum is now called TypeKind. Several other interfaces now use Type instances instead of numbers to describe types.

# [4.0.0](https://github.com/wasdk/wasmparser/compare/v3.3.1...v4.0.0) (2020-11-03)


### Bug Fixes

* both members of IFunctionBodyOffset are mandatory numbers ([7383b87](https://github.com/wasdk/wasmparser/commit/7383b87960e09844c094588424bc0acb3076838c))


### BREAKING CHANGES

* the `start` and `end` fields of `IFunctionBodyOffset`
were optional members before.

## [3.3.1](https://github.com/wasdk/wasmparser/compare/v3.3.0...v3.3.1) (2020-10-27)


### Bug Fixes

* update data section support ([1dc9f39](https://github.com/wasdk/wasmparser/commit/1dc9f392551153a7f2a45aac280b6af1552c8509))

# [3.3.0](https://github.com/wasdk/wasmparser/compare/v3.2.1...v3.3.0) (2020-10-24)


### Features

* add support for i32x4.dot_i16x8_s ([ebd88d6](https://github.com/wasdk/wasmparser/commit/ebd88d65be345b55170c047231845d964123d46d))
* add support for pmin/pmax ([2f03191](https://github.com/wasdk/wasmparser/commit/2f03191e3df7329d6a44b1de4192f1a1b724744e))
* add support for v128.load32_zero and v128.load64_zero ([51f00f5](https://github.com/wasdk/wasmparser/commit/51f00f5d2b874198b6c057c0dbbe769a7eac1703))

## [3.2.1](https://github.com/wasdk/wasmparser/compare/v3.2.0...v3.2.1) (2020-10-23)


### Bug Fixes

* print opcodes in errors in hexadecimal form ([687ba47](https://github.com/wasdk/wasmparser/commit/687ba47c0cafb5cec040d1bee7796d37f9627071))

# [3.2.0](https://github.com/wasdk/wasmparser/compare/v3.1.3...v3.2.0) (2020-10-13)


### Features

* support some extended name subsections ([d3efc60](https://github.com/wasdk/wasmparser/commit/d3efc60a93326c09502d8bbace5d2d6231df03e3))

## [3.1.3](https://github.com/wasdk/wasmparser/compare/v3.1.2...v3.1.3) (2020-10-12)


### Bug Fixes

* ignore unsupported "name" subsections ([652f0f7](https://github.com/wasdk/wasmparser/commit/652f0f7c79db00edcc21d9049bb73e4d41383740))

## [3.1.2](https://github.com/wasdk/wasmparser/compare/v3.1.1...v3.1.2) (2020-08-26)


### Bug Fixes

* extensions have an leb128 opcode ([#77](https://github.com/wasdk/wasmparser/issues/77)) ([149816c](https://github.com/wasdk/wasmparser/commit/149816c5aa42f7c30bcced7d36742ad9984683fa))

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
