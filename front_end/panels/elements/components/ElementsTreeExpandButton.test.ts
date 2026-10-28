// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {
  dispatchClickEvent,
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../../testing/LocaleHelpers.js';
import {createViewFunctionStub} from '../../../testing/ViewFunctionHelpers.js';

import * as ElementsComponents from './components.js';

describe('Elements tree expand button', () => {
  setupLocaleHooks();

  it('renders and triggers click handler in view', () => {
    const target = document.createElement('div');
    renderElementIntoDOM(target);

    let clicks = 0;
    const clickHandler = () => clicks++;
    ElementsComponents.ElementsTreeExpandButton.DEFAULT_VIEW({clickHandler}, undefined, target);

    const button = target.querySelector('.expand-button');
    assert.instanceOf(button, HTMLElement);

    dispatchClickEvent(button);
    assert.strictEqual(clicks, 1);
  });

  it('contains only html tags and no visible characters in button innerText', () => {
    const target = document.createElement('div');
    renderElementIntoDOM(target);

    ElementsComponents.ElementsTreeExpandButton.DEFAULT_VIEW({clickHandler: () => {}}, undefined, target);

    const button = target.querySelector('.expand-button');
    assert.instanceOf(button, HTMLElement);
    assert.strictEqual(button.innerText, '');
  });

  it('passes clickHandler to view from presenter', async () => {
    const view = createViewFunctionStub(ElementsComponents.ElementsTreeExpandButton.ElementsTreeExpandButton);
    const component = new ElementsComponents.ElementsTreeExpandButton.ElementsTreeExpandButton(undefined, view);
    const clickHandler = () => {};
    component.clickHandler = clickHandler;

    renderElementIntoDOM(component);
    const input = await view.nextInput;
    assert.strictEqual(input.clickHandler, clickHandler);
  });
});
