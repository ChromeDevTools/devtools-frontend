// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ElementsComponentsModule from '../../../../../../front_end/panels/elements/components/components.js';
import {assertShadowRoot, renderElementIntoDOM} from '../../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';

const {assert} = chai;

const initialData = {
  inherited: false,
  traceable: true,
  onNavigateToSource: () => {},
};

describeWithEnvironment('ComputedStyleProperty', () => {
  let ElementsComponents: typeof ElementsComponentsModule;
  before(async () => {
    ElementsComponents = await import('../../../../../../front_end/panels/elements/components/components.js');
  });

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

    const slots = Array.from(component.shadowRoot.querySelectorAll('.inherited slot'));
    assert.deepEqual(
        slots.map(slot => slot.getAttribute('name')),
        [
          'property-name',
          'property-value',
        ],
        'should contain name and value slots under .inherited selector');
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
