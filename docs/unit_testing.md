# Unit tests

You can run the unit tests with `npm run auto-unittest`.
Unit tests are written using [Mocha](https://mochajs.org/) and [Chai](https://www.chaijs.com/) and run with [Karma](https://karma-runner.github.io/latest/index.html) in a web browser.
The unit tests live next to the source code they are testing and follow the naming convention `Foo.test.ts` for `Foo.ts`.

## DOM Helpers

### Rendering a component in a test

When running a Karma unit test, the DOM that you create during a test is automatically cleaned up for you before the next test, ensuring that no tests are impacted by stray DOM left behind from a previous test.

To ensure you render your component into the test DOM, use the `renderElementIntoDOM` helper, which takes any `HTMLElement` and renders it. By using this helper you ensure that it's cleaned up at the end of the test.

### Asserting presence of variables for TypeScript

When trying to read a component's shadow DOM, TypeScript will ask that you check it's not null first:

```
component.shadowRoot.querySelector('.foo') // TS will error here: shadowRoot may be `null`.
```

The `assert.isNotNull` method will do this for you and fail the test if the shadow root is not present:

```
assert.isNotNull(component.shadowRoot);
component.shadowRoot.querySelector('.foo') // TS is happy!
```

When you query elements from the DOM, you can use `assert.instanceOf` or `assertElements` to check that an element is the expected type. This will ensure the test fails if the DOM is not as expected, and satisfy TypeScript:

```
const button = component.shadowRoot.querySelector('button.foo');
assert.instanceOf(button, HTMLButtonElement);

const allDivs = component.shadowRoot.querySelectorAll('div');
assertElements(allDivs, HTMLDivElement);
```

## Mutation helpers

When building components we want to ensure that they are efficient and do not update the DOM more than necessary. We can use the mutation helpers to assert on the amount of DOM changes in a given test. These use a [Mutation Observer](https://developer.mozilla.org/en/docs/Web/API/MutationObserver) to track any mutations.

_Important!_: These tests are async, so you must `await` them.

### Expecting mutations

If you are expecting mutations, you can wrap the part of the test that triggers the mutation in a `withMutation` call. The first argument is an array of mutations you expect (read on for the structure of it), the second is the element to observe (will nearly always be `component.shadowRoot`, and a callback function that takes the observed shadow root. It is this function that will be executed whilst the DOM is being observed for mutations.

```
it('adds a new button when the data changes', async () => {
  const component = new MyComponent();
  component.data = {...}
  renderElementIntoDOM(component);

  await withMutations([{
    type: MutationType.ADD, // MutationType is an exported enum from MutationHelpers
    tagName: 'button',
    max: 2, // the maximum number of mutations to allow; defaults to 10
  }], component.shadowRoot, shadowRoot => {
    // do something that updates the component and causes mutations
    component.data = {...}
  })
})
```

This test will assert that updating the component causes _at most 2 additions_ to the component's shadow DOM. You can pass `MutationType.ADD` or `MutationType.REMOVE` as the `type` to watch for just additions/removals, or you can omit the `type` key and have the test watch for both additions and removals.

You don't need to wrap every test in a `withMutation` block, but if you are testing some code that should update the DOM, it's a good idea to ensure we aren't unexpectedly doing much more work than expected.

### Expecting no mutations

If you have a test where no DOM should mutate, you can use `withNoMutations`. This is the opposite of `withMutations`; it will fail the test should it detect any DOM mutations. Using this helper when testing the `ElementBreadcrumbs` component discovered that when we scrolled the breadcrumbs we caused _over 70 DOM mutations_ (!), which is what lead to the creation of this helper. It's a great way to verify that we're not doing work that can be avoided.

```
it('does not mutate the DOM when we scroll the component', async () => {
  const component = new MyComponent();
  component.data = {...}
  renderElementIntoDOM(component);

  await withNoMutations(component.shadowRoot, shadowRoot => {
    // Imagine there's code here to cause the component to scroll
  })
})
```

The above test will fail if any DOM mutations are detected.

## Running a subset of unit tests

If you want to run a specific (set of) unit test, you can use `it.only` or `describe.only` for those tests that you want to run.

```ts
describe.only('The test suite that you want to run', () => {
  it('A test that would run', () => {});
  it('Another test that would run', () => {});
});
```

```ts
describe('The test suite that you want to run', () => {
  it.only('A test that would run', () => {});
  it('A test that would not run', () => {});
});
```

After that, run `npm run auto-unittest` again. This time, only the tests that you specified will be run.

## Obtaining code coverage

We can collect code coverage for the source code that is tested with unit tests.
You can run `COVERAGE=1 npm run auto-unittest` to obtain code coverage for the whole `front_end` folder.
However, there is some preprocessing overhead for collecting coverage.
You can use `COVERAGE_FOLDERS` to only preprocess specific folders for code coverage:

```bash
COVERAGE_FOLDERS='front_end/ui/components' npm run auto-unittest
COVERAGE_FOLDERS='front_end/{ui/components,core/common}' npm run auto-unittest
```

The code coverage output is written to `/karma-coverage` in the repository root.
You can open `/karma-coverage/index.html` in a browser to inspect coverage for individual files.

## Inspecting detailed errors

By default, the Karma testing output is terse, to avoid console output cluttering.
However, if you want to obtain detailed reporting of a failure you are investigating, you can use `--expanded-reporting`:

```bash
npm run auto-unittest -- --expanded-reporting
```

### Debugging with VSCode

To run tests under the debugger, open the "Run and Debug" sidebar,
select "Run unit tests in VS Code debugger" from the dropdown, and click
the start button or press F5.

### Debugging with DevTools

To run tests under the DevTools debugger use `DEBUG_TEST` environment variable.

```bash
DEBUG_TEST=1 npm run auto-unittest
```

This will bring up Chrome with a Karma launcher page. Wait for "Debug" button to
appear and click it. A new page will open, here you can open DevTools, set
breakpoints in the tests and reload page to rerun tests.
