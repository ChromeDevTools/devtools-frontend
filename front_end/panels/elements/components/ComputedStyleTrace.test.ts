// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';

import * as ElementsComponents from './components.js';

describe('ComputedStyleTrace', () => {
  it('renders ComputedStyleTrace selector correctly', () => {
    const component = new ElementsComponents.ComputedStyleTrace.ComputedStyleTrace();
    renderElementIntoDOM(component);
    const selector = '#id';
    const data = {
      selector,
      active: true,
      onNavigateToSource: () => {},
    };
    component.data = data;

    const renderedSelector = component.shadowRoot!.querySelector('.trace-selector');
    assert.exists(renderedSelector, 'selector was not rendered');
    assert.strictEqual(renderedSelector.textContent, selector);
  });

  it('has a clickable goto icon and trace value', () => {
    const component = new ElementsComponents.ComputedStyleTrace.ComputedStyleTrace();
    renderElementIntoDOM(component);
    let clickCounter = 0;
    const data = {
      selector: '#id',
      active: true,
      onNavigateToSource: () => {
        clickCounter++;
      },
    };
    component.data = data;

    const goto = component.shadowRoot!.querySelector<HTMLElement>('.goto');
    assert.exists(goto, 'goto did not exist');
    goto.click();
    assert.strictEqual(clickCounter, 1, 'goto icon should be clickable');

    const traceValue = component.shadowRoot!.querySelector<HTMLElement>('slot[name="trace-value"]');
    assert.exists(traceValue, 'trace value slot was not rendered');
    traceValue.click();
    assert.strictEqual(clickCounter, 2, 'trace value should be clickable');
  });
});
