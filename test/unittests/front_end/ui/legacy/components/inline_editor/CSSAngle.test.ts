// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as InlineEditor from '../../../../../../../front_end/ui/legacy/components/inline_editor/inline_editor.js';
import {assertShadowRoot, renderElementIntoDOM} from '../../../../helpers/DOMHelpers.js';

const {assert} = chai;

const assertPopoverOpen = (root: ShadowRoot) => {
  const popover = root.querySelector('.popover');
  assert.exists(popover);
};

const assertPopoverClosed = (root: ShadowRoot) => {
  const popover = root.querySelector('.popover');
  assert.notExists(popover);
};

const assertAndGetSwatch = (root: ShadowRoot) => {
  const swatch = root.querySelector<HTMLElement>('devtools-css-angle-swatch');
  if (!swatch) {
    assert.fail('swatch was not rendered');
    return;
  }
  return swatch;
};

const togglePopover = (root: ShadowRoot) => {
  const swatch = assertAndGetSwatch(root);
  swatch?.click();
};

const assertNewAngleFromEvent =
    (angle: InlineEditor.CSSAngleUtils.Angle, event: KeyboardEvent|MouseEvent, approximateNewValue: number) => {
      const newAngle = InlineEditor.CSSAngleUtils.getNewAngleFromEvent(angle, event);
      if (!newAngle) {
        assert.fail('should create a new angle');
        return;
      }

      assert.strictEqual(newAngle.unit, angle.unit);
      assert.approximately(newAngle.value, approximateNewValue, 0.1);
    };

const initialData: InlineEditor.CSSAngle.CSSAngleData = {
  propertyName: 'background',
  propertyValue: 'linear-gradient(45deg, red, green)',
  angleText: '45deg',
  containingPane: document.createElement('div'),
};

