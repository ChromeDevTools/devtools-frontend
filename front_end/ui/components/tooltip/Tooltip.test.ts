// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {checkForPendingActivity} from '../../../testing/TrackAsyncOperations.js';
import * as Lit from '../../lit/lit.js';

import * as TooltipModule from './Tooltip.js';
import type {TooltipVariant} from './Tooltip.js';

const {
  closestAnchor,
  Tooltip,
} = TooltipModule;

const {html, Directives} = Lit;
const {ref, createRef} = Directives;

function renderTooltip(
    {variant = 'simple',
     attribute = 'aria-describedby'}: {variant?: TooltipVariant, attribute?: 'aria-describedby'|'aria-details'} = {}) {
  const container = document.createElement('div');
  // clang-format off
  Lit.render(html`
    ${attribute === 'aria-details' ?
      html`<button aria-details="tooltip-id">Button</button>` :
      html`<button aria-describedby="tooltip-id">Button</button>`
    }
    <devtools-tooltip id="tooltip-id" variant=${variant}>
      ${variant === 'rich' ? html`<p>Rich content</p>` : 'Simple content'}
    </devtools-tooltip>
  `, container);
  // clang-format on
  renderElementIntoDOM(container);
  return container;
}

describe('Tooltip', () => {
  it('renders a simple tooltip', () => {
    const container = renderTooltip();
    const tooltip = container.querySelector('devtools-tooltip');
    assert.strictEqual(tooltip?.variant, 'simple');
    assert.strictEqual(container.querySelector('devtools-tooltip')?.textContent?.trim(), 'Simple content');
  });

  it('renders a rich tooltip', () => {
    const container = renderTooltip({variant: 'rich', attribute: 'aria-details'});
    const tooltip = container.querySelector('devtools-tooltip');
    assert.strictEqual(tooltip?.variant, 'rich');
    assert.strictEqual(container.querySelector('devtools-tooltip')?.querySelector('p')?.textContent, 'Rich content');
  });

  it('should be activated if hovered', async () => {
    const container = renderTooltip();

    const button = container.querySelector('button');
    button?.dispatchEvent(new MouseEvent('mouseenter'));

    await checkForPendingActivity();
    assert.isFalse(container.querySelector('devtools-tooltip')?.hidden);
  });

  const eventsNotToPropagate = ['click', 'mouseup'];

  eventsNotToPropagate.forEach(eventName => {
    it('shoould stop propagation of click events', () => {
      const container = renderTooltip();
      const callback = sinon.spy();
      container.addEventListener(eventName, callback);

      const tooltip = container.querySelector('devtools-tooltip');
      tooltip?.dispatchEvent(new Event(eventName, {bubbles: true}));

      assert.isFalse(callback.called);
      container.removeEventListener(eventName, callback);
    });
  });

  it('should print a warning if rich tooltip is used with wrong aria label on anchor', () => {
    const consoleSpy = sinon.spy(console, 'warn');
    renderTooltip({variant: 'rich'});
    assert.isTrue(consoleSpy.calledOnce);
  });

  it('can be instantiated programatically', () => {
    const container = document.createElement('div');
    const anchor = document.createElement('button');
    const tooltip = new Tooltip({id: 'tooltip-id', anchor});
    tooltip.append('Text content');
    container.appendChild(anchor);
    container.appendChild(tooltip);
    renderElementIntoDOM(container);

    assert.strictEqual(anchor.style.anchorName, '--tooltip-id-anchor');
  });
});

describe('closestAnchor', () => {
  function renderTemplate(template: Lit.TemplateResult) {
    const container = document.createElement('div');
    Lit.render(template, container);
    renderElementIntoDOM(container);
  }

  it('finds a previous sibling anchor', () => {
    const origin = createRef();
    const expectedAchnor = createRef();
    // clang-format off
    renderTemplate(html`
      <div class="anchor" ${ref(expectedAchnor)}></div>
      <div ${ref(origin)}></div>
    `);
    // clang-format on

    const actual = closestAnchor(origin.value!, '.anchor');

    assert.strictEqual(actual, expectedAchnor.value);
  });

  it('finds a parent', () => {
    const origin = createRef();
    const expectedAchnor = createRef();
    // clang-format off
    renderTemplate(html`
      <div class="anchor" ${ref(expectedAchnor)}>
        <div ${ref(origin)}></div>
      </div>
    `);
    // clang-format on

    const actual = closestAnchor(origin.value!, '.anchor');

    assert.strictEqual(actual, expectedAchnor.value);
  });

  it('finds an ancestors decendant', () => {
    const origin = createRef();
    const expectedAchnor = createRef();
    // clang-format off
    renderTemplate(html`
      <div>
        <div>
          <div class="anchor" ${ref(expectedAchnor)}></div>
        </div>
        <div>
          <div ${ref(origin)}></div>
        </div>
      </div>
    `);
    // clang-format on

    const actual = closestAnchor(origin.value!, '.anchor');

    assert.strictEqual(actual, expectedAchnor.value);
  });

  it('takes the next anchor up the tree', () => {
    const origin = createRef();
    const expectedAchnor = createRef();
    // clang-format off
    renderTemplate(html`
      <div class="anchor a"></div>
      <div class="anchor b"></div>
      <div class="anchor c" ${ref(expectedAchnor)}></div>
      <div ${ref(origin)}></div>
      <div class="anchor d"></div>
    `);
    // clang-format on

    const actual = closestAnchor(origin.value!, '.anchor');

    assert.strictEqual(actual, expectedAchnor.value);
  });
});
