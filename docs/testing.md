# Testing Chromium DevTools

Follow the steps outlined in [Get the Code](get_the_code.md) to checkout the DevTools front-end code.

[TOC]

## DevTools frontend

Run tests with

```
npm test
```

This command runs all tests in the devtools frontend repo, which are the [unit tests](../test/unit/README.md),
[interactions tests](../test/interactions/README.md), [e2e tests](../test/e2e/README.md), and performance tests.

You can also run just a subset of tests like this:

```
npm test \
   front_end/core/common/Color.test.ts \
   front_end/core/sdk
```


The current test status can be seen at the [test waterfall](https://ci.chromium.org/p/devtools-frontend/g/main/console).


### Debugging

#### Debugging with VSCode

To run tests under the debugger, open the "Run and Debug" sidebar, select "Run unit tests in VS Code debugger" from the
dropdown, and click the start button or press F5.

Current limitations when using VSCode for e2e and interactions tests:

- VSCode only attaches to the node portion of the code (mostly the test files and the test helpers), not to Chrome.
- VSCode debugging only works with headless mode.

#### Debugging with DevTools

To run tests under the DevTools debugger use the `--debug` command line option.

For unittests this will bring up Chrome with a Karma launcher page. Wait for "Debug" button to appear and click it. A
new page will open, here you can open DevTools, set breakpoints in the tests and reload page to rerun tests.

For e2e tests, you can debug the "DevTools under test" with DevTools-on-DevTools. Use the standard DevTools key
combination to open another DevTools instance while you look at the "DevTools under test". You can set breakpoints and
inspect the status of the "DevTools under test" this way. You can debug the puppeteer side by inspecting the Node.js
process that runs the e2e suite. Either open `chrome://inspect` or click the Node.js icon in any open DevTools window to
connect to the puppeteer process. You can step through the puppeteer test code this way.

### Obtaining code coverage

We can collect code coverage for the source code that is tested: `npm run test -- --coverage`. This is available for
interactions and unit tests.

The code coverage output is written to `/karma-coverage` or `/interactions-coverage` in the repository root. The
location can be overriden with `--artifacts-dir`.  You can open `/karma-coverage/index.html` in a browser to inspect
coverage for individual files.

## Useful tools

In .vscode/launch.conf there are some launch options available for running tests from within VSCode.

The following shell function allows running all tests changed in a given git commit range, in addition to all unittests
files for all changed code files. Store it in your .bashrc.

```
affected() {
  ref="$1"
  if [ -n "$ref" ]; then
    shift 1
  fi
  if [ -z "$ref" -o "$ref" = "--" ]; then
    ref="HEAD"
  fi
  if [ "$1" = "--" ]; then
    shift 1
  fi
  affected=($(ls -d 2>/dev/null $(git diff "$ref" --name-only | sed -e 's,\(\.test\)\?\.ts,.test.ts,' | grep '\.test\.ts') | sort -u | tr '\n' ' '))
  if [ -z "$affected" ]; then
    return
  fi
  npm run test -- "${affected[@]}" $@
}

```

## Layout tests

After building content shell as part of Chromium, we can also run layout tests that are relevant for DevTools frontend:

```bash
autoninja -C out/Default content_shell
third_party/blink/tools/run_web_tests.py -t Default http/tests/devtools
```

To debug a failing layout test we can run
```bash
npm run debug-webtest -- http/tests/devtools/<path>/<to>/<test>.js
```

The script supports either default DevTools checkout inside the chromium tree or side-by-side checkouts of chromium and
DevTools. Passing `--custom-devtools-frontend` is not supported currently, meaning in the side-by-side scenario the
DevTools checkout inside the chromium tree will be used (if not symlinked).
