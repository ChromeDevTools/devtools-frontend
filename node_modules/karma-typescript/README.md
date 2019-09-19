# karma-typescript

<a href="https://www.npmjs.com/package/karma-typescript"><img alt="Npm Version" src="https://img.shields.io/npm/v/karma-typescript.svg"></a>
<a href="https://www.npmjs.com/package/karma-typescript"><img alt="Npm Total Downloads" src="https://img.shields.io/npm/dt/karma-typescript.svg"></a>
<a href="https://www.npmjs.com/package/karma-typescript"><img alt="Npm Monthly Downloads" src="https://img.shields.io/npm/dm/karma-typescript.svg"></a>
<a href="https://travis-ci.org/monounity/karma-typescript"><img alt="Travis Status" src="https://img.shields.io/travis/monounity/karma-typescript/master.svg?label=travis"></a>
<a href="https://ci.appveyor.com/project/monounity/karma-typescript"><img alt="Appveyor Status" src="https://img.shields.io/appveyor/ci/monounity/karma-typescript/master.svg?label=appveyor"></a>

> Karma :heart: Typescript

* Run unit tests written in Typescript with full type checking, seamlessly without extra build steps or scripts.
* Get remapped test coverage with [karma-coverage](https://github.com/karma-runner/karma-coverage) and [Istanbul](https://github.com/gotwarlost/istanbul).
* Use plain Typescript or a framework: Angular2, AngularJS, React, Sinon, any framework of choice.

## Installation

The easiest way is to keep `karma-typescript` as a devDependency in `package.json`:

```json
{
  "devDependencies": {
    "karma": "^4.0.0",
    "karma-typescript": "4.1.1"
  }
}
```

Do this by installing the plugin via npm:

```
npm install --save-dev karma-typescript
```

## Configuration

Bare minimum configuration can be achieved with the following `karma.conf.js` file:

```javascript
module.exports = function(config) {
    config.set({
        frameworks: ["jasmine", "karma-typescript"],
        files: [
            "src/**/*.ts" // *.tsx for React Jsx
        ],
        preprocessors: {
            "**/*.ts": "karma-typescript" // *.tsx for React Jsx
        },
        reporters: ["progress", "karma-typescript"],
        browsers: ["Chrome"]
    });
};
```

The above example will compile all Typescript files and run the unit tests, producing remapped coverage in `./coverage`.

## Examples

[Cookbook](https://github.com/monounity/karma-typescript/blob/master/packages/karma-typescript/cookbook.md)

### Frameworks and Integrations

- [Angular2](https://github.com/monounity/karma-typescript/tree/master/examples/angular2)
- [AngularJS](https://github.com/monounity/karma-typescript/tree/master/examples/angularjs)
- [Docker](https://github.com/monounity/karma-typescript/tree/master/examples/docker)
- [Gulp](https://github.com/monounity/karma-typescript/tree/master/examples/gulp)
- [Mocha](https://github.com/monounity/karma-typescript/tree/master/examples/mocha)

### Other examples

- Typescript [1.8.10 to ^2.0.0](https://github.com/monounity/karma-typescript/tree/master/examples/typescript-latest)
- Typescript [1.6.2 to 1.7.5](https://github.com/monounity/karma-typescript/tree/master/examples/typescript-1.6.2)
- Typescript [1.8.10](https://github.com/monounity/karma-typescript/tree/master/tests/integration-1.8.10/src)
- Typescript [@latest](https://github.com/monounity/karma-typescript/tree/master/tests/integration-latest/src)

### Sample applications by users
- [Hybrid app, code in JavaScript and tests in Typescript](https://github.com/adrianmarinica/karma-typescript-angularjs-sample)

## Transforms:
- [karma-typescript-angular2-transform](https://github.com/monounity/karma-typescript/tree/master/packages/karma-typescript-angular2-transform)
- [karma-typescript-cssmodules-transform](https://github.com/monounity/karma-typescript/tree/master/packages/karma-typescript-cssmodules-transform)
- [karma-typescript-es6-transform](https://github.com/monounity/karma-typescript/tree/master/packages/karma-typescript-es6-transform)
- [karma-typescript-postcss-transform](https://github.com/monounity/karma-typescript/tree/master/packages/karma-typescript-postcss-transform)

### Example output

<img src="http://i.imgur.com/sc4Mswh.png" width="580" height="280" />

- [Angular2 screenshot](https://github.com/monounity/karma-typescript/blob/master/assets/angular2.png)
- [React screenshot](https://github.com/monounity/karma-typescript/blob/master/assets/react.png)

## Advanced configuration

The plugin has default settings for the compiler, instrumenting files and creating reports etc, which should suit most needs.

These are the default compiler settings:

```javascript
karmaTypescriptConfig: {
    compilerOptions: {
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
        jsx: "react",
        module: "commonjs",
        sourceMap: true,
        target: "ES5"
    },
    exclude: ["node_modules"]
}
```

The default `karma-coverage` instrumentation settings:

```javascript
karmaTypescriptConfig: {
    coverageReporter: {
        instrumenterOptions: {
            istanbul: { noCompact: true }
        }
    }
}
```

If the defaults aren't enough, the settings can be configured from `karma.conf.js`:

* **karmaTypescriptConfig.bundlerOptions.addNodeGlobals** - Boolean indicating whether the global variables
  `process` and `Buffer` should be added to the bundle.<br/>
  Defaults to `true`.

* **karmaTypescriptConfig.bundlerOptions.constants** - An object literal with keys/values which will be available as global
  variables in the bundle. The keys are expected to be strings and any non-string value will be stringified with `JSON.stringify`.

  Configuration example:
    ```javascript
    constants: {
        __STRING__: JSON.stringify("abc" + 123),
        __BOOLEAN__: true,
        "process.env": {
            "VARIABLE": "value"
        }
    }
    ```
  Code example:
    ```javascript
    declare var __STRING__: string;
    declare var __BOOLEAN__: boolean;

    console.log(__STRING__, __BOOLEAN__, process.env.VARIABLE);
    ```

* **karmaTypescriptConfig.bundlerOptions.entrypoints** - A `RegExp` filtering which files loaded by Karma should be executed in
   a test run, for example only filenames ending with ".spec.ts": `/\.spec\.ts$/`.<br/>
   This setting can be used to make sure the specs have finished setting up the test environment before other code starts
   requiring modules, which otherwise could lead to subtle bugs caused by race conditions.<br/>
   When filtering file paths, beware that Windows uses `\` while UNIX-like systems use `/` as path separator.<br/>
   Defaults to all files, `/.*/`.

* **karmaTypescriptConfig.bundlerOptions.exclude** - An array of npm module names that will be excluded from the bundle.

* **karmaTypescriptConfig.bundlerOptions.ignore** - An array of npm module names that will be bundled as stubs, ie `module.exports = {};`.

* **karmaTypescriptConfig.bundlerOptions.noParse** - An array of module names that will be bundled without being parsed for dependencies.

* **karmaTypescriptConfig.bundlerOptions.resolve.alias** - An object literal where the key is a module name
  and the value is a path that will be used when resolving the module.<br/>
  The key is a string.

* **karmaTypescriptConfig.bundlerOptions.resolve.extensions** - An array of file extensions to use, in order, when resolving modules.<br/>
  Defaults to `[".js", ".json", ".ts", ".tsx"]`.

* **karmaTypescriptConfig.bundlerOptions.resolve.directories** - An array of directories where modules will be recursively looked up.<br/>
  Defaults to `["node_modules"]`.

* **karmaTypescriptConfig.bundlerOptions.sourceMap** - A boolean indicating whether source maps should be generated for imported modules in the bundle, useful for debugging in a browser.
  For more debugging options, please see `karmaTypescriptConfig.coverageOptions.instrumentation`.</br>
  Defaults to `false`.

* **karmaTypescriptConfig.bundlerOptions.transforms** - An array of functions altering or replacing compiled Typescript code/Javascript
  code loaded from `node_modules` before bundling it.
  For more detailed documentation on transforms, please refer to the [Transforms API section](#transforms-api) in this document.<br/>

* **karmaTypescriptConfig.bundlerOptions.validateSyntax** - A boolean indicating whether the syntax of the bundled code should be validated.
  Setting this to `false` may speed up bundling for large projects with lots of imports from `node_modules`.<br/>
  Defaults to `true`.

* **karmaTypescriptConfig.compilerDelay** - The number of milliseconds the compiler waits before compiling the project on each run.</br>
  For projects with a large number of files it might be necessary to increase this value to make sure the compiler has collected all files before firing.</br>
  Defaults to 250 ms.

* **karmaTypescriptConfig.compilerOptions** - This setting will override or add to existing compiler options.<br/>
  Valid options are the same as for the `compilerOptions` section in `tsconfig.json`, with the
  exception of `outDir`and `outFile` which are ignored since the code is compiled in-memory.

  If `noEmitOnError` is set to a truthy value, in either `tsconfig.json` or in `karmaTypescriptConfig.compilerOptions`,
  the karma process will exit with `ts.ExitStatus.DiagnosticsPresent_OutputsSkipped` if any compilation errors occur.

* **karmaTypescriptConfig.coverageOptions.instrumentation** - A boolean indicating whether the code should be instrumented,
  set this property to `false` to see the original Typescript code when debugging.
  Please note that setting this property to `true` requires the Typescript compiler option `sourceMap` to also be set to `true`.
  For more debugging options, please see `karmaTypescriptConfig.coverageOptions.sourceMap`.<br/>
  Defaults to `true`.

* **karmaTypescriptConfig.coverageOptions.exclude** - A `RegExp` object or an array of `RegExp` objects for filtering which files should be excluded from coverage instrumentation.<br/>
  When filtering file paths, beware that Windows uses `\` while UNIX-like systems use `/` as path separator.<br/>
  Defaults to `/\.(d|spec|test)\.ts$/i` which excludes &ast;.d.ts, &ast;.spec.ts and &ast;.test.ts (case insensitive).

* **karmaTypescriptConfig.coverageOptions.threshold** - An object with minimum coverage thresholds. The threshold values can be set on
  a global level and on a per-file level, with options to exclude files and directories, and override settings on a per-file basis using globbing patterns.<br/>
  A positive value will be used as a minimum percentage, for example `statements: 50` means that at least 50% of the statements should be covered by a test.<br/>
  A negative value will be used as a maximum number of uncovered items, for example `lines: 10` means that no more than 10 uncovered lines are allowed.
    ```javascript
    threshold: {
        global: {
            statements: 100,
            branches: 100,
            functions: -10,
            lines: 100,
            excludes: [
                "src/foo/**/*.js"
            ]
        },
        file: {
            statements: -10,
            branches: 100,
            functions: 100,
            lines: 100,
            excludes: [
                "src/bar/**/*.js"
            ],
            overrides: {
                "src/file.js": {
                    statements: 90
                }
            }
        }
    }
    ```

* **karmaTypescriptConfig.exclude** - File string patterns to be excluded by the compiler. This property may be an `array` or an `object` for more fine-grained control.
  * Array: The string values will be merged with existing options.
  * Object: The string values will be merged with or replace existing options:
  ```javascript
  {
      mode: "merge|replace",
      values: ["foo", "bar"]
  }
  ```
  Defaults to `["node_modules"]`.

* **karmaTypescriptConfig.include** - File string patterns to be included by the compiler. This property may be an `array` or an `object` for more fine-grained control.
  * Array: The string values will be merged with existing options.
  * Object: The string values will be merged with or replace existing options:
  ```javascript
  {
      mode: "merge|replace",
      values: ["foo", "bar"]
  }
  ```
  This option is available in Typescript ^2.0.0.

* **karmaTypescriptConfig.remapOptions** - Pass options to `remap-istanbul`.

    * Available options:

        * `exclude`, a regex for excluding files from remapping
        * `warn`, a function for handling error messages

* **karmaTypescriptConfig.reports** - The types of coverage reports that should be created when running the tests,
  defaults to an html report in the directory `./coverage`.
  Reporters are configured as `"reporttype": destination` where the destination can be specified in three ways:

    * A `string` with a directory path, for example `"html": "coverage"`.
    * An empty string or `null`. Writes the output to the console, for example `"text-summary": ""`. This is only possible for a subset of the reports available.
    * An `object` with more fine-grained control over path and filename:
    ```javascript
    "cobertura": {
        "directory": "coverage",    // optional, defaults to 'coverage'
        "subdirectory": "cobertura" // optional, defaults to the name of the browser running the tests
        "filename": "coverage.xml", // optional, defaults to the report name
    }

    // "subdirectory" may also be a function that returns a directory from a given browser
    "cobertura": {
        "directory": "coverage",
        "subdirectory": function(browser) {
            // normalizes browser name directories to lowercase without version
            // ex: coverage/chrome/coverage.xml
            return browser.name.toLowerCase().split(' ')[0];
        },
        "filename": "coverage.xml"
    }
    ```

    * Available report types:
        * `"clover": destination`
        * `"cobertura": destination`
        * `"html": destination`
        * `"json-summary": destination`
        * `"json": destination`
        * `"lcovonly": destination`
        * `"teamcity": destination` (redirects to the console with destination "" or `null`)
        * `"text-lcov": destination` (redirects to the console with destination "" or `null`)
        * `"text-summary": destination` (redirects to the console with destination "" or `null`)
        * `"text": destination` (redirects to the console with destination "" or `null`)

    * Example of the three destination types:
    ```javascript
    karmaTypescriptConfig: {
        reports:
        {
            "cobertura": {
                "directory": "coverage",
                "filename": "coverage.xml",
                "subdirectory": "cobertura"
            },
            "html": "coverage",
            "text-summary": ""
        }
    }
    ```

* **karmaTypescriptConfig.transformPath** - A function for renaming compiled file extensions to `.js`.<br/>
  Defaults to renaming `.ts` and `.tsx` to `.js`.

* **karmaTypescriptConfig.tsconfig** - A path to a `tsconfig.json` file.<br/>
  The default compiler options will be replaced by the options in this file.<br/>
  The directory of the `tsconfig.json` file will be used as the base path for the Typescript compiler, and if `karmaTypescriptConfig.tsconfig` isn't set, the `basePath` property of the Karma config will be used as the
  compiler base path instead.

Example of a full `karmaTypescriptConfig` configuration:

```javascript
karmaTypescriptConfig: {
    bundlerOptions: {
        addNodeGlobals: true,
        constants: {
            __PRODUCTION__: false
        },
        entrypoints: /\.spec\.(ts|tsx)$/,
        exclude: ["react/addons"],
        ignore: ["ws"],
        noParse: "jquery",
        resolve: {
            alias: {
                "@angular/upgrade/static$": "../bundles/upgrade-static.umd.js"
            },
            extensions: [".js", ".json"],
            directories: ["node_modules"]
        },
        sourceMap: false,
        transforms: [require("karma-typescript-es6-transform")()],
        validateSyntax: true
    },
    compilerDelay: 500,
    compilerOptions: {
        noImplicitAny: true,
    },
    coverageOptions: {
        instrumentation: true,
        exclude: /\.(d|spec|test)\.ts/i,
        threshold: {
            global: {
                statements: 100,
                branches: 100,
                functions: -10,
                lines: 100,
                excludes: [
                    "src/foo/**/*.js"
                ]
            },
            file: {
                statements: -10,
                branches: 100,
                functions: 100,
                lines: 100,
                excludes: [
                    "src/bar/**/*.js"
                ],
                overrides: {
                    "src/file.js": {
                        statements: 90
                    }
                }
            }
        },
    },
    exclude: ["broken"],
    include: {
        mode: "replace",
        values: ["**/*.ts"]
    },
    remapOptions: {
        warn: function(message){
            console.log(message);
        }
    },
    reports: {
        "cobertura": {
            "directory": "coverage",
            "filename": "cobertura/coverage.xml"
        },
        "html": "coverage",
        "text-summary": ""
    },
    transformPath: function(filepath) {
        return filepath.replace(/\.(ts|tsx)$/, ".js");
    },
    tsconfig: "./tsconfig.json"
}
```

## Automatic bundling

Files executed in the test run are bundled into a main bundle, containing dependencies required from node_modules,
and several smaller standalone bundles containing the Typescript files. All these bundles are tied together by `commonjs.js`,
which acts as a hub, loading modules when they are required by other modules.

All files are bundled by being wrapped in a custom [CommonJS](https://en.wikipedia.org/wiki/CommonJS) wrapper,
which emulates the Node.js module system by injecting the require function, the module object, the exports object,
the &#95;&#95;dirname variable and the &#95;&#95;filename variable.

For instance, this Typescript sample:

```javascript
export function exportedFunction(): string {
    return "";
}
```

Would be compiled to the following JavaScript (assuming the compiler option `module` is set to `commonjs`):

```javascript
function exportedFunction() {
    return "";
}
exports.exportedFunction = exportedFunction;
```

It would then be wrapped in a `CommonJS` wrapper by the bundler:

```javascript
(function(global){
    global.wrappers['/absolutepath/app/src/file.ts']=[function(require,module,exports,__dirname,__filename){
        function exportedFunction() {
            return "";
        }
        exports.exportedFunction = exportedFunction;
    },'src/file.ts',{}];
})(this);
```

*(In this example, the source map and a few other statements have been omitted for brevity and the wrapper has been formatted for readability)*

After compilation, a simple static analysis is performed to find "import" and "require" statements in the code and if any
dependencies are found, for instance `import { Component } from "@angular/core";`, it is added to the main bundle file along
with its dependencies.

If no import or require statements are found in any Typescript file included in the test run, or the compiler option `module`
is set to another value than `commonjs`, *automatic bundling will not occur*.

This means that no Typescript file will be wrapped in the CommonJS wrapper and the reason behind this is the encapsulation that
the Node.js module system provides. If no module requests any other module, the test run would contain only isolated islands of
code unreachable from the global scope, there would be nothing to execute.

However, this intentional behavior makes it possible to use karma-typescript for projects that use the Typescript module system,
or have the compiler option `module` set to another value than `commonjs`, or simply put everything on the global scope.

### Importing stylesheets and bundling for production

Style files (.css|.less|.sass|.scss) are served as JSON strings to the browser running the tests,
allowing styles to be loaded using the Typescript import statement, ie `import "./style/app.scss";`.

This means styles can be imported in order to let, for instance, webpack load the styles with
less-loader or scss-loader etc for bundling later on, without breaking the unit test runner.

Note: JSON required by modules in node_modules will be loaded automatically by the bundler.

### The module object

```javascript
module: {
    exports: {},
    id: "project-relative-path/bar.ts",
    uri: "/absolute-path/project-relative-path/bar.ts"
}
```

The `module.id` will be calculated from the value of `module.uri`, relative to the Karma config `basePath` value.

Modules exporting an extensible object such as a *function* or an *object literal* will also be decorated with
a non-enumerable `default` property if `module.exports.default` is undefined.

### Globals

A full Node.js environment will be provided with global variables and browser shims for builtin core modules:

* &#95;&#95;dirname
* &#95;&#95;filename
* Buffer
* global
* process

### Browser shims
* [assert](https://www.npmjs.com/package/assert)
* [buffer](https://www.npmjs.com/package/buffer)
* [console](https://www.npmjs.com/package/console-browserify)
* [constants](https://www.npmjs.com/package/constants-browserify)
* [crypto](https://www.npmjs.com/package/crypto-browserify)
* [domain](https://www.npmjs.com/package/domain-browser)
* [events](https://www.npmjs.com/package/events)
* [http](https://www.npmjs.com/package/stream-http)
* [https](https://www.npmjs.com/package/https-browserify)
* [os](https://www.npmjs.com/package/os-browserify)
* [path](https://www.npmjs.com/package/path-browserify)
* [punycode](https://www.npmjs.com/package/punycode)
* [querystring](https://www.npmjs.com/package/querystring-es3)
* [stream](https://www.npmjs.com/package/stream-browserify)
* [string_decoder](https://www.npmjs.com/package/string_decoder)
* [timers](https://www.npmjs.com/package/timers-browserify)
* [tty](https://www.npmjs.com/package/tty-browserify)
* [url](https://www.npmjs.com/package/url)
* [util](https://www.npmjs.com/package/util)
* [vm](https://www.npmjs.com/package/vm-browserify)
* [zlib](https://www.npmjs.com/package/browserify-zlib)

The plugin uses [browser-resolve](https://github.com/defunctzombie/node-browser-resolve) from the [browserify](https://github.com/substack/node-browserify) tool chain to load the source code from node_modules.

### Mocking
Imported modules, local or npm packages, can be mocked using [karma-typescript-mock](https://www.npmjs.com/package/karma-typescript-mock). This feature is available in `karma-typescript@^3.0.5`.

## Transforms API

The bundler has a public API which lets plugins alter or completely replace code before adding it to the bundle.
For example, a plugin could compile ES2015 JavaScript code to to ES5 syntax, making it possible to import an `npm` module
written in ES2015 syntax from a Typescript module directly.

The interface between the bundler and the plugins is a plain array of functions, specified in the configuration property `karmaTypescriptConfig.bundlerOptions.transforms`, where each function is considered a transforming plugin.

The plugin functions in the transforms array are asynchronous and adhere to the Node.js callback convention where the first
argument of the callback function is an `Error` object or `undefined` and the following parameters contains the result.
However, although each function is asynchronous, all functions will be called *synchronously* one by one in the order they were added to the array, and each function will be called with the result of the previous function, enabling transforms plugin chaining.

Transforms will be executed at two points in the bundling process: right after compilation of the project Typescript files
and when resolving `import` and `require` statements. This means each transforming function will be called for both
Typescript files and JavaScript files from `node_modules`, making each plugin implementation responsible for validating the
context before performing any logic, for example by checking the file name, module name or the existence of an ast object etc.

Each transforming function will be executed before resolving dependencies, which means paths in `import` or `require` statements
or anywhere in the code can be rewritten before bundling, to fit the Karma execution environment. 

Example of a simple inline transforming function replacing the contents of a `.css` file, mimicking the behavior of Css Modules:

```javascript
karmaTypescriptConfig: {
    bundlerOptions: {
        transforms: [
            function(context, callback) {
                if(context.module === "./main.css") {
                    context.source = "module.exports = { color: red };";
                    return callback(undefined, true);
                }
                return callback(undefined, false);
            }
        ]
    }
}
```

It is also possible to change the transpiled Typescript (ie the plain JavaScript code) code by using the third callback parameter to tell the Transforms API not to recompile the transpiled code:

```javascript
karmaTypescriptConfig: {
    bundlerOptions: {
        transforms: [
            function(context, callback) {
                if(context.ts) {
                    context.ts.transpiled = "\n/* istanbul ignore next */\n" + context.ts.transpiled;
                    return callback(undefined, true, false);
                }
                return callback(undefined, false);
            }
        ]
    }
}
```

### Context
The context object, `TransformContext`, is defined [here](https://github.com/monounity/karma-typescript/blob/master/src/api/transforms.ts).

### Callback

The callback has two signatures, the "boolean" and the "object".

The boolean callback function has three arguments:
1. An `Error` object or `undefined`
2. A boolean indicating whether the value of `context.source` has changed or not.
3. A boolean indicating whether the transformed source should be recompiled. Defaults to true and can be omitted.

The object callback function has two arguments:

1. An `Error` object or `undefined`
2. An object literal, which has the following properties:
    1. A boolean indicating whether the value of `context.source` has changed or not.
    2. A boolean indicating whether the transformed source should be recompiled (Typescript only!).
    3. A boolean indicating whether a new AST should be created for the transformed source (JavaScript only!).

## Requirements

Typescript ^1.6.2 is required.

Versions 1.6.2 - 1.7.5 work but aren't as heavily tested as versions 1.8.10 and up.

## Troubleshooting

### Error: Can not load "karma-typescript", it is not registered!

Users have reported success by simply deleting the `node_modules` folder and then running `npm install` again.

### Error: Cannot find module 'buffer/' from '.'

*Note: this error has been fixed in karma-typescript@^3.0.0`.*

This error seems to hit mostly users of with older versions of `npm`, where all dependencies don't get pulled in automatically by `npm`.

There's a workaround reported by users, which is simply adding the missing dependencies explicitly to `package.json`:

 * `npm install --save-dev browser-resolve`
 * `npm install --save-dev buffer`
 * `npm install --save-dev process`

Other workarounds are running `npm install` twice or, if possible, upgrading to a newer version of `npm`.

These are the environments reported failing/working:

|Npm|Node.js|OS|Works|
|---|---|---|---|
|2.5.18|4.4.7|Unknown|No|
|2.14.7|4.2.1|Ubuntu 14.04|No|
|2.14.12|4.2.6|OSX 10.11.3|No|
|2.15.9|4.5.0|OSX 10.11.6|No|
|2.15.9|4.6.0|OSX 10.12.3|No|
|2.15.11|4.6.2|Ubuntu 14.04|No|
|2.15.11|4.7.0|Ubuntu 14.04|Yes|
|3.5.3|4.2.1|Windows 10|Yes|
|3.8.6|6.10.0|Windows Server 2012 R2|Yes|
|3.10.3|6.4.0|OSX 10.11.6|Yes|
|3.10.9|6.9.2|Ubuntu 14.04|Yes|
|4.0.5|6.4.0|OSX 10.11.6|Yes|
|4.1.2|7.5.0|OSX 10.12.2|No|
|4.1.2|7.7.3|Ubuntu 14.04|Yes|

## Licensing

This software is licensed with the MIT license.

© 2016-2019 Erik Barke, Monounity
