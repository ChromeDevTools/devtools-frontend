// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  assertScreenshot,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import type * as Buttons from '../../../ui/components/buttons/buttons.js';

import * as LinearMemoryInspectorComponents from './components.js';

export const NAVIGATOR_ADDRESS_SELECTOR = '[data-input]';

describe('LinearMemoryNavigator', () => {
  setupLocaleHooks();
  let component: LinearMemoryInspectorComponents.LinearMemoryNavigator.LinearMemoryNavigator;

  beforeEach(async () => {
    renderNavigator();
    await component.updateComplete;
  });

  function renderNavigator() {
    component = new LinearMemoryInspectorComponents.LinearMemoryNavigator.LinearMemoryNavigator();
    renderElementIntoDOM(component);

    component.data = {
      address: '20',
      valid: true,
      mode: LinearMemoryInspectorComponents.LinearMemoryNavigator.Mode.SUBMITTED,
      error: undefined,
      canGoBackInHistory: true,
      canGoForwardInHistory: true,
    };
  }

  async function assertNavigationEvents(eventType: 'page'|'history') {
    const shadowRoot = component.contentElement.shadowRoot;
    assert.isNotNull(shadowRoot);

    // Grab all buttons and rely on their predictable rendering order
    const buttons = shadowRoot.querySelectorAll('devtools-button');
    assert.lengthOf(buttons, 5);

    const navigation: LinearMemoryInspectorComponents.LinearMemoryNavigator.Navigation[] = [];
    let buttonsToClick: HTMLElement[] = [];

    if (eventType === 'page') {
      component.onNavigatePage = nav => navigation.push(nav);
      buttonsToClick = [buttons[2] as HTMLElement, buttons[3] as HTMLElement];
    } else {
      component.onNavigateHistory = nav => navigation.push(nav);
      buttonsToClick = [buttons[0] as HTMLElement, buttons[1] as HTMLElement];
    }

    for (const button of buttonsToClick) {
      button.click();
    }

    assert.deepEqual(navigation, [
      LinearMemoryInspectorComponents.LinearMemoryNavigator.Navigation.BACKWARD,
      LinearMemoryInspectorComponents.LinearMemoryNavigator.Navigation.FORWARD,
    ]);
  }

  it('renders navigator address', () => {
    const shadowRoot = component.contentElement.shadowRoot;
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

    const shadowRoot = component.contentElement.shadowRoot;
    assert.isNotNull(shadowRoot);
    const input = shadowRoot.querySelector(NAVIGATOR_ADDRESS_SELECTOR);
    assert.instanceOf(input, HTMLInputElement);
    assert.strictEqual(input.value, '16');
  });

  it('sends event when clicking on refresh', async () => {
    let refreshRequested = false;
    component.onRefreshRequest = () => {
      refreshRequested = true;
    };

    const shadowRoot = component.contentElement.shadowRoot;
    assert.isNotNull(shadowRoot);

    const buttons = shadowRoot.querySelectorAll('devtools-button');
    assert.lengthOf(buttons, 5);

    const refreshButton = buttons[4] as HTMLElement;
    refreshButton.click();

    assert.isTrue(refreshRequested);
  });

  it('sends events when clicking previous and next page', async () => {
    await assertNavigationEvents('page');
  });

  it('sends events when clicking undo and redo', async () => {
    await assertNavigationEvents('history');
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

    const shadowRoot = component.contentElement.shadowRoot;
    assert.isNotNull(shadowRoot);
    const buttons = shadowRoot.querySelectorAll('devtools-button');
    assert.lengthOf(buttons, 5);
    const historyBack = buttons[0] as Buttons.Button.Button;
    const historyForward = buttons[1] as Buttons.Button.Button;

    assert.isTrue(historyBack.disabled);
    assert.isTrue(historyForward.disabled);
  });

  it('shows tooltip on hovering over address', () => {
    const input = component.contentElement.shadowRoot!.querySelector<HTMLInputElement>(NAVIGATOR_ADDRESS_SELECTOR);
    assert.isNotNull(input);
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
    const input = component.contentElement.shadowRoot!.querySelector<HTMLInputElement>(NAVIGATOR_ADDRESS_SELECTOR);
    assert.isNotNull(input);
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
    const input = component.contentElement.shadowRoot!.querySelector<HTMLInputElement>(NAVIGATOR_ADDRESS_SELECTOR);
    assert.isNotNull(input);
    assert.strictEqual(input.title, error);
  });

  it('shows tooltip on page navigation buttons', () => {
    const shadowRoot = component.contentElement.shadowRoot;
    assert.isNotNull(shadowRoot);
    const buttons = shadowRoot.querySelectorAll('devtools-button');
    assert.lengthOf(buttons, 5);
    const pageBack = buttons[2];
    const pageForward = buttons[3];

    assert.strictEqual(pageBack.getAttribute('title'), 'Previous page');
    assert.strictEqual(pageForward.getAttribute('title'), 'Next page');
  });

  it('shows tooltip on history navigation buttons', () => {
    const shadowRoot = component.contentElement.shadowRoot;
    assert.isNotNull(shadowRoot);
    const buttons = shadowRoot.querySelectorAll('devtools-button');
    assert.lengthOf(buttons, 5);
    const historyBack = buttons[0];
    const historyForward = buttons[1];

    assert.strictEqual(historyBack.getAttribute('title'), 'Go back in address history');
    assert.strictEqual(historyForward.getAttribute('title'), 'Go forward in address history');
  });

  it('shows tooltip on refresh button', () => {
    const shadowRoot = component.contentElement.shadowRoot;
    assert.isNotNull(shadowRoot);
    const buttons = shadowRoot.querySelectorAll('devtools-button');
    assert.lengthOf(buttons, 5);
    const refreshButton = buttons[4];

    assert.strictEqual(refreshButton.getAttribute('title'), 'Refresh');
  });
});

describe('LinearMemoryNavigator Screenshots', () => {
  setupLocaleHooks();
  let component: LinearMemoryInspectorComponents.LinearMemoryNavigator.LinearMemoryNavigator;

  it('renders correctly', async () => {
    component = new LinearMemoryInspectorComponents.LinearMemoryNavigator.LinearMemoryNavigator();
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
