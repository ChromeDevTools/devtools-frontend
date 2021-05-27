# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [1.3.5](https://github.com/asyncLiz/minify-html-literals/compare/v1.3.4...v1.3.5) (2021-03-09)


### Bug Fixes

* typing build error ([9571152](https://github.com/asyncLiz/minify-html-literals/commit/9571152724e542d329aea6e79bf609a67e20bec6))

### [1.3.4](https://github.com/asyncLiz/minify-html-literals/compare/v1.3.3...v1.3.4) (2021-03-09)


### Bug Fixes

* build errors ([ee4d596](https://github.com/asyncLiz/minify-html-literals/commit/ee4d596c2797cea335af2c43ba0368ec3d6fa518))

### [1.3.3](https://github.com/asyncLiz/minify-html-literals/compare/v1.3.2...v1.3.3) (2021-03-09)


### Bug Fixes

* html attribute placeholders throwing split error [#28](https://github.com/asyncLiz/minify-html-literals/issues/28) ([b1e14dc](https://github.com/asyncLiz/minify-html-literals/commit/b1e14dca1a5ed9e6599193f474992729953f885d))
* minify multiline svg elements ([9f37d2d](https://github.com/asyncLiz/minify-html-literals/commit/9f37d2d6442a6533a90c1728f80aeb78d6060d9b))
* parse errors with JS comments in HTML attributes with no quotes ([0f5a842](https://github.com/asyncLiz/minify-html-literals/commit/0f5a842c54f3514c72c79eaf6749f15770818550))
* spaces in pseudo classes (like ::part) are not removed ([85526fc](https://github.com/asyncLiz/minify-html-literals/commit/85526fcb889e288e1adbb5c7ff9feca41d45acff)), closes [#26](https://github.com/asyncLiz/minify-html-literals/issues/26)

### [1.3.2](https://github.com/asyncLiz/minify-html-literals/compare/v1.3.1...v1.3.2) (2020-08-18)


### Bug Fixes

* css tagged templates not respecting semicolons ([#22](https://github.com/asyncLiz/minify-html-literals/issues/22)) ([3651a0b](https://github.com/asyncLiz/minify-html-literals/commit/3651a0bc30167deccdfb21b4177827072df16cb5))

### [1.3.1](https://github.com/asyncLiz/minify-html-literals/compare/v1.3.0...v1.3.1) (2020-06-10)


### Bug Fixes

* don't remove attribute quotes by default. Fixes [#12](https://github.com/asyncLiz/minify-html-literals/issues/12). ([#13](https://github.com/asyncLiz/minify-html-literals/issues/13)) ([e18ae65](https://github.com/asyncLiz/minify-html-literals/commit/e18ae65e202802cb2fd793089f76de3af54fec6f))

## [1.3.0](https://github.com/asyncLiz/minify-html-literals/compare/v1.2.2...v1.3.0) (2020-02-08)

### Features

- minify svg-tagged templates [#9](https://github.com/asyncLiz/minify-html-literals/issues/9) ([62da810](https://github.com/asyncLiz/minify-html-literals/commit/62da810894a1f2c3705783ebb1a4264cf8989ee4))

### Bug Fixes

- update to html-minifier v4.0.0 ([6ddfd10](https://github.com/asyncLiz/minify-html-literals/commit/6ddfd104307347b7a66739b3c4e418bb6686e94e))
- update to parse-literals v1.2.0 ([bba4c7d](https://github.com/asyncLiz/minify-html-literals/commit/bba4c7d12b9d92635ed1d72d00d69086a45d8edb))

<a name="1.2.2"></a>

## [1.2.2](https://github.com/asyncLiz/minify-html-literals/compare/v1.2.1...v1.2.2) (2019-02-13)

### Bug Fixes

- failure to minify templates prefixed with comments ([8805f69](https://github.com/asyncLiz/minify-html-literals/commit/8805f69))

<a name="1.2.1"></a>

## [1.2.1](https://github.com/asyncLiz/minify-html-literals/compare/v1.2.0...v1.2.1) (2019-02-13)

### Bug Fixes

- remove source files from package ([b53c052](https://github.com/asyncLiz/minify-html-literals/commit/b53c052))

<a name="1.2.0"></a>

# [1.2.0](https://github.com/asyncLiz/minify-html-literals/compare/v1.1.2...v1.2.0) (2019-02-13)

### Features

- add ability to minify css-tagged templates ([d37a037](https://github.com/asyncLiz/minify-html-literals/commit/d37a037)), closes [#3](https://github.com/asyncLiz/minify-html-literals/issues/3)

<a name="1.1.2"></a>

## [1.1.2](https://github.com/asyncLiz/minify-html-literals/compare/v1.1.1...v1.1.2) (2018-11-29)

### Bug Fixes

- update to html-minifier 3.5.21 ([11a9f6b](https://github.com/asyncLiz/minify-html-literals/commit/11a9f6b))
- **strategy:** error when minifying inline CSS style placeholders [#1](https://github.com/asyncLiz/minify-html-literals/issues/1) ([2226ae2](https://github.com/asyncLiz/minify-html-literals/commit/2226ae2))

<a name="1.1.1"></a>

## [1.1.1](https://github.com/asyncLiz/minify-html-literals/compare/v1.1.0...v1.1.1) (2018-10-25)

### Bug Fixes

- fail to minify with <style> placeholders ([64b9b6f](https://github.com/asyncLiz/minify-html-literals/commit/64b9b6f))

<a name="1.1.0"></a>

# [1.1.0](https://github.com/asyncLiz/minify-html-literals/compare/v1.0.7...v1.1.0) (2018-10-24)

### Bug Fixes

- do not fail on empty template literals ([b74973a](https://github.com/asyncLiz/minify-html-literals/commit/b74973a))
- update parse-literals to 1.1.0 ([5ba1e99](https://github.com/asyncLiz/minify-html-literals/commit/5ba1e99))

### Features

- allow partial minify options to make it easier to customize ([f007988](https://github.com/asyncLiz/minify-html-literals/commit/f007988))
- do not require options or filename ([6649ac9](https://github.com/asyncLiz/minify-html-literals/commit/6649ac9))

<a name="1.0.7"></a>

## [1.0.7](https://github.com/asyncLiz/minify-html-literals/compare/v1.0.6...v1.0.7) (2018-10-05)

### Bug Fixes

- do not remove tag whitespace ([89f362a](https://github.com/asyncLiz/minify-html-literals/commit/89f362a))

<a name="1.0.6"></a>

## [1.0.6](https://github.com/asyncLiz/minify-html-literals/compare/v1.0.5...v1.0.6) (2018-10-03)

### Bug Fixes

- do not collapse boolean attributes for Polymer binding syntax ([80df154](https://github.com/asyncLiz/minify-html-literals/commit/80df154))

<a name="1.0.5"></a>

## [1.0.5](https://github.com/asyncLiz/minify-html-literals/compare/v1.0.4...v1.0.5) (2018-09-27)

### Bug Fixes

- update parse-literals to fix escaped character minifying ([93922c8](https://github.com/asyncLiz/minify-html-literals/commit/93922c8))

<a name="1.0.4"></a>

## [1.0.4](https://github.com/asyncLiz/minify-html-literals/compare/v1.0.3...v1.0.4) (2018-09-19)

### Bug Fixes

- do not sort attributes or class names ([b72a5c4](https://github.com/asyncLiz/minify-html-literals/commit/b72a5c4))

<a name="1.0.3"></a>

## [1.0.3](https://github.com/asyncLiz/minify-html-literals/compare/v1.0.2...v1.0.3) (2018-09-19)

### Bug Fixes

- use hires sourcemaps by default ([7f132b2](https://github.com/asyncLiz/minify-html-literals/commit/7f132b2))

<a name="1.0.2"></a>

## [1.0.2](https://github.com/asyncLiz/minify-html-literals/compare/v1.0.1...v1.0.2) (2018-09-13)

### Bug Fixes

- remove unused import ([e37a43a](https://github.com/asyncLiz/minify-html-literals/commit/e37a43a))

<a name="1.0.1"></a>

## 1.0.1 (2018-07-24)

### Bug Fixes

- option type errors ([b917607](https://github.com/asyncLiz/minify-html-literals/commit/b917607))

### Features

- initial release ([cadf7c2](https://github.com/asyncLiz/minify-html-literals/commit/cadf7c2))
