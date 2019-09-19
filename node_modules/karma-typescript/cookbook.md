# Cookbook

> Recipes for configuring `karma-typescript`

## Hybrid application with coverage

To get code coverage for both plain JavaScript modules and Typescript modules in a hybrid application,
simply use `allowJs` in the Typescript compiler options and then pipe all `.js` and `.ts` files through
`karma-typescript`:

```javascript
module.exports = function(config) {
    config.set({

        frameworks: ["jasmine", "karma-typescript"],

        files: [
            { pattern: "src/**/*.+(js|ts)" },
        ],

        preprocessors: {
            "src/**/*.+(js|ts)": ["karma-typescript"],
        },

        reporters: ["progress", "karma-typescript"],

        karmaTypescriptConfig: {
            compilerOptions: {
                allowJs: true,
            },
        },

        browsers: ["Chrome"]
    });
};
```

## Code and tests in separate directories

There are two ways to configure `karma-typescript` when you keep the application code and its unit tests in
separate directories and you don't want the tests to get included in the coverage report.

1. The setting `karmaTypescriptConfig.coverageOptions.exclude`, which is a `RegExp` object (or an array of
`RegExp` objects) for filtering which files get excluded from coverage instrumentation.

2. You can tell `karma-typescript` not to instrument all code for coverage automatically by adding `karma-coverage`
to the `preprocessors` array; if the presence of `karma-coverage` is detected no code will be instrumented for
coverage automatically by `karma-typescript`, giving you full control over which files should get instrumented:

```javascript
module.exports = function(config) {
    config.set({

        frameworks: ["jasmine", "karma-typescript"],

        files: [
            { pattern: "src/**/*.ts" },
            { pattern: "test/**/*.ts" }
        ],

        preprocessors: {
            "src/**/*.ts": ["karma-typescript", "coverage"],
            "test/**/*.ts": ["karma-typescript"]
        },

        reporters: ["progress", "coverage", "karma-typescript"],

        browsers: ["Chrome"]
    });
};
```

## Importing ES2015 (aka ES6) modules

Modules written in ES6 syntax can't be run in a web browser directly (yet) and need to be compiled to
ES5 syntax first. To do this automatically on each test run, you can use the bundler plugin
[karma-typescript-es6-transform](https://github.com/monounity/karma-typescript-es6-transform):

First, install the ES6 transforms plugin as a dev dependency:

```bash
npm install --save-dev karma-typescript-es6-transform
```

And then in the Karma configuration, configure the bundler to use the plugin:

```javascript
karmaTypescriptConfig: {
    bundlerOptions: {
        transforms: [require("karma-typescript-es6-transform")()]
    }
}
```

## PostCSS runner with a plugin

In this recipe we set up `karma-typescript` to run the PostCSS `autoprefixer` plugin on all `.css` files
with the PostCSS runner [karma-typescript-postcss-transform](https://github.com/monounity/karma-typescript-postcss-transform).

First, install the PostCSS transforms plugin and the `autoprefixer` package as dev dependencies:

```bash
npm install --save-dev karma-typescript-postcss-transform autoprefixer
```

And then in the Karma configuration, configure the bundler to use the runner with a plugin and custom options:

```javascript
karmaTypescriptConfig: {
    bundlerOptions: {
        transforms: [
            require("karma-typescript-postcss-transform")(
                [require("autoprefixer")], { map: { inline: true } }, /\.css$/
            )
        ]
    }
}
```

## Css Modules

When using (for instance) [React CSS Modules](https://github.com/gajus/react-css-modules), style sheets must
be loaded as JSON objects by the bundler. This can be achieved by using the CSS Modules transforms plugin
[karma-typescript-cssmodules-transform](https://github.com/monounity/karma-typescript-cssmodules-transform),
which will transform style sheets to JSON on the fly each test run.

First, install the CSS Modules transforms plugin as a dev dependency:

```bash
npm install --save-dev karma-typescript-cssmodules-transform
```

And then in the Karma configuration, configure the bundler to use the transform with custom options:

```javascript
karmaTypescriptConfig: {
    bundlerOptions: {
        transforms: [
            require("karma-typescript-cssmodules-transform")({}, {}, /\.css$/),
        ]
    }
}
```

## Emulating webpack's define plugin with bundler constants:

```javascript
karmaTypescriptConfig: {
    bundlerOptions: {
        constants: {
            __PRODUCTION__: false
        }
    }
}
```
