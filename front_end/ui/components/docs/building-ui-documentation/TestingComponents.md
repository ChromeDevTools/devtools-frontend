# Testing components

One of the main ways that we test our components is with thorough unit tests. In these tests we render the component into the page, and query the DOM to assert that the component behaves and outputs the HTML as we expect.

## Initialising a component in a unit test

Within a unit test, you can create the component by initialising it and calling any methods on it to set data:

```ts
it('outputs the user name onto the screen', async () => {
  const component = new DummyComponent();
  component.data = {name: 'Jack' /* whatever data the component needs */}
})
```

Now we have a component, we need to render it into the page. You can use the `renderElementIntoDOM` helper method, which is defined in `test/unittests/front_end/helpers/DOMHelpers.js`. It is recommended to use this helper because it will automatically remove the component from the page after the test is done. It is important that the DOM is cleaned after each test to ensure that tests don't inadvertently change the behaviour of future tests.

```ts
import {
  renderElementIntoDOM,
  // adjust this path as required depending on the location of your test file
} from '../../helpers/DOMHelpers.js';

it('outputs the user name onto the screen', async () => {
  const component = new DummyComponent();
  component.data = {name: 'Jack' /* whatever data the component needs */}
  renderElementIntoDOM(component)
})
```

## Waiting for the component to render

If your component is implemented using the scheduled renderer, you will need to wait for the render to be complete before continuing with the test. Otherwise you may try to query the DOM before the component has finished rendering.

```ts
import * as Coordinator from '../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

it('outputs the user name onto the screen', async () => {
  const component = new DummyComponent();
  component.data = {name: 'Jack' /* whatever data the component needs */}
  renderElementIntoDOM(component);
  await coordinator.done(); // Ensure the component is rendered onto the page.
})
```

## Querying the component

Most of our components use the [shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM) to render their content. Therefore when querying the contents of the component in a test we need to query the contents of its shadow DOM.

The shadow DOM for a component can be accessed via `component.shadowRoot`. In TypeScript, this is typed as `ShadowRoot | null`. We therefore have another helper in `DOMHelpers.js` that can check that the shadow root is available, and fail the test otherwise. This will also satisfy TypeScript that the shadow root is present, and avoids you having to continually guard against it being `null`:

```ts
it('outputs the user name onto the screen', async () => {
  const component = new DummyComponent();
  component.data = {name: 'Jack' /* whatever data the component needs */}
  renderElementIntoDOM(component);
  await coordinator.done();
  assertShadowRoot(component.shadowRoot); // Check that the Shadow Root exists.
})
```

Now we are ready to query the DOM and make assertions! You can use the regular DOM APIs such as `querySelector` / `querySelectorAll`:

```ts
it('outputs the user name onto the screen', async () => {
  const component = new DummyComponent();
  component.data = {name: 'Jack' /* whatever data the component needs */}
  renderElementIntoDOM(component);
  await coordinator.done();
  assertShadowRoot(component.shadowRoot);
  const name = component.shadowRoot.querySelector<HTMLElement>('span.name');
})
```

Note that by default TypeScript will type the result as `Element|null`. Sometimes it is useful to tell TypeScript more specifically what type of element you are expecting, as not all APIs (such as `textContent`) are available on the `Element` type.

## Ensuring queries returned elements

Any DOM querying API could return back `null` if the element was not found. You can use the `assertElement` method from `DOMHelpers.js` to ensure that if the element was not found, the test fails. This also satisfies TypeScript and (much like with the shadow root check earlier) avoids you having to continually code against the element not being found.


```ts
it('outputs the user name onto the screen', async () => {
  const component = new DummyComponent();
  component.data = {name: 'Jack' /* whatever data the component needs */}
  renderElementIntoDOM(component);
  await coordinator.done();
  assertShadowRoot(component.shadowRoot);
  const name = component.shadowRoot.querySelector<HTMLElement>('span.name');
  assertElement(name, HTMLSpanElement);
})
```

## Asserting on the contents

Now we have an element that exists, we can query for its contents and assert against them:

```ts
it('outputs the user name onto the screen', async () => {
  const component = new DummyComponent();
  component.data = {name: 'Jack' /* whatever data the component needs */}
  renderElementIntoDOM(component);
  await coordinator.done();
  assertShadowRoot(component.shadowRoot);
  const name = component.shadowRoot.querySelector<HTMLElement>('span.name');
  assertElement(name, HTMLSpanElement);
  assert.strictEqual(name.innerText, 'Jack');
})
```

And with that, our basic unit test is written.
