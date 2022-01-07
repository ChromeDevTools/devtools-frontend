# [2.1.0](https://github.com/karma-runner/karma-coverage/compare/v2.0.3...v2.1.0) (2021-12-01)


### Bug Fixes

* **deps:** update main and dev dependencies ([c20d982](https://github.com/karma-runner/karma-coverage/commit/c20d982607168ccc302f1cca576dbbbdac0a1af6))


### Features

* **reporter:** log coverage threshold as a warning fixed [#432](https://github.com/karma-runner/karma-coverage/issues/432) ([a6c95d8](https://github.com/karma-runner/karma-coverage/commit/a6c95d8fb932a4191474e6504174df7bc9a6fe60))

## [2.0.3](https://github.com/karma-runner/karma-coverage/compare/v2.0.2...v2.0.3) (2020-07-24)


### Bug Fixes

* **report:** waiting promise resolve in onExist method fix [#418](https://github.com/karma-runner/karma-coverage/issues/418) ([c93f061](https://github.com/karma-runner/karma-coverage/commit/c93f0612da6898fb5cfbb9ece57556a2704c4397))

## [2.0.2](https://github.com/karma-runner/karma-coverage/compare/v2.0.1...v2.0.2) (2020-04-13)


### Bug Fixes

* **reporter:** update calls to  match new API in istanbul-lib-report fix [#398](https://github.com/karma-runner/karma-coverage/issues/398) ([#403](https://github.com/karma-runner/karma-coverage/issues/403)) ([4962a70](https://github.com/karma-runner/karma-coverage/commit/4962a70026efbbd77e9fa7b6bfd6be29047c1082))
* remove information about old istanbul lib ([#404](https://github.com/karma-runner/karma-coverage/issues/404)) ([5cf931a](https://github.com/karma-runner/karma-coverage/commit/5cf931afe331cfcebf7cf934ec52de933344091d))

<a name="2.0.1"></a>
## [2.0.1](https://github.com/karma-runner/karma-coverage/compare/v2.0.0...v2.0.1) (2019-08-20)



<a name="2.0.0"></a>
# [2.0.0](https://github.com/karma-runner/karma-coverage/compare/v1.1.1...v2.0.0) (2019-08-20)


### Bug Fixes

* **build:** Update to lodash 4 ([d6d21d2](https://github.com/karma-runner/karma-coverage/commit/d6d21d2)), closes [#242](https://github.com/karma-runner/karma-coverage/issues/242)
* **reporter:** replace colons in the output path ([3b2bffa](https://github.com/karma-runner/karma-coverage/commit/3b2bffa))
* bump lodash for CVE-2018-16487 ([15f8b12](https://github.com/karma-runner/karma-coverage/commit/15f8b12))


### Chores

* Update travis config ([00090ea](https://github.com/karma-runner/karma-coverage/commit/00090ea))
* **deps:** Use latest istanbul lib packages ([#377](https://github.com/karma-runner/karma-coverage/issues/377)) ([f40d6af](https://github.com/karma-runner/karma-coverage/commit/f40d6af))


### BREAKING CHANGES

* **deps:** This set of changes may impact some use cases.

* chore: Add Updated Istanbul Dependencies

The istanbul package is deprecated in favor several split packages that
control different aspects of how istanbul works. This commit adds the
recommended packages that will be used in future commits as
karma-coverage's usage of istanbul is updated to the latest api.

* refactor(reporter): Follow new report API

This commit refactors the in memory report implementation to use the new
istanbul report API.

Report creation is removed from newer versions of the istanbul API, so
this commit adds a set of utility functions to wrap around the new API
and provide similar functionality as the old API. The top level export
uses the new utility function to register the in-memory report.

* refactor(preprocessor): Switch to istanbul-lib-instrument

This commit updates the preprocessor to use istanbul-lib-instrument
instead of the deprecated istanbul package. The biggest change in this
refactor is using a callable function instead of a constructor when
creating instrumenters

The old istanbul package exposed the Instrumenter directly, allowing the
preprocessor to create an instance of it. istanbul-lib-instrument,
however, exposes a callable function that creates an Instrumenter.
This commit updates the preprocessor to follow this new pattern of using
a callable function. In order to ensure backwards compatibility, a
utility function is added to wrap constructors with a callable function
for creation automatically.

This change allows the following configuration for creating instrumenters:
1. An object that contains an Instrumenter constructor
2. An Instrumenter constructor itself
3. A callable function that returns an Instrumenter instance.

This commit also uses the istanbul-lib-source-maps package to handle
storing source maps. A global source map store registers source maps so
they can be used later on in the reporter.

* refactor(reporter): Switch to istanbul-lib-coverage

This commit updates the reporter by using the istanbul-lib-coverage
package api for handling coverage checking/management and the
istanbul-lib-report package api for handling reporting.

The new apis remove the need for collectors and remove the need to
handle disposing collectors.

* refactor: Remove unused source cache utilities

This commit removes the source-cache-store and source-cache files as
they are no longer being used. The source-map-store and
istanbul-lib-source-maps are used instead, so these files are no longer
needed.

* feat(util): Add Reset Functionality

This commit updates the report creator utility to allow resetting the
custom reporter map.

* fix(preprocessor): Track Coverage Maps Properly

This commit updates the preprocessor to properly access file coverage
when storing it in the global coverage map (when includeAllSources is
true). The previous method did not work because the returned
instrumented code from the default istanbul instrumenter returns the
coverage map in a POJO object instead of JSON notation. This breaks the
coverage regex used to match and parse the coverage map.

The istanbul instrumenter offers the ability to receive the coverage map
for the last instrumented file through a separate function, so that is
tested for and used if it is supported. The original method is used as a
fallback for backwards compatibility.

This commit also addresses changes from the v0 instanbul instrumenter
options. The changes are additive only to maintain backwards compatibility
for other instrumenters.

* fix(reporter): Access Data Properly to Check Coverage

This commit fixes errors with accessing data properly during the
checkCoverage method. A previous commit updated the implementation to
use istanbul-lib-coverage, but this involved an api change to access the
raw coverage data (which checkCoverage uses).

This commit also fixes the checking coverage for each file by using a
map to store file coverage summaries instead of merging summaries like
the global results. Per file coverage now works as expected.

* test: Update Unit Tests to use new Istanbul API

This commit updates the mocking done in unit tests to properly mock the
new istanbul API. Additionally, new unit test suites are added for the
utility methods report-creator and source-map-store.
* drop support for node < 8
* **reporter:** the output folder names change, they no longer contain `:`



<a name="1.1.2"></a>
## [1.1.2](https://github.com/karma-runner/karma-coverage/compare/v1.1.1...v1.1.2) (2018-05-03)


### Bug Fixes

* **build:** Update to lodash 4 ([d6d21d2](https://github.com/karma-runner/karma-coverage/commit/d6d21d2)), closes [#242](https://github.com/karma-runner/karma-coverage/issues/242)
* **reporter:** replace colons in the output path ([3b2bffa](https://github.com/karma-runner/karma-coverage/commit/3b2bffa))


### BREAKING CHANGES

* **reporter:** the output folder names change, they no longer contain `:`



<a name="1.1.1"></a>
## [1.1.1](https://github.com/karma-runner/karma-coverage/compare/v1.1.0...v1.1.1) (2016-07-23)


### Bug Fixes

* remove usage of the deprecated helper._ ([dacf9e9](https://github.com/karma-runner/karma-coverage/commit/dacf9e9))



<a name="1.1.0"></a>
# [1.1.0](https://github.com/karma-runner/karma-coverage/compare/v0.5.5...v1.1.0) (2016-07-07)


### Features

* **reporter:** Add callbacks for "writeReport" and "onExit" methods ([7e20759](https://github.com/karma-runner/karma-coverage/commit/7e20759))



<a name="1.0.0"></a>
# [1.0.0](https://github.com/karma-runner/karma-coverage/compare/v0.5.5...v1.0.0) (2016-05-04)



<a name="0.5.5"></a>
## [0.5.5](https://github.com/karma-runner/karma-coverage/compare/v0.5.4...v0.5.5) (2016-03-07)


### Bug Fixes

* **in-memory-reporter:** Fix bug in new InMemoryReport, now using null-checks ([051cffd](https://github.com/karma-runner/karma-coverage/commit/051cffd))



<a name="0.5.4"></a>
## [0.5.4](https://github.com/karma-runner/karma-coverage/compare/v0.5.3...v0.5.4) (2016-03-03)


### Bug Fixes

* **preprocessor:** Call done with error message instead of populating instrumentedCode ([c56e4de](https://github.com/karma-runner/karma-coverage/commit/c56e4de))
* **preprocessor:** Support CoffeeScript when using  RequireJS ([e941e0c](https://github.com/karma-runner/karma-coverage/commit/e941e0c)), closes [#177](https://github.com/karma-runner/karma-coverage/issues/177)
* **preprocessor:** Use _.includes instead of _.contains ([3c769d5](https://github.com/karma-runner/karma-coverage/commit/3c769d5)), closes [#212](https://github.com/karma-runner/karma-coverage/issues/212)



<a name="0.5.3"></a>
## 0.5.3 (2015-10-20)


### Bug Fixes

* Update (dev)dependencies, include missing peer dependency and fix linter errors ([bb73158](https://github.com/karma-runner/karma-coverage/commit/bb73158))



<a name="0.5.2"></a>
## 0.5.2 (2015-09-08)


### Bug Fixes

* **preprocessor:** Reset coverageObjRegex before each use ([ef3f45c](https://github.com/karma-runner/karma-coverage/commit/ef3f45c))



<a name="0.5.1"></a>
## 0.5.1 (2015-08-28)


### Bug Fixes

* **preprocessor:** Change paths in windows to use backslash ([b0eecbe](https://github.com/karma-runner/karma-coverage/commit/b0eecbe)), closes [#178](https://github.com/karma-runner/karma-coverage/issues/178)
* **preprocessor:** Resolve all paths properly ([098182f](https://github.com/karma-runner/karma-coverage/commit/098182f)), closes [#65](https://github.com/karma-runner/karma-coverage/issues/65)



<a name="0.5.0"></a>
# 0.5.0 (2015-08-06)


### Bug Fixes

* **preprocessor:** use absolute paths ([27e0b09](https://github.com/karma-runner/karma-coverage/commit/27e0b09))



<a name"0.4.2"></a>
### 0.4.2 (2015-06-12)


#### Bug Fixes

* **preprocessor:** Use `_.contains` instead of `_.includes` to avoid braking with `lodash@2` ([411beb1f](https://github.com/karma-runner/karma-coverage/commit/411beb1f))


<a name"0.4.1"></a>
### 0.4.1 (2015-06-09)

#### Features

* **preprocessor:** Add sourcemap support ([de3b738b](https://github.com/karma-runner/karma-coverage/commit/de3b738b), closes [#109](https://github.com/karma-runner/karma-coverage/issues/109))
* **reporter:** add check coverage thresholds ([bc63b158](https://github.com/karma-runner/karma-coverage/commit/bc63b158), closes [#21](https://github.com/karma-runner/karma-coverage/issues/21))


<a name"0.4.0"></a>
## 0.4.0 (2015-06-09)


#### Bug Fixes

* Drop karma from peerDependencies ([eebcc989](https://github.com/karma-runner/karma-coverage/commit/eebcc989))
* do not dispose collectors before they are written ([9816cd14](https://github.com/karma-runner/karma-coverage/commit/9816cd14))
* reporter allow using a externally provided source cachere for reporters change ` ([781c126f](https://github.com/karma-runner/karma-coverage/commit/781c126f))
* watermarks are not passed to reporters ([a9044055](https://github.com/karma-runner/karma-coverage/commit/a9044055), closes [#143](https://github.com/karma-runner/karma-coverage/issues/143), [#144](https://github.com/karma-runner/karma-coverage/issues/144))
* when using browserify dont create source code caching ([50030df1](https://github.com/karma-runner/karma-coverage/commit/50030df1))


#### Breaking Changes

* Karma is no longer a `peerDependency` so it needs to be installed
manually. Ref https://github.com/karma-runner/integration-tests/issues/5 ([eebcc989](https://github.com/karma-runner/karma-coverage/commit/eebcc989))


<a name"0.3.1"></a>
### 0.3.1 (2015-06-09)


#### Bug Fixes

* skip directory creation when reporting to console ([42c9e0a8](https://github.com/karma-runner/karma-coverage/commit/42c9e0a8), closes [#24](https://github.com/karma-runner/karma-coverage/issues/24))


#### Features

* adding support for including all sources in coverage data ([18091753](https://github.com/karma-runner/karma-coverage/commit/18091753))


<a name"0.3.0"></a>
## 0.3.0 (2015-06-09)


#### Features

* **preprocessor:** free instrumenter ([626e7b0c](https://github.com/karma-runner/karma-coverage/commit/626e7b0c), closes [#101](https://github.com/karma-runner/karma-coverage/issues/101))


#### Breaking Changes

* Karma-coverage does not ship with additional instrumenter. You need to explicitly install the instrumenter you need.

Removed **Ibrik** instrumenter that need to be installed explicitly.

Quick list of known community instrumenters :
- [Ibrik](https://github.com/Constellation/ibrik) (CoffeeScript files instrumenter).
- [Ismailia](https://github.com/Spote/ismailia) (ES6 files instrumenter using Traceur).
- [Isparta](https://github.com/douglasduteil/isparta) (ES6 files instrumenter using 6to5).

 ([626e7b0c](https://github.com/karma-runner/karma-coverage/commit/626e7b0c))


<a name"0.2.7"></a>
### 0.2.7 (2015-06-09)


#### Bug Fixes

* add in-memory source code caching to support detail reports on compiled CoffeeSc ([c1e542a5](https://github.com/karma-runner/karma-coverage/commit/c1e542a5))


<a name"0.2.6"></a>
### 0.2.6 (2015-06-09)


#### Bug Fixes

* reporters can be configured individually ([adcb8e69](https://github.com/karma-runner/karma-coverage/commit/adcb8e69))


<a name"0.2.5"></a>
### 0.2.5 (2015-06-09)


#### Features

* new `subdir` option ([309dad4e](https://github.com/karma-runner/karma-coverage/commit/309dad4e))


<a name"0.2.4"></a>
### 0.2.4 (2015-06-09)


#### Bug Fixes

* optional option no longer trigger an error when omitted ([a2cdf569](https://github.com/karma-runner/karma-coverage/commit/a2cdf569))


<a name"0.2.3"></a>
### 0.2.3 (2015-06-09)


#### Features

* **config:** instrumenter override option ([ee3e68e8](https://github.com/karma-runner/karma-coverage/commit/ee3e68e8))


<a name"0.2.2"></a>
### 0.2.2 (2015-06-09)


#### Features

* update the dependencies ([77d73e2b](https://github.com/karma-runner/karma-coverage/commit/77d73e2b))


<a name"0.2.1"></a>
### 0.2.1 (2015-06-09)


#### Features

* update istanbul to 0.2.3, ibrik to 1.1.1 ([9064ec1e](https://github.com/karma-runner/karma-coverage/commit/9064ec1e))


<a name"0.2.0"></a>
## 0.2.0 (2015-06-09)


#### Features

* no longer write json unless configured ([1256fb8b](https://github.com/karma-runner/karma-coverage/commit/1256fb8b))


#### Breaking Changes

* No json coverage is generated by default. If you want that, please use `json` reporter:

```js
coverageReporter: {
  type: 'json'
}

// or with multiple reporters
coverageReporter: {
  reporters: [
    {type: 'html', dir: 'coverage'},
    {type: 'json', dir: 'coverage'},
  ]
}
```

 ([1256fb8b](https://github.com/karma-runner/karma-coverage/commit/1256fb8b))


<a name"0.1.5"></a>
### 0.1.5 (2015-06-09)


#### Bug Fixes

* use output dir per reporter ([dac46788](https://github.com/karma-runner/karma-coverage/commit/dac46788), closes [#42](https://github.com/karma-runner/karma-coverage/issues/42))


#### Features

* revert update istanbul ([5b8937ab](https://github.com/karma-runner/karma-coverage/commit/5b8937ab))
* update istanbul ([b696c3e3](https://github.com/karma-runner/karma-coverage/commit/b696c3e3))


<a name"0.1.4"></a>
### 0.1.4 (2015-06-09)


#### Features

* Update ibrik version to 1.0.1 ([b50f2d53](https://github.com/karma-runner/karma-coverage/commit/b50f2d53), closes [#39](https://github.com/karma-runner/karma-coverage/issues/39))


<a name"0.1.3"></a>
### 0.1.3 (2015-06-09)


#### Bug Fixes

* update to work with Karma 0.11 ([89c98177](https://github.com/karma-runner/karma-coverage/commit/89c98177))


#### Features

* update instanbul ([24126e72](https://github.com/karma-runner/karma-coverage/commit/24126e72))
* support coverage for coffee script ([9f802c1c](https://github.com/karma-runner/karma-coverage/commit/9f802c1c))
* log where the coverage reports are generated ([c9ef5c9f](https://github.com/karma-runner/karma-coverage/commit/c9ef5c9f))
* add a default config and normalize outputFile path ([027fa4fc](https://github.com/karma-runner/karma-coverage/commit/027fa4fc))


<a name"0.1.2"></a>
### 0.1.2 (2015-06-09)


<a name"0.1.1"></a>
### 0.1.1 (2015-06-09)


#### Bug Fixes

* update to work with Karma 0.11 ([b744d6f2](https://github.com/karma-runner/karma-coverage/commit/b744d6f2))


<a name"0.1.0"></a>
## 0.1.0 (2015-06-09)


<a name"0.0.5"></a>
### 0.0.5 (2015-06-09)


#### Bug Fixes

* delay collector disposal until all file writing has completed. ([75c4db0e](https://github.com/karma-runner/karma-coverage/commit/75c4db0e))


#### Features

* allow multiple report types ([4a9afb62](https://github.com/karma-runner/karma-coverage/commit/4a9afb62))


<a name"0.0.4"></a>
### 0.0.4 (2015-06-09)


#### Features

* do not preprocess files if coverage reporter is not used ([277a1ad9](https://github.com/karma-runner/karma-coverage/commit/277a1ad9), closes [#7](https://github.com/karma-runner/karma-coverage/issues/7))


<a name"0.0.3"></a>
### 0.0.3 (2015-06-09)


#### Bug Fixes

* handle no result ([5eca4882](https://github.com/karma-runner/karma-coverage/commit/5eca4882))


#### Features

* support coverage per spec ([385b6e1f](https://github.com/karma-runner/karma-coverage/commit/385b6e1f))


<a name"0.0.2"></a>
### 0.0.2 (2015-06-09)

* Initial release
