// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LinearMemoryInspector from '../../../../../../front_end/ui/components/linear_memory_inspector/linear_memory_inspector.js';
import {
  assertElement,
  assertElements,
  assertShadowRoot,
  getElementsWithinComponent,
  getElementWithinComponent,
  getEventPromise,
  renderElementIntoDOM,
} from '../../../helpers/DOMHelpers.js';
import {describeWithLocale} from '../../../helpers/EnvironmentHelpers.js';

const {assert} = chai;

export const NAVIGATOR_ADDRESS_SELECTOR = '[data-input]';
export const NAVIGATOR_PAGE_BUTTON_SELECTOR = '[data-button=pagenavigation]';
export const NAVIGATOR_HISTORY_BUTTON_SELECTOR = '[data-button=historynavigation]';
export const NAVIGATOR_REFRESH_BUTTON_SELECTOR = '[data-button=refreshrequested]';

describeWithLocale('LinearMemoryNavigator', () => {
  let component: LinearMemoryInspector.LinearMemoryNavigator.LinearMemoryNavigator;

  beforeEach(renderNavigator);

  function renderNavigator() {
    component = new LinearMemoryInspector.LinearMemoryNavigator.LinearMemoryNavigator();
    renderElementIntoDOM(component);

    component.data = {
      address: '20',
      valid: true,
      mode: LinearMemoryInspector.LinearMemoryNavigator.Mode.Submitted,
      error: undefined,
      canGoBackInHistory: true,
      canGoForwardInHistory: true,
    };
  }

  async function assertNavigationEvents(eventType: string) {
    const shadowRoot = component.shadowRoot;
    assertShadowRoot(shadowRoot);
    const pageNavigationButtons = shadowRoot.querySelectorAll(`[data-button=${eventType}]`);
    assertElements(pageNavigationButtons, HTMLButtonElement);
    assert.lengthOf(pageNavigationButtons, 2);

    const navigation = [];
    for (const button of pageNavigationButtons) {
      const eventPromise =
          getEventPromise<LinearMemoryInspector.LinearMemoryNavigator.PageNavigationEvent>(component, eventType);
      button.click();
      const event = await eventPromise;
      navigation.push(event.data);
    }

    assert.deepEqual(navigation, [
      LinearMemoryInspector.LinearMemoryNavigator.Navigation.Backward,
      LinearMemoryInspector.LinearMemoryNavigator.Navigation.Forward,
    ]);
  }

  it('renders navigator address', () => {
    const shadowRoot = component.shadowRoot;
    assertShadowRoot(shadowRoot);
    const input = shadowRoot.querySelector(NAVIGATOR_ADDRESS_SELECTOR);
    assertElement(input, HTMLInputElement);
    assert.strictEqual(input.value, '20');
  });

  it('re-renders address on address change', () => {
    component.data = {
      address: '16',
      valid: true,
      mode: LinearMemoryInspector.LinearMemoryNavigator.Mode.Submitted,
      error: undefined,
      canGoBackInHistory: false,
      canGoForwardInHistory: false,
    };

    const shadowRoot = component.shadowRoot;
    assertShadowRoot(shadowRoot);
    const input = shadowRoot.querySelector(NAVIGATOR_ADDRESS_SELECTOR);
    assertElement(input, HTMLInputElement);
    assert.strictEqual(input.value, '16');
  });

  it('sends event when clicking on refresh', async () => {
    const eventPromise = getEventPromise<LinearMemoryInspector.LinearMemoryNavigator.RefreshRequestedEvent>(
        component, 'refreshrequested');

    const shadowRoot = component.shadowRoot;
    assertShadowRoot(shadowRoot);
    const refreshButton = shadowRoot.querySelector(NAVIGATOR_REFRESH_BUTTON_SELECTOR);
    assertElement(refreshButton, HTMLButtonElement);
    refreshButton.click();

    assert.isNotNull(await eventPromise);
  });

  it('sends events when clicking previous and next page', async () => {
    await assertNavigationEvents('historynavigation');
  });

  it('sends events when clicking undo and redo', async () => {
    await assertNavigationEvents('pagenavigation');
  });

  it('disables the previous and next page buttons if specified as not navigatable', () => {
    component.data = {
      address: '0',
      valid: true,
      mode: LinearMemoryInspector.LinearMemoryNavigator.Mode.Submitted,
      error: undefined,
      canGoBackInHistory: false,
      canGoForwardInHistory: false,
    };

    const buttons = getElementsWithinComponent(component, NAVIGATOR_HISTORY_BUTTON_SELECTOR, HTMLButtonElement);
    assert.lengthOf(buttons, 2);
    const historyBack = buttons[0];
    const historyForward = buttons[1];

    assert.isTrue(historyBack.disabled);
    assert.isTrue(historyForward.disabled);
  });

  it('shows tooltip on hovering over address', () => {
    const input = getElementWithinComponent(component, NAVIGATOR_ADDRESS_SELECTOR, HTMLInputElement);
    assert.strictEqual(input.title, 'Enter address');
  });

  it('shows tooltip with error and selects all text on submitting invalid address input', () => {
    const error = 'Address is invalid';
    const invalidAddress = '60';
    component.data = {
      address: invalidAddress,
      valid: false,
      mode: LinearMemoryInspector.LinearMemoryNavigator.Mode.InvalidSubmit,
      error,
      canGoBackInHistory: false,
      canGoForwardInHistory: false,
    };
    const input = getElementWithinComponent(component, NAVIGATOR_ADDRESS_SELECTOR, HTMLInputElement);
    assert.strictEqual(input.title, error);
    assert.isNotNull(input.selectionStart);
    assert.isNotNull(input.selectionEnd);
    if (input.selectionEnd !== null && input.selectionStart !== null) {
      const selectionLength = input.selectionEnd - input.selectionStart;
      assert.strictEqual(selectionLength, invalidAddress.length);
    }
  });

  it('shows tooltip with invalid address on hovering over address', () => {
    const error = 'Address is invalid';
    component.data = {
      address: '60',
      valid: false,
      mode: LinearMemoryInspector.LinearMemoryNavigator.Mode.Edit,
      error,
      canGoBackInHistory: false,
      canGoForwardInHistory: false,
    };
    const input = getElementWithinComponent(component, NAVIGATOR_ADDRESS_SELECTOR, HTMLInputElement);
    assert.strictEqual(input.title, error);
  });

  it('shows tooltip on page navigation buttons', () => {
    const buttons = getElementsWithinComponent(component, NAVIGATOR_PAGE_BUTTON_SELECTOR, HTMLButtonElement);
    assert.lengthOf(buttons, 2);
    const pageBack = buttons[0];
    const pageForward = buttons[1];

    assert.strictEqual(pageBack.title, 'Previous page');
    assert.strictEqual(pageForward.title, 'Next page');
  });

  it('shows tooltip on history navigation buttons', () => {
    const buttons = getElementsWithinComponent(component, NAVIGATOR_HISTORY_BUTTON_SELECTOR, HTMLButtonElement);
    assert.lengthOf(buttons, 2);
    const historyBack = buttons[0];
    const historyForward = buttons[1];

    assert.strictEqual(historyBack.title, 'Go back in address history');
    assert.strictEqual(historyForward.title, 'Go forward in address history');
  });

  it('shows tooltip on refresh button', () => {
    const refreshButton = getElementWithinComponent(component, NAVIGATOR_REFRESH_BUTTON_SELECTOR, HTMLButtonElement);

    assert.strictEqual(refreshButton.title, 'Refresh');
  });
});
