# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [4.1.0](https://github.com/foray1010/didyoumean2/compare/v4.0.0...v4.1.0) (2020-06-18)

### Features

- return different type depends on options.returnType ([1a2c0ce](https://github.com/foray1010/didyoumean2/commit/1a2c0cea00f9a16d3ae505677685e92244d487e4))

### Bug Fixes

- do not use object type as eslint adviced ([27315f6](https://github.com/foray1010/didyoumean2/commit/27315f629db8e8ad99540cc36d49ec1b52c736a9))

## [4.0.0](https://github.com/foray1010/didyoumean2/compare/v3.1.2...v4.0.0) (2020-02-06)

### ⚠ BREAKING CHANGES

- default enable deburr
- drop nodejs < 10.13

### Features

- default enable deburr ([16a0a56](https://github.com/foray1010/didyoumean2/commit/16a0a5613481475047bdb92a2d17aa5fa29a42b8))

* require nodejs 10 ([d22ea95](https://github.com/foray1010/didyoumean2/commit/d22ea9592c7c3b663383506f8ed8738ee821f378))

### [3.1.2](https://github.com/foray1010/didyoumean2/compare/v3.1.1...v3.1.2) (2019-07-29)

### Bug Fixes

- do not throw error when matched item is not string ([656f555](https://github.com/foray1010/didyoumean2/commit/656f555))

### [3.1.1](https://github.com/foray1010/didyoumean2/compare/v3.1.0...v3.1.1) (2019-06-09)

### Build System

- greatly reduce bundle size by rely less on ramda ([69ec2b6](https://github.com/foray1010/didyoumean2/commit/69ec2b6))

## [3.1.0](https://github.com/foray1010/didyoumean2/compare/v3.0.0...v3.1.0) (2019-06-07)

### Build System

- set moduleResolution to node ([e7e6fb4](https://github.com/foray1010/didyoumean2/commit/e7e6fb4))

### Features

- provide esm build ([8e9a755](https://github.com/foray1010/didyoumean2/commit/8e9a755))
- provide umd build ([ab96a8c](https://github.com/foray1010/didyoumean2/commit/ab96a8c))

### Tests

- add type-coverage to ensure typescript coverage ([a19cf85](https://github.com/foray1010/didyoumean2/commit/a19cf85))

## [3.0.0](https://github.com/foray1010/didyoumean2/compare/v2.0.4...v3.0.0) (2019-04-05)

### Bug Fixes

- **deps:** update dependency leven to v3 ([#132](https://github.com/foray1010/didyoumean2/issues/132)) ([0e489ec](https://github.com/foray1010/didyoumean2/commit/0e489ec))

### chore

- only support node >= 6.9 ([8bff8be](https://github.com/foray1010/didyoumean2/commit/8bff8be))

### Features

- accept readonly arguments ([c182207](https://github.com/foray1010/didyoumean2/commit/c182207))

### BREAKING CHANGES

- require TypeScript >=3.4
- drop node >= 4.2 < 6.9

## [2.0.4](https://github.com/foray1010/didyoumean2/compare/v2.0.3...v2.0.4) (2019-03-17)

### Bug Fixes

- Revert "fix(deps): update dependency leven to v3 ([#132](https://github.com/foray1010/didyoumean2/issues/132)))" ([b500e58](https://github.com/foray1010/didyoumean2/commit/b500e58)) as leven v3 doesn't support node 4

## [2.0.3](https://github.com/foray1010/didyoumean2/compare/v2.0.2...v2.0.3) (2019-03-17)

### Bug Fixes

- **deps:** update dependency leven to v3 ([#132](https://github.com/foray1010/didyoumean2/issues/132)) ([fc4ea25](https://github.com/foray1010/didyoumean2/commit/fc4ea25))

## [2.0.2](https://github.com/foray1010/didyoumean2/compare/v2.0.1...v2.0.2) (2019-02-06)

### Bug Fixes

- do not include test files in built package ([e35bbac](https://github.com/foray1010/didyoumean2/commit/e35bbac))
- only allow object and string for function `matchItemProcessor` ([ce656ee](https://github.com/foray1010/didyoumean2/commit/ce656ee))

## [2.0.1](https://github.com/foray1010/didyoumean2/compare/v2.0.0...v2.0.1) (2019-02-02)

### Bug Fixes

- only allow object and string for `matchList` ([1e58e70](https://github.com/foray1010/didyoumean2/commit/1e58e70))

## [2.0.0](https://github.com/foray1010/didyoumean2/compare/v1.3.0...v2.0.0) (2018-10-29)

### Features

- export ReturnTypeEnums and ThresholdTypeEnums ([27a6b37](https://github.com/foray1010/didyoumean2/commit/27a6b37))
- support typescript ([1cff536](https://github.com/foray1010/didyoumean2/commit/1cff536))
- added `"sideEffects": false` flag to support tree shaking ([fb31fac](https://github.com/foray1010/didyoumean2/commit/fb31fac))

### BREAKING CHANGES

- matchPath use Array of string/number instead of string concatenated by `.`
- rename `trimSpace` to `trimSpaces`
- `trimSpaces` default value changed to `true`
- `'random-closest-match'` is removed from `ReturnTypeEnums`
- schema on arguments are removed as it now depends on typescript checking
- `didYouMean` function is exported under `default` key in export object
