// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ElementsComponents from '../../../../../../front_end/panels/elements/components/components.js';
import {assertShadowRoot, renderElementIntoDOM} from '../../../helpers/DOMHelpers.js';

const {assert} = chai;

const initialData = {
  propertyNameRenderer: () => {
    return document.createElement('span');
  },
  propertyValueRenderer: () => {
    return document.createElement('span');
  },
  inherited: false,
  traceable: true,
  onNavigateToSource: () => {},
};

describe('ComputedStyleProperty', () => {
  it('renders inherited property correctly', () => {
    const component = new ElementsComponents.ComputedStyleProperty.ComputedStyleProperty();
    renderElementIntoDOM(component);
    const data = {
      ...initialData,
      traceable: false,
      inherited: true,
    };
    component.data = data;

    assertShadowRoot(component.shadowRoot);

    const wrapper = component.shadowRoot.querySelector('.computed-style-property.inherited');
    assert.exists(wrapper, 'it should add .inherited class to wrapper for inherited properties');
  });

  it('renders a clickable goto icon that calls onNavigateToSource when it contains traces', () => {
    const component = new ElementsComponents.ComputedStyleProperty.ComputedStyleProperty();
    renderElementIntoDOM(component);
    let isOnNavigateToSourceCalled = false;
    const data = {
      ...initialData,
      onNavigateToSource: () => {
        isOnNavigateToSourceCalled = true;
      },
    };
    component.data = data;

    assertShadowRoot(component.shadowRoot);
    const goto = component.shadowRoot.querySelector<HTMLElement>('.goto');
    if (!goto) {
      assert.fail('goto icon should exist');
      return;
    }
    goto.click();
    assert.isTrue(isOnNavigateToSourceCalled, 'goto icon should be clickable that calls onNavigateToSource');
  });
});
