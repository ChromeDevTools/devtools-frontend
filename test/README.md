# Unit Testing

[goo.gle/devtools-testing-guide](http://goo.gle/devtools-testing-guide)

Follow the steps outlined in [Get the Code](../docs/get_the_code.md) to checkout the DevTools front-end code.

[TOC]

## DevTools front-end tests

The `devtools-frontend` repository contains a variety of test suites, check
out the individual guides below:

* [Unit Testing Guide](./unit/README.md)
* [Interactions Testing Guide](./interactions/README.md)
* [E2E Testing Guide](./e2e/README.md)
* [Performance Testing Guide](./perf/README.md)

You can use

```
npm test
```

to run all tests in the devtools frontend repo. You can also run just a
subset of tests like this:

```
npm test \
   front_end/core/common/Color.test.ts \
   front_end/core/sdk
```

The current test status can be seen at the
[test waterfall](https://ci.chromium.org/p/devtools-frontend/g/main/console).

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
