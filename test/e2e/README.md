# Guide on end-to-end testing

This directory hosts the end-to-end tests we run on DevTools.
These tests open a target page and a DevTools frontend page, for which the DevTools frontend connects to the target page over CDP.
We use [Puppeteer] to talk over CDP and all functionality of Puppeteer is available to you as well when writing end-to-end tests.
We use [Mocha] as testing framework.

The goal of these end-to-end tests is to implement core user journeys throughout the application.
As such, the tests you write should read like a little story that you can read, even if you don't know how it is implemented.

The tests therefore have a dual purpose:
1. Verify that core user stories are working as intended and are not broken by a particular DevTools frontend change.
1. Serve as documentation and reference point for how DevTools is intended to be used.

## Running tests
All tests: `npm run e2etest` (note, this requires python2 to be the default python binary!)
Some additional, optional, helpful flags:
`npm run e2etest -- --chrome-binary=[LOCATION] --chrome-features=[FEATURES]`
LOCATION is a path to the chrome executable
FEATURES is a comma separated list of chrome features passed as `--enable-features=[FEATURES]` to the chrome binary.

If you only want to run a single test or testsuite, use respectively `it.only` or `describe.only`.

You can also run all tests in one file with the `--test-file` option, e.g.
`npm run e2etest -- --test-file=console/console-clear_test`. The path is relative to the generated test/e2e/
directory. File extensions are not needed and are ignored.

## Debugging tests
To see what the test script does, run `npm run debug-e2etest`. This will bring up the chrome window and stop just
before your test script is about to execute. The test will then run to completion and exit. You can add an infinite
await `await new Promise(() => {});` at the end of your test to give you some time to examine the result of your
test script.

The `it.repeat` helper is useful for reproducing a flaky test failure. e.g.

```js
it.repeat(20, 'find element', async () => {...});
```

`it.repeat` behaves like `it.only` in that it will cause just that single test to be run.

## General implementation details

To that end, the "what" from the "how" are separate in end-to-end tests.
The "what" is the actual end-to-end test.
The "how" are functions in [helpers](helpers/) that implement the interaction with DevTools to perform a particular action.

For example, an end-to-end test might read like this:

```js
it('can show newly created snippets show up in command menu', async () => {
    await openSourcesPanel();
    await openSnippetsSubPane();
    await createNewSnippet('New snippet');

    await openCommandMenu();
    await showSnippetsAutocompletion();

    assert.deepEqual(await getAvailableSnippets(), [
      'New snippet\u200B',
    ]);
});
```

The test describes the user journey and then describes what actions the user takes to fulfill that journey.
For example, when the user wants to "open the command menu", that is an action performed.
The implementation is separated in a helper that implements "how" the user performs that action.

The separation of the two concepts allows us to change the underlying implementation of the action while making sure that the user journey remains intact.

For example, this is the implementation of `openCommandMenu()`:

```js
export const openCommandMenu = async () => {
  const {frontend} = getBrowserAndPages();

  switch (platform) {
    case 'mac':
      await frontend.keyboard.down('Meta');
      await frontend.keyboard.down('Shift');
      break;

    case 'linux':
    case 'win32':
      await frontend.keyboard.down('Control');
      await frontend.keyboard.down('Shift');
      break;
  }

  await frontend.keyboard.press('P');

  switch (platform) {
    case 'mac':
      await frontend.keyboard.up('Meta');
      await frontend.keyboard.up('Shift');
      break;

    case 'linux':
    case 'win32':
      await frontend.keyboard.up('Control');
      await frontend.keyboard.up('Shift');
      break;
  }

  await waitFor(QUICK_OPEN_SELECTOR);
};
```

As you can see, the way the user opens the command menu is via key-bindings.
We don't "bypass" the functionality by calling functions on components or on our models directly; we instruct Puppeteer to do exactly what a user would do.
Doing so, we are certain that we don't test our component abstractions and potentially lose track of integration issues.

Secondly, the function has a `waitFor`, which waits for the command menu (found by the `QUICK_OPEN_SELECTOR`) to appear.
For every action that is performed in DevTools, there must be a corresponding user-visible change in the UI.
This means that you always have to wait for something to happen and you can't assume that, as soon as you have performed an action, the UI has updated accordingly.

**Note: Because of the async rendering of DevTools, content might not be strictly visible when DOM Nodes are appended to the DOM.**
As such, be aware of the functionality you are testing and relying on, as it could render differently than you originally assumed.

To summarize:
1. Separate the "what" from the "how".
1. Use real actions (clicking, using key-bindings, typing) instead of "bypassing" via components/models.
1. Every action must be observed by a change in the UI and must be waited for.
1. Be aware of the async rendering of DevTools

## Helpers

There are two kinds of helpers:
1. Helpers written as part of the end-to-end test, implementing the "how" of user actions.
1. Helpers supplied to interact with a page and abstract away the way the tests are run.

The former are implemented in [helpers](helpers/), written by the DevTools maintainers and are specific to the implementation of the DevTools frontend.
The latter are implemented in [../shared](../shared/), written by the Puppeteer maintainers and are predominantly DevTools-agnostic (apart from the handling of a target page + CDP connection).

In general, the e2e/helpers make use of the shared helpers.
See [../shared/README.md](../shared/README.md) for more documentation on the shared helpers.

[Puppeteer]: https://pptr.dev/
[Mocha]: https://mochajs.org
