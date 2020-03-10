# eslint-plugin-rulesdir

Allows a local directory containing ESLint rules directory to be easily used. This is a substitute for the `--rulesdir` option that can be used without a command-line flag.

**Experimental:** This plugin is currently a proof-of-concept. Its API is likely to change in the future.

## Installation

You'll first need to install [ESLint](http://eslint.org):

```
$ npm i eslint --save-dev
```

Next, install `eslint-plugin-rulesdir`:

```
$ npm install eslint-plugin-rulesdir --save-dev
```

**Note:** If you installed ESLint globally (using the `-g` flag) then you must also install `eslint-plugin-rulesdir` globally.

## Usage

To use this plugin, you must load it manually first and set its `RULES_DIR` property to a path. The path is resolved from the current working directory, and indicates where you would like the plugin to load your rules from. This is easiest if you use a JavaScript config file (`.eslintrc.js`), and use a local installation of ESLint.

```js
// .eslintrc.js
const rulesDirPlugin = require('eslint-plugin-rulesdir');
rulesDirPlugin.RULES_DIR = 'tools/eslint-rules'; // (an example folder where your rules might be stored)
```

Then you should add `rulesdir` to the plugins section of your `.eslintrc.js` file.

```js
{
  plugins: [
    'rulesdir'
  ]
}
```

Finally, you can configure your local rules, prefixed with `rulesdir/`.

```js
{
  rules: {
    //
    'rulesdir/my-internal-foo-rule': 'error',
    'rulesdir/my-internal-bar-rule': ['warn', 2]
  }
}
```

All of the rules from your configured rules directory will be available. In this example, we assumed there were rule files in `tools/eslint-rules/my-internal-foo-rule.js` and `tools/eslint-rules/my-internal-bar-rule.js`.

## Prior Art

* [`eslint-plugin-local-rules`](https://github.com/cletusw/eslint-plugin-local-rules)

## License

[MIT](https://github.com/not-an-aardvark/eslint-plugin-rulesdir/blob/master/LICENSE.md)
