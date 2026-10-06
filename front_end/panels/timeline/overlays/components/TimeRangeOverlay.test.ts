// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as sinon from 'sinon';

import * as Trace from '../../../../models/trace/trace.js';
import {dispatchInputEvent, dispatchKeyDownEvent, renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../../../testing/LocaleHelpers.js';

import * as Components from './components.js';

const {TimeRangeOverlay} = Components.TimeRangeOverlay;

interface RenderedElements {
  rangeContainer: HTMLElement;
  labelBox: HTMLElement;
  duration: HTMLElement;
}

function getRenderedElements(component: Components.TimeRangeOverlay.TimeRangeOverlay): RenderedElements {
  const rangeContainer = component.contentElement.querySelector<HTMLElement>('.range-container');
  assert.isOk(rangeContainer);
  const labelBox = rangeContainer.querySelector<HTMLElement>('.label-text');
  assert.isOk(labelBox);
  const duration = rangeContainer.querySelector<HTMLElement>('.duration');
  assert.isOk(duration);
  return {rangeContainer, labelBox, duration};
}

async function renderOverlay(label: string): Promise<Components.TimeRangeOverlay.TimeRangeOverlay> {
  const component = new TimeRangeOverlay();
  component.label = label;
  renderElementIntoDOM(component);
  await component.updateComplete;
  return component;
}

const CANVAS_WIDTH_PX = 1000;

interface PositionedOverlay {
  component: Components.TimeRangeOverlay.TimeRangeOverlay;
  overlayElement: HTMLElement;
  canvas: HTMLElement;
}

interface PositionedOverlayOptions {
  left: number;
  width: number;
  label: string;
  duration: Trace.Types.Timing.Micro|null;
}

const DURATION = Trace.Types.Timing.Micro(1_260_000);

/**
 * Renders the overlay the same way `Overlays` does: inside an absolutely
 * positioned wrapper element whose left and width match the time range. The
 * wrapper sits inside a container that acts as the canvas.
 */
async function renderPositionedOverlay(options: PositionedOverlayOptions): Promise<PositionedOverlay> {
  const canvas = document.createElement('div');
  canvas.style.position = 'relative';
  canvas.style.width = `${CANVAS_WIDTH_PX}px`;
  canvas.style.height = '100px';

  const overlayElement = document.createElement('div');
  overlayElement.style.position = 'absolute';
  overlayElement.style.top = '0';
  overlayElement.style.height = '100%';
  overlayElement.style.left = `${options.left}px`;
  overlayElement.style.width = `${options.width}px`;
  canvas.appendChild(overlayElement);
  renderElementIntoDOM(canvas);

  const component = new TimeRangeOverlay();
  component.label = options.label;
  component.duration = options.duration;
  component.canvasRect = canvas.getBoundingClientRect();
  component.markAsRoot();
  component.show(overlayElement);
  // The update renders the view and then positions the label.
  await component.updateComplete;
  return {component, overlayElement, canvas};
}

describe('TimeRangeOverlay', () => {
  setupLocaleHooks();

  it('applies the overlay styles to the widget element', async () => {
    const component = await renderOverlay('my label');
    assert.strictEqual(getComputedStyle(component.element).display, 'flex');
  });

  it('renders the formatted duration', async () => {
    const component = await renderOverlay('');
    component.duration = Trace.Types.Timing.Micro(1_260_000);
    await component.updateComplete;
    const {duration} = getRenderedElements(component);
    assert.strictEqual(duration.textContent, '1.26\xA0s');
  });

  it('clears the duration when it is set back to null', async () => {
    const component = await renderOverlay('');
    component.duration = Trace.Types.Timing.Micro(1_260_000);
    await component.updateComplete;
    component.duration = null;
    await component.updateComplete;
    const {duration} = getRenderedElements(component);
    assert.strictEqual(duration.textContent, '');
  });

  it('renders a non-empty initial label as text and aria-label, and makes it non-editable', async () => {
    const component = await renderOverlay('my label');
    const {labelBox} = getRenderedElements(component);
    assert.strictEqual(labelBox.textContent, 'my label');
    assert.strictEqual(labelBox.getAttribute('aria-label'), 'my label');
    assert.strictEqual(labelBox.getAttribute('contenteditable'), 'false');
  });

  it('makes an empty initial label editable', async () => {
    const component = await renderOverlay('');
    const {labelBox} = getRenderedElements(component);
    assert.strictEqual(labelBox.getAttribute('contenteditable'), 'plaintext-only');
  });

  it('makes a non-editable label editable and focuses it on double click', async () => {
    const component = await renderOverlay('my label');
    const {labelBox} = getRenderedElements(component);
    labelBox.dispatchEvent(new MouseEvent('dblclick'));
    await component.updateComplete;
    assert.strictEqual(labelBox.getAttribute('contenteditable'), 'plaintext-only');
    assert.strictEqual(document.activeElement, labelBox);
    // Blur the label and wait for the resulting update, so that it does not
    // run after the test has removed the locale.
    labelBox.blur();
    await component.updateComplete;
  });

  it('makes a non-empty label non-editable when it loses focus', async () => {
    const component = await renderOverlay('my label');
    const {labelBox} = getRenderedElements(component);
    labelBox.dispatchEvent(new MouseEvent('dblclick'));
    await component.updateComplete;
    labelBox.blur();
    await component.updateComplete;
    assert.strictEqual(labelBox.getAttribute('contenteditable'), 'false');
  });

  it('keeps an empty label editable and focused when it loses focus', async () => {
    const component = await renderOverlay('');
    const {labelBox} = getRenderedElements(component);
    labelBox.focus();
    // An empty label is refocused synchronously, without an update.
    labelBox.blur();
    assert.strictEqual(labelBox.getAttribute('contenteditable'), 'plaintext-only');
    assert.strictEqual(document.activeElement, labelBox);
  });

  it('calls onLabelChange and updates the aria-label when the text changes on input', async () => {
    const component = await renderOverlay('');
    const onLabelChange = sinon.spy();
    component.onLabelChange = onLabelChange;
    const {labelBox} = getRenderedElements(component);

    labelBox.textContent = 'new label';
    dispatchInputEvent(labelBox);
    await component.updateComplete;

    sinon.assert.calledOnceWithExactly(onLabelChange, 'new label');
    assert.strictEqual(labelBox.getAttribute('aria-label'), 'new label');
  });

  it('does not call onLabelChange when the text is unchanged on input', async () => {
    const component = await renderOverlay('my label');
    const onLabelChange = sinon.spy();
    component.onLabelChange = onLabelChange;
    const {labelBox} = getRenderedElements(component);

    dispatchInputEvent(labelBox);

    sinon.assert.notCalled(onLabelChange);
  });

  it('keeps the typed text when the overlay re-renders after input', async () => {
    const component = await renderOverlay('');
    const {labelBox} = getRenderedElements(component);

    labelBox.textContent = 'typed label';
    dispatchInputEvent(labelBox);
    // Changing the duration re-renders the overlay.
    component.duration = Trace.Types.Timing.Micro(1_260_000);
    await component.updateComplete;

    assert.strictEqual(labelBox.textContent, 'typed label');
  });

  it('calls onRemove and stops propagation when Enter is pressed and the label is empty', async () => {
    const component = await renderOverlay('');
    const onRemove = sinon.spy();
    component.onRemove = onRemove;
    const onKeyDownOutside = sinon.spy();
    component.element.addEventListener('keydown', onKeyDownOutside);
    const {labelBox} = getRenderedElements(component);

    dispatchKeyDownEvent(labelBox, {key: 'Enter', bubbles: true, composed: true});

    sinon.assert.calledOnce(onRemove);
    sinon.assert.notCalled(onKeyDownOutside);
  });

  it('calls onRemove and stops propagation when Escape is pressed and the label is empty', async () => {
    const component = await renderOverlay('');
    const onRemove = sinon.spy();
    component.onRemove = onRemove;
    // Escape must not reach DevTools, where it would toggle the console drawer.
    const onKeyDownOutside = sinon.spy();
    component.element.addEventListener('keydown', onKeyDownOutside);
    const {labelBox} = getRenderedElements(component);

    dispatchKeyDownEvent(labelBox, {key: 'Escape', bubbles: true, composed: true});

    sinon.assert.calledOnce(onRemove);
    sinon.assert.notCalled(onKeyDownOutside);
  });

  it('does not call onRemove and ends editing when Enter is pressed and the label is not empty', async () => {
    const component = await renderOverlay('my label');
    const onRemove = sinon.spy();
    component.onRemove = onRemove;
    const {labelBox} = getRenderedElements(component);
    labelBox.dispatchEvent(new MouseEvent('dblclick'));
    await component.updateComplete;
    assert.strictEqual(labelBox.getAttribute('contenteditable'), 'plaintext-only');

    dispatchKeyDownEvent(labelBox, {key: 'Enter'});
    await component.updateComplete;

    sinon.assert.notCalled(onRemove);
    assert.strictEqual(labelBox.getAttribute('contenteditable'), 'false');
  });

  it('updates the text and makes the label non-editable when a new label is set', async () => {
    const component = await renderOverlay('');
    const {labelBox} = getRenderedElements(component);
    assert.strictEqual(labelBox.getAttribute('contenteditable'), 'plaintext-only');

    component.label = 'saved label';
    await component.updateComplete;

    assert.strictEqual(labelBox.textContent, 'saved label');
    assert.strictEqual(labelBox.getAttribute('aria-label'), 'saved label');
    assert.strictEqual(labelBox.getAttribute('contenteditable'), 'false');
  });

  it('hides a non-empty, unfocused label when the visible range is narrower than the duration', async () => {
    const {component} = await renderPositionedOverlay({left: 100, width: 20, label: 'label', duration: DURATION});
    const {rangeContainer} = getRenderedElements(component);
    assert.isTrue(rangeContainer.classList.contains('labelHidden'));
  });

  it('keeps a non-empty label visible while it is being edited even when the visible range is narrower than the duration',
     async () => {
       const {component} = await renderPositionedOverlay({left: 100, width: 20, label: 'label', duration: DURATION});
       const {rangeContainer, labelBox} = getRenderedElements(component);
       assert.isTrue(rangeContainer.classList.contains('labelHidden'));

       labelBox.dispatchEvent(new MouseEvent('dblclick'));
       await component.updateComplete;
       assert.isFalse(rangeContainer.classList.contains('labelHidden'));

       labelBox.blur();
       await component.updateComplete;
       assert.isTrue(rangeContainer.classList.contains('labelHidden'));
     });

  it('keeps the label centered when the range is fully inside the canvas', async () => {
    const {component} = await renderPositionedOverlay({left: 200, width: 400, label: 'label', duration: DURATION});
    const {rangeContainer} = getRenderedElements(component);
    assert.isFalse(rangeContainer.classList.contains('labelHidden'));
    assert.isFalse(rangeContainer.classList.contains('offScreenLeft'));
    assert.isFalse(rangeContainer.classList.contains('offScreenRight'));
    assert.strictEqual(rangeContainer.style.margin, '0px');
  });

  it('pins the label to the left edge of the canvas when the range starts off the left of the canvas', async () => {
    const {component} = await renderPositionedOverlay({left: -200, width: 400, label: 'label', duration: DURATION});
    const {rangeContainer} = getRenderedElements(component);
    assert.isTrue(rangeContainer.classList.contains('offScreenLeft'));
    assert.isFalse(rangeContainer.classList.contains('offScreenRight'));
    // The margin is the 200px the range extends past the canvas, plus 9px of scrollbar padding.
    assert.strictEqual(rangeContainer.style.marginLeft, '209px');
  });

  it('pins the label to the right edge of the canvas when the range ends off the right of the canvas', async () => {
    const {component} =
        await renderPositionedOverlay({left: CANVAS_WIDTH_PX - 200, width: 400, label: 'label', duration: DURATION});
    const {rangeContainer} = getRenderedElements(component);
    assert.isTrue(rangeContainer.classList.contains('offScreenRight'));
    assert.isFalse(rangeContainer.classList.contains('offScreenLeft'));
    // The margin is the 200px the range extends past the canvas, plus 9px of scrollbar padding.
    assert.strictEqual(rangeContainer.style.marginRight, '209px');
  });

  it('repositions the label synchronously when updateLabelPositioning() is called', async () => {
    const {component, overlayElement} =
        await renderPositionedOverlay({left: 200, width: 400, label: 'label', duration: DURATION});
    const {rangeContainer} = getRenderedElements(component);
    assert.isFalse(rangeContainer.classList.contains('offScreenLeft'));

    // This is what `Overlays` does when the user pans: move the wrapper, then
    // reposition the label in the same frame.
    overlayElement.style.left = '-200px';
    component.updateLabelPositioning();

    assert.isTrue(rangeContainer.classList.contains('offScreenLeft'));
    assert.strictEqual(rangeContainer.style.marginLeft, '209px');
  });

  it('positions the label against a canvasRect set just before updateLabelPositioning() is called', async () => {
    const {component, canvas} =
        await renderPositionedOverlay({left: 600, width: 300, label: 'label', duration: DURATION});
    const {rangeContainer} = getRenderedElements(component);
    assert.isFalse(rangeContainer.classList.contains('offScreenRight'));

    // This is what `Overlays` does on every update: set the canvas rect, then
    // reposition the label before the update that the new rect requests.
    const canvasRect = canvas.getBoundingClientRect();
    component.canvasRect = new DOMRect(canvasRect.x, canvasRect.y, 700, canvasRect.height);
    component.updateLabelPositioning();

    assert.isTrue(rangeContainer.classList.contains('offScreenRight'));
    // The margin is the 200px the range extends past the narrower canvas, plus 9px of scrollbar padding.
    assert.strictEqual(rangeContainer.style.marginRight, '209px');
    // Wait for the requested update, so that it does not run after the test
    // has removed the locale.
    await component.updateComplete;
  });

  it('focuses an empty label once it has been positioned', async () => {
    const {component} = await renderPositionedOverlay({left: 200, width: 400, label: '', duration: DURATION});
    const {labelBox} = getRenderedElements(component);
    assert.strictEqual(document.activeElement, labelBox);
  });

  it('does not focus an empty label while the duration text has no width', async () => {
    const {component} = await renderPositionedOverlay({left: 200, width: 400, label: '', duration: null});
    const {labelBox} = getRenderedElements(component);
    assert.notStrictEqual(document.activeElement, labelBox);
  });

  it('keeps an empty label visible when the visible range is narrower than the duration', async () => {
    const {component} = await renderPositionedOverlay({left: 100, width: 20, label: '', duration: DURATION});
    const {rangeContainer} = getRenderedElements(component);
    assert.isFalse(rangeContainer.classList.contains('labelHidden'));
  });
});
