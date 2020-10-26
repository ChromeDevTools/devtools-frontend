// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {findIcon, getPhysicalFlexDirections, PhysicalFlexDirection, reverseDirection, rotateFlexDirectionIcon} from '../../../../front_end/elements/CSSPropertyIconResolver.js';

const {assert} = chai;

describe('CSSPropertyIconResolver', () => {
  function mapFromStyle(style: {[key: string]: string|undefined}) {
    const result = new Map();
    for (const key of Object.keys(style)) {
      result.set(key, style[key]);
    }
    return result;
  }


  it('can computed actual directions for row and column', () => {
    const tests = [
      {
        style: {
          'direction': 'ltr',
        },
        expected: {
          row: PhysicalFlexDirection.LEFT_TO_RIGHT,
          column: PhysicalFlexDirection.TOP_TO_BOTTOM,
          'row-reverse': PhysicalFlexDirection.RIGHT_TO_LEFT,
          'column-reverse': PhysicalFlexDirection.BOTTOM_TO_TOP,
        },
      },
      {
        style: {
          'direction': 'ltr',
          'writing-mode': 'vertical-rl',
        },
        expected: {
          row: PhysicalFlexDirection.TOP_TO_BOTTOM,
          column: PhysicalFlexDirection.RIGHT_TO_LEFT,
          'row-reverse': PhysicalFlexDirection.BOTTOM_TO_TOP,
          'column-reverse': PhysicalFlexDirection.LEFT_TO_RIGHT,
        },
      },
      {
        style: {
          'direction': 'ltr',
          'writing-mode': 'vertical-lr',
        },
        expected: {
          row: PhysicalFlexDirection.TOP_TO_BOTTOM,
          column: PhysicalFlexDirection.LEFT_TO_RIGHT,
          'row-reverse': PhysicalFlexDirection.BOTTOM_TO_TOP,
          'column-reverse': PhysicalFlexDirection.RIGHT_TO_LEFT,
        },
      },
      {
        style: {
          'direction': 'ltr',
          'writing-mode': 'tb',
        },
        expected: {
          row: PhysicalFlexDirection.TOP_TO_BOTTOM,
          column: PhysicalFlexDirection.RIGHT_TO_LEFT,
          'row-reverse': PhysicalFlexDirection.BOTTOM_TO_TOP,
          'column-reverse': PhysicalFlexDirection.LEFT_TO_RIGHT,
        },
      },
      {
        style: {
          'direction': 'ltr',
          'writing-mode': 'tb-rl',
        },
        expected: {
          row: PhysicalFlexDirection.TOP_TO_BOTTOM,
          column: PhysicalFlexDirection.RIGHT_TO_LEFT,
          'row-reverse': PhysicalFlexDirection.BOTTOM_TO_TOP,
          'column-reverse': PhysicalFlexDirection.LEFT_TO_RIGHT,
        },
      },
      {
        style: {
          'direction': 'rtl',
        },
        expected: {
          row: PhysicalFlexDirection.RIGHT_TO_LEFT,
          column: PhysicalFlexDirection.TOP_TO_BOTTOM,
          'row-reverse': PhysicalFlexDirection.LEFT_TO_RIGHT,
          'column-reverse': PhysicalFlexDirection.BOTTOM_TO_TOP,
        },
      },
      {
        style: {
          'direction': 'rtl',
          'writing-mode': 'vertical-rl',
        },
        expected: {
          row: PhysicalFlexDirection.BOTTOM_TO_TOP,
          column: PhysicalFlexDirection.RIGHT_TO_LEFT,
          'row-reverse': PhysicalFlexDirection.TOP_TO_BOTTOM,
          'column-reverse': PhysicalFlexDirection.LEFT_TO_RIGHT,
        },
      },
      {
        style: {
          'direction': 'rtl',
          'writing-mode': 'vertical-lr',
        },
        expected: {
          row: PhysicalFlexDirection.BOTTOM_TO_TOP,
          column: PhysicalFlexDirection.LEFT_TO_RIGHT,
          'row-reverse': PhysicalFlexDirection.TOP_TO_BOTTOM,
          'column-reverse': PhysicalFlexDirection.RIGHT_TO_LEFT,
        },
      },
      {
        style: {
          'direction': 'rtl',
          'writing-mode': 'tb',
        },
        expected: {
          row: PhysicalFlexDirection.BOTTOM_TO_TOP,
          column: PhysicalFlexDirection.RIGHT_TO_LEFT,
          'row-reverse': PhysicalFlexDirection.TOP_TO_BOTTOM,
          'column-reverse': PhysicalFlexDirection.LEFT_TO_RIGHT,
        },
      },
      {
        style: {
          'direction': 'rtl',
          'writing-mode': 'tb-rl',
        },
        expected: {
          row: PhysicalFlexDirection.BOTTOM_TO_TOP,
          column: PhysicalFlexDirection.RIGHT_TO_LEFT,
          'row-reverse': PhysicalFlexDirection.TOP_TO_BOTTOM,
          'column-reverse': PhysicalFlexDirection.LEFT_TO_RIGHT,
        },
      },
    ];

    for (const test of tests) {
      assert.deepEqual(
          getPhysicalFlexDirections(mapFromStyle(test.style)), test.expected,
          `Test ${JSON.stringify(test.style)} failed.`);
    }
  });

  it('can rotate the icon', () => {
    assert.deepEqual(rotateFlexDirectionIcon(PhysicalFlexDirection.LEFT_TO_RIGHT), {
      iconName: 'flex-direction-icon',
      rotate: -90,
      scaleX: -1,
      scaleY: 1,
    });
    assert.deepEqual(rotateFlexDirectionIcon(PhysicalFlexDirection.RIGHT_TO_LEFT), {
      iconName: 'flex-direction-icon',
      rotate: 90,
      scaleX: 1,
      scaleY: 1,
    });
    assert.deepEqual(rotateFlexDirectionIcon(PhysicalFlexDirection.TOP_TO_BOTTOM), {
      iconName: 'flex-direction-icon',
      rotate: 0,
      scaleX: 1,
      scaleY: 1,
    });
    assert.deepEqual(rotateFlexDirectionIcon(PhysicalFlexDirection.BOTTOM_TO_TOP), {
      iconName: 'flex-direction-icon',
      rotate: 0,
      scaleX: 1,
      scaleY: -1,
    });
  });

  it('can find an icon for flex-direction row', () => {
    const tests = [
      {
        style: {
          'direction': 'ltr',
        },
        expected: PhysicalFlexDirection.LEFT_TO_RIGHT,
      },
      {
        style: {
          'direction': 'ltr',
          'writing-mode': 'tb',
        },
        expected: PhysicalFlexDirection.TOP_TO_BOTTOM,
      },
      {
        style: {
          'direction': 'ltr',
          'writing-mode': 'vertical-lr',
        },
        expected: PhysicalFlexDirection.TOP_TO_BOTTOM,
      },
      {
        style: {
          'direction': 'ltr',
          'writing-mode': 'vertical-rl',
        },
        expected: PhysicalFlexDirection.TOP_TO_BOTTOM,
      },
      {
        style: {
          'direction': 'ltr',
          'writing-mode': 'tb-rl',
        },
        expected: PhysicalFlexDirection.TOP_TO_BOTTOM,
      },
      {
        style: {
          'direction': 'rtl',
        },
        expected: PhysicalFlexDirection.RIGHT_TO_LEFT,
      },
      {
        style: {
          'direction': 'rtl',
          'writing-mode': 'tb',
        },
        expected: PhysicalFlexDirection.BOTTOM_TO_TOP,
      },
      {
        style: {
          'direction': 'rtl',
          'writing-mode': 'vertical-lr',
        },
        expected: PhysicalFlexDirection.BOTTOM_TO_TOP,
      },
      {
        style: {
          'direction': 'rtl',
          'writing-mode': 'vertical-rl',
        },
        expected: PhysicalFlexDirection.BOTTOM_TO_TOP,
      },
      {
        style: {
          'direction': 'rtl',
          'writing-mode': 'tb-rl',
        },
        expected: PhysicalFlexDirection.BOTTOM_TO_TOP,
      },
    ];
    for (const test of tests) {
      assert.deepEqual(
          findIcon('flex-direction: row', mapFromStyle(test.style)), rotateFlexDirectionIcon(test.expected),
          `Test 'flex-direction: row'(${JSON.stringify(test.style)}) failed.`);

      assert.deepEqual(
          findIcon('flex-direction: row-reverse', mapFromStyle(test.style)),
          rotateFlexDirectionIcon(reverseDirection(test.expected)),
          `Test 'flex-direction: row-reverse'(${JSON.stringify(test.style)}) failed.`);
    }
  });

  it('can find an icon for flex-direction: column and column-reverse', () => {
    const tests = [
      {
        style: {
          'direction': 'ltr',
        },
        expected: PhysicalFlexDirection.TOP_TO_BOTTOM,
      },
      {
        style: {
          'writing-mode': 'vertical-rl',
        },
        expected: PhysicalFlexDirection.RIGHT_TO_LEFT,
      },
      {
        style: {
          'writing-mode': 'vertical-lr',
        },
        expected: PhysicalFlexDirection.LEFT_TO_RIGHT,
      },
    ];

    for (const test of tests) {
      assert.deepEqual(
          findIcon('flex-direction: column', mapFromStyle(test.style)), rotateFlexDirectionIcon(test.expected),
          `Test 'flex-direction: column'(${JSON.stringify(test.style)}) failed.`);

      assert.deepEqual(
          findIcon('flex-direction: column-reverse', mapFromStyle(test.style)),
          rotateFlexDirectionIcon(reverseDirection(test.expected)),
          `Test 'flex-direction: column-reverse'(${JSON.stringify(test.style)}) failed.`);
    }
  });
});
