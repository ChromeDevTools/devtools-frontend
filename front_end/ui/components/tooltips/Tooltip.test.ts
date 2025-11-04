// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import * as UI from '../../legacy/legacy.js';
import * as Lit from '../../lit/lit.js';

import * as Tooltips from './tooltips.js';

const {html, nothing} = Lit;

interface RenderProps {
  variant?: Tooltips.Tooltip.TooltipVariant;
  attribute?: 'aria-describedby'|'aria-details';
  trigger?: Tooltips.Tooltip.TooltipTrigger;
  useHotkey?: boolean;
  jslogContext?: string;
  id?: string;
}

function renderTooltip({
  variant = 'simple',
  attribute = 'aria-describedby',
  trigger = 'hover',
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
     hover-delay=${0}
     trigger=${trigger}
     ?use-hotkey=${useHotkey}
     jslogContext=${jslogContext??nothing}
     >
      ${variant === 'rich' ? html`<p>Rich content</p>` : 'Simple content'}
    </devtools-tooltip>
  `, container);
  // clang-format on
  renderElementIntoDOM(container, {allowMultipleChildren: true});
  return container;
}

async function waitForToggle(tooltip: Tooltips.Tooltip.Tooltip, state: 'open'|'closed'): Promise<void> {
  return await new Promise<void>(resolve => {
    tooltip.addEventListener('toggle', (event: Event) => {
      if ((event as ToggleEvent).newState === state) {
        resolve();
      }
    }, {once: true});
  });
}

describe('Tooltip', () => {
  let inspectorViewRootElementStub: HTMLElement;

  beforeEach(async () => {
    inspectorViewRootElementStub = document.createElement('div');
    renderElementIntoDOM(inspectorViewRootElementStub, {allowMultipleChildren: true});

    const inspectorViewStub = sinon.createStubInstance(UI.InspectorView.InspectorView);
    Object.assign(inspectorViewStub, {element: inspectorViewRootElementStub});
    sinon.stub(UI.InspectorView.InspectorView, 'instance').returns(inspectorViewStub);

    Tooltips.Tooltip.Tooltip.lastOpenedTooltipId = null;
  });

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
    const tooltip = container.querySelector('devtools-tooltip');
    assert.exists(tooltip);

    const button = container.querySelector('button');
    const opened = waitForToggle(tooltip, 'open');
    button?.dispatchEvent(new MouseEvent('mouseenter'));

    await opened;
    assert.isTrue(tooltip.open);
  });

  it('should close if the user presses escape when it is open', async () => {
    const container = renderTooltip();
    const tooltip = container.querySelector('devtools-tooltip');
    assert.exists(tooltip);

    const button = container.querySelector('button');
    const opened = waitForToggle(tooltip, 'open');
    button?.dispatchEvent(new MouseEvent('mouseenter'));

    await opened;
    assert.isTrue(tooltip.open);

    const closed = waitForToggle(tooltip, 'closed');
    document.body.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
    await closed;
    assert.isFalse(tooltip.open);
  });

  it('should only close the innermost tooltip on escape', async () => {
    const container = document.createElement('div');
    // clang-format off
    Lit.render(html`
      <button aria-details="outer-tooltip-id">Outer Button</button>
      <devtools-tooltip
        id="outer-tooltip-id"
        variant="rich"
        hover-delay=${0}
      >
        <button aria-details="inner-tooltip-id">Inner Button</button>
        <devtools-tooltip
          id="inner-tooltip-id"
          variant="rich"
          hover-delay=${0}
        >
          <p>Inner Tooltip Content</p>
        </devtools-tooltip>
      </devtools-tooltip>
    `, container);
    // clang-format on
    renderElementIntoDOM(container, {allowMultipleChildren: true});

    const outerTooltip = container.querySelector('devtools-tooltip');
    assert.exists(outerTooltip);

    const outerButton = container.querySelector('button');
    const outerOpened = waitForToggle(outerTooltip, 'open');
    outerButton?.dispatchEvent(new MouseEvent('mouseenter'));

    await outerOpened;
    assert.isTrue(outerTooltip.open);

    const innerTooltip = outerTooltip.querySelector('devtools-tooltip');
    assert.exists(innerTooltip);

    const innerButton = outerTooltip.querySelector('button');
    const innerOpened = waitForToggle(innerTooltip, 'open');
    innerButton?.dispatchEvent(new MouseEvent('mouseenter'));

    await innerOpened;
    assert.isTrue(innerTooltip.open);

    const outerClosed = waitForToggle(outerTooltip, 'closed');
    const innerClosed = waitForToggle(innerTooltip, 'closed');

    document.body.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
    await innerClosed;
    assert.isTrue(outerTooltip.open);
    assert.isFalse(innerTooltip.open);

    document.body.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
    await outerClosed;
    assert.isFalse(outerTooltip.open);
    assert.isFalse(innerTooltip.open);
  });

  it('should be activated if focused', async () => {
    const container = renderTooltip();
    const tooltip = container.querySelector('devtools-tooltip');
    assert.exists(tooltip);

    const opened = waitForToggle(tooltip, 'open');
    const button = container.querySelector('button');
    button?.dispatchEvent(new FocusEvent('focus'));

    await opened;
    assert.isTrue(tooltip.open);
  });

  it('should not be activated if un-hovered', async () => {
    const container = renderTooltip();
    const tooltip = container.querySelector('devtools-tooltip');
    assert.exists(tooltip);

    const button = container.querySelector('button');
    const opened = waitForToggle(tooltip, 'open');
    button?.dispatchEvent(new MouseEvent('mouseenter'));

    await opened;
    assert.isTrue(tooltip.open);

    button?.dispatchEvent(new MouseEvent('mouseleave'));
    assert.isFalse(tooltip.open);
  });

  it('should not be activated if dragged', () => {
    const clock = sinon.useFakeTimers({toFake: ['setTimeout']});
    const container = renderTooltip();

    const button = container.querySelector('button');
    button?.dispatchEvent(new MouseEvent('mouseenter', {buttons: 1}));

    clock.runAll();
    assert.isFalse(container.querySelector('devtools-tooltip')?.open);
    clock.restore();
  });

  it('should not be activated if un-focused', async () => {
    const container = renderTooltip();
    const tooltip = container.querySelector('devtools-tooltip');
    assert.exists(tooltip);

    const button = container.querySelector('button');
    const opened = waitForToggle(tooltip, 'open');
    button?.dispatchEvent(new FocusEvent('focus'));

    await opened;
    assert.isTrue(tooltip.open);

    button?.dispatchEvent(new FocusEvent('blur'));
    assert.isFalse(tooltip.open);
  });

  it('should not open on hover if `trigger` is set to `click`', () => {
    const clock = sinon.useFakeTimers({toFake: ['setTimeout']});
    const container = renderTooltip({trigger: 'click'});

    const button = container.querySelector('button');
    button?.dispatchEvent(new MouseEvent('mouseenter'));

    clock.runAll();
    assert.isFalse(container.querySelector('devtools-tooltip')?.open);
    clock.restore();
  });

  it('should not open on focus if `trigger` is set to `click`', () => {
    const clock = sinon.useFakeTimers({toFake: ['setTimeout']});
    const container = renderTooltip({trigger: 'click'});

    const button = container.querySelector('button');
    button?.dispatchEvent(new FocusEvent('focus'));

    clock.runAll();
    assert.isFalse(container.querySelector('devtools-tooltip')?.open);
    clock.restore();
  });

  it('should open with click if `trigger` is set to `click`', () => {
    const container = renderTooltip({trigger: 'click'});

    const button = container.querySelector('button');
    button?.click();

    assert.isTrue(container.querySelector('devtools-tooltip')?.open);
  });

  it('should open on hover if `trigger` is set to `both`', () => {
    const clock = sinon.useFakeTimers({toFake: ['setTimeout']});
    const container = renderTooltip({trigger: 'both'});

    const button = container.querySelector('button');
    button?.dispatchEvent(new MouseEvent('mouseenter'));

    clock.runAll();
    assert.isTrue(container.querySelector('devtools-tooltip')?.open);
    clock.restore();
  });

  it('should open on focus if `trigger` is set to `both`', () => {
    const clock = sinon.useFakeTimers({toFake: ['setTimeout']});
    const container = renderTooltip({trigger: 'both'});

    const button = container.querySelector('button');
    button?.dispatchEvent(new FocusEvent('focus'));

    clock.runAll();
    assert.isTrue(container.querySelector('devtools-tooltip')?.open);
    clock.restore();
  });

  it('should open with click if `trigger` is set to `both`', () => {
    const container = renderTooltip({trigger: 'both'});

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

  it('should not open on focus if use-hotkey is set', () => {
    const container = renderTooltip({useHotkey: true});

    const button = container.querySelector('button');
    button?.dispatchEvent(new FocusEvent('focus'));

    assert.isFalse(container.querySelector('devtools-tooltip')?.open);
  });

  const eventsNotToPropagate = ['click', 'mouseup'];

  eventsNotToPropagate.forEach(eventName => {
    it('should stop propagation of click events', () => {
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

  it('should hide the tooltip if anchor is removed from DOM', async () => {
    const container = renderTooltip();
    const tooltip = container.querySelector('devtools-tooltip');
    assert.exists(tooltip);

    const opened = waitForToggle(tooltip, 'open');
    const button = container.querySelector('button');
    button?.dispatchEvent(new MouseEvent('mouseenter'));
    await opened;

    const closed = waitForToggle(tooltip, 'closed');
    button?.remove();
    await closed;

    assert.isFalse(tooltip.open);
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

    const opened = waitForToggle(tooltip, 'open');
    anchor.dispatchEvent(new FocusEvent('focus'));
    await opened;
    assert.isTrue(tooltip.open);
    const richContents = container.querySelector('devtools-tooltip')?.querySelector('p.deep-nested');
    assert.exists(richContents);

    anchor.dispatchEvent(new FocusEvent('blur', {relatedTarget: richContents}));
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

    const opened = waitForToggle(tooltip, 'open');
    tooltip.showTooltip();
    await opened;
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

  describe('assigns the correct position', () => {
    const inspectorViewRect = {
      top: 0,
      bottom: 290,
      height: 290,
      left: 0,
      right: 500,
      width: 500,
    } as DOMRect;
    const anchorRect = {
      top: 100,
      bottom: 200,
      height: 100,
      left: 200,
      right: 400,
      width: 200,
    } as DOMRect;

    it('for default postion bottom span right', () => {
      const currentPopoverRect = {
        height: 80,
        width: 160,
      } as DOMRect;
      const proposedRect = Tooltips.Tooltip.proposedRectForRichTooltip(
          {inspectorViewRect, anchorRect, currentPopoverRect, preferredPositions: []});
      assert.strictEqual(proposedRect.top, 200);
      assert.strictEqual(proposedRect.left, 200);
    });

    it('for preferred postion bottom span left', () => {
      const currentPopoverRect = {
        height: 80,
        width: 160,
      } as DOMRect;
      const proposedRect = Tooltips.Tooltip.proposedRectForRichTooltip({
        inspectorViewRect,
        anchorRect,
        currentPopoverRect,
        preferredPositions: [Tooltips.Tooltip.PositionOption.BOTTOM_SPAN_LEFT]
      });
      assert.strictEqual(proposedRect.top, 200);
      assert.strictEqual(proposedRect.left, 240);
    });

    it('uses 2nd option from default order if 1st is impossible', () => {
      const currentPopoverRect = {
        height: 80,
        width: 350,
      } as DOMRect;
      const proposedRect = Tooltips.Tooltip.proposedRectForRichTooltip(
          {inspectorViewRect, anchorRect, currentPopoverRect, preferredPositions: []});
      assert.strictEqual(proposedRect.top, 200);
      assert.strictEqual(proposedRect.left, 50);
    });

    it('uses 3rd option from default order if first 2 are impossible', () => {
      const currentPopoverRect = {
        height: 95,
        width: 160,
      } as DOMRect;
      const proposedRect = Tooltips.Tooltip.proposedRectForRichTooltip(
          {inspectorViewRect, anchorRect, currentPopoverRect, preferredPositions: []});
      assert.strictEqual(proposedRect.top, 5);
      assert.strictEqual(proposedRect.left, 200);
    });

    it('uses 4th option from default order if first 3 are impossible', () => {
      const currentPopoverRect = {
        height: 95,
        width: 350,
      } as DOMRect;
      const proposedRect = Tooltips.Tooltip.proposedRectForRichTooltip(
          {inspectorViewRect, anchorRect, currentPopoverRect, preferredPositions: []});
      assert.strictEqual(proposedRect.top, 5);
      assert.strictEqual(proposedRect.left, 50);
    });

    it('uses 4th option from preferred order if first 3 are impossible', () => {
      const currentPopoverRect = {
        height: 95,
        width: 350,
      } as DOMRect;
      const proposedRect = Tooltips.Tooltip.proposedRectForRichTooltip({
        inspectorViewRect,
        anchorRect,
        currentPopoverRect,
        preferredPositions:
            [Tooltips.Tooltip.PositionOption.BOTTOM_SPAN_LEFT, Tooltips.Tooltip.PositionOption.TOP_SPAN_LEFT]
      });
      assert.strictEqual(proposedRect.top, 5);
      assert.strictEqual(proposedRect.left, 50);
    });

    it('moves the rect into the viewport if all 4 options are impossible', () => {
      const currentPopoverRect = {
        height: 110,
        width: 440,
      } as DOMRect;
      const proposedRect = Tooltips.Tooltip.proposedRectForRichTooltip(
          {inspectorViewRect, anchorRect, currentPopoverRect, preferredPositions: []});
      assert.strictEqual(proposedRect.top, 0);
      assert.strictEqual(proposedRect.left, 60);
    });

    it('for anchors in a corner of the viewport', () => {
      const anchorBottomLeftCorner = {
        top: 190,
        bottom: 290,
        height: 100,
        left: 0,
        right: 100,
        width: 100,
      } as DOMRect;
      const currentPopoverRect = {
        height: 100,
        width: 200,
      } as DOMRect;
      const proposedRect = Tooltips.Tooltip.proposedRectForRichTooltip(
          {inspectorViewRect, anchorRect: anchorBottomLeftCorner, currentPopoverRect, preferredPositions: []});
      assert.strictEqual(proposedRect.top, 90);
      assert.strictEqual(proposedRect.left, 0);
    });

    it('moves a simple tooltip into the viewport', () => {
      const currentPopoverRect = {
        height: 95,
        width: 410,
      } as DOMRect;
      const proposedRect =
          Tooltips.Tooltip.proposedRectForSimpleTooltip({inspectorViewRect, anchorRect, currentPopoverRect});
      assert.strictEqual(proposedRect.top, 5);
      assert.strictEqual(proposedRect.left, 90);
    });
  });
});
