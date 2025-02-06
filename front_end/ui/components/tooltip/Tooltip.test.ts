// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './Tooltip.js';

import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {checkForPendingActivity} from '../../../testing/TrackAsyncOperations.js';
import * as Lit from '../../lit/lit.js';

import type {TooltipVariant} from './Tooltip.js';

const {html} = Lit;

function renderTooltip({variant}: {variant: TooltipVariant} = {
  variant: 'simple'
}) {
  const container = document.createElement('div');
  // clang-format off
  Lit.render(html`
    <button aria-describedby="simple-tooltip">Simple</button>
    <devtools-tooltip id="simple-tooltip" variant=${variant}>
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
    const container = renderTooltip({variant: 'rich'});
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
});
