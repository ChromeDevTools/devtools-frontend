[![NPM Version](https://img.shields.io/npm/v/eslint-plugin-mocha.svg?style=flat)](https://www.npmjs.org/package/eslint-plugin-mocha)
[![GitHub Actions status](https://github.com/lo1tuma/eslint-plugin-mocha/workflows/CI/badge.svg)](https://github.com/lo1tuma/eslint-plugin-mocha/actions)
[![Coverage Status](https://img.shields.io/coveralls/lo1tuma/eslint-plugin-mocha/master.svg?style=flat)](https://coveralls.io/r/lo1tuma/eslint-plugin-mocha)
[![NPM Downloads](https://img.shields.io/npm/dm/eslint-plugin-mocha.svg?style=flat)](https://www.npmjs.org/package/eslint-plugin-mocha)

# eslint-plugin-mocha

ESLint rules for [mocha](http://mochajs.org/).

## Install and configure

This plugin requires ESLint `4.0.0` or later.

```bash
npm install --save-dev eslint-plugin-mocha
```

### `.eslintrc.json`

Then add a reference to this plugin and selected rules in your eslint config:

```json
{
    "plugins": [
        "mocha"
    ]
}
```

### `eslint.config.js` (requires eslint >= 8.23.0)

To use this plugin with [the new eslint configuration format (flat config)](https://eslint.org/docs/latest/use/configure/configuration-files-new):

```js
import mochaPlugin from 'eslint-plugin-mocha';

export default [
    mochaPlugin.configs.flat.recommended // or `mochaPlugin.configs.flat.all` to enable all
    // ... Your configurations here
];
```

### Plugin Settings

This plugin supports the following settings, which are used by multiple rules:

* `additionalCustomNames`: This allows rules to check additional function names when looking for suites or test cases. This might be used with a custom Mocha extension, such as [`ember-mocha`](https://github.com/switchfly/ember-mocha) or [`mocha-each`](https://github.com/ryym/mocha-each).

   **Example:**

    ```json
    {
        "rules": {
            "mocha/no-skipped-tests": "error",
            "mocha/no-exclusive-tests": "error"
        },
        "settings": {
            "mocha/additionalCustomNames": [
                { "name": "describeModule", "type": "suite", "interfaces": [ "BDD" ] },
                { "name": "testModule", "type": "testCase", "interfaces": [ "TDD" ] }
            ]
        }
    }
    ```

  The `name` property can be in any of the following forms:
  * A plain name e.g. `describeModule`, which allows:

    ```javascript
    describeModule("example", function() { ... });
    ```

  * A dotted name, e.g. `describe.modifier`, which allows:

    ```javascript
    describe.modifier("example", function() { ... });
    ```

  * A name with parentheses, e.g. `forEach().describe`, which allows:

    ```javascript
    forEach([ 1, 2, 3 ])
        .describe("example", function(n) { ... });
    ```

  * Any combination of the above, e.g. `forEach().describeModule.modifier`, which allows:

    ```javascript
    forEach([ 1, 2, 3 ])
        .describeModule.modifier("example", function(n) { ... });
    ```

## Configs

### `recommended`

This plugin exports a recommended config that enforces good practices.

Enable it with the extends option:

```json
{
    "extends": [
        "plugin:mocha/recommended"
    ]
}
```

### `all`

There's also a configuration that enables all of our rules.

See [Configuring Eslint](http://eslint.org/docs/user-guide/configuring) on [eslint.org](http://eslint.org) for more info.

## Rules

<!-- begin auto-generated rules list -->

💼 [Configurations](https://github.com/lo1tuma/eslint-plugin-mocha#configs) enabled in.\
⚠️ [Configurations](https://github.com/lo1tuma/eslint-plugin-mocha#configs) set to warn in.\
🚫 [Configurations](https://github.com/lo1tuma/eslint-plugin-mocha#configs) disabled in.\
✅ Set in the `recommended` [configuration](https://github.com/lo1tuma/eslint-plugin-mocha#configs).\
🔧 Automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).

| Name                                                                                 | Description                                                             | 💼 | ⚠️ | 🚫 | 🔧 |
| :----------------------------------------------------------------------------------- | :---------------------------------------------------------------------- | :- | :- | :- | :- |
| [consistent-spacing-between-blocks](docs/rules/consistent-spacing-between-blocks.md) | Require consistent spacing between blocks                               | ✅  |    |    | 🔧 |
| [handle-done-callback](docs/rules/handle-done-callback.md)                           | Enforces handling of callbacks for async tests                          | ✅  |    |    |    |
| [max-top-level-suites](docs/rules/max-top-level-suites.md)                           | Enforce the number of top-level suites in a single file                 | ✅  |    |    |    |
| [no-async-describe](docs/rules/no-async-describe.md)                                 | Disallow async functions passed to describe                             | ✅  |    |    | 🔧 |
| [no-empty-description](docs/rules/no-empty-description.md)                           | Disallow empty test descriptions                                        | ✅  |    |    |    |
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
| [no-sibling-hooks](docs/rules/no-sibling-hooks.md)                                   | Disallow duplicate uses of a hook at the same level inside a describe   | ✅  |    |    |    |
| [no-skipped-tests](docs/rules/no-skipped-tests.md)                                   | Disallow skipped tests                                                  |    | ✅  |    |    |
| [no-synchronous-tests](docs/rules/no-synchronous-tests.md)                           | Disallow synchronous tests                                              |    |    | ✅  |    |
| [no-top-level-hooks](docs/rules/no-top-level-hooks.md)                               | Disallow top-level hooks                                                |    | ✅  |    |    |
| [prefer-arrow-callback](docs/rules/prefer-arrow-callback.md)                         | Require using arrow functions for callbacks                             |    |    | ✅  | 🔧 |
| [valid-suite-description](docs/rules/valid-suite-description.md)                     | Require suite descriptions to match a pre-configured regular expression |    |    | ✅  |    |
| [valid-test-description](docs/rules/valid-test-description.md)                       | Require test descriptions to match a pre-configured regular expression  |    |    | ✅  |    |

<!-- end auto-generated rules list -->
