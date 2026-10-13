# Unit Testing

Unit tests are written using [Mocha](https://mochajs.org/) and
[Chai](https://www.chaijs.com/) and run with
[Karma](https://karma-runner.github.io/latest/index.html) in a web browser. A
subset of unit tests called `foundation_unittests` is additionally run in Node.
The unit tests live next to the source code they are testing and follow the
naming convention `Foo.test.ts` for `Foo.ts`.

[TOC]

## Running unit tests

The unit tests are implicitly run as part of `./dt test`,
but that also runs all the other test suites. To run only
**all unit tests**, use:

```bash
./dt test front_end
```

To use `out/Debug` instead of the default `out/Default` target
directory, use:

```bash
./dt test -t Debug front_end
```

To run the unit tests in **debug mode**, use:

```bash
./dt test --debug front_end
```

To run only **specific unit tests** from a single `.test.ts`
file, say `SourcesView.test.ts` for example, use:

```bash
./dt test front_end/panels/sources/SourcesView.test.ts
```

To run only **foundation unit tests in Node** use `--node-unit-tests flag`:

```bash
./dt test front_end --node-unit-tests
```

Check the output of `./dt test --help` for an overview of
all options.

### Running a subset of unit tests

If you want to run a specific unit test, you can use the exact test ID printed in the console output when a test fails or when you run the tests. You can pass this test ID to `./dt test` to run only that specific test without modifying the code.

```bash
./dt test front_end/panels/sources/SourcesView.test.ts:the_test_suite_that_you_want_to_run:a_test_that_would_run
```

## Writing unit tests

All unit tests live in the `front_end` directory in the same folder as
the file that they are testing, with `.test.ts` extension instead of
`.ts`. For example, the unit tests for `Foo.ts` will end up in a file
`Foo.test.ts` next to it.

Checkout the [Unit Testing Helpers](../../front_end/testing/README.md)
documentation for details on various available helpers.

## Debugging unit tests

To debug unit tests with DevTools, start the test runner like this

```bash
./dt test --debug front_end
```

and optionally pass the (relative) path to the `.test.ts` file that
you want to debug. This will bring up Chrome with a Karma launcher
page.

![Debugging unit tests with DevTools](../../docs/images/debugging-unit-tests-with-devtools.png 'Debugging unit tests with DevTools')

Click on the "Debug" button, which opens a new page, on which
you can open DevTools, set breakpoints in the tests and reload the
page to rerun tests.

### Debugging unit tests with VSCode

There's experimental support for running unit tests directly from
within VSCode. Open the "Run and Debug" sidebar, select "Run unit tests
in VS Code debugger" from the dropdown, and click the start button or
press F5.

![Debugging unit tests with VSCode](../../docs/images/debugging-unit-tests-with-vscode.png 'Debugging unit tests with VSCode')

## Screenshot tests

Unit tests also have the ability to store a screenshot of an element and
in future tests ensure that the screenshot has not changed. The purpose
of screenshot tests is to test view functions of presenters to ensure
that visual styles do not regress.

```ts
describe('view', () => {
  it('renders the feedback form', async () => {
    const target = document.createElement('div');
    renderElementIntoDOM(target);
    AiAssistance.ChatMessageWidget.DEFAULT_VIEW(
      {
        onRatingClick: () => {},
        onReportClick: () => {},
        scrollSuggestionsScrollContainer: () => {},
        onSuggestionsScrollOrResize: () => {},
        onSuggestionClick: () => {},
        onSubmit: () => {},
        onClose: () => {},
        onInputChange: () => {},
        showRateButtons: true,
        isSubmitButtonDisabled: false,
        isShowingFeedbackForm: true,
      },
      {},
      target,
    );
    await assertScreenshot('ai_assistance/user_action_row.png');
  });
});
```

Currently, screenshot tests require that they are run in the browser
instance started by the test runner because they rely on custom bindings
to take and compare screenshots.

Screenshot assertions are only supported on Linux. On other platforms,
they are reported as passing without actually capturing any screenshots.

### Updating screenshots locally

When you need to update a screenshot because you have purposefully changed the UI:

```sh
./dt test $TESTPATH --on-diff=update
```

### Generating and/or updating screenshots via CQ bots

> Ensure you are a member of the g/devtools-dev group, otherwise the
> `update_goldens.py` tool will not work.

After the try jobs completed on a CL (`git cl upload && git cl try`),
you can fetch screenshots created on the bots by runng in the
`update_goldens.py`:

```sh
scripts/tools/update_goldens.py
```

The command is expected to fetch images from the bots and apply them to
your local source code. You need to review and commit them to your CL.

## Foundation unit tests

Foundation unit tests (GN target name is usually `foundation_unittests`) is a
set of unit tests that do not depend on the DevTools UI and can run in Node. We
use these tests to test functionality exposed via
https://github.com/ChromeDevTools/chrome-devtools-mcp in Node.js.
