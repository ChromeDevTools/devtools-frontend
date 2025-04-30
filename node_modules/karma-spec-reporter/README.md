# karma-spec-reporter

[![Join the chat at https://gitter.im/mlex/karma-spec-reporter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/mlex/karma-spec-reporter?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) [![CircleCI](https://circleci.com/gh/tmcgee123/karma-spec-reporter/tree/master.svg?style=svg)](https://circleci.com/gh/tmcgee123/karma-spec-reporter/tree/master)
[![Coverage Status](https://coveralls.io/repos/github/tmcgee123/karma-spec-reporter/badge.svg?branch=master)](https://coveralls.io/github/tmcgee123/karma-spec-reporter?branch=master)

Test reporter, that prints detailed results to console (similar to mocha's spec reporter).

## Usage

To use in your own Node.js project, just execute
```
npm install karma-spec-reporter --save-dev
```
This will download the karma-spec-reporter and add the dependency to `package.json`.

Then add ``'spec'`` to reporters in karma.conf.js, e.g.

```
reporters: ['spec']
```

Take a look at the [karma-spec-reporter-example](http://github.com/mlex/karma-spec-reporter-example) repository to see the reporter in action.

## Configuration

To limit the number of lines logged per test or suppress specific reporting, use the `specReporter` configuration in your
karma.conf.js file
``` js
//karma.conf.js
...
  config.set({
    ...
      reporters: ["spec"],
      specReporter: {
        maxLogLines: 5,             // limit number of lines logged per test
        suppressSummary: true,      // do not print summary
        suppressErrorSummary: true, // do not print error summary
        suppressFailed: false,      // do not print information about failed tests
        suppressPassed: false,      // do not print information about passed tests
        suppressSkipped: true,      // do not print information about skipped tests
        showBrowser: false,         // print the browser for each spec
        showSpecTiming: false,      // print the time elapsed for each spec
        failFast: true,             // test would finish with error when a first fail occurs
        prefixes: {
          success: '    OK: ',      // override prefix for passed tests, default is '✓ '
          failure: 'FAILED: ',      // override prefix for failed tests, default is '✗ '
          skipped: 'SKIPPED: '      // override prefix for skipped tests, default is '- '
        }
      },
      plugins: ["karma-spec-reporter"],
    ...
```

## Contributing

### Running tests

To run the tests for the index.js file, run: `npm test`

### Generating Coverage

To see the coverage report for the module, run: `npm run coverage`
