// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as sinon from 'sinon';

import * as Trace from '../../../../models/trace/trace.js';
import {dispatchInputEvent, dispatchKeyDownEvent, renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../../../testing/LocaleHelpers.js';

import * as Components from './components.js';

const {TimeRangeOverlay, TimeRangeLabelChangeEvent, TimeRangeRemoveEvent} = Components.TimeRangeOverlay;

interface RenderedElements {
  rangeContainer: HTMLElement;
  labelBox: HTMLElement;
  duration: HTMLElement;
}

function getRenderedElements(component: Components.TimeRangeOverlay.TimeRangeOverlay): RenderedElements {
  assert.isOk(component.shadowRoot);
  const rangeContainer = component.shadowRoot.querySelector<HTMLElement>('.range-container');
  assert.isOk(rangeContainer);
  const labelBox = rangeContainer.querySelector<HTMLElement>('.label-text');
  assert.isOk(labelBox);
  const duration = rangeContainer.querySelector<HTMLElement>('.duration');
  assert.isOk(duration);
  return {rangeContainer, labelBox, duration};
}

function renderOverlay(label: string): Components.TimeRangeOverlay.TimeRangeOverlay {
  const component = new TimeRangeOverlay(label);
  renderElementIntoDOM(component);
  return component;
}

const CANVAS_WIDTH_PX = 1000;

/**
 * Renders the overlay the same way `Overlays` does: inside an absolutely
 * positioned wrapper element whose left and width match the time range. The
 * wrapper sits inside a container that acts as the canvas.
 */
function renderPositionedOverlay(options: {left: number, width: number}): Components.TimeRangeOverlay.TimeRangeOverlay {
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

  const component = new TimeRangeOverlay('label');
  component.duration = Trace.Types.Timing.Micro(1_260_000);
  overlayElement.appendChild(component);
  renderElementIntoDOM(canvas);

  component.canvasRect = canvas.getBoundingClientRect();
  component.updateLabelPositioning();
  return component;
}

describe('TimeRangeOverlay', () => {
  setupLocaleHooks();

  it('renders the formatted duration', () => {
    const component = renderOverlay('');
    component.duration = Trace.Types.Timing.Micro(1_260_000);
    const {duration} = getRenderedElements(component);
    assert.strictEqual(duration.textContent, '1.26\xA0s');
  });

  it('clears the duration when it is set back to null', () => {
    const component = renderOverlay('');
    component.duration = Trace.Types.Timing.Micro(1_260_000);
    component.duration = null;
    const {duration} = getRenderedElements(component);
    assert.strictEqual(duration.textContent, '');
  });

  it('renders a non-empty initial label as text and aria-label, and makes it non-editable', () => {
    const component = renderOverlay('my label');
    const {labelBox} = getRenderedElements(component);
    assert.strictEqual(labelBox.textContent, 'my label');
    assert.strictEqual(labelBox.getAttribute('aria-label'), 'my label');
    assert.strictEqual(labelBox.getAttribute('contenteditable'), 'false');
  });

  it('makes an empty initial label editable', () => {
    const component = renderOverlay('');
    const {labelBox} = getRenderedElements(component);
    assert.strictEqual(labelBox.getAttribute('contenteditable'), 'plaintext-only');
  });

  it('makes a non-editable label editable on double click', () => {
    const component = renderOverlay('my label');
    const {labelBox} = getRenderedElements(component);
    labelBox.dispatchEvent(new MouseEvent('dblclick'));
    assert.strictEqual(labelBox.getAttribute('contenteditable'), 'plaintext-only');
    // Making the label editable focuses it. Blur it now: otherwise the test
    // DOM cleanup fires focusout, which re-renders after the locale is gone.
    labelBox.blur();
  });

  it('makes a non-empty label non-editable when it loses focus', () => {
    const component = renderOverlay('my label');
    const {labelBox} = getRenderedElements(component);
    labelBox.dispatchEvent(new MouseEvent('dblclick'));
    labelBox.blur();
    assert.strictEqual(labelBox.getAttribute('contenteditable'), 'false');
  });

  it('keeps an empty label editable and focused when it loses focus', () => {
    const component = renderOverlay('');
    const {labelBox} = getRenderedElements(component);
    labelBox.focus();
    labelBox.blur();
    assert.strictEqual(labelBox.getAttribute('contenteditable'), 'plaintext-only');
    assert.strictEqual(component.shadowRoot?.activeElement, labelBox);
  });

  it('dispatches a label change event and updates the aria-label when the text changes on input', () => {
    const component = renderOverlay('');
    const onLabelChange = sinon.spy();
    component.addEventListener(TimeRangeLabelChangeEvent.eventName, onLabelChange);
    const {labelBox} = getRenderedElements(component);

    labelBox.textContent = 'new label';
    dispatchInputEvent(labelBox);

    sinon.assert.calledOnce(onLabelChange);
    const event = onLabelChange.firstCall.args[0];
    assert.instanceOf(event, TimeRangeLabelChangeEvent);
    assert.strictEqual(event.newLabel, 'new label');
    assert.strictEqual(labelBox.getAttribute('aria-label'), 'new label');
  });

  it('does not dispatch a label change event when the text is unchanged on input', () => {
    const component = renderOverlay('my label');
    const onLabelChange = sinon.spy();
    component.addEventListener(TimeRangeLabelChangeEvent.eventName, onLabelChange);
    const {labelBox} = getRenderedElements(component);

    dispatchInputEvent(labelBox);

    sinon.assert.notCalled(onLabelChange);
  });

  it('keeps the typed text when the overlay re-renders after input', () => {
    const component = renderOverlay('');
    const {labelBox} = getRenderedElements(component);

    labelBox.textContent = 'typed label';
    dispatchInputEvent(labelBox);
    // Changing the duration re-renders the overlay.
    component.duration = Trace.Types.Timing.Micro(1_260_000);

    assert.strictEqual(labelBox.textContent, 'typed label');
  });

  it('dispatches a remove event and stops propagation when Enter is pressed and the label is empty', () => {
    const component = renderOverlay('');
    const onRemove = sinon.spy();
    component.addEventListener(TimeRangeRemoveEvent.eventName, onRemove);
    const onKeyDownOutside = sinon.spy();
    component.addEventListener('keydown', onKeyDownOutside);
    const {labelBox} = getRenderedElements(component);

    dispatchKeyDownEvent(labelBox, {key: 'Enter', bubbles: true, composed: true});

    sinon.assert.calledOnce(onRemove);
    sinon.assert.notCalled(onKeyDownOutside);
  });

  it('dispatches a remove event and stops propagation when Escape is pressed and the label is empty', () => {
    const component = renderOverlay('');
    const onRemove = sinon.spy();
    component.addEventListener(TimeRangeRemoveEvent.eventName, onRemove);
    // Escape must not reach DevTools, where it would toggle the console drawer.
    const onKeyDownOutside = sinon.spy();
    component.addEventListener('keydown', onKeyDownOutside);
    const {labelBox} = getRenderedElements(component);

    dispatchKeyDownEvent(labelBox, {key: 'Escape', bubbles: true, composed: true});

    sinon.assert.calledOnce(onRemove);
    sinon.assert.notCalled(onKeyDownOutside);
  });

  it('does not dispatch a remove event when Enter is pressed and the label is not empty', () => {
    const component = renderOverlay('my label');
    const onRemove = sinon.spy();
    component.addEventListener(TimeRangeRemoveEvent.eventName, onRemove);
    const {labelBox} = getRenderedElements(component);

    dispatchKeyDownEvent(labelBox, {key: 'Enter'});

    sinon.assert.notCalled(onRemove);
  });

  it('hides a non-empty, unfocused label when the visible range is narrower than the duration', () => {
    const component = renderPositionedOverlay({left: 100, width: 20});
    const {rangeContainer} = getRenderedElements(component);
    assert.isTrue(rangeContainer.classList.contains('labelHidden'));
  });

  it('keeps the label centered when the range is fully inside the canvas', () => {
    const component = renderPositionedOverlay({left: 200, width: 400});
    const {rangeContainer} = getRenderedElements(component);
    assert.isFalse(rangeContainer.classList.contains('labelHidden'));
    assert.isFalse(rangeContainer.classList.contains('offScreenLeft'));
    assert.isFalse(rangeContainer.classList.contains('offScreenRight'));
    assert.strictEqual(rangeContainer.style.margin, '0px');
  });

  it('pins the label to the left edge of the canvas when the range starts off the left of the canvas', () => {
    const component = renderPositionedOverlay({left: -200, width: 400});
    const {rangeContainer} = getRenderedElements(component);
    assert.isTrue(rangeContainer.classList.contains('offScreenLeft'));
    assert.isFalse(rangeContainer.classList.contains('offScreenRight'));
    // The margin is the 200px the range extends past the canvas, plus 9px of scrollbar padding.
    assert.strictEqual(rangeContainer.style.marginLeft, '209px');
  });

  it('pins the label to the right edge of the canvas when the range ends off the right of the canvas', () => {
    const component = renderPositionedOverlay({left: CANVAS_WIDTH_PX - 200, width: 400});
    const {rangeContainer} = getRenderedElements(component);
    assert.isTrue(rangeContainer.classList.contains('offScreenRight'));
    assert.isFalse(rangeContainer.classList.contains('offScreenLeft'));
    // The margin is the 200px the range extends past the canvas, plus 9px of scrollbar padding.
    assert.strictEqual(rangeContainer.style.marginRight, '209px');
  });
});
