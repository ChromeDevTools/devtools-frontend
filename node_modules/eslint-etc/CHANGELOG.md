<a name="5.2.1"></a>
## [5.2.1](https://github.com/cartant/eslint-etc/compare/v5.2.0...v5.2.1) (2023-03-29)

## Fixes

* Widen the TypeScript peer dependency. ([6e56ec2](https://github.com/cartant/eslint-etc/commit/6e56ec2))

<a name="5.2.0"></a>
## [5.2.0](https://github.com/cartant/eslint-etc/compare/v5.1.0...v5.2.0) (2022-07-16)

## Features

* Add `isPrivateIdentifier`. ([779193a](https://github.com/cartant/eslint-etc/commit/779193a))

<a name="5.1.0"></a>
## [5.1.0](https://github.com/cartant/eslint-etc/compare/v5.0.1...v5.1.0) (2021-11-08)

## Features

* Add `isUnknown` to type services. ([d0eb521](https://github.com/cartant/eslint-etc/commit/d0eb521))

<a name="5.0.1"></a>
## [5.0.1](https://github.com/cartant/eslint-etc/compare/v5.0.0...v5.0.1) (2021-10-17)

## Fixes

* Accept `readonly` arrays in `fromFixture`. ([0c2d7e0](https://github.com/cartant/eslint-etc/commit/0c2d7e0))

<a name="5.0.0"></a>
## [5.0.0](https://github.com/cartant/eslint-etc/compare/v4.2.5...v5.0.0) (2021-10-16)

## Breaking changes

- Bump to `eslint` version 8 and `@typescript-eslint/experimental-utils` version 5.
- Change the way the `suggest` annotation works:

    - If `suggest` is specified with no indices, all suggestions are associated with the annotated error.
    - If `suggest` is specified with indices, suggestions at those indices are associated with the annotated error.
    - If `suggest` is not specified, no suggestions are associated with the annotated error.
    - And if `suggestions` are specified without a `suggest` annotation being used, `fromFixture` will throw an error.

<a name="4.2.5"></a>
## [4.2.5](https://github.com/cartant/eslint-etc/compare/v4.2.4...v4.2.5) (2021-09-19)

## Fixes

* Add `TMessageIds` to option-less `fromFixture` signature. ([11d66ad](https://github.com/cartant/eslint-etc/commit/11d66ad))

<a name="4.2.4"></a>
## [4.2.4](https://github.com/cartant/eslint-etc/compare/v4.2.3...v4.2.4) (2021-09-17)

## Fixes

* Don't spread `suggestions` into `options` in `fromFixture`. ([9184235](https://github.com/cartant/eslint-etc/commit/9184235))

<a name="4.2.3"></a>
## [4.2.3](https://github.com/cartant/eslint-etc/compare/v4.2.2...v4.2.3) (2021-09-17)

## Fixes

* Ignore `suggestions` in `fromFixture` if not specified. ([7bda092](https://github.com/cartant/eslint-etc/commit/7bda092))

<a name="4.2.2"></a>
## [4.2.2](https://github.com/cartant/eslint-etc/compare/v4.2.1...v4.2.2) (2021-09-17)

## Fixes

* Revert removal of `fromFixture` overload. ([d64f088](https://github.com/cartant/eslint-etc/commit/d64f088))

<a name="4.2.1"></a>
## [4.2.1](https://github.com/cartant/eslint-etc/compare/v4.2.0...v4.2.1) (2021-09-17)

## Fixes

* Use `never[]` as default options type argument for `fromFixture`. ([634568c](https://github.com/cartant/eslint-etc/commit/634568c))

<a name="4.2.0"></a>
## [4.2.0](https://github.com/cartant/eslint-etc/compare/v4.1.0...v4.2.0) (2021-09-17)

## Features

* Add support for `suggestions` in `fromFixture`. ([fae4cb5](https://github.com/cartant/eslint-etc/commit/fae4cb5))

<a name="4.1.0"></a>
## [4.1.0](https://github.com/cartant/eslint-etc/compare/v4.0.7...v4.1.0) (2021-06-28)

## Features

* Add `isImport`. ([f76d7f1](https://github.com/cartant/eslint-etc/commit/f76d7f1))

<a name="4.0.7"></a>
## [4.0.7](https://github.com/cartant/eslint-etc/compare/v4.0.6...v4.0.7) (2021-05-29)

## Fixes

* Downlevel to ES2018. ([70eda6e](https://github.com/cartant/eslint-etc/commit/70eda6e))

<a name="4.0.6"></a>
## [4.0.6](https://github.com/cartant/eslint-etc/compare/v4.0.5...v4.0.6) (2021-05-28)

## Fixes

* Use the body type in `couldReturnType` if the return type is not annotated. ([02584e7](https://github.com/cartant/eslint-etc/commit/02584e7))

<a name="4.0.5"></a>
## [4.0.5](https://github.com/cartant/eslint-etc/compare/v4.0.4...v4.0.5) (2021-04-25)

## Fixes

* Upgrade `tsutils-etc` dependency. ([b0dd48b](https://github.com/cartant/eslint-etc/commit/b0dd48b))

<a name="4.0.4"></a>
## [4.0.4](https://github.com/cartant/eslint-etc/compare/v4.0.3...v4.0.4) (2021-03-20)

## Fixes

* Remove misused type parameters from `fromFixture`. ([2733425](https://github.com/cartant/eslint-etc/commit/2733425))

<a name="4.0.3"></a>
## [4.0.3](https://github.com/cartant/eslint-etc/compare/v4.0.2...v4.0.3) (2021-03-20)

## Fixes

* Use a separate `output`-only signature for `fromFixture`. ([0bb0bbe](https://github.com/cartant/eslint-etc/commit/0bb0bbe))

<a name="4.0.2"></a>
## [4.0.2](https://github.com/cartant/eslint-etc/compare/v4.0.1...v4.0.2) (2021-03-20)

## Fixes

* Use separate signatures for `fromFixture` to better handle no-option usage. ([3545994](https://github.com/cartant/eslint-etc/commit/3545994))

## Features

* Add more type guards. ([220d981](https://github.com/cartant/eslint-etc/commit/220d981))

<a name="4.0.1"></a>
## [4.0.1](https://github.com/cartant/eslint-etc/compare/v4.0.0...v4.0.1) (2020-11-28)

## Changes

* Use `files` in `package.json` instead of `.npmignore`. ([1b83d0b](https://github.com/cartant/eslint-etc/commit/1b83d0b))

<a name="4.0.0"></a>
## [4.0.0](https://github.com/cartant/eslint-etc/compare/v3.0.2...v4.0.0) (2020-09-02)

## Changes

* Upgrade `@typescript-eslint` dependencies. ([519e76d](https://github.com/cartant/eslint-etc/commit/519e76d))

<a name="3.1.1"></a>
## [3.1.1](https://github.com/cartant/eslint-etc/compare/v3.0.1...v3.0.2) (2020-09-02)

## Changes

* For what ever reason, `yarn version --patch` seemed to have bumped the minor version instead of the patch version. 🤷‍♂️ This is 3.0.2.

<a name="3.0.2"></a>
## [3.0.2](https://github.com/cartant/eslint-etc/compare/v3.0.1...v3.0.2) (2020-09-02)

## Changes

* Revert upgrade of `@typescript-eslint` dependencies. ([f407b62](https://github.com/cartant/eslint-etc/commit/f407b62))

<a name="3.0.1"></a>
## [3.0.1](https://github.com/cartant/eslint-etc/compare/v3.0.0...v3.0.1) (2020-09-02)

## Changes

* Upgrade `@typescript-eslint` dependencies. ([09d2e8e](https://github.com/cartant/eslint-etc/commit/09d2e8e))

<a name="3.0.0"></a>
## [3.0.0](https://github.com/cartant/eslint-etc/compare/v2.0.0...v3.0.0) (2020-08-30)

## Breaking changes

* Remove `nodeMap` from `getTypeServices`. Use the (standard) maps from `getParserServices` instead. ([8bd2c4d](https://github.com/cartant/eslint-etc/commit/8bd2c4d))

<a name="2.0.0"></a>
## [2.0.0](https://github.com/cartant/eslint-etc/compare/v1.0.2...v2.0.0) (2020-07-23)

## Breaking changes

* `fromFixture` now supports message IDs only. ([4f63498](https://github.com/cartant/eslint-etc/commit/4f63498))