// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../../../front_end/core/common/common.js';
import {assertNotNullOrUndefined} from '../../../../../../../front_end/core/platform/platform.js';
import * as InlineEditor from '../../../../../../../front_end/ui/legacy/components/inline_editor/inline_editor.js';
import * as UI from '../../../../../../../front_end/ui/legacy/legacy.js';
import {
  assertElement,
  assertShadowRoot,
  dispatchClickEvent,
  renderElementIntoDOM,
} from '../../../../helpers/DOMHelpers.js';
import {describeWithLocale} from '../../../../helpers/EnvironmentHelpers.js';

const {assert} = chai;

function assertSwatch(
    swatch: InlineEditor.ColorSwatch.ColorSwatch,
    expected: {backgroundColor?: string, colorTextInSlot?: string, tooltip?: string}) {
  assertShadowRoot(swatch.shadowRoot);

  const swatchEl = swatch.shadowRoot.querySelector('.color-swatch');
  const swatchInnerEl = swatch.shadowRoot.querySelector('.color-swatch-inner');
  const slotEl = swatch.shadowRoot.querySelector('slot');
  assertElement(swatchEl, HTMLElement);
  assertElement(swatchInnerEl, HTMLElement);
  assertNotNullOrUndefined(slotEl);

  if (expected.backgroundColor) {
    assert.strictEqual(
        swatchInnerEl.style.backgroundColor, expected.backgroundColor, 'The swatch has the correct color');
  }
  if (expected.colorTextInSlot) {
    assert.strictEqual(slotEl.textContent, expected.colorTextInSlot, 'The slot shows the correct default color');
  }
  if (expected.tooltip) {
    assert.strictEqual(swatchEl.getAttribute('title'), expected.tooltip, 'The tooltip is correct');
  }
}

function createSwatch(color: Common.Color.Color|string, formatOrUseUserSetting?: string|boolean, tooltip?: string) {
  const swatch = new InlineEditor.ColorSwatch.ColorSwatch();
  renderElementIntoDOM(swatch);
  swatch.renderColor(color, formatOrUseUserSetting, tooltip);
  return swatch;
}

function getClickTarget(swatch: InlineEditor.ColorSwatch.ColorSwatch) {
  assertNotNullOrUndefined(swatch.shadowRoot);
  return swatch.shadowRoot.querySelector('.color-swatch-inner') as HTMLElement;
}

