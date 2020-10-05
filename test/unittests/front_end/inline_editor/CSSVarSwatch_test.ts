// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {CSSVarSwatch} from '../../../../front_end/inline_editor/CSSVarSwatch.js';
import {assertNotNull, assertShadowRoot, renderElementIntoDOM} from '../helpers/DOMHelpers.js';

const {assert} = chai;

function assertSwatch(swatch: CSSVarSwatch, expected: {
  valueTooltip: string|null,
  linkTooltip: string,
  isDefined: boolean,
  varText: string,
  hasColorSwatch: boolean,
  parsedColor?: string
}) {
  assertShadowRoot(swatch.shadowRoot);
  const container = swatch.shadowRoot.querySelector('span');
  assertNotNull(container);

  const link = container.querySelector('.css-var-link');
  assertNotNull(link);
  const colorSwatch = container.querySelector('.color-swatch');

  assert.strictEqual(
      container.getAttribute('title'), expected.valueTooltip || '', 'The computed values appears as a tooltip');
  assert.strictEqual(
      link.classList.contains('undefined'), !expected.isDefined,
      'The link only has the class undefined when the property is undefined');
  assert.strictEqual(link.getAttribute('title'), expected.linkTooltip, 'The link has the right tooltip');
  assert.strictEqual(link.textContent, expected.varText, 'The link has the right text content');
  assert.strictEqual(!!colorSwatch, expected.hasColorSwatch, 'The color swatch state is correct');

  if (expected.hasColorSwatch) {
    const innerColorSwatch = container.querySelector('.color-swatch-inner') as HTMLSpanElement;
    assertNotNull(innerColorSwatch);
    assert.strictEqual(innerColorSwatch.style.backgroundColor, expected.parsedColor, 'The color is correct');
  }
}

describe('CSSVarSwatch', () => {
  it('can be instantiated successfully', () => {
    const component = new CSSVarSwatch();
    renderElementIntoDOM(component);

    assert.instanceOf(component, HTMLElement, 'The swatch is an instance of HTMLElement');
  });

  it('renders a simple var function', () => {
    const component = new CSSVarSwatch();
    renderElementIntoDOM(component);
    component.data = {
      text: 'var(--test)',
      computedValue: '2px',
      fromFallback: false,
      onLinkClick: () => {},
    };

    assertSwatch(component, {
      valueTooltip: '2px',
      linkTooltip: 'Jump to definition',
      isDefined: true,
      varText: '--test',
      hasColorSwatch: false,
    });
  });

  it('renders a var function with an undefined property', () => {
    const component = new CSSVarSwatch();
    renderElementIntoDOM(component);
    component.data = {
      text: 'var(--undefined)',
      computedValue: null,
      fromFallback: false,
      onLinkClick: () => {},
    };

    assertSwatch(component, {
      valueTooltip: null,
      linkTooltip: '--undefined is not defined',
      isDefined: false,
      varText: '--undefined',
      hasColorSwatch: false,
    });
  });

  it('renders a var function with an undefined property but a fallback value', () => {
    const component = new CSSVarSwatch();
    renderElementIntoDOM(component);
    component.data = {
      text: 'var(--undefined, 3px)',
      computedValue: '3px',
      fromFallback: true,
      onLinkClick: () => {},
    };

    assertSwatch(component, {
      valueTooltip: '3px',
      linkTooltip: '--undefined is not defined',
      isDefined: false,
      varText: '--undefined',
      hasColorSwatch: false,
    });
  });

  it('renders a color swatch for properties that compute to valid colors', () => {
    const component = new CSSVarSwatch();
    renderElementIntoDOM(component);
    component.data = {
      text: 'var(--main-color)',
      computedValue: '#f06',
      fromFallback: false,
      onLinkClick: () => {},
    };

    assertSwatch(component, {
      valueTooltip: '#f06',
      linkTooltip: 'Jump to definition',
      isDefined: true,
      varText: '--main-color',
      hasColorSwatch: true,
      parsedColor: 'rgb(255, 0, 102)',
    });
  });

  it('doesn\'t get confused with properties that look like colors', () => {
    const component = new CSSVarSwatch();
    renderElementIntoDOM(component);
    component.data = {
      text: 'var(--fake-color)',
      computedValue: '#12345',
      fromFallback: false,
      onLinkClick: () => {},
    };

    assertSwatch(component, {
      valueTooltip: '#12345',
      linkTooltip: 'Jump to definition',
      isDefined: true,
      varText: '--fake-color',
      hasColorSwatch: false,
    });
  });
});
