// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  assertElements,
  assertScreenshot,
  getElementsWithinComponent,
  getElementWithinComponent,
  getEventPromise,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';

import * as LinearMemoryInspectorComponents from './components.js';

export const NAVIGATOR_ADDRESS_SELECTOR = '[data-input]';
export const NAVIGATOR_PAGE_BUTTON_SELECTOR = '[data-button=pagenavigation]';
export const NAVIGATOR_HISTORY_BUTTON_SELECTOR = '[data-button=historynavigation]';
export const NAVIGATOR_REFRESH_BUTTON_SELECTOR = '[data-button=refreshrequested]';

describe('LinearMemoryNavigator', () => {
  setupLocaleHooks();
  let component: LinearMemoryInspectorComponents.LinearMemoryNavigator.LinearMemoryNavigator;

  beforeEach(async () => {
    const el = document.createElement('devtools-linear-memory-inspector-navigator');
    component = new LinearMemoryInspectorComponents.LinearMemoryNavigator.LinearMemoryNavigator(el);
    renderElementIntoDOM(component);

    component.data = {
      address: '20',
      valid: true,
      mode: LinearMemoryInspectorComponents.LinearMemoryNavigator.Mode.SUBMITTED,
      error: undefined,
      canGoBackInHistory: true,
      canGoForwardInHistory: true,
    };
    await component.updateComplete;
  });

  async function assertNavigationEvents(eventType: string) {
    const shadowRoot = component.element.shadowRoot;
    assert.isNotNull(shadowRoot);
    const pageNavigationButtons = shadowRoot.querySelectorAll(`[data-button=${eventType}]`);
    assertElements(pageNavigationButtons, Buttons.Button.Button);
    assert.lengthOf(pageNavigationButtons, 2);

    const navigation = [];
    for (const button of pageNavigationButtons) {
      const eventPromise = getEventPromise<LinearMemoryInspectorComponents.LinearMemoryNavigator.PageNavigationEvent>(
          component.element, eventType);
      button.click();
      const event = await eventPromise;
      navigation.push(event.data);
    }

    assert.deepEqual(navigation, [
      LinearMemoryInspectorComponents.LinearMemoryNavigator.Navigation.BACKWARD,
      LinearMemoryInspectorComponents.LinearMemoryNavigator.Navigation.FORWARD,
    ]);
  }

  it('renders navigator address', () => {
    const shadowRoot = component.element.shadowRoot;
    assert.isNotNull(shadowRoot);
    const input = shadowRoot.querySelector(NAVIGATOR_ADDRESS_SELECTOR);
    assert.instanceOf(input, HTMLInputElement);
    assert.strictEqual(input.value, '20');
  });

  it('re-renders address on address change', async () => {
    component.data = {
      address: '16',
      valid: true,
      mode: LinearMemoryInspectorComponents.LinearMemoryNavigator.Mode.SUBMITTED,
      error: undefined,
      canGoBackInHistory: false,
      canGoForwardInHistory: false,
    };
    await component.updateComplete;

    const shadowRoot = component.element.shadowRoot;
    assert.isNotNull(shadowRoot);
    const input = shadowRoot.querySelector(NAVIGATOR_ADDRESS_SELECTOR);
    assert.instanceOf(input, HTMLInputElement);
    assert.strictEqual(input.value, '16');
  });

  it('sends event when clicking on refresh', async () => {
    const eventPromise = getEventPromise<LinearMemoryInspectorComponents.LinearMemoryNavigator.RefreshRequestedEvent>(
        component.element, 'refreshrequested');

    const shadowRoot = component.element.shadowRoot;
    assert.isNotNull(shadowRoot);
    const refreshButton = shadowRoot.querySelector(NAVIGATOR_REFRESH_BUTTON_SELECTOR);
    assert.instanceOf(refreshButton, Buttons.Button.Button);
    refreshButton.click();

    assert.isNotNull(await eventPromise);
  });

  it('sends events when clicking previous and next page', async () => {
    await assertNavigationEvents('historynavigation');
  });

  it('sends events when clicking undo and redo', async () => {
    await assertNavigationEvents('pagenavigation');
  });

  it('disables the previous and next page buttons if specified as not navigatable', async () => {
    component.data = {
      address: '0',
      valid: true,
      mode: LinearMemoryInspectorComponents.LinearMemoryNavigator.Mode.SUBMITTED,
      error: undefined,
      canGoBackInHistory: false,
      canGoForwardInHistory: false,
    };
    await component.updateComplete;

    const buttons =
        getElementsWithinComponent(component.element, NAVIGATOR_HISTORY_BUTTON_SELECTOR, Buttons.Button.Button);
    assert.lengthOf(buttons, 2);
    const historyBack = buttons[0];
    const historyForward = buttons[1];

    assert.isTrue(historyBack.disabled);
    assert.isTrue(historyForward.disabled);
  });

  it('shows tooltip on hovering over address', () => {
    const input = getElementWithinComponent(component.element, NAVIGATOR_ADDRESS_SELECTOR, HTMLInputElement);
    assert.strictEqual(input.title, 'Enter address');
  });

  it('shows tooltip with error and selects all text on submitting invalid address input', async () => {
    const error = 'Address is invalid';
    const invalidAddress = '60';
    component.data = {
      address: invalidAddress,
      valid: false,
      mode: LinearMemoryInspectorComponents.LinearMemoryNavigator.Mode.INVALID_SUBMIT,
      error,
      canGoBackInHistory: false,
      canGoForwardInHistory: false,
    };
    await component.updateComplete;
    const input = getElementWithinComponent(component.element, NAVIGATOR_ADDRESS_SELECTOR, HTMLInputElement);
    assert.strictEqual(input.title, error);
    assert.isNotNull(input.selectionStart);
    assert.isNotNull(input.selectionEnd);
    if (input.selectionEnd !== null && input.selectionStart !== null) {
      const selectionLength = input.selectionEnd - input.selectionStart;
      assert.strictEqual(selectionLength, invalidAddress.length);
    }
  });

  it('shows tooltip with invalid address on hovering over address', async () => {
    const error = 'Address is invalid';
    component.data = {
      address: '60',
      valid: false,
      mode: LinearMemoryInspectorComponents.LinearMemoryNavigator.Mode.EDIT,
      error,
      canGoBackInHistory: false,
      canGoForwardInHistory: false,
    };
    await component.updateComplete;
    const input = getElementWithinComponent(component.element, NAVIGATOR_ADDRESS_SELECTOR, HTMLInputElement);
    assert.strictEqual(input.title, error);
  });

  it('shows tooltip on page navigation buttons', () => {
    const buttons =
        getElementsWithinComponent(component.element, NAVIGATOR_PAGE_BUTTON_SELECTOR, Buttons.Button.Button);
    assert.lengthOf(buttons, 2);
    const pageBack = buttons[0];
    const pageForward = buttons[1];

    assert.strictEqual(pageBack.getAttribute('title'), 'Previous page');
    assert.strictEqual(pageForward.getAttribute('title'), 'Next page');
  });

  it('shows tooltip on history navigation buttons', () => {
    const buttons =
        getElementsWithinComponent(component.element, NAVIGATOR_HISTORY_BUTTON_SELECTOR, Buttons.Button.Button);
    assert.lengthOf(buttons, 2);
    const historyBack = buttons[0];
    const historyForward = buttons[1];

    assert.strictEqual(historyBack.getAttribute('title'), 'Go back in address history');
    assert.strictEqual(historyForward.getAttribute('title'), 'Go forward in address history');
  });

  it('shows tooltip on refresh button', () => {
    const refreshButton =
        getElementWithinComponent(component.element, NAVIGATOR_REFRESH_BUTTON_SELECTOR, Buttons.Button.Button);

    assert.strictEqual(refreshButton.getAttribute('title'), 'Refresh');
  });
});

describe('LinearMemoryNavigator Screenshots', () => {
  setupLocaleHooks();
  let component: LinearMemoryInspectorComponents.LinearMemoryNavigator.LinearMemoryNavigator;

  it('renders correctly', async () => {
    const el = document.createElement('devtools-linear-memory-inspector-navigator');
    component = new LinearMemoryInspectorComponents.LinearMemoryNavigator.LinearMemoryNavigator(el);
    renderElementIntoDOM(component, {
      width: 400,
      height: 'var(--sys-size-15)',
      includeCommonStyles: true,
    });

    component.data = {
      address: '20',
      valid: true,
      mode: LinearMemoryInspectorComponents.LinearMemoryNavigator.Mode.SUBMITTED,
      error: undefined,
      canGoBackInHistory: true,
      canGoForwardInHistory: true,
    };
    await component.updateComplete;

    const style = document.createElement('style');
    style.textContent = 'input { font-family: ahem !important; }';
    component.element.shadowRoot!.appendChild(style);

    await assertScreenshot('linear_memory_inspector/navigator.png');
  });
});
