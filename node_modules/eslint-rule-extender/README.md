# eslint-rule-extender

[![npm](https://img.shields.io/npm/v/eslint-rule-extender.svg?style=flat-square)](https://www.npmjs.com/package/eslint-rule-extender/)
[![node](https://img.shields.io/node/v/eslint-rule-extender.svg?style=flat-square)](https://nodejs.org/en/)

A utility to extend existing ESLint rules.

## Installation

```sh
npm install eslint-rule-extender
```

or

```sh
yarn add eslint-rule-extender
```

## Usage

The default export is a function that takes two arguments and returns the modified rule.

### API

```ts
ruleExtender(originalRule: ESLintRule, options: Object) => ESLintRule;
```

- `originalRule` - The original rule to extend
- options - An object with the desired overrides (options can be viewed [below](#options))

### Example Usage

```js
const ruleExtender = require('eslint-rule-extender');
const { originalRule } = require('eslint-plugin-example');

const extendedRule = ruleExtender(originalRule, options);

module.exports = {
  extendedRule,
};
```

## Options

### `metaOverrides`

Overrides for the original rule's `meta` property. The properties of the `meta` object can be found [here](https://eslint.org/docs/developer-guide/working-with-rules#rule-basics).Options

```js
const extendedRule = ruleExtender(originalRule, {
  metaOverrides: {
    type: 'suggestion',
    fixable: false,
  },
});
```

### `createAdditionalVisitors`

A function that has the same signature as ESLint rules' `create` method. It is passed the [`context`](https://eslint.org/docs/developer-guide/working-with-rules#the-context-object) object and should return a object of visitor callbacks. See [the official ESLint docs](https://eslint.org/docs/developer-guide/working-with-rules#rule-basics) for more details!

### Example Usage

```js
const extendedRule = ruleExtender(originalRule, {
  createAdditionalVisitors(context) {
    return {
      ArrowFunctionExpression(node) {
        context.report({ node, messageId: 'anAdditionalSuggestion' });
      },
    };
  },
});
```

### `reportOverrides`

A function that is called with the report metadata of the original rule's [`context.report()`](https://eslint.org/docs/developer-guide/working-with-rules#contextreport) calls. The return value of this function is a trinary with the following behavior:

- `true`: report with original metadata (unchanged)
- `false`: do not report
- modified report metadata object: report with this metadata instead

### Example Usage

```js
const extendedRule = ruleExtender(originalRule, {
  reportOverrides(meta) {
    return meta.node.type !== 'ThisExpression';
  },
});
```

## Putting It All Together

```js
const ruleExtender = require('eslint-rule-extender');
const { originalRule } = require('eslint-plugin-example');

const extendedRule = ruleExtender(originalRule, {
  metaOverrides: {
    type: 'suggestion',
    fixable: false,
  },
  createAdditionalVisitors(context) {
    return {
      ArrowFunctionExpression(node) {
        context.report({ node, messageId: 'anAdditionalSuggestion' });
      },
    };
  },
  reportOverrides(meta) {
    return meta.node.type !== 'ThisExpression';
  },
});

module.exports = {
  extendedRule,
};
```

## Prior art

- [eslint-rule-composer](https://github.com/not-an-aardvark/eslint-rule-composer)
