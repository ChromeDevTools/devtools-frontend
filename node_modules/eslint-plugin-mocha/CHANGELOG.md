## 8.0.0 (August 6, 2020)

### Breaking Changes

* Consistently use shared settings in all rules ([#262](https://github.com/lo1tuma/eslint-plugin-mocha/pull/262))
* remove autofix from no-skipped-tests rule fix ([#258](https://github.com/lo1tuma/eslint-plugin-mocha/pull/258))

### Features

* New rule no-exports ([#263](https://github.com/lo1tuma/eslint-plugin-mocha/pull/263))

### Enhancements

* New option `ignoreSkipped` for `handle-done-callback` rule ([#260](https://github.com/lo1tuma/eslint-plugin-mocha/pull/260))

### Documentation

* Add meta.docs.description to all rules ([#257](https://github.com/lo1tuma/eslint-plugin-mocha/pull/257))

### Dependency Upgrades

* Update dependencies ([#259](https://github.com/lo1tuma/eslint-plugin-mocha/pull/259))

### Code Refactoring

* Use includes instead of indexOf ([#261](https://github.com/lo1tuma/eslint-plugin-mocha/pull/261))

## 7.0.1 (May 30, 2020)

### Bug Fixes

* Fix no-setup-in-describe to not flag describe.skip() ([#256](https://github.com/lo1tuma/eslint-plugin-mocha/pull/256))
* Fix max-top-level-suites to work with ES modules ([#255](https://github.com/lo1tuma/eslint-plugin-mocha/pull/255))
* Support comments in arrow functions when fixing ([#253](https://github.com/lo1tuma/eslint-plugin-mocha/pull/253))

## 7.0.0 (May 13, 2020)

### Breaking Changes

* Drop support for ESLint &lt; v7 and Node.js &lt; v10 ([#247](https://github.com/lo1tuma/eslint-plugin-mocha/pull/247))

### Enhancements

* Add `meta.type` and missing `fixable: 'code'` ([#245](https://github.com/lo1tuma/eslint-plugin-mocha/pull/245))

### Dependency Upgrades

* Updates of devDependencies ([#246](https://github.com/lo1tuma/eslint-plugin-mocha/pull/246))

## 6.3.0 (February 19, 2020)

### Bug Fixes

* no-hooks-for-single-case: fix false postive in nested suites ([#238](https://github.com/lo1tuma/eslint-plugin-mocha/pull/238))
* Fix max-top-level-suites to ignore generated suites ([#239](https://github.com/lo1tuma/eslint-plugin-mocha/pull/239))
* Check static template strings in valid-test-description and valid-suite-description ([#237](https://github.com/lo1tuma/eslint-plugin-mocha/pull/237))

### Enhancements

* no-hooks: add option to allow certain kind of hooks ([#236](https://github.com/lo1tuma/eslint-plugin-mocha/pull/236))
* Add schemas for options (and remove for files which are using settings) ([#234](https://github.com/lo1tuma/eslint-plugin-mocha/pull/234))
* Add `u` flag in RegExp for `valid-test-description` and `valid-suite-description` ([#232](https://github.com/lo1tuma/eslint-plugin-mocha/pull/232))
* Add `fixable` property to fixable rules (and mention in docs) ([#228](https://github.com/lo1tuma/eslint-plugin-mocha/pull/228))
* add plugin to recommended config ([#226](https://github.com/lo1tuma/eslint-plugin-mocha/pull/226))

### Documentation

* Indicate whether rule is recommended ([#229](https://github.com/lo1tuma/eslint-plugin-mocha/pull/229))
* "Options" heading in doc files (and consistent level 2 heading) ([#233](https://github.com/lo1tuma/eslint-plugin-mocha/pull/233))
* Doc syntax issue ([#231](https://github.com/lo1tuma/eslint-plugin-mocha/pull/231))

### Code Refactoring

* Nondeprecated rule format ([#235](https://github.com/lo1tuma/eslint-plugin-mocha/pull/235))
* Alphabetize rule lists ([#227](https://github.com/lo1tuma/eslint-plugin-mocha/pull/227))

### Build-Related

* - npm: Add package-lock.json ([#230](https://github.com/lo1tuma/eslint-plugin-mocha/pull/230))
* ✉️ Send a webhook to Coveralls when the build completes ([#222](https://github.com/lo1tuma/eslint-plugin-mocha/pull/222))

## 6.2.2 (November 22, 2019)

### Bug Fixes

* Support TDD interface in no-setup-in-describe ([#220](https://github.com/lo1tuma/eslint-plugin-mocha/pull/220))

### Build-Related

* 🚀 Use GitHub Actions instead of Travis ([#221](https://github.com/lo1tuma/eslint-plugin-mocha/pull/221))

## 6.2.1 (October 28, 2019)

### Bug Fixes

* Fix no-setup-in-describe to allow mocha config calls ([#215](https://github.com/lo1tuma/eslint-plugin-mocha/pull/215))
* Relax no-synchronous-tests to allow non literals from concise arrows ([#216](https://github.com/lo1tuma/eslint-plugin-mocha/pull/216))

### Documentation

* Minor documentation tweaks ([#217](https://github.com/lo1tuma/eslint-plugin-mocha/pull/217))

### Dependency Upgrades

* Update devDependencies ([#218](https://github.com/lo1tuma/eslint-plugin-mocha/pull/218))

## 6.2.0 (October 14, 2019)

### Enhancements

* Startup Performance Optimization ([#214](https://github.com/lo1tuma/eslint-plugin-mocha/pull/214))

## 6.1.1 (September 11, 2019)

### Bug Fixes

* Fix no-setup-in-describe to allow Mocha suite config ([#209](https://github.com/lo1tuma/eslint-plugin-mocha/pull/209))

## 6.1.0 (August 22, 2019)

### Enhancements

* Add custom message for valid-suite-description ([#207](https://github.com/lo1tuma/eslint-plugin-mocha/pull/207))
* Add custom message for valid-test-description rule ([#206](https://github.com/lo1tuma/eslint-plugin-mocha/pull/206))

## 6.0.0 (July 17, 2019)

### Breaking Changes

* Revamped recommended ruleset ([#200](https://github.com/lo1tuma/eslint-plugin-mocha/pull/200))
* Drop nodejs 6 support ([#197](https://github.com/lo1tuma/eslint-plugin-mocha/pull/197))

### Bug Fixes

* Fix no-setup-in-describe to correctly detect describe calls ([#196](https://github.com/lo1tuma/eslint-plugin-mocha/pull/196))
* Fix no-setup-in-describe to work with arrow functions ([#195](https://github.com/lo1tuma/eslint-plugin-mocha/pull/195))

### Features

* Implement no-return-from-async rule ([#190](https://github.com/lo1tuma/eslint-plugin-mocha/pull/190))

### Dependency Upgrades

* Update dev dependencies ([#199](https://github.com/lo1tuma/eslint-plugin-mocha/pull/199))

### Build-Related

* Add nodejs to travis build environments ([#198](https://github.com/lo1tuma/eslint-plugin-mocha/pull/198))

## 5.3.0 (February 13, 2019)

### Features

* Implement no-async-describe rule ([#188](https://github.com/lo1tuma/eslint-plugin-mocha/pull/188))

## 5.2.1 (January 8, 2019)

### Bug Fixes

* Remove invalid test-cases and unreachable code from prefer-arrow-callback ([#186](https://github.com/lo1tuma/eslint-plugin-mocha/pull/186))
* Fix invalid syntax in test case ([#182](https://github.com/lo1tuma/eslint-plugin-mocha/pull/182))

### Documentation

* Fixing typo ([#184](https://github.com/lo1tuma/eslint-plugin-mocha/pull/184))
* Replace `warning` with `warn` ([#181](https://github.com/lo1tuma/eslint-plugin-mocha/pull/181))

### Dependency Upgrades

* Update dependencies ([#187](https://github.com/lo1tuma/eslint-plugin-mocha/pull/187))
* Update eslint-plugin-node to the latest version 🚀 ([#173](https://github.com/lo1tuma/eslint-plugin-mocha/pull/173))

## 5.2.0 (August 13, 2018)

### Enhancements

* Prohibit tests in beforeEach etc. hook calls ([#174](https://github.com/lo1tuma/eslint-plugin-mocha/pull/174))

## 5.1.0 (July 6, 2018)

### Bug Fixes

* Issue #166: No setup in describe hooks ([#167](https://github.com/lo1tuma/eslint-plugin-mocha/pull/167))

### Features

* Adds mocha-aware prefer-arrow-callback rule ([#163](https://github.com/lo1tuma/eslint-plugin-mocha/pull/163))

### Dependency Upgrades

* Update eslint-config-holidaycheck to version 0.13.1 ([#170](https://github.com/lo1tuma/eslint-plugin-mocha/pull/170))
* Update eslint to version 5.0.1 ([#169](https://github.com/lo1tuma/eslint-plugin-mocha/pull/169))
* Update nyc to version 12.0.2 ([#168](https://github.com/lo1tuma/eslint-plugin-mocha/pull/168))

### Build-Related

* Add node 10 build environment ([#171](https://github.com/lo1tuma/eslint-plugin-mocha/pull/171))

## 5.0.0 (March 24, 2018)

### Breaking Changes

* Remove support for ESLint versions < 4.0.0 ([#155](https://github.com/lo1tuma/eslint-plugin-mocha/pull/155))
* Remove support for nodejs 4, 5 and 7 ([#154](https://github.com/lo1tuma/eslint-plugin-mocha/pull/154))

### Dependency Upgrades

* Update pr-log to the latest version 🚀 ([#159](https://github.com/lo1tuma/eslint-plugin-mocha/pull/159))
* Update chai to version 4.1.2 ([#151](https://github.com/lo1tuma/eslint-plugin-mocha/pull/151))

### Code Refactoring

* Use new language features ([#156](https://github.com/lo1tuma/eslint-plugin-mocha/pull/156))

### Build-Related

* Use nyc instead of istanbul ([#153](https://github.com/lo1tuma/eslint-plugin-mocha/pull/153))
* Whitelist files instead of using .npmignore ([#152](https://github.com/lo1tuma/eslint-plugin-mocha/pull/152))

## 4.12.1 (March 3, 2018)

### Bug Fixes

* Fix: skip template strings in valid-test-description and valid-suite-description

## 4.12.0 (March 2, 2018)

### Features

* Adds rule "no setup in describe" (#147)

### Dependency Upgrades

* Update coveralls to the latest version 🚀 (#142)
* chore(package): update mocha to version 5.0.1 (#150)
* Update ramda to the latest version 🚀 (#144)

### Bug Fixes

* Fix complexity problems (#149)

## 4.11.0 (June 19, 2017)

### Enhancements

* Added support for async functions in no-synchronous-tests (#138)

## 4.10.1 (June 12, 2017)

### Bug Fixes

* don't drop support for eslint 3.x (#137)

## 4.10.0 (June 12, 2017)

### Build-Related

* Add node 8 to build environments (#135)

### Enhancements

* Support ESLint 4.x (#134)

### Dependency Upgrades

* Update ramda to the latest version 🚀 (#130)
* Update pr-log to version 2.0.0 🚀 (#127)

## 4.9.0 (March 17, 2017)

### Dependency Upgrades

* Update ramda to version 0.23.0 🚀 (#121)

### Enhancements

* Add settings to support additional suite function names (#126)

### Documentation

* Organize alphabetically (#123)

## 4.8.0 (December 23, 2016)

### Enhancements

* Support MemberExpression for additionalTestFunctions (#114)
* Make no-mocha-arrows rule fixable (#112)

### Bug Fixes

* Fix no-mocha-arrow fixer (#118)

### Build-Related

* Add node 7 as travis build environment (#115)

### Documentation

* Fix rule name in CHANGELOG to match actual rule (#111)

## 4.7.0 (October 12, 2016)

### Features

* Add no-nested-tests rule (#109)

## 4.6.0 (October 3, 2016)

### Documentation

* Adds rule name to title for `valid-suite-description` documentation. (#107)
* Adds rule name to title for `valid-test-description` documentation. (#106)

### Features

* Add 'max-top-level-suites' rule (#103) (#105)

## 4.5.1 (August 30, 2016)

### Bug Fixes

* Fix crash in no-identical-title (fixes #98) (#99)

## 4.5.0 (August 29, 2016)

### Features

* Add `no-identical-title` rule (fixes #33) (#97)

## 4.4.0 (August 24, 2016)

### Features

* Add `no-hooks-for-single-case` rule (fixes #44) (#95)
* Add rule `no-return-and-callback` (fixes #88) (#94)
* Add `no-top-level-hooks` rule (fixes #37) (#87)

### Documentation

* Fix title in `no-sibling-hooks` documentation file (#92)

### Dependency Upgrades

* Update ramda to version 0.22.1 🚀 (#93)

### Build-Related

* Add editorconfig file (#91)

## 4.3.0 (August 1, 2016)

### Dependency Upgrades

* Update mocha to version 3.0.0 🚀 (#86)

### Features

* Add rule `no-sibling-hooks` (fixes #82) (#85)
* Add rule `no-hooks` (fixes #39)  (#84)

## 4.2.0 (July 26, 2016)

### Features

* Allow custom test functions (#81)

## 4.1.0 (July 22, 2016)

### Features

* no-mocha-arrows: New rule (#78)

## 4.0.0 (July 4, 2016)

### Features

* feat(rules): add 'valid-suite-description' rule (#74)
* feat(rules): add 'valid-test-description' rule (#68)

### Enhancements

* Add recommended config (#72)

### Dependency Upgrades

* Update eslint to version 3.0.0 🚀 (#70)

### Breaking Changes

* Drop support old node versions (#71)

### Documentation

* Remove fixable from no-exclusive on README (#73)
* [README] Use a more explicit config (#65)
* update to docs to match removed autofix (#64)

## 3.0.0 (June 2, 2016)

### Breaking Changes

* Remove autofix on no-exclusive-tests rule.  (#63)

## 2.2.0 (April 14, 2016)

### Features

* Add rule no-pending-tests (#59)

## 2.1.0 (April 11, 2016)

### Bug Fixes

* Support specify alias (#58)

### Dependency Upgrades

* Update ramda to version 0.21.0 🚀 (#56)
* Update ramda to version 0.20.0 🚀 (#53)

### Features

* Add rule no-skipped-tests (#55)

## 2.0.0 (February 13, 2016)

### Breaking Changes

* Update to eslint 2.0.0 (#49)

## 1.1.0 (November 13, 2015)

### Features

* Implement new rule no-global-tests (#46)

### Enhancements

* Replace lodash with ramda (#45)

## 1.0.0 (September 17, 2015)

### Enhancements

* Implement autofix for no-exclusive-tests (#34)
* Improve detection if done callback is handled (#23)
* Add integration tests (#30)
* Instrumment all sources for coverage (#29)

### Build-Related

* Add node 4 to travis-ci build (#42)

### Dependency Upgrades

* Update devDependencies (#43)
* Update eslint (#31)

### Documentation

* Add NPM Downloads badge (#41)
* Badges in README.md should only show master status (#40)

## 0.5.1 (August 20, 2015)

### Bug Fixes

* add new rule to index.js and change tests to keep that from happening (#28)

## 0.5.0 (August 19, 2015)

### Features

* Add no-synchronous-tests rule (#26)

### Dependency Upgrades

* ESLint 1.x compatibility (#25)
* Update dependencies (#22)


## 0.4.0 (June 26, 2015)

### Enhancements

* add context.only to no-exclusive-tests rule (#21)


## 0.3.0 (June 23, 2015)

### Features

* Add new rule handle-done-callback (#15)

### Build-Related

* Refactor package.json scripts (#17)
* Disable sudo on travis-ci (#10)
* Run travis build on node 0.12 and iojs (#11)
* Ignore log files and .idea folder (#9)
* Add changelog (#8)

### Documentation

* Fix links to mocha website (#16)
* Add install documentation to README (#14)

### Dependency Upgrades

* Update dependencies (#18)
* Update pr-log (#13)
* Update eslint (#12)
* Update dev dependencies (#7)


## 0.2.2 (October 25, 2014)

### Bug Fixes

* Allow all ESLint versions >= 0.8.0

## 0.2.1 (October 18, 2014)

### Build-Related

* Add recommended keywords to package.json

## 0.2.0 (September 20, 2014)

### Enhancements

* Support mochas tdd interface (fixes #4)

### Build-Related

* Allow minor version updates for eslint

### Documentation

* Docs: remove unnecessary backtick

### Dependency Upgrades

* Update devDependencies.


## 0.1.1 (September 6, 2014)

### Build-Related

* Add .npmignore

## 0.1.0 (September 6, 2014)

Initial release