describe('CSSAngle', () => {
  it('can open and close a popover', () => {
    const component = new InlineEditor.CSSAngle.CSSAngle();
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
    const component = new InlineEditor.CSSAngle.CSSAngle();
    renderElementIntoDOM(component);
    let isPopoverOpen = false;
    component.data = initialData;

    component.addEventListener('popovertoggled', (event: Event) => {
      const popoverToggledEvent = event as InlineEditor.CSSAngle.PopoverToggledEvent;
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

  it('can change unit when the swatch is shift-clicked upon', () => {
    const component = new InlineEditor.CSSAngle.CSSAngle();
    renderElementIntoDOM(component);
    component.data = initialData;

    assertShadowRoot(component.shadowRoot);

    let cssAngleText = initialData.angleText;
    component.addEventListener('unitchanged', (event: Event) => {
      const {data} = event as InlineEditor.CSSAngle.UnitChangedEvent;
      cssAngleText = data.value;
    });

    const swatch = assertAndGetSwatch(component.shadowRoot);
    if (!swatch) {
      return;
    }
    const shiftClick = new MouseEvent('click', {shiftKey: true});
    swatch.dispatchEvent(shiftClick);
    assert.strictEqual(cssAngleText, '50grad', 'angle unit should change to Grad from Deg');
  });

  it('can +/- angle values when pressing UP or DOWN keys', () => {
    const component = new InlineEditor.CSSAngle.CSSAngle();
    renderElementIntoDOM(component);
    component.data = initialData;

    assertShadowRoot(component.shadowRoot);

    let cssAngleText = initialData.angleText;
    component.addEventListener('valuechanged', (event: Event) => {
      const {data} = event as InlineEditor.InlineEditorUtils.ValueChangedEvent;
      cssAngleText = data.value;
    });

    togglePopover(component.shadowRoot);
    const angleContainer = component.shadowRoot.querySelector('.css-angle');
    if (!angleContainer) {
      assert.fail('angle container was not rendered');
      return;
    }

    const arrowUp = new KeyboardEvent('keydown', {key: 'ArrowUp'});
    angleContainer.dispatchEvent(arrowUp);
    assert.strictEqual(cssAngleText, '46deg', 'angle value should increase by 1 when ArrowUp is pressed');

    const arrowDownShift = new KeyboardEvent('keydown', {key: 'ArrowDown', shiftKey: true});
    angleContainer.dispatchEvent(arrowDownShift);
    assert.strictEqual(cssAngleText, '36deg', 'angle value should increase by 1 when ArrowUp is pressed');
  });

  describe('#CSSAngleUtils', () => {
    it('can fire InlineEditor.CSSAngle.PopoverToggledEvent when toggling the popover', () => {
      const component = new InlineEditor.CSSAngle.CSSAngle();
      renderElementIntoDOM(component);
      let shouldPopoverEventBeOpen = false;
      component.data = initialData;
      component.addEventListener('popovertoggled', (event: Event) => {
        const popoverEvent = event as InlineEditor.CSSAngle.PopoverToggledEvent;
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
      assert.deepEqual(
          InlineEditor.CSSAngleUtils.parseText('rotate(45deg)'),
          {value: 45, unit: InlineEditor.CSSAngleUtils.AngleUnit.Deg});
      assert.deepEqual(
          InlineEditor.CSSAngleUtils.parseText('rotate(calc(45deg))'),
          {value: 45, unit: InlineEditor.CSSAngleUtils.AngleUnit.Deg});
      assert.deepEqual(
          InlineEditor.CSSAngleUtils.parseText('skew(20deg)'),
          {value: 20, unit: InlineEditor.CSSAngleUtils.AngleUnit.Deg});
      assert.deepEqual(
          InlineEditor.CSSAngleUtils.parseText('rotateX(20deg)'),
          {value: 20, unit: InlineEditor.CSSAngleUtils.AngleUnit.Deg});
      assert.deepEqual(
          InlineEditor.CSSAngleUtils.parseText('rotateY(20deg)'),
          {value: 20, unit: InlineEditor.CSSAngleUtils.AngleUnit.Deg});
      assert.deepEqual(
          InlineEditor.CSSAngleUtils.parseText('rotateZ(20deg)'),
          {value: 20, unit: InlineEditor.CSSAngleUtils.AngleUnit.Deg});
      assert.deepEqual(
          InlineEditor.CSSAngleUtils.parseText('rotate3d(1, 1, 1, 20deg)'),
          {value: 20, unit: InlineEditor.CSSAngleUtils.AngleUnit.Deg});
      assert.deepEqual(
          InlineEditor.CSSAngleUtils.parseText('linear-gradient(10.5grad, black, white)'),
          {value: 10.5, unit: InlineEditor.CSSAngleUtils.AngleUnit.Grad});
      assert.deepEqual(
          InlineEditor.CSSAngleUtils.parseText(
              'conic-gradient(black 25%, white 10deg 50%, black 20deg 75%, white 30deg)'),
          {value: 10, unit: InlineEditor.CSSAngleUtils.AngleUnit.Deg});
      assert.deepEqual(
          InlineEditor.CSSAngleUtils.parseText('rotate3d(2, -1, -1, -0.2rad);'),
          {value: -0.2, unit: InlineEditor.CSSAngleUtils.AngleUnit.Rad});
      assert.deepEqual(
          InlineEditor.CSSAngleUtils.parseText('hue-rotate(1.5turn)'),
          {value: 1.5, unit: InlineEditor.CSSAngleUtils.AngleUnit.Turn});
      assert.deepEqual(
          InlineEditor.CSSAngleUtils.parseText('oblique 25deg'),
          {value: 25, unit: InlineEditor.CSSAngleUtils.AngleUnit.Deg});
      assert.deepEqual(
          InlineEditor.CSSAngleUtils.parseText('ray(20.8deg closest-side)'),
          {value: 20.8, unit: InlineEditor.CSSAngleUtils.AngleUnit.Deg});
      assert.deepEqual(InlineEditor.CSSAngleUtils.parseText('rotate(12345)'), null);
      assert.deepEqual(InlineEditor.CSSAngleUtils.parseText(''), null);
      // TODO(changhaohan): crbug.com/1138628 handle unitless 0 case
      assert.deepEqual(InlineEditor.CSSAngleUtils.parseText('rotate(0)'), null);
    });

    it('converts angles in degree to other units correctly', () => {
      assert.deepEqual(
          InlineEditor.CSSAngleUtils.getAngleFromRadians(Math.PI / 4, InlineEditor.CSSAngleUtils.AngleUnit.Grad), {
            value: 50,
            unit: InlineEditor.CSSAngleUtils.AngleUnit.Grad,
          });
      assert.deepEqual(
          InlineEditor.CSSAngleUtils.getAngleFromRadians(Math.PI / 4, InlineEditor.CSSAngleUtils.AngleUnit.Rad), {
            value: Math.PI / 4,
            unit: InlineEditor.CSSAngleUtils.AngleUnit.Rad,
          });
      assert.deepEqual(
          InlineEditor.CSSAngleUtils.getAngleFromRadians(Math.PI / 4, InlineEditor.CSSAngleUtils.AngleUnit.Turn), {
            value: 0.125,
            unit: InlineEditor.CSSAngleUtils.AngleUnit.Turn,
          });
      assert.deepEqual(
          InlineEditor.CSSAngleUtils.getAngleFromRadians(Math.PI / 4, InlineEditor.CSSAngleUtils.AngleUnit.Deg), {
            value: 45,
            unit: InlineEditor.CSSAngleUtils.AngleUnit.Deg,
          });
    });

    it('converts angles in other units to radians correctly', () => {
      assert.strictEqual(
          InlineEditor.CSSAngleUtils.getRadiansFromAngle({
            value: 50,
            unit: InlineEditor.CSSAngleUtils.AngleUnit.Grad,
          }),
          0.7853981633974483);
      assert.strictEqual(
          InlineEditor.CSSAngleUtils.getRadiansFromAngle({
            value: 45,
            unit: InlineEditor.CSSAngleUtils.AngleUnit.Deg,
          }),
          0.7853981633974483);
      assert.strictEqual(
          InlineEditor.CSSAngleUtils.getRadiansFromAngle({
            value: 0.125,
            unit: InlineEditor.CSSAngleUtils.AngleUnit.Turn,
          }),
          0.7853981633974483);
      assert.strictEqual(
          InlineEditor.CSSAngleUtils.getRadiansFromAngle({
            value: 1,
            unit: InlineEditor.CSSAngleUtils.AngleUnit.Rad,
          }),
          1);
    });

    it('gets 2D translations for angles correctly', () => {
      assert.deepEqual(
          InlineEditor.CSSAngleUtils.get2DTranslationsForAngle(
              {
                value: 45,
                unit: InlineEditor.CSSAngleUtils.AngleUnit.Deg,
              },
              1),
          {
            translateX: 0.7071067811865475,
            translateY: -0.7071067811865476,
          });
    });

    it('rounds angles by units correctly', () => {
      assert.deepEqual(
          InlineEditor.CSSAngleUtils.roundAngleByUnit({
            value: 45.723,
            unit: InlineEditor.CSSAngleUtils.AngleUnit.Deg,
          }),
          {
            value: 46,
            unit: InlineEditor.CSSAngleUtils.AngleUnit.Deg,
          });
      assert.deepEqual(
          InlineEditor.CSSAngleUtils.roundAngleByUnit({
            value: 45.723,
            unit: InlineEditor.CSSAngleUtils.AngleUnit.Grad,
          }),
          {
            value: 46,
            unit: InlineEditor.CSSAngleUtils.AngleUnit.Grad,
          });
      assert.deepEqual(
          InlineEditor.CSSAngleUtils.roundAngleByUnit({
            value: 45.723,
            unit: InlineEditor.CSSAngleUtils.AngleUnit.Rad,
          }),
          {
            value: 45.723,
            unit: InlineEditor.CSSAngleUtils.AngleUnit.Rad,
          });
      assert.deepEqual(
          InlineEditor.CSSAngleUtils.roundAngleByUnit({
            value: 45.723275,
            unit: InlineEditor.CSSAngleUtils.AngleUnit.Rad,
          }),
          {
            value: 45.7233,
            unit: InlineEditor.CSSAngleUtils.AngleUnit.Rad,
          });
      assert.deepEqual(
          InlineEditor.CSSAngleUtils.roundAngleByUnit({
            value: 45.723275,
            unit: InlineEditor.CSSAngleUtils.AngleUnit.Turn,
          }),
          {
            value: 45.72,
            unit: InlineEditor.CSSAngleUtils.AngleUnit.Turn,
          });
      assert.deepEqual(
          InlineEditor.CSSAngleUtils.roundAngleByUnit({
            value: 45.8,
            unit: InlineEditor.CSSAngleUtils.AngleUnit.Turn,
          }),
          {
            value: 45.8,
            unit: InlineEditor.CSSAngleUtils.AngleUnit.Turn,
          });
    });

    it('cycles angle units correctly', () => {
      assert.strictEqual(
          InlineEditor.CSSAngleUtils.getNextUnit(InlineEditor.CSSAngleUtils.AngleUnit.Deg),
          InlineEditor.CSSAngleUtils.AngleUnit.Grad);
      assert.strictEqual(
          InlineEditor.CSSAngleUtils.getNextUnit(InlineEditor.CSSAngleUtils.AngleUnit.Grad),
          InlineEditor.CSSAngleUtils.AngleUnit.Rad);
      assert.strictEqual(
          InlineEditor.CSSAngleUtils.getNextUnit(InlineEditor.CSSAngleUtils.AngleUnit.Rad),
          InlineEditor.CSSAngleUtils.AngleUnit.Turn);
      assert.strictEqual(
          InlineEditor.CSSAngleUtils.getNextUnit(InlineEditor.CSSAngleUtils.AngleUnit.Turn),
          InlineEditor.CSSAngleUtils.AngleUnit.Deg);
    });

    it('converts angle units correctly', () => {
      assert.deepEqual(
          InlineEditor.CSSAngleUtils.convertAngleUnit(
              {
                value: 45,
                unit: InlineEditor.CSSAngleUtils.AngleUnit.Deg,
              },
              InlineEditor.CSSAngleUtils.AngleUnit.Grad),
          {
            value: 50,
            unit: InlineEditor.CSSAngleUtils.AngleUnit.Grad,
          });

      assert.deepEqual(
          InlineEditor.CSSAngleUtils.convertAngleUnit(
              {
                value: Math.PI / 180,
                unit: InlineEditor.CSSAngleUtils.AngleUnit.Rad,
              },
              InlineEditor.CSSAngleUtils.AngleUnit.Deg),
          {
            value: 1,
            unit: InlineEditor.CSSAngleUtils.AngleUnit.Deg,
          });

      assert.deepEqual(
          InlineEditor.CSSAngleUtils.convertAngleUnit(
              {
                value: 1,
                unit: InlineEditor.CSSAngleUtils.AngleUnit.Turn,
              },
              InlineEditor.CSSAngleUtils.AngleUnit.Deg),
          {
            value: 360,
            unit: InlineEditor.CSSAngleUtils.AngleUnit.Deg,
          });
    });

    it('gets new angles from events correctly', () => {
      const originalAngle = {
        value: 45,
        unit: InlineEditor.CSSAngleUtils.AngleUnit.Deg,
      };

      const arrowDown = new KeyboardEvent('keydown', {key: 'ArrowDown'});
      const arrowUpShift = new KeyboardEvent('keydown', {key: 'ArrowUp', shiftKey: true});
      const wheelUp = new WheelEvent('wheel', {deltaY: 1});
      const wheelDownShift = new WheelEvent('wheel', {deltaX: -1, shiftKey: true});

      assertNewAngleFromEvent(originalAngle, arrowDown, 44);
      assertNewAngleFromEvent(originalAngle, arrowUpShift, 55);
      assertNewAngleFromEvent(originalAngle, wheelUp, 44);
      assertNewAngleFromEvent(originalAngle, wheelDownShift, 55);

      const otherEvent = new MouseEvent('mousedown');
      assert.notExists(InlineEditor.CSSAngleUtils.getNewAngleFromEvent(originalAngle, otherEvent));
    });
  });
});
