// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../front_end/common/common.js';
import {ColorSwatch, FormatChangedEvent} from '../../../../front_end/inline_editor/ColorSwatch.js';
import {assertElement, assertNotNull, assertShadowRoot, dispatchClickEvent, renderElementIntoDOM} from '../helpers/DOMHelpers.js';

const {assert} = chai;

function assertSwatch(
    swatch: ColorSwatch, expected: {backgroundColor?: string, colorTextInSlot?: string, tooltip?: string}) {
  assertShadowRoot(swatch.shadowRoot);

  const swatchEl = swatch.shadowRoot.querySelector('.color-swatch');
  const swatchInnerEl = swatch.shadowRoot.querySelector('.color-swatch-inner');
  const slotEl = swatch.shadowRoot.querySelector('slot');
  assertElement(swatchEl, HTMLElement);
  assertElement(swatchInnerEl, HTMLElement);
  assertNotNull(slotEl);

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
  const swatch = new ColorSwatch();
  renderElementIntoDOM(swatch);
  swatch.renderColor(color, formatOrUseUserSetting, tooltip);
  return swatch;
}

function getClickTarget(swatch: ColorSwatch) {
  assertNotNull(swatch.shadowRoot);
  return swatch.shadowRoot.querySelector('.color-swatch-inner') as HTMLElement;
}

describe('ColorSwatch', () => {
  it('accepts colors as text', () => {
    const swatch = createSwatch('red');

    assertSwatch(swatch, {
      backgroundColor: 'red',
      colorTextInSlot: 'red',
    });
  });

  it('accepts colors as color objects', () => {
    const swatch = createSwatch(Common.Color.Color.parse('red') as Common.Color.Color);

    assertSwatch(swatch, {
      backgroundColor: 'red',
      colorTextInSlot: 'red',
    });

    swatch.renderColor(new Common.Color.Color([1, .5, .2, .5], Common.Color.Format.RGBA));

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
    assertSwatch(swatch, {colorTextInSlot: 'rgb(255 0 0)'});

    swatch.renderColor(new Common.Color.Color([1, .5, .2, .5], Common.Color.Format.HSLA), Common.Color.Format.RGB);
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

  it('cycles through color format on shift-click', () => {
    const swatch = createSwatch('red');
    assertSwatch(swatch, {colorTextInSlot: 'red'});

    const target = getClickTarget(swatch);

    dispatchClickEvent(target);
    assertSwatch(swatch, {colorTextInSlot: 'red'});

    dispatchClickEvent(target, {shiftKey: true});
    assertSwatch(swatch, {colorTextInSlot: '#f00'});
    dispatchClickEvent(target, {shiftKey: true});
    assertSwatch(swatch, {colorTextInSlot: '#ff0000'});
    dispatchClickEvent(target, {shiftKey: true});
    assertSwatch(swatch, {colorTextInSlot: 'red'});
    dispatchClickEvent(target, {shiftKey: true});
    assertSwatch(swatch, {colorTextInSlot: 'rgb(255 0 0)'});
    dispatchClickEvent(target, {shiftKey: true});
    assertSwatch(swatch, {colorTextInSlot: 'hsl(0deg 100% 50%)'});
    dispatchClickEvent(target, {shiftKey: true});
    assertSwatch(swatch, {colorTextInSlot: 'red'});
  });

  it('dispatches an event when the format changes', () => {
    const swatch = createSwatch('red');
    const target = getClickTarget(swatch);

    let currentFormat = swatch.format;
    swatch.addEventListener('format-changed', (e: Event) => {
      currentFormat = (e as FormatChangedEvent).data.format;
    });

    assert.strictEqual(currentFormat, Common.Color.Format.Nickname);

    dispatchClickEvent(target, {shiftKey: true});
    assert.strictEqual(currentFormat, Common.Color.Format.ShortHEX);
  });

  it('dispatches an event on clicks', () => {
    const swatch = createSwatch('red');
    const target = getClickTarget(swatch);

    const clickEventsReceived: Event[] = [];
    const onClick = (e: Event) => {
      clickEventsReceived.push(e);
    };
    swatch.addEventListener('swatch-click', onClick);

    dispatchClickEvent(target);
    dispatchClickEvent(target);
    dispatchClickEvent(target);
    assert.strictEqual(clickEventsReceived.length, 3, 'The right click events were received');

    swatch.removeEventListener('swatch-click', onClick);

    dispatchClickEvent(target);
    assert.strictEqual(clickEventsReceived.length, 3, 'No more click events received after removing listener');
  });
});
