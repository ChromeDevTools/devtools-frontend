// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ElementsComponents from '../../../../../../front_end/panels/elements/components/components.js';
import {assertShadowRoot, renderElementIntoDOM} from '../../../helpers/DOMHelpers.js';

const {assert} = chai;

describe('ComputedStyleTrace', async () => {
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

    assertShadowRoot(component.shadowRoot);
    const renderedSelector = component.shadowRoot.querySelector('.trace-selector');
    if (!renderedSelector) {
      assert.fail('selector was not rendered');
      return;
    }
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

    assertShadowRoot(component.shadowRoot);
    const goto = component.shadowRoot.querySelector<HTMLElement>('.goto');
    if (!goto) {
      assert.fail('goto did not exist');
      return;
    }
    goto.click();
    assert.strictEqual(clickCounter, 1, 'goto icon should be clickable');

    const traceValue = component.shadowRoot.querySelector<HTMLElement>('slot[name="trace-value"]');
    if (!traceValue) {
      assert.fail('trace value slot was not rendered');
      return;
    }
    traceValue.click();
    assert.strictEqual(clickCounter, 2, 'trace value should be clickable');
  });
});
