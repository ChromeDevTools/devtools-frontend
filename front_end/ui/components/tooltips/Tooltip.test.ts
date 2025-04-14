// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {checkForPendingActivity} from '../../../testing/TrackAsyncOperations.js';
import * as Lit from '../../lit/lit.js';

import * as Tooltips from './tooltips.js';

const {html, nothing} = Lit;

interface RenderProps {
  variant?: Tooltips.Tooltip.TooltipVariant;
  attribute?: 'aria-describedby'|'aria-details';
  useClick?: boolean;
  useHotkey?: boolean;
  jslogContext?: string;
  id?: string;
}

function renderTooltip({
  variant = 'simple',
  attribute = 'aria-describedby',
  useClick = false,
  useHotkey = false,
  jslogContext = undefined,
  id = 'tooltip-id',
}: RenderProps = {}) {
  const container = document.createElement('div');
  // clang-format off
  Lit.render(html`
    ${attribute === 'aria-details' ?
      html`<button aria-details=${id}>Button</button>` :
      html`<button aria-describedby=${id}>Button</button>`
    }
    <devtools-tooltip
     id=${id}
     variant=${variant}
     ?use-click=${useClick}
     ?use-hotkey=${useHotkey}
     jslogContext=${jslogContext??nothing}
     >
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
    assert.isTrue(container.querySelector('devtools-tooltip')?.open);
  });

  it('should be activated if focused', async () => {
    const container = renderTooltip();

    const button = container.querySelector('button');
    button?.dispatchEvent(new FocusEvent('focus'));

    await checkForPendingActivity();
    assert.isTrue(container.querySelector('devtools-tooltip')?.open);
  });

  it('should not be activated if un-hovered', async () => {
    const container = renderTooltip();

    const button = container.querySelector('button');
    button?.dispatchEvent(new MouseEvent('mouseenter'));
    button?.dispatchEvent(new MouseEvent('mouseleave'));

    await checkForPendingActivity();
    assert.isFalse(container.querySelector('devtools-tooltip')?.open);
  });

  it('should not be activated if dragged', async () => {
    const container = renderTooltip();

    const button = container.querySelector('button');
    button?.dispatchEvent(new MouseEvent('mouseenter', {buttons: 1}));

    await checkForPendingActivity();
    assert.isFalse(container.querySelector('devtools-tooltip')?.open);
  });

  it('should not be activated if un-focused', async () => {
    const container = renderTooltip();

    const button = container.querySelector('button');
    button?.dispatchEvent(new FocusEvent('focus'));
    button?.dispatchEvent(new FocusEvent('blur'));

    await checkForPendingActivity();
    assert.isFalse(container.querySelector('devtools-tooltip')?.open);
  });

  it('should not open on hover if use-click is set', async () => {
    const container = renderTooltip({useClick: true});

    const button = container.querySelector('button');
    button?.dispatchEvent(new MouseEvent('mouseenter'));

    await checkForPendingActivity();
    assert.isFalse(container.querySelector('devtools-tooltip')?.open);
  });

  it('should not open on focus if use-click is set', async () => {
    const container = renderTooltip({useClick: true});

    const button = container.querySelector('button');
    button?.dispatchEvent(new FocusEvent('focus'));

    await checkForPendingActivity();
    assert.isFalse(container.querySelector('devtools-tooltip')?.open);
  });

  it('should open with click if use-click is set', () => {
    const container = renderTooltip({useClick: true});

    const button = container.querySelector('button');
    button?.click();

    assert.isTrue(container.querySelector('devtools-tooltip')?.open);
  });

  it('should open with hotkey if use-hotkey is set', () => {
    const container = renderTooltip({useHotkey: true});

    const button = container.querySelector('button');
    button?.dispatchEvent(new KeyboardEvent('keydown', {altKey: true, key: 'ArrowDown'}));

    assert.isTrue(container.querySelector('devtools-tooltip')?.open);
  });

  it('should not open on focus if use-hotkey is set', async () => {
    const container = renderTooltip({useHotkey: true});

    const button = container.querySelector('button');
    button?.dispatchEvent(new FocusEvent('focus'));

    await checkForPendingActivity();
    assert.isFalse(container.querySelector('devtools-tooltip')?.open);
  });

  const eventsNotToPropagate = ['click', 'mouseup'];

  eventsNotToPropagate.forEach(eventName => {
    it('shoould stop propagation of click events', () => {
      const container = renderTooltip();
      const callback = sinon.spy();
      container.addEventListener(eventName, callback);

      const tooltip = container.querySelector('devtools-tooltip');
      tooltip?.dispatchEvent(new Event(eventName, {bubbles: true}));

      sinon.assert.notCalled(callback);
      container.removeEventListener(eventName, callback);
    });
  });

  it('should print a warning if rich tooltip is used with wrong aria label on anchor', () => {
    const consoleSpy = sinon.stub(console, 'warn');
    renderTooltip({variant: 'rich'});
    sinon.assert.calledOnce(consoleSpy);
  });

  it('can be instantiated programatically', () => {
    const container = document.createElement('div');
    const anchor = document.createElement('button');
    anchor.setAttribute('aria-describedby', 'tooltip-id');
    const tooltip = new Tooltips.Tooltip.Tooltip({id: 'tooltip-id', anchor});
    tooltip.append('Text content');
    container.appendChild(anchor);
    container.appendChild(tooltip);
    renderElementIntoDOM(container);

    assert.strictEqual(anchor.style.anchorName, '--devtools-tooltip-tooltip-id-anchor');
  });

  it('should hide the tooltip if anchor is removed from DOM', async () => {
    const container = renderTooltip();

    const button = container.querySelector('button');
    button?.dispatchEvent(new MouseEvent('mouseenter'));
    await checkForPendingActivity();
    button?.remove();
    await checkForPendingActivity();

    assert.isFalse(container.querySelector('devtools-tooltip')?.open);
  });

  it('should not hide the tooltip if focus moves from the anchor into deep DOM within the tooltip', async () => {
    const container = renderTooltip({variant: 'rich', attribute: 'aria-details'});
    const anchor = container.querySelector('button');
    assert.exists(anchor);
    const tooltip = container.querySelector('devtools-tooltip');
    assert.exists(tooltip);
    // Make some nested DOM for this; this test exists because of a bug where
    // the tooltip only stayed open if the focused element was an immediate
    // child, so for this test we make a nested DOM structure and test on that.
    tooltip.innerHTML = '<div><span><p class="deep-nested">nested</p></span></div>';

    anchor.dispatchEvent(new FocusEvent('focus'));
    await checkForPendingActivity();
    assert.isTrue(tooltip.open);
    const richContents = container.querySelector('devtools-tooltip')?.querySelector('p.deep-nested');
    assert.exists(richContents);

    anchor.dispatchEvent(new FocusEvent('blur', {relatedTarget: richContents}));
    await checkForPendingActivity();
    assert.isTrue(tooltip.open);  // tooltip should still be open
  });

  it('automatically sets and updates jslog', () => {
    const container = renderTooltip({jslogContext: 'context'});
    const tooltip = container.querySelector('devtools-tooltip');
    assert.exists(tooltip);
    assert.strictEqual(tooltip.getAttribute('jslog'), 'Popover; context: context; parent: mapped');

    tooltip.setAttribute('jslogcontext', 'context2');
    assert.strictEqual(tooltip.getAttribute('jslog'), 'Popover; context: context2; parent: mapped');

    const anchor = container.createChild('button');
    anchor.setAttribute('aria-details', 'constructed-tooltip-id');
    const constructedTooltip =
        new Tooltips.Tooltip.Tooltip({id: 'constructed-tooltip-id', jslogContext: 'context3', anchor});
    container.appendChild(constructedTooltip);
    assert.strictEqual(constructedTooltip.getAttribute('jslog'), 'Popover; context: context3; parent: mapped');
  });

  it('automatically opens a new tooltip with the same id on re-attach', async () => {
    const container = renderTooltip();
    const tooltip = container.querySelector('devtools-tooltip');
    assert.exists(tooltip);

    const waitForOpen = Promise.withResolvers<Event>();
    tooltip.ontoggle = waitForOpen.resolve;
    tooltip.showTooltip();
    await waitForOpen.promise;
    assert.isTrue(tooltip.open);

    container.remove();
    const container2 = renderTooltip();
    const tooltip2 = container2.querySelector('devtools-tooltip');
    assert.exists(tooltip2);
    assert.isTrue(tooltip2.open);

    tooltip2.id = 'tooltip-id-2';
    container2.remove();
    const container3 = renderTooltip({id: 'tooltip-id-2'});
    const tooltip3 = container3.querySelector('devtools-tooltip');
    assert.exists(tooltip3);
    assert.isTrue(tooltip3.open);
  });
});
