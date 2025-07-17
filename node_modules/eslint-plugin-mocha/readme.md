[![NPM Version](https://img.shields.io/npm/v/eslint-plugin-mocha.svg?style=flat)](https://www.npmjs.org/package/eslint-plugin-mocha)
[![GitHub Actions status](https://github.com/lo1tuma/eslint-plugin-mocha/workflows/CI/badge.svg)](https://github.com/lo1tuma/eslint-plugin-mocha/actions)
[![Coverage Status](https://img.shields.io/coveralls/lo1tuma/eslint-plugin-mocha/main.svg?style=flat)](https://coveralls.io/r/lo1tuma/eslint-plugin-mocha)
[![NPM Downloads](https://img.shields.io/npm/dm/eslint-plugin-mocha.svg?style=flat)](https://www.npmjs.org/package/eslint-plugin-mocha)

# eslint-plugin-mocha

ESLint rules for [mocha](http://mochajs.org/).

## Install and configure

This plugin requires ESLint `9.0.0` or later.

```bash
npm install --save-dev eslint-plugin-mocha
```

### Configuration via `eslint.config.js`

To use this plugin with [eslint flat configuration format](https://eslint.org/docs/latest/use/configure/configuration-files-new):

```js
import mochaPlugin from "eslint-plugin-mocha";

export default [
    mochaPlugin.configs.recommended, // or `mochaPlugin.configs.all` to enable all
    // ... Your configurations here
];
```

### Plugin Settings

This plugin supports the following settings, which are used by multiple rules:

- `additionalCustomNames`: This allows rules to check additional function names when looking for suites or test cases. This might be used with a custom Mocha extension, such as [`ember-mocha`](https://github.com/switchfly/ember-mocha) or [`mocha-each`](https://github.com/ryym/mocha-each).

    **Example:**

    ```json
    {
        "rules": {
            "mocha/no-pending-tests": "error",
            "mocha/no-exclusive-tests": "error"
        },
        "settings": {
            "mocha/additionalCustomNames": [
                {
                    "name": "describeModule",
                    "type": "suite",
                    "interface": "BDD"
                },
                {
                    "name": "testModule",
                    "type": "testCase",
                    "interface": "TDD"
                }
            ]
        }
    }
    ```

    The `name` property can be in any of the following forms:

  - A plain name e.g. `describeModule`, which allows:

    ```javascript
    describeModule("example", function() { ... });
    ```

  - A dotted name, e.g. `describe.modifier`, which allows:

    ```javascript
    describe.modifier("example", function() { ... });
    ```

  - A name with parentheses, e.g. `forEach().describe`, which allows:

    ```javascript
    forEach([ 1, 2, 3 ])
        .describe("example", function(n) { ... });
    ```

  - Any combination of the above, e.g. `forEach().describeModule.modifier`, which allows:

    ```javascript
    forEach([ 1, 2, 3 ])
        .describeModule.modifier("example", function(n) { ... });
    ```

- `interface`: This allows to select either `TDD`, `BDD` (default) or `exports`. When using `exports` mocha variables are resolved from named `import` statements instead of global variables.

## Rules

<!-- begin auto-generated rules list -->

💼 [Configurations](https://github.com/lo1tuma/eslint-plugin-mocha#configs) enabled in.\
⚠️ [Configurations](https://github.com/lo1tuma/eslint-plugin-mocha#configs) set to warn in.\
🚫 [Configurations](https://github.com/lo1tuma/eslint-plugin-mocha#configs) disabled in.\
✅ Set in the `recommended` [configuration](https://github.com/lo1tuma/eslint-plugin-mocha#configs).\
🔧 Automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).

| Name                                                                                 | Description                                                             | 💼 | ⚠️ | 🚫 | 🔧 |
| :----------------------------------------------------------------------------------- | :---------------------------------------------------------------------- | :- | :- | :- | :- |
| [consistent-interface](docs/rules/consistent-interface.md)                           | Enforces consistent use of mocha interfaces                             |    |    |    |    |
| [consistent-spacing-between-blocks](docs/rules/consistent-spacing-between-blocks.md) | Require consistent spacing between blocks                               | ✅  |    |    | 🔧 |
| [handle-done-callback](docs/rules/handle-done-callback.md)                           | Enforces handling of callbacks for async tests                          | ✅  |    |    |    |
| [max-top-level-suites](docs/rules/max-top-level-suites.md)                           | Enforce the number of top-level suites in a single file                 | ✅  |    |    |    |
| [no-async-suite](docs/rules/no-async-suite.md)                                       | Disallow async functions passed to a suite                              | ✅  |    |    | 🔧 |
| [no-empty-title](docs/rules/no-empty-title.md)                                       | Disallow empty test descriptions                                        | ✅  |    |    |    |
| [no-exclusive-tests](docs/rules/no-exclusive-tests.md)                               | Disallow exclusive tests                                                |    | ✅  |    |    |
| [no-exports](docs/rules/no-exports.md)                                               | Disallow exports from test files                                        | ✅  |    |    |    |
| [no-global-tests](docs/rules/no-global-tests.md)                                     | Disallow global tests                                                   | ✅  |    |    |    |
| [no-hooks](docs/rules/no-hooks.md)                                                   | Disallow hooks                                                          |    |    | ✅  |    |
| [no-hooks-for-single-case](docs/rules/no-hooks-for-single-case.md)                   | Disallow hooks for a single test or test suite                          |    |    | ✅  |    |
| [no-identical-title](docs/rules/no-identical-title.md)                               | Disallow identical titles                                               | ✅  |    |    |    |
| [no-mocha-arrows](docs/rules/no-mocha-arrows.md)                                     | Disallow arrow functions as arguments to mocha functions                | ✅  |    |    | 🔧 |
| [no-nested-tests](docs/rules/no-nested-tests.md)                                     | Disallow tests to be nested within other tests                          | ✅  |    |    |    |
| [no-pending-tests](docs/rules/no-pending-tests.md)                                   | Disallow pending tests                                                  |    | ✅  |    |    |
| [no-return-and-callback](docs/rules/no-return-and-callback.md)                       | Disallow returning in a test or hook function that uses a callback      | ✅  |    |    |    |
| [no-return-from-async](docs/rules/no-return-from-async.md)                           | Disallow returning from an async test or hook                           |    |    | ✅  |    |
| [no-setup-in-describe](docs/rules/no-setup-in-describe.md)                           | Disallow setup in describe blocks                                       | ✅  |    |    |    |
| [no-sibling-hooks](docs/rules/no-sibling-hooks.md)                                   | Disallow duplicate uses of a hook at the same level inside a suite      | ✅  |    |    |    |
| [no-synchronous-tests](docs/rules/no-synchronous-tests.md)                           | Disallow synchronous tests                                              |    |    | ✅  |    |
| [no-top-level-hooks](docs/rules/no-top-level-hooks.md)                               | Disallow top-level hooks                                                |    | ✅  |    |    |
| [prefer-arrow-callback](docs/rules/prefer-arrow-callback.md)                         | Require using arrow functions for callbacks                             |    |    | ✅  | 🔧 |
| [valid-suite-title](docs/rules/valid-suite-title.md)                                 | Require suite descriptions to match a pre-configured regular expression |    |    | ✅  |    |
| [valid-test-title](docs/rules/valid-test-title.md)                                   | Require test descriptions to match a pre-configured regular expression  |    |    | ✅  |    |

<!-- end auto-generated rules list -->
