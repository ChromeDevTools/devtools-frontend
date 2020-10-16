// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {CSSAngle, CSSAngleData, PopoverToggledEvent} from '../../../../front_end/elements/CSSAngle.js';
import {AngleUnit, getAngleFromDegree, parseText, roundAngleByUnit} from '../../../../front_end/elements/CSSAngleUtils.js';
import {assertShadowRoot, renderElementIntoDOM} from '../helpers/DOMHelpers.js';

const {assert} = chai;

const assertPopoverOpen = (root: ShadowRoot) => {
  const popover = root.querySelector('.popover');
  assert.exists(popover);
};

const assertPopoverClosed = (root: ShadowRoot) => {
  const popover = root.querySelector('.popover');
  assert.notExists(popover);
};

const togglePopover = (root: ShadowRoot) => {
  const miniIcon = root.querySelector<HTMLElement>('.mini-icon');
  if (!miniIcon) {
    assert.fail('mini icon was not rendered');
    return;
  }
  miniIcon.dispatchEvent(new Event('mousedown'));
};

const initialData: CSSAngleData = {
  propertyText: '45deg',
  containingPane: document.createElement('div'),
};

describe('CSSAngle', () => {
  it('can open and close a popover', () => {
    const component = new CSSAngle();
    renderElementIntoDOM(component);
    component.data = initialData;

    assertShadowRoot(component.shadowRoot);

    assertPopoverClosed(component.shadowRoot);
    togglePopover(component.shadowRoot);
    assertPopoverOpen(component.shadowRoot);
    togglePopover(component.shadowRoot);
    assertPopoverClosed(component.shadowRoot);
  });

  it('can fire events when toggling the popover', () => {
    const component = new CSSAngle();
    renderElementIntoDOM(component);
    let isPopoverOpen = false;
    component.data = initialData;

    component.addEventListener('popover-toggled', (event: Event) => {
      const popoverToggledEvent = event as PopoverToggledEvent;
      isPopoverOpen = popoverToggledEvent.data.open;
    });

    assertShadowRoot(component.shadowRoot);

    assertPopoverClosed(component.shadowRoot);
    togglePopover(component.shadowRoot);
    assertPopoverOpen(component.shadowRoot);
    assert.isTrue(isPopoverOpen, 'external isPopoverOpen flag not synced');
    togglePopover(component.shadowRoot);
    assertPopoverClosed(component.shadowRoot);
    assert.isFalse(isPopoverOpen, 'external isPopoverOpen flag not synced');
  });

  describe('#CSSAngleUtils', () => {
    it('can fire PopoverToggledEvent when toggling the popover', () => {
      const component = new CSSAngle();
      renderElementIntoDOM(component);
      let shouldPopoverEventBeOpen = false;
      component.data = initialData;
      component.addEventListener('popover-toggled', (event: Event) => {
        const popoverEvent = event as PopoverToggledEvent;
        assert.strictEqual(popoverEvent.data.open, shouldPopoverEventBeOpen);
      });

      assertShadowRoot(component.shadowRoot);

      assertPopoverClosed(component.shadowRoot);
      shouldPopoverEventBeOpen = true;
      togglePopover(component.shadowRoot);
      shouldPopoverEventBeOpen = false;
      togglePopover(component.shadowRoot);
    });

    it('parses CSS properties with angles correctly', () => {
      assert.deepEqual(parseText('rotate(45deg)'), {value: 45, unit: AngleUnit.Deg});
      assert.deepEqual(parseText('linear-gradient(10.5grad, black, white)'), {value: 10.5, unit: AngleUnit.Grad});
      assert.deepEqual(parseText('rotate3d(2, -1, -1, -0.2rad);'), {value: -0.2, unit: AngleUnit.Rad});
      assert.deepEqual(parseText('hue-rotate(1.5turn)'), {value: 1.5, unit: AngleUnit.Turn});
      assert.deepEqual(parseText('rotate(12345)'), null);
      assert.deepEqual(parseText(''), null);
      // TODO(changhaohan): crbug.com/1138628 handle unitless 0 case
      assert.deepEqual(parseText('rotate(0)'), null);
    });

    it('converts angles in degree to other units correctly', () => {
      assert.strictEqual(getAngleFromDegree(45, AngleUnit.Grad), 50);
      assert.strictEqual(getAngleFromDegree(45, AngleUnit.Rad), 0.7853981633974483);
      assert.strictEqual(getAngleFromDegree(45, AngleUnit.Turn), 0.125);
      assert.strictEqual(getAngleFromDegree(45, AngleUnit.Deg), 45);
    });

    it('rounds angles by units correctly', () => {
      assert.strictEqual(roundAngleByUnit(45.723, AngleUnit.Deg), 46);
      assert.strictEqual(roundAngleByUnit(45.723, AngleUnit.Grad), 46);
      assert.strictEqual(roundAngleByUnit(45.723, AngleUnit.Rad), 45.723);
      assert.strictEqual(roundAngleByUnit(45.723275, AngleUnit.Rad), 45.7233);
      assert.strictEqual(roundAngleByUnit(45.723275, AngleUnit.Turn), 45.72);
      assert.strictEqual(roundAngleByUnit(45.8, AngleUnit.Turn), 45.8);
    });
  });
});
