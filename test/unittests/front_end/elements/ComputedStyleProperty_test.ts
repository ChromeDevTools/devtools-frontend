// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ComputedStyleProperty} from '../../../../front_end/elements/ComputedStyleProperty.js';
import {assertShadowRoot, renderElementIntoDOM} from '../helpers/DOMHelpers.js';

const {assert} = chai;

const getDetailAndSummaryFromNonInheritedProperty = (root: ShadowRoot) => {
  const detailsElement = root.querySelector('details');
  const summaryElement = root.querySelector('summary');
  if (!detailsElement) {
    assert.fail('non-inherited property should be wrapped in a <details> element');
  }
  if (!summaryElement) {
    assert.fail('non-inherited property should contain a <summary> element');
  }

  return {detailsElement, summaryElement};
};

const initialData = {
  propertyName: 'display',
  propertyValue: 'block',
  inherited: false,
  traceable: true,
  expanded: false,
  onNavigateToSource: () => {},
};

describe('ComputedStyleProperty', () => {
  it('renders inherited property correctly', () => {
    const component = new ComputedStyleProperty();
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

  it('renders traceable property correctly', () => {
    const component = new ComputedStyleProperty();
    renderElementIntoDOM(component);
    const data = {...initialData};
    component.data = data;

    assertShadowRoot(component.shadowRoot);

    const slots = Array.from(component.shadowRoot.querySelectorAll('details summary slot'));
    assert.deepEqual(
        slots.map(slot => slot.getAttribute('name')),
        [
          'property-name',
          'property-value',
        ],
        'should contain name and value slots under details summary selector');
  });

  it('renders expanded property correctly', () => {
    const component = new ComputedStyleProperty();
    renderElementIntoDOM(component);
    const data = {...initialData, expanded: true};
    component.data = data;

    assertShadowRoot(component.shadowRoot);

    const {detailsElement, summaryElement} = getDetailAndSummaryFromNonInheritedProperty(component.shadowRoot);
    if (!detailsElement || !summaryElement) {
      return;
    }

    assert.isTrue(detailsElement.open, 'details tag should be open when the property is expanded');

    summaryElement.click();
    assert.isFalse(component.isExpanded(), 'component should be collapsed after clicking while open');
    assert.isFalse(detailsElement.open, 'details tag should be closed after clicking while open');
  });

  it('renders collapsed property correctly', () => {
    const component = new ComputedStyleProperty();
    renderElementIntoDOM(component);
    const data = {...initialData};
    component.data = data;

    assertShadowRoot(component.shadowRoot);

    const {detailsElement, summaryElement} = getDetailAndSummaryFromNonInheritedProperty(component.shadowRoot);
    if (!detailsElement || !summaryElement) {
      return;
    }

    assert.isFalse(detailsElement.open, 'details tag should not be open when the property is collapsed');

    summaryElement.click();
    assert.isTrue(component.isExpanded(), 'component should be expanded after clicking while closed');
    assert.isTrue(detailsElement.open, 'details tag should be open after clicking while closed');
  });

  it('renders a clickable goto icon that calls onNavigateToSource when it contains traces', () => {
    const component = new ComputedStyleProperty();
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