describeWithLocale('ColorSwatch', () => {
  it('accepts colors as text', () => {
    const swatch = createSwatch('red');

    assertSwatch(swatch, {
      backgroundColor: 'red',
      colorTextInSlot: 'red',
    });
  });

  it('accepts colors as color objects', () => {
    const swatch = createSwatch(Common.Color.parse('red') as Common.Color.Color);

    assertSwatch(swatch, {
      backgroundColor: 'red',
      colorTextInSlot: 'red',
    });

    swatch.renderColor(new Common.Color.Legacy([1, .5, .2, .5], Common.Color.Format.RGBA));

    assertSwatch(swatch, {
      backgroundColor: 'rgba(255, 128, 51, 0.5)',
      colorTextInSlot: 'rgb(255 128 51 / 50%)',
    });
  });

  it('renders text only for invalid colors provided as text', () => {
    const swatch = createSwatch('invalid');

    assertShadowRoot(swatch.shadowRoot);
    assert.strictEqual(
        swatch.shadowRoot.querySelectorAll('.color-swatch').length, 0, 'There is no swatch in the component');
    assert.strictEqual(swatch.shadowRoot.textContent, 'invalid', 'The correct value is displayed');
  });

  it('accepts a custom color format', () => {
    const swatch = createSwatch('red', Common.Color.Format.RGB);
    assertSwatch(swatch, {colorTextInSlot: 'red'});

    swatch.renderColor(
        new Common.Color.Legacy([1, .5, .2, .5], Common.Color.Format.RGBA).as(Common.Color.Format.HSL),
        Common.Color.Format.RGBA);
    assertSwatch(swatch, {colorTextInSlot: 'rgb(255 128 51 / 50%)'});
  });

  it('displays a default tooltip', () => {
    const swatch = createSwatch('red');

    assertSwatch(swatch, {tooltip: 'Shift-click to change color format'});
  });

  it('can display a custom tooltip', () => {
    const swatch = createSwatch('red', false, 'This is a custom tooltip');

    assertSwatch(swatch, {tooltip: 'This is a custom tooltip'});
  });

  it('dispatches an event on clicks', () => {
    const swatch = createSwatch('red');
    const target = getClickTarget(swatch);

    const swatchClickEventsReceived: Event[] = [];
    const onClick = (e: Event) => {
      swatchClickEventsReceived.push(e);
    };
    swatch.addEventListener(InlineEditor.ColorSwatch.ClickEvent.eventName, onClick);

    dispatchClickEvent(target);
    dispatchClickEvent(target);
    dispatchClickEvent(target);
    assert.strictEqual(swatchClickEventsReceived.length, 3, 'The right click events were received');

    swatch.removeEventListener(InlineEditor.ColorSwatch.ClickEvent.eventName, onClick);

    dispatchClickEvent(target);
    assert.strictEqual(swatchClickEventsReceived.length, 3, 'No more click events received after removing listener');
  });

  it('does not dispatch an event on click when it is readonly', () => {
    const swatch = createSwatch('red');
    swatch.setReadonly(true);
    const target = getClickTarget(swatch);

    const swatchClickEventsReceived: Event[] = [];
    const onClick = (e: Event) => {
      swatchClickEventsReceived.push(e);
    };
    swatch.addEventListener(InlineEditor.ColorSwatch.ClickEvent.eventName, onClick);

    dispatchClickEvent(target);
    dispatchClickEvent(target);
    dispatchClickEvent(target);
    assert.strictEqual(swatchClickEventsReceived.length, 0, 'No click events received for readonly color swatch');
  });

  it('does not dispatch a swatch-click event on shift-click', () => {
    const contextMenuShow = sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show').resolves();
    const swatch = createSwatch('red');
    const target = getClickTarget(swatch);

    const swatchClickEventsReceived: Event[] = [];
    const onClick = (e: Event) => {
      swatchClickEventsReceived.push(e);
    };
    swatch.addEventListener(InlineEditor.ColorSwatch.ClickEvent.eventName, onClick);

    dispatchClickEvent(target, {shiftKey: true});
    dispatchClickEvent(target, {shiftKey: true});
    dispatchClickEvent(target, {shiftKey: true});

    assert.strictEqual(swatchClickEventsReceived.length, 0, 'No swatch-click events are received on shift-click');

    swatch.removeEventListener(InlineEditor.ColorSwatch.ClickEvent.eventName, onClick);
    assert.isTrue(contextMenuShow.calledThrice);
  });

  it('does not dispatch a formatchanged event on click', () => {
    const swatch = createSwatch('red');
    const target = getClickTarget(swatch);

    const formatChangedEventsReceived: InlineEditor.ColorSwatch.ColorChangedEvent[] = [];
    const onClick = (e: InlineEditor.ColorSwatch.ColorChangedEvent) => {
      formatChangedEventsReceived.push(e);
    };
    swatch.addEventListener(InlineEditor.ColorSwatch.ColorChangedEvent.eventName, onClick);

    dispatchClickEvent(target);
    dispatchClickEvent(target);
    dispatchClickEvent(target);

    assert.strictEqual(formatChangedEventsReceived.length, 0, 'No formatchanged events are received on click');

    swatch.removeEventListener(InlineEditor.ColorSwatch.ColorChangedEvent.eventName, onClick);
  });

  it('produces a color conversion menu', () => {
    const menuEntries: string[] = [];
    sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show').resolves();
    sinon.stub(UI.ContextMenu.Section.prototype, 'appendItem').callsFake((label: string): UI.ContextMenu.Item => {
      menuEntries.push(label);
      return new UI.ContextMenu.Item(null, 'item');
    });

    // Without alpha:
    const swatch = createSwatch('#ff0000');
    const target = getClickTarget(swatch);
    dispatchClickEvent(target, {shiftKey: true});
    assert.deepEqual(menuEntries, [
      'red',
      // HEX is skipped because it is the input format
      '#f00',
      'rgb(255 0 0)',
      'hsl(0deg 100% 50%)',
      'hwb(0deg 0% 0%)',
      'lch(54 106.85 40.86)',
      'oklch(0.63 0.26 29.23)',
      'lab(54 80.82 69.9)',
      'oklab(0.63 0.22 0.13)',
      'color(srgb 1 0 0)',
      'color(srgb-linear 1 0 0)',
      'color(display-p3 0.92 0.2 0.14)',
      'color(a98-rgb 0.86 0 0)',
      'color(prophoto-rgb 0.7 0.28 0.1)',
      'color(rec2020 0.79 0.23 0.07)',
      'color(xyz 0.41 0.21 0.02)',
      'color(xyz-d50 0.44 0.22 0.01)',
      'color(xyz-d65 0.41 0.21 0.02)',
    ]);

    // With alpha:
    menuEntries.splice(0);
    swatch.renderColor('#ff000080');
    dispatchClickEvent(target, {shiftKey: true});

    assert.deepEqual(menuEntries, [
      // HEXA is skipped because it's the input
      'rgb(255 0 0 / 50%)',
      'hsl(0deg 100% 50% / 50.2%)',
      'hwb(0deg 0% 0% / 50.2%)',
      'lch(54 106.85 40.86 / 0.5)',
      'oklch(0.63 0.26 29.23 / 0.5)',
      'lab(54 80.82 69.9 / 0.5)',
      'oklab(0.63 0.22 0.13 / 0.5)',
      'color(srgb 1 0 0 / 0.5)',
      'color(srgb-linear 1 0 0 / 0.5)',
      'color(display-p3 0.92 0.2 0.14 / 0.5)',
      'color(a98-rgb 0.86 0 0 / 0.5)',
      'color(prophoto-rgb 0.7 0.28 0.1 / 0.5)',
      'color(rec2020 0.79 0.23 0.07 / 0.5)',
      'color(xyz 0.41 0.21 0.02 / 0.5)',
      'color(xyz-d50 0.44 0.22 0.01 / 0.5)',
      'color(xyz-d65 0.41 0.21 0.02 / 0.5)',
    ]);

    // With alpha:
    menuEntries.splice(0);
    swatch.renderColor('lab(54.29 80.82 69.9 / 0.5)');
    dispatchClickEvent(target, {shiftKey: true});

    assert.deepEqual(menuEntries, [
      '#ff000080',
      'rgb(255 0 0 / 50%)',
      'hsl(360deg 100% 50% / 50%)',
      'hwb(360deg 0% 0% / 50%)',
      'lch(54 106.85 40.86 / 0.5)',
      'oklch(0.63 0.26 29.23 / 0.5)',
      //  'lab(54.29 80.82 69.9 / 0.5)',
      'oklab(0.63 0.22 0.13 / 0.5)',
      'color(srgb 1 0 0 / 0.5)',
      'color(srgb-linear 1 0 0 / 0.5)',
      'color(display-p3 0.92 0.2 0.14 / 0.5)',
      'color(a98-rgb 0.86 0 0 / 0.5)',
      'color(prophoto-rgb 0.7 0.28 0.1 / 0.5)',
      'color(rec2020 0.79 0.23 0.07 / 0.5)',
      'color(xyz 0.41 0.21 0.02 / 0.5)',
      'color(xyz-d50 0.44 0.22 0.01 / 0.5)',
      'color(xyz-d65 0.41 0.21 0.02 / 0.5)',
    ]);
  });

  it('does not produce a color conversion menu when it is readonly', () => {
    const showContextMenuStub = sinon.stub(UI.ContextMenu.ContextMenu.prototype, 'show');

    const swatch = createSwatch('#ff0000');
    swatch.setReadonly(true);
    const target = getClickTarget(swatch);
    dispatchClickEvent(target, {shiftKey: true});
    assert.isTrue(showContextMenuStub.notCalled);
  });
});
