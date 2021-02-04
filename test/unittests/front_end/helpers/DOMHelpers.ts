// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * These helpers are designed to be used when testing components or other code that renders into the DOM.
 * By using these helpers we ensure the DOM is correctly cleaned between test runs.
 *
 * Note that `resetTestDOM` is automatically run before each test (see `test_setup.ts`).
 **/

const {assert} = chai;

const TEST_CONTAINER_ID = '__devtools-test-container-id';

interface RenderOptions {
  allowMultipleChildren?: boolean;
}

/**
 * Renders a given element into the DOM. By default it will error if it finds an element already rendered but this can be controlled via the options.
 **/
export const renderElementIntoDOM = (element: HTMLElement, renderOptions: RenderOptions = {}) => {
  const container = document.getElementById(TEST_CONTAINER_ID);

  if (!container) {
    assert.fail(`renderIntoDOM expected to find ${TEST_CONTAINER_ID}`);
    return;
  }

  const allowMultipleChildren = Boolean(renderOptions.allowMultipleChildren);

  if (container.childNodes.length !== 0 && !allowMultipleChildren) {
    assert.fail('renderIntoDOM expects the container to be empty');
    return;
  }

  container.appendChild(element);
  return element;
};

/**
 * Completely cleans out the test DOM to ensure it's empty for the next test run.
 * This is run automatically between tests - you should not be manually calling this yourself.
 **/
export const resetTestDOM = () => {
  const previousContainer = document.getElementById(TEST_CONTAINER_ID);
  if (previousContainer) {
    previousContainer.remove();
  }

  const newContainer = document.createElement('div');
  newContainer.id = TEST_CONTAINER_ID;

  document.body.appendChild(newContainer);
};

/**
 * An easy way to assert the component's shadowRoot exists so you're able to assert on its contents.
 */
export function assertShadowRoot(shadowRoot: ShadowRoot|null): asserts shadowRoot is ShadowRoot {
  assert.instanceOf(shadowRoot, ShadowRoot);
}

type Constructor<T> = {
  new (...args: unknown[]): T,
};

/**
 * Asserts that `element` is of type `T`.
 */
export function assertElement<T extends Element>(
    element: Element|null, elementClass: Constructor<T>): asserts element is T {
  assert.instanceOf(element, elementClass);
}

/**
 * Asserts that all emenents of `nodeList` are at least of type `T`.
 */
export function assertElements<T extends Element>(
    nodeList: NodeListOf<Element>, elementClass: Constructor<T>): asserts nodeList is NodeListOf<T> {
  nodeList.forEach(e => assert.instanceOf(e, elementClass));
}

export function getElementWithinComponent<T extends HTMLElement, V extends Element>(
    component: T, selector: string, elementClass: Constructor<V>) {
  assertShadowRoot(component.shadowRoot);
  const element = component.shadowRoot.querySelector(selector);
  assertElement(element, elementClass);
  return element;
}

export function getElementsWithinComponent<T extends HTMLElement, V extends Element>(
    component: T, selector: string, elementClass: Constructor<V>) {
  assertShadowRoot(component.shadowRoot);
  const elements = component.shadowRoot.querySelectorAll(selector);
  assertElements(elements, elementClass);
  return elements;
}

/* Waits for the given element to have a scrollLeft property of at least desiredScrollLeft */
export function waitForScrollLeft<T extends Element>(element: T, desiredScrollLeft: number): Promise<void> {
  let lastScrollLeft = -1;
  let scrollLeftTimeout: number|null = null;

  const timeBetweenPolls = 50;


  return new Promise(resolve => {
    const pollForScrollLeft = () => {
      const newScrollLeft = element.scrollLeft;
      // If we get the same scroll value twice in a row, and it's at least what
      // we want, we're done!
      if (lastScrollLeft === newScrollLeft && newScrollLeft >= desiredScrollLeft) {
        if (scrollLeftTimeout) {
          window.clearTimeout(scrollLeftTimeout);
        }
        resolve();
        return;
      }

      lastScrollLeft = newScrollLeft;
      scrollLeftTimeout = window.setTimeout(pollForScrollLeft, timeBetweenPolls);
    };

    window.setTimeout(pollForScrollLeft, timeBetweenPolls);
  });
}

/**
 * Dispatches a mouse click event.
 */
export function dispatchClickEvent<T extends Element>(element: T, options: MouseEventInit = {}) {
  const clickEvent = new MouseEvent('click', options);
  element.dispatchEvent(clickEvent);
}

/**
 * Dispatches a keydown event. Errors if the event was not dispatched successfully.
 */
export function dispatchKeyDownEvent<T extends Element>(element: T, options: KeyboardEventInit = {}) {
  const clickEvent = new KeyboardEvent('keydown', options);
  const success = element.dispatchEvent(clickEvent);
  if (!success) {
    assert.fail('Failed to trigger keydown event successfully.');
  }
}

/**
 * Dispatches a mouse move event.
 */
export function dispatchMouseMoveEvent<T extends Element>(element: T, options: MouseEventInit = {}) {
  const moveEvent = new MouseEvent('mousemove', options);
  element.dispatchEvent(moveEvent);
}

/**
 * Dispatches a mouse leave event.
 */
export function dispatchMouseLeaveEvent<T extends Element>(element: T, options: MouseEventInit = {}) {
  const leaveEvent = new MouseEvent('mouseleave', options);
  element.dispatchEvent(leaveEvent);
}

/**
 * Listens to an event of an element and returns a Promise that resolves to the
 * specified event type.
 */
export function getEventPromise<T extends Event>(element: HTMLElement, eventName: string): Promise<T> {
  return new Promise<T>(resolve => {
    element.addEventListener(eventName, (event: Event) => {
      resolve(event as T);
    });
  });
}

export async function doubleRaf() {
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

export async function raf() {
  return new Promise(resolve => requestAnimationFrame(resolve));
}
