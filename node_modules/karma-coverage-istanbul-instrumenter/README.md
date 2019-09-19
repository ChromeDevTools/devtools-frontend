# karma-coverage-istanbul-instrumenter

[![Npmjs Version](https://img.shields.io/npm/v/karma-coverage-istanbul-instrumenter.svg)](https://www.npmjs.com/package/karma-coverage-istanbul-instrumenter)
[![Npmjs Npm Monthly Downloads](https://img.shields.io/npm/dm/karma-coverage-istanbul-instrumenter.svg)](https://www.npmjs.com/package/karma-coverage-istanbul-instrumenter)
[![dependencies Status](https://david-dm.org/monounity/karma-coverage-istanbul-instrumenter/status.svg)](https://david-dm.org/monounity/karma-coverage-istanbul-instrumenter)

> A karma preprocessor that uses the latest istanbul 1.x APIs to instrument bundled ES5 or native ES6 code for coverage

## About

This plugin instruments javascript code for coverage using the latest [istanbul 1.x APIs](https://github.com/istanbuljs). Source maps and mapping transpiled/bundled code to get coverage for the original source code is fully supported.

For configuring coverage output format, thresholds and other reporting options, please see [karma-coverage-istanbul-reporter](https://github.com/mattlewis92/karma-coverage-istanbul-reporter).

## Examples

- Unit testing native ES6 code with coverage in Karma and Chrome Headless, no bundling or transpiling: [test/es6-native](https://github.com/monounity/karma-coverage-istanbul-instrumenter/tree/master/test/es6-native).

- Unit testing Typescript code transpiled to ES6 + external source maps with coverage in Karma and Chrome Headless: [test/external-sourcemap](https://github.com/monounity/karma-coverage-istanbul-instrumenter/tree/master/test/external-sourcemap).

- Unit testing Typescript code transpiled to ES6 + inline source maps with coverage in Karma and Chrome Headless: [test/inline-sourcemap](https://github.com/monounity/karma-coverage-istanbul-instrumenter/tree/master/test/inline-sourcemap).

- Unit testing ES6 code transpiled to ES5 with coverage in Karma and Chrome Headless, bundled with Rollup, transpiled with Babel: [test/rollup](https://github.com/monounity/karma-coverage-istanbul-instrumenter/tree/master/test/rollup).

## Installation

```
npm install --save-dev karma-coverage-istanbul-instrumenter
```

## Configuration

```js
module.exports = function(config) {
    config.set({

        // ...

        preprocessors: {
            "/!(*.spec).js": ["karma-coverage-istanbul-instrumenter"]
        },

        coverageIstanbulInstrumenter: {
            esModules: true,
            // ... 
        },

        // ...
    });
};
```

## Options

The plugin supports all options supported by [istanbul-lib-instrument](https://github.com/istanbuljs/istanbuljs/blob/master/packages/istanbul-lib-instrument/src/instrumenter.js):

```js
{
    // Name of global coverage variable.
    coverageVariable: '__coverage__',

    // Preserve comments in output.
    preserveComments: false,

    // Generate compact code.
    compact: true,

    // Set to true to instrument ES6 modules.
    esModules: false,

    // Set to true to allow `return` statements outside of functions.
    autoWrap: false,

    // Set to true to produce a source map for the instrumented code.
    produceSourceMap: false,

    // Set to array of class method names to ignore for coverage.
    ignoreClassMethods: [],

    // A callback function that is called when a source map URL is found in the original code.
    // This function is called with the source file name and the source map URL.
    sourceMapUrlCallback: null,

    // Turn debugging on.
    debug: false,

    // Set plugins.
    plugins: [
        'asyncGenerators',
        'dynamicImport',
        'objectRestSpread',
        'optionalCatchBinding',
        'flow',
        'jsx'
    ]
};
```

## License

MIT

© 2019 Erik Barke, Monounity
