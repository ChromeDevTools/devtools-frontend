// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {_getPositionFromLabelType, _getLabelType, LabelTypes} from '../../../inspector_overlay/tool_source_order_impl.js';

const positionTypes = Object.values(LabelTypes);
const labelHeight = 22;
const labelWidth = 27;
const defaultBounds = {
  minX: 100,
  minY: 100,
  maxX: 200,
  maxY: 200,
};

describe('_getPositionFromLabelType', () => {
  type positionId = 'to'|'ab'|'be'|'bo';
  const expectedPositions = {
    'to': defaultBounds.minY,
    'ab': defaultBounds.minY - labelHeight,
    'be': defaultBounds.maxY,
    'bo': defaultBounds.maxY - labelHeight,
  };

  for (const positionType of positionTypes) {
    it('can place ' + positionType, () => {
      const position = _getPositionFromLabelType(positionType, defaultBounds, labelHeight);
      const positionId = positionType.slice(0, 2);

      assert.strictEqual(
          position.contentTop, expectedPositions[<positionId>positionId], 'incorrect offset from the top of the page');
      assert.strictEqual(position.contentLeft, defaultBounds.minX, 'incorrect offset from the left of the page');
    });
  }
});

describe('_getLabelType', () => {
  const thinBounds = {minX: 100, minY: 100, maxX: 110, maxY: 200};
  const shortBounds = {minX: 100, minY: 100, maxX: 200, maxY: 110};
  const canvasHeight = 1000;

  const TESTS = [
    {
      description: 'can assign topCorner type when the associated element is large enough',
      bounds: defaultBounds,
      overlap: false,
      expectedType: LabelTypes.topCorner,
    },
    {
      description: 'can assign aboveElementWider type when the label is wider than the associated element',
      bounds: thinBounds,
      overlap: false,
      expectedType: LabelTypes.aboveElementWider,
    },
    {
      description: 'can assign aboveElement type when the label is taller than the associated element',
      bounds: shortBounds,
      overlap: false,
      expectedType: LabelTypes.aboveElement,
    },
    {
      description:
          'can assign belowElementWider type when a label in the above-element postition would extend off the page and the label is wider than the associated element',
      bounds: {minX: 100, minY: 0, maxX: 110, maxY: 200},
      overlap: false,
      expectedType: LabelTypes.belowElementWider,
    },
    {
      description:
          'can assign below-element type when a label in the above-element postition would overlap with another label and the label is wider than the associated element',
      bounds: thinBounds,
      overlap: true,
      expectedType: LabelTypes.belowElementWider,
    },
    {
      description: 'can assign belowElement type when a label in the above-element postition would extend off the page',
      bounds: {minX: 100, minY: 0, maxX: 200, maxY: 10},
      overlap: false,
      expectedType: LabelTypes.belowElement,
    },
    {
      description:
          'can assign below-element type when a label in the above-element postition would overlap with another label',
      bounds: shortBounds,
      overlap: true,
      expectedType: LabelTypes.belowElement,
    },
    {
      description:
          'can assign bottomCornerWider type when a label in the below-element position would extend off the page and the label is wider than the associated element',
      bounds: {minX: 100, minY: canvasHeight - 100, maxX: 110, maxY: canvasHeight},
      overlap: true,
      expectedType: LabelTypes.bottomCornerWider,
    },
    {
      description:
          'can assign bottomCornerTaller type when a label in the below-element position would extend off the page and the label is taller than the associated element',
      bounds: {minX: 100, minY: canvasHeight - 10, maxX: 200, maxY: canvasHeight},
      overlap: true,
      expectedType: LabelTypes.bottomCornerTaller,
    },
    {
      description:
          'can assign bottomCornerWiderTaller type when a label in the below-element position would extend off the page and the label is both wider and taller than the associated element',
      bounds: {minX: 100, minY: canvasHeight - 10, maxX: 110, maxY: canvasHeight},
      overlap: true,
      expectedType: LabelTypes.bottomCornerWiderTaller,
    },
  ];

  for (const {description, bounds, overlap, expectedType} of TESTS) {
    it(description, () => {
      const otherLabelsCollection = <HTMLCollectionOf<HTMLElement>><unknown>[];
      if (overlap) {
        const y = bounds.minY - labelHeight;
        const overlappingLabel = <HTMLElement><unknown>{
          getBoundingClientRect: () => {
            return new DOMRect(bounds.minX, y, labelWidth, labelHeight);
          },
          style: {top: bounds.minX + 'px', left: y + 'px'},
        };
        otherLabelsCollection[0] = overlappingLabel;
      }

      const positionType = _getLabelType(bounds, labelHeight, labelWidth, otherLabelsCollection, canvasHeight);
      assert.strictEqual(positionType, expectedType, 'incorrect position type');
    });
  }
});
