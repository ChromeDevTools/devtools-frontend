// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';

import * as InlineEditor from './inline_editor.js';

describe('CSSLength', () => {
  const {CSSLength} = InlineEditor.CSSLength;

  it('can render CSSLength component correctly', () => {
    const component = new CSSLength();
    renderElementIntoDOM(component);
    component.data = {lengthText: '42rem'};

    assert.strictEqual(component.shadowRoot!.textContent?.trim(), '42rem');
    const valueElement = component.shadowRoot!.querySelector('.value');
    assert.strictEqual(valueElement!.textContent, '42');
  });

  it('correctly preserves lengths in decimal notation', () => {
    const component = new CSSLength();
    renderElementIntoDOM(component);
    component.data = {lengthText: '.0000001px'};

    assert.strictEqual(component.shadowRoot!.textContent?.trim(), '.0000001px');
    const valueElement = component.shadowRoot!.querySelector('.value');
    assert.strictEqual(valueElement!.textContent, '.0000001');
  });

  it('correctly preserves lengths in exponential notation', () => {
    const component = new CSSLength();
    renderElementIntoDOM(component);
    component.data = {lengthText: '1e-7vw'};

    assert.strictEqual(component.shadowRoot!.textContent?.trim(), '1e-7vw');
    const valueElement = component.shadowRoot!.querySelector('.value');
    assert.strictEqual(valueElement!.textContent, '1e-7');
  });

  it('correctly incremenets and decrements lengths via dragging', async () => {
    let lengthText = '42px';

    const component = new CSSLength();
    renderElementIntoDOM(component);
    component.data = {lengthText};
    component.addEventListener('valuechanged', (event: Event) => {
      const {data} = event as InlineEditor.InlineEditorUtils.ValueChangedEvent;
      lengthText = data.value;
    });

    let mousePositionX = 1;
    const valueElement = component.shadowRoot!.querySelector('.value');
    valueElement!.dispatchEvent(new MouseEvent('mousedown', {clientX: mousePositionX}));
    // Wait enough to let CSSLength think it is not a click.
    await new Promise<void>(res => setTimeout(() => res(), 400));

    const mousemoveRight = new MouseEvent('mousemove', {
      clientX: ++mousePositionX,
    });
    document.dispatchEvent(mousemoveRight);
    assert.strictEqual(lengthText, '43px', 'length value should increase by 1 when the mouse is dragged to right');

    const mousemoveLeftShift = new MouseEvent('mousemove', {
      clientX: --mousePositionX,
      shiftKey: true,
    });
    document.dispatchEvent(mousemoveLeftShift);
    assert.strictEqual(
        lengthText, '33px', 'length value should decrease by 10 when the mouse is dragged to left with shift key');

    const mousemoveRightAlt = new MouseEvent('mousemove', {
      clientX: ++mousePositionX,
      altKey: true,
    });
    document.dispatchEvent(mousemoveRightAlt);
    assert.strictEqual(
        lengthText, '33.1px', 'length value should increase by 0.1 when the mouse is dragged to right with alt key');
  });
});
