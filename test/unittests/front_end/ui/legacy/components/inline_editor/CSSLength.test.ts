// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as InlineEditor from '../../../../../../../front_end/ui/legacy/components/inline_editor/inline_editor.js';
import {assertShadowRoot, renderElementIntoDOM} from '../../../../helpers/DOMHelpers.js';

const {assert} = chai;

const initialData = {
  lengthText: '42px',
  overloaded: false,
};

describe('CSSLength', () => {
  it('can render CSSLength component correctly', () => {
    const component = new InlineEditor.CSSLength.CSSLength();
    renderElementIntoDOM(component);
    component.data = initialData;

    assertShadowRoot(component.shadowRoot);
    const valueElement = component.shadowRoot.querySelector('.value');
    const unitElement = component.shadowRoot.querySelector('.unit');
    if (!valueElement || !unitElement) {
      assert.fail('CSSLength component is not rendered correctly');
      return;
    }
    assert.strictEqual(valueElement.textContent, '42', 'CSSLength value content is not rendered correctly');
    assert.strictEqual(unitElement.textContent, 'px', 'CSSLength unit content is not rendered correctly');
  });

  it('can +/- length values when the value is dragged', async () => {
    const component = new InlineEditor.CSSLength.CSSLength();
    renderElementIntoDOM(component);
    component.data = initialData;

    assertShadowRoot(component.shadowRoot);

    let lengthText = initialData.lengthText;
    component.addEventListener('valuechanged', (event: Event) => {
      const {data} = event as InlineEditor.InlineEditorUtils.ValueChangedEvent;
      lengthText = data.value;
    });

    const lengthValueElement = component.shadowRoot.querySelector('.value');
    if (!lengthValueElement) {
      assert.fail('length value element was not rendered');
      return;
    }

    let mousePositionX = 1;
    lengthValueElement.dispatchEvent(new MouseEvent('mousedown', {clientX: mousePositionX}));
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
        lengthText, '33.1px', 'length value should decrease by 10 when the mouse is dragged to left with shift key');
  });

  describe('#CSSLengthUtils', () => {
    it('parses CSS properties with length correctly', () => {
      assert.deepEqual(
          InlineEditor.CSSLengthUtils.parseText('42px'),
          {value: 42, unit: InlineEditor.CSSLengthUtils.LengthUnit.PIXEL});
      assert.deepEqual(
          InlineEditor.CSSLengthUtils.parseText('-5vw'), {value: -5, unit: InlineEditor.CSSLengthUtils.LengthUnit.VW});
      assert.deepEqual(InlineEditor.CSSLengthUtils.parseText('42'), null);
      assert.deepEqual(InlineEditor.CSSLengthUtils.parseText(''), null);
    });
  });
});
