# Testing Guide

[goo.gle/devtools-testing-guide](http://goo.gle/devtools-testing-guide)

Follow the steps outlined in [Get the Code](../docs/get_the_code.md) to checkout the DevTools front-end code.

[TOC]

## DevTools front-end tests

The `devtools-frontend` repository contains a variety of test suites, check
out the individual guides below:

- [Unit Testing Guide](./unit/README.md)
- [E2E Testing Guide](./e2e/README.md)
- [API Testing Guide](./api/README.md)
- [Performance Testing Guide](./perf/README.md)

You can use

```bash
npm test
```

to run all tests in the devtools frontend repo. You can also run just a
subset of tests like this:

```bash
npm test \
   front_end/core/common/Color.test.ts \
   front_end/core/sdk
```

The current test status can be seen at the
[test waterfall](https://ci.chromium.org/p/devtools-frontend/g/main/console).

### Testing guidance

For guidance on choosing the appropriate test suite when writing new tests, see the [Testing Guidance Skill](../.agents/skills/devtools-testing-guidance/SKILL.md).

### Obtaining code coverage

We can collect code coverage for the source code that is tested: `npm run test -- --coverage`. This is available for
unit tests.

The code coverage output is written to `/karma-coverage` in the repository root. The
location can be overridden with `--artifacts-dir`. You can open `/karma-coverage/index.html` in a browser to inspect
coverage for individual files.

## Layout tests

After building content shell as part of Chromium, we can also run layout tests that are relevant for DevTools front-end:

```bash
autoninja -C out/Default blink_tests
third_party/blink/tools/run_web_tests.py -t Default http/tests/devtools
```

To debug a failing layout test we can run

```bash
npm run debug-webtest -- http/tests/devtools/<path>/<to>/<test>.js
```

The script supports either default DevTools checkout inside the chromium tree or side-by-side checkouts of chromium and
DevTools. Passing `--custom-devtools-frontend` is not supported currently, meaning in the side-by-side scenario the
DevTools checkout inside the chromium tree will be used (if not symlinked).

**\* note
**Note:\*\* Layout tests usually do not actually test the layout or anything UI related. With `content_shell`,
it runs the Blink renderer with DevTools front-end embedded, and executes scripted JavaScript commands to
load DevTools front-end modules, and exercises some code paths. It dumps some results as strings to compare
against expectation files.

---

Since these tests live in Chromium, we may need to perform three-way changes when changing DevTools front-end. Example: disable test in Chromium (https://chromium-review.googlesource.com/c/chromium/src/+/5851392), land front-end CL, then update and re-enable the Chromium test.

## DevTools back-end tests

The DevTools back-end is distributed across Chromium and V8, and is tested mainly via

- Blink Inspector protocol tests (in [`third_party/blink/web_tests/inspector-protocol/`](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/web_tests/inspector-protocol/) and [`third_party/blink/web_tests/http/tests/inspector-protocol/`](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/web_tests/http/tests/inspector-protocol/)),
- V8 Inspector tests (in [`test/inspector/`](https://source.chromium.org/chromium/chromium/src/+/main:v8/test/inspector/)),
- V8, Blink, and Chromium unit tests (in [`*_unittest.cc`](https://source.chromium.org/search?q=f:.*_unittest.cc)), and
- Chromium browser tests (in [`*_browsertest.cc`](https://source.chromium.org/search?q=f:.*_browsertest.cc)).

See the [Guide to DevTools Backend Testing](https://docs.google.com/document/d/1m_RWQ4YrwKqd7wxNqadaLmia1VQIuNKSTzGC3Z9ExUo)
for more details.

## Type checks

The DevTools front-end is written in TypeScript and uses `tsc` (TypeScript Compiler) to check type consistency.
Unless you specify `devtools_skip_typecheck = true` in your `out/Default/args.gn`, running

```bash
autoninja -C out/Default
```

will automatically check for type consistency.

## Presubmit checks

The [`PRESUBMIT.py`](../PRESUBMIT.py) script includes various checks related to code ownership, localization rules,
license headers, formatting, and the like that are automatically run while uploading a CL (change list), as part of
the CQ (commit queue), and on the [CI (continous integration)](https://ci.chromium.org/p/devtools-frontend/g/main/console).

You can manually trigger the presubmit checks with

```bash
git cl presubmit
```

on a clean checkout with no uncommitted local changes (you can otherwise pass `--force` to have it execute even
on a dirty tree). This will execute the checks against all the file changed compared to the base branch, because
that's much faster. You can use

```bash
git cl presubmit --all
```

if you need to run the checks on all files, and not just the modified ones.

Check the section on [Presubmit Scripts](https://www.chromium.org/developers/how-tos/depottools/presubmit-scripts/)
in the main Chromium documentation to learn more about the presubmit API built into `git-cl`.

## Lint checks

We use a set of [ESLint](https://eslint.org) and [Stylelint](https://stylelint.io) rules to perform automated checks,
which are also run as part of the [presubmit checks](#Presubmit-checks).

You can use

```bash
npm run lint
```

to execute all lint checks, or

```bash
npm run lint -- '**/*.ts'
npm run lint -- '**/*.css'
```

to execute only the lint checks for TypeScript or CSS files respectively. By default this will fix all issues
that can be automatically corrected; you can pass `--no-fix` to disable this behavior.

The configuration for Stylelint can be found in [`.stylelintrc.json`](../.stylelintrc.json) in the root directory,
whereas ESLint is configured via a toplevel flat config in [`eslint.config.mjs`](../eslint.config.mjs).

The custom ESLint rules live in the [`scripts/eslint_rules` directory](../scripts/eslint_rules/) and are used
to implement checks for DevTools specifics.

## Dealing with flaky tests

To skip a flaky test, create a new bug on [crbug.com](https://crbug.com) in the
`Chromium > Platform > DevTools` component, and add an entry to the `test/TestExpectations` file.
For example, to skip the `can return bar` test in `test/e2e/foo.test.ts`, add:

```
# Flaking on multiple bots on CQ after recent CL xyz.
crbug.com/12345678 test/e2e/foo.test.ts:Foo:can_return_bar [ Skip ]
```

If the test is only flaky on specific platforms, you can specify them:
```
crbug.com/12345678 [ mac win32 ] test/e2e/foo.test.ts:Foo:can_return_bar [ Skip ]
```

If you need to skip the entire file:
```
crbug.com/12345678 test/e2e/foo.test.ts [ Skip ]
```

Note that it is preferable to skip individual tests so that test results list the skipped tests, rather than skipping entire files.

Also, when dealing with flaky tests, it is highly recommended to use `[ Pass Failure ]` instead of `[ Skip ]`. `[ Skip ]` is a last resort, as skipped tests won't run at all and will not report coverage. Using `[ Pass Failure ]` allows the test to run and fail without turning the tree red, but still provides signal and coverage.

For example, to mark a test as flaky:

```
# Flaking on multiple bots on CQ after recent CL xyz.
crbug.com/12345678 test/e2e/foo.test.ts:Foo:can_return_bar [ Pass Failure ]
```

### Skip flake detection in CQ

When a test is updated in a CL that is not related to the test's flakiness, the CQ builder might fail in the Flake Detection steps. You can skip Flake Detection for specific tests by adding the `Skip-Flake-Detection` CL footer with the full path to your test. For example: `Skip-Flake-Detection: test/e2e/foo.test.ts`.

If you need to skip multiple tests, you can repeat the footer for each test:
```
Skip-Flake-Detection: test/e2e/foo.test.ts
Skip-Flake-Detection: test/e2e/bar.test.ts
```

You can also skip Flake Detection for multiple tests using a glob pattern by adding the `Skip-Flake-Detection-Pattern` CL footer. For example: `Skip-Flake-Detection-Pattern: test/e2e/*`.

### De-flaking tests

Note that despite the bot name all kinds of tests are supported.

To reproduce a flaky test locally, use the exact test ID printed in the test runner output and the `--repeat=X` command line flag:

```sh
npm run test -- --repeat=20 test/e2e/sources/navigator-view.test.ts:can_show_newly_created_snippets_show_up_in_command_menu
```

To see if certain tests are flaky you can use the E2E stressor bots (despite the name, these bots also support unit tests). Open a CL with your test changes and run the following command specifying your test file:

```sh
git cl try -B devtools-frontend/try -b e2e_stressor_linux -b e2e_stressor_win64 -b e2e_stressor_mac -p runner_args='test/e2e/sources/navigator-view.test.ts --repeat=80'
```

or multiple test files:

```sh
git cl try -B devtools-frontend/try -b e2e_stressor_linux -b e2e_stressor_win64 -b e2e_stressor_mac -p runner_args='test/e2e/sources/navigator-view.test.ts test/e2e/sources/snippets.test.ts --repeat=80'
```

This will run the specified tests on dedicated bots with the specified number of iterations. Note that in order for iterations to work the test should be using `it` from `mocha_extensions.ts`.

The following command runs the stressor bot on all files of the latest commit with reasonable settings:

```sh
git cl try -B devtools-frontend/try \
  -b e2e_stressor_linux \
  -p runner_args="\
    $(git diff-tree --no-commit-id --name-only HEAD -r | grep test/e2e | grep -v e2e/helpers | cut -c 10- - | tr "\n" " ") \
    --repeat=20"
```

> By default, tests are run using the debug build. To run it with the release build, append `-p builder_config=Release` to the end of the command.

Please use a reasonable number of iterations and include the minimal amount of test files to avoid overloading the bots. This bot is experimental and the parameters might change in the future.

## Useful tools

### VS Code Debugging

In `.vscode/launch.conf` there are some launch options available for running tests from within VSCode.

### Run all changed test files

The following shell function allows running all tests changed in a given git commit range, in addition to all unit tests
files for all changed code files. Store it in your `.bashrc`.

```bash
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

### Bisect dependent failing unit tests

Currently the testing environment for unit test does not provide 100% isolation between test.
Due to this earlier test (A) may make later ones (B) fails. This is hard to debug due to running in isolation makes
the test pass.

Here is an example workflow :

- You find a test X fails.
- You run the test alone and it passes.
- You run the full suite and see the test fails.
- Suspect that X is failing due to previous test leaving unclear state.

Now we can use the following script to bisect each file
Example if X is `front_end/panels/ai_assistance/AiAssistancePanel.test.ts`:

```bash
node ./scripts/bisect-test-failure-dependency.ts -t front_end/panels/ai_assistance/AiAssistancePanel.test.ts
```

For more options see

```bash
node ./scripts/bisect-test-failure-dependency.ts -h
```
