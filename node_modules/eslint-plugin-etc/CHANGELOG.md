<a name="2.0.3"></a>

## [2.0.3](https://github.com/cartant/eslint-plugin-etc/compare/v2.0.2...v2.0.3) (2023-05-10)

## Fixes

- Widen the TypeScript peer dependency. ([0b4f07d](https://github.com/cartant/eslint-plugin-etc/commit/0b4f07d))

<a name="2.0.2"></a>

## [2.0.2](https://github.com/cartant/eslint-plugin-etc/compare/v2.0.1...v2.0.2) (2022-01-22)

## Fixes

- Don't flag multi-line comments with a single word on each line as code. ([ed13864](https://github.com/cartant/eslint-plugin-etc/commit/ed13864))

<a name="2.0.1"></a>

## [2.0.1](https://github.com/cartant/eslint-plugin-etc/compare/v2.0.0...v2.0.1) (2021-11-08)

## Fixes

- Don't effect failures in the `throw-error` rule when `unknown` is thrown. See [this issue](https://github.com/cartant/eslint-plugin-etc/issues/39). ([88494f2](https://github.com/cartant/eslint-plugin-etc/commit/88494f2))

<a name="2.0.0"></a>

## [2.0.0](https://github.com/cartant/eslint-plugin-etc/compare/v1.5.4...v2.0.0) (2021-10-17)

## Breaking Changes

- Support `eslint` v8 and `@typescript-eslint` v5. ([c827e02](https://github.com/cartant/eslint-plugin-etc/commit/c827e02))

<a name="1.5.4"></a>

## [1.5.4](https://github.com/cartant/eslint-plugin-etc/compare/v1.5.3...v1.5.4) (2021-07-02)

## Fixes

- Deem binary expressions, identifiers and literals to be non-code in the `no-commented-out-code` rule. ([3317531](https://github.com/cartant/eslint-plugin-etc/commit/3317531))

<a name="1.5.3"></a>

## [1.5.3](https://github.com/cartant/eslint-plugin-etc/compare/v1.5.2...v1.5.3) (2021-06-30)

## Fixes

- Fix false positives for trivial comments in interfaces with the `no-commented-out-code` rule. ([c948008](https://github.com/cartant/eslint-plugin-etc/commit/c948008))

<a name="1.5.2"></a>

## [1.5.2](https://github.com/cartant/eslint-plugin-etc/compare/v1.5.1...v1.5.2) (2021-06-16)

## Changes

- Replace the use of `RegExp` to identify comments that can be parsed that aren't really commented-out code. ([03517cc](https://github.com/cartant/eslint-plugin-etc/commit/03517cc))

<a name="1.5.1"></a>

## [1.5.1](https://github.com/cartant/eslint-plugin-etc/compare/v1.5.0...v1.5.1) (2021-06-16)

## Fixes

- Deem labeled statements to be non-code in the `no-commented-out-code` rule. ([e64c8e2](https://github.com/cartant/eslint-plugin-etc/commit/e64c8e2))

<a name="1.5.0"></a>

## [1.5.0](https://github.com/cartant/eslint-plugin-etc/compare/v1.4.1...v1.5.0) (2021-05-27)

## Features

- Add the `prefer-less-than` rule. ([17fafab](https://github.com/cartant/eslint-plugin-etc/commit/17fafab))

<a name="1.4.1"></a>

## [1.4.1](https://github.com/cartant/eslint-plugin-etc/compare/v1.4.0...v1.4.1) (2021-05-27)

## Fixes

- Support TypeScript 4.3 in the  `no-deprecated` and `no-internal` rules. ([43fe310](https://github.com/cartant/eslint-plugin-etc/commit/43fe310))

<a name="1.4.0"></a>

## [1.4.0](https://github.com/cartant/eslint-plugin-etc/compare/v1.3.8...v1.4.0) (2021-04-15)

## Features

- Add `underscore-internal` rule. ([540574e](https://github.com/cartant/eslint-plugin-etc/commit/540574e))

<a name="1.3.8"></a>

## [1.3.8](https://github.com/cartant/eslint-plugin-etc/compare/v1.3.7...v1.3.8) (2021-03-30)

## Fixes

- Support `// #endregion` comments in `no-commented-out-code`. ([6cb6d67](https://github.com/cartant/eslint-plugin-etc/commit/6cb6d67))

<a name="1.3.7"></a>

## [1.3.7](https://github.com/cartant/eslint-plugin-etc/compare/v1.3.6...v1.3.7) (2021-03-22)

## Fixes

- Set minimum `eslint-etc` version. ([fadbbf4](https://github.com/cartant/eslint-plugin-etc/commit/fadbbf4))

<a name="1.3.6"></a>

## [1.3.6](https://github.com/cartant/eslint-plugin-etc/compare/v1.3.5...v1.3.6) (2021-03-20)

## Fixes

-   Support multiple `@deprecated` and `@internal` tags in the `no-deprecated` and `no-internal` rules. ([20eb236](https://github.com/cartant/eslint-plugin-etc/commit/20eb236))
-   Enable TypeScript's `strict` option and fix related problems. ([826953c](https://github.com/cartant/eslint-plugin-etc/commit/826953c))

<a name="1.3.5"></a>

## [1.3.5](https://github.com/cartant/eslint-plugin-etc/compare/v1.3.4...v1.3.5) (2021-03-14)

## Fixes

-   New lines and excess whitespace are now striped from deprecations reported by the `no-deprecated` rule. ([16d19d0](https://github.com/cartant/eslint-plugin-etc/commit/16d19d0))

<a name="1.3.4"></a>

## [1.3.4](https://github.com/cartant/eslint-plugin-etc/compare/v1.3.3...v1.3.4) (2021-03-11)

## Fixes

-   Match non-Latin characters in the `no-commented-out-code` rule to avoid more false positives. ([9a7411a](https://github.com/cartant/eslint-plugin-etc/commit/9a7411a))

<a name="1.3.3"></a>

## [1.3.3](https://github.com/cartant/eslint-plugin-etc/compare/v1.3.2...v1.3.3) (2021-02-18)

## Changes

-   Tweaked the `no-commented-out-code` rule to find more comments. ([15648f5](https://github.com/cartant/eslint-plugin-etc/commit/15648f5))

<a name="1.3.2"></a>

## [1.3.2](https://github.com/cartant/eslint-plugin-etc/compare/v1.3.1...v1.3.2) (2021-02-11)

## Fixes

-   Ignore whitespace-only comments in the `no-commented-out-code` rule. ([4cfccfa](https://github.com/cartant/eslint-plugin-etc/commit/4cfccfa))

<a name="1.3.1"></a>

## [1.3.1](https://github.com/cartant/eslint-plugin-etc/compare/v1.3.0...v1.3.1) (2021-02-11)

## Fixes

-   Ignore some basic, unintentionally-parsable comments in the `no-commented-out-code` rule. ([b1263e7](https://github.com/cartant/eslint-plugin-etc/commit/b1263e7))

<a name="1.3.0"></a>

## [1.3.0](https://github.com/cartant/eslint-plugin-etc/compare/v1.2.0...v1.3.0) (2021-02-10)

## Features

-   Add a `no-commented-out-code` rule. ([4a7cbc5](https://github.com/cartant/eslint-plugin-etc/commit/4a7cbc5))

<a name="1.2.0"></a>

## [1.2.0](https://github.com/cartant/eslint-plugin-etc/compare/v1.1.10...v1.2.0) (2021-02-06)

## Features

-   The `prefer-interface` rule now has an `allowIntersection` option that - when set to `false` - will replace intersection type aliases with interface extensions. See the [docs](https://github.com/cartant/eslint-plugin-etc/blob/main/docs/rules/prefer-interface.md) for more information. ([12fab8d](https://github.com/cartant/eslint-plugin-etc/commit/12fab8d))

<a name="1.1.10"></a>

## [1.1.10](https://github.com/cartant/eslint-plugin-etc/compare/v1.1.9...v1.1.10) (2021-02-05)

## Fixes

-   Support `Array` constructors in `no-assign-mutated-array`. ([a5837e5](https://github.com/cartant/eslint-plugin-etc/commit/a5837e5))

<a name="1.1.9"></a>

## [1.1.9](https://github.com/cartant/eslint-plugin-etc/compare/v1.1.8...v1.1.9) (2021-02-03)

## Fixes

-   Support arrow functions without parameter parentheses in `no-implicit-any-catch`. ([f4f4089](https://github.com/cartant/eslint-plugin-etc/commit/f4f4089))

<a name="1.1.8"></a>

## [1.1.8](https://github.com/cartant/eslint-plugin-etc/compare/v1.1.7...v1.1.8) (2021-01-11)

## Changes

-   Fix GitHub URL to docs. ([0add586](https://github.com/cartant/eslint-plugin-etc/commit/0add586))

<a name="1.1.7"></a>

## [1.1.7](https://github.com/cartant/eslint-plugin-etc/compare/v1.1.6...v1.1.7) (2020-11-28)

## Changes

-   Use `files` in `package.json` instead of `.npmignore`. ([5ace4c7](https://github.com/cartant/eslint-plugin-etc/commit/5ace4c7))

<a name="1.1.6"></a>

## [1.1.6](https://github.com/cartant/eslint-plugin-etc/compare/v1.1.5...v1.1.6) (2020-11-03)

## Changes

-   Update rule metadata.

<a name="1.1.5"></a>

## [1.1.5](https://github.com/cartant/eslint-plugin-etc/compare/v1.1.4...v1.1.5) (2020-10-28)

## Changes

-   Removed `no-misused-generics` from the recommended set of rules. ATM, it's too likely that the rule will emit false-positive failures - see [#15](https://github.com/cartant/eslint-plugin-etc/issues/15) and [#24](https://github.com/cartant/eslint-plugin-etc/issues/24).

<a name="1.1.4"></a>

## [1.1.4](https://github.com/cartant/eslint-plugin-etc/compare/v1.1.3...v1.1.4) (2020-10-27)

## Fixes

-   Include any signature type parameters in `prefer-interface` fixer output for function types. ([aaebbd9](https://github.com/cartant/eslint-plugin-etc/commit/aaebbd9))

<a name="1.1.3"></a>

## [1.1.3](https://github.com/cartant/eslint-plugin-etc/compare/v1.1.2...v1.1.3) (2020-10-27)

## Fixes

-   Include type parameters in `prefer-interface` fixer output for function types. ([8762605](https://github.com/cartant/eslint-plugin-etc/commit/8762605))

<a name="1.1.2"></a>

## [1.1.2](https://github.com/cartant/eslint-plugin-etc/compare/v1.1.1...v1.1.2) (2020-10-27)

## Fixes

-   Include type parameters in `prefer-interface` fixer output. ([d90b938](https://github.com/cartant/eslint-plugin-etc/commit/d90b938))

<a name="1.1.1"></a>

## [1.1.1](https://github.com/cartant/eslint-plugin-etc/compare/v1.1.0...v1.1.1) (2020-10-27)

## Changes

-   Specify Node 10 as the minimum `engines` in `package.json` and downlevel to ES2018.

<a name="1.1.0"></a>

## [1.1.0](https://github.com/cartant/eslint-plugin-etc/compare/v1.0.2...v1.1.0) (2020-10-26)

## Features

-   Add the `prefer-interface` rule. ([ccf6a02](https://github.com/cartant/eslint-plugin-etc/commit/ccf6a02))

<a name="1.0.2"></a>

## [1.0.2](https://github.com/cartant/eslint-plugin-etc/compare/v1.0.1...v1.0.2) (2020-10-23)

## Changes

-   Specify `engines` in `package.json`.
-   Downlevel the TypeScript output to ES2019.

<a name="1.0.1"></a>

## [1.0.1](https://github.com/cartant/eslint-plugin-etc/compare/v1.0.0...v1.0.1) (2020-10-22)

## Changes

-   Update `README.md`.

<a name="1.0.0"></a>

## [1.0.0](https://github.com/cartant/eslint-plugin-etc/compare/v0.0.3-beta.48...v1.0.0) (2020-10-22)

## Breaking Changes

-   Remove deprecated rules.

## Changes

-   Add rule docs.

<a name="0.0.3-beta.48"></a>

## [0.0.3-beta.48](https://github.com/cartant/eslint-plugin-etc/compare/v0.0.2-beta.46...v0.0.3-beta.48) (2020-10-01)

## Changes

-   A `no-internal` rule has been added.
-   The `deprecation` rule has been deprecated and renamed to `no-deprecated`.
-   The `ban-imports` rule has been deprecated in favour of the built-in ESLint rule `no-restricted-imports`.
-   The deprecated rules will be removed when the beta ends.

<a name="0.0.3-beta.46"></a>

## [0.0.3-beta.46](https://github.com/cartant/eslint-plugin-etc/compare/v0.0.2-beta.45...v0.0.3-beta.46) (2020-09-25)

## Breaking Changes

-   Removed the `no-unused-declarations` rule. Now that the official TypeScript ESLint plugin has a proper implementation of [`no-unused-vars`](https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/no-unused-vars.md), `no-unused-declaration` is pretty much redundant and I would prefer not to support it. If anyone needs to differentiate between vars and imports, the [`eslint-plugin-unused-imports`](https://github.com/sweepline/eslint-plugin-unused-imports) plugin includes `no-unused-vars-ts` and `no-unused-imports-ts` rules - and the latter has a fixer.
