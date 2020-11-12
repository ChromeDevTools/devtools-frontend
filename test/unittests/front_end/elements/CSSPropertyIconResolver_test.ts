// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ElementsModule from '../../../../front_end/elements/elements.js';
import {describeWithEnvironment} from '../helpers/EnvironmentHelpers.js';

const {assert} = chai;

describeWithEnvironment('CSSPropertyIconResolver', async () => {
  let Elements: typeof ElementsModule;
  before(async () => {
    Elements = await import('../../../../front_end/elements/elements.js');
  });

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
          row: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.LEFT_TO_RIGHT,
          column: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.TOP_TO_BOTTOM,
          'row-reverse': Elements.CSSPropertyIconResolver.PhysicalFlexDirection.RIGHT_TO_LEFT,
          'column-reverse': Elements.CSSPropertyIconResolver.PhysicalFlexDirection.BOTTOM_TO_TOP,
        },
      },
      {
        style: {
          'direction': 'ltr',
          'writing-mode': 'vertical-rl',
        },
        expected: {
          row: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.TOP_TO_BOTTOM,
          column: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.RIGHT_TO_LEFT,
          'row-reverse': Elements.CSSPropertyIconResolver.PhysicalFlexDirection.BOTTOM_TO_TOP,
          'column-reverse': Elements.CSSPropertyIconResolver.PhysicalFlexDirection.LEFT_TO_RIGHT,
        },
      },
      {
        style: {
          'direction': 'ltr',
          'writing-mode': 'vertical-lr',
        },
        expected: {
          row: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.TOP_TO_BOTTOM,
          column: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.LEFT_TO_RIGHT,
          'row-reverse': Elements.CSSPropertyIconResolver.PhysicalFlexDirection.BOTTOM_TO_TOP,
          'column-reverse': Elements.CSSPropertyIconResolver.PhysicalFlexDirection.RIGHT_TO_LEFT,
        },
      },
      {
        style: {
          'direction': 'ltr',
          'writing-mode': 'tb',
        },
        expected: {
          row: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.TOP_TO_BOTTOM,
          column: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.RIGHT_TO_LEFT,
          'row-reverse': Elements.CSSPropertyIconResolver.PhysicalFlexDirection.BOTTOM_TO_TOP,
          'column-reverse': Elements.CSSPropertyIconResolver.PhysicalFlexDirection.LEFT_TO_RIGHT,
        },
      },
      {
        style: {
          'direction': 'ltr',
          'writing-mode': 'tb-rl',
        },
        expected: {
          row: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.TOP_TO_BOTTOM,
          column: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.RIGHT_TO_LEFT,
          'row-reverse': Elements.CSSPropertyIconResolver.PhysicalFlexDirection.BOTTOM_TO_TOP,
          'column-reverse': Elements.CSSPropertyIconResolver.PhysicalFlexDirection.LEFT_TO_RIGHT,
        },
      },
      {
        style: {
          'direction': 'rtl',
        },
        expected: {
          row: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.RIGHT_TO_LEFT,
          column: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.TOP_TO_BOTTOM,
          'row-reverse': Elements.CSSPropertyIconResolver.PhysicalFlexDirection.LEFT_TO_RIGHT,
          'column-reverse': Elements.CSSPropertyIconResolver.PhysicalFlexDirection.BOTTOM_TO_TOP,
        },
      },
      {
        style: {
          'direction': 'rtl',
          'writing-mode': 'vertical-rl',
        },
        expected: {
          row: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.BOTTOM_TO_TOP,
          column: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.RIGHT_TO_LEFT,
          'row-reverse': Elements.CSSPropertyIconResolver.PhysicalFlexDirection.TOP_TO_BOTTOM,
          'column-reverse': Elements.CSSPropertyIconResolver.PhysicalFlexDirection.LEFT_TO_RIGHT,
        },
      },
      {
        style: {
          'direction': 'rtl',
          'writing-mode': 'vertical-lr',
        },
        expected: {
          row: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.BOTTOM_TO_TOP,
          column: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.LEFT_TO_RIGHT,
          'row-reverse': Elements.CSSPropertyIconResolver.PhysicalFlexDirection.TOP_TO_BOTTOM,
          'column-reverse': Elements.CSSPropertyIconResolver.PhysicalFlexDirection.RIGHT_TO_LEFT,
        },
      },
      {
        style: {
          'direction': 'rtl',
          'writing-mode': 'tb',
        },
        expected: {
          row: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.BOTTOM_TO_TOP,
          column: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.RIGHT_TO_LEFT,
          'row-reverse': Elements.CSSPropertyIconResolver.PhysicalFlexDirection.TOP_TO_BOTTOM,
          'column-reverse': Elements.CSSPropertyIconResolver.PhysicalFlexDirection.LEFT_TO_RIGHT,
        },
      },
      {
        style: {
          'direction': 'rtl',
          'writing-mode': 'tb-rl',
        },
        expected: {
          row: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.BOTTOM_TO_TOP,
          column: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.RIGHT_TO_LEFT,
          'row-reverse': Elements.CSSPropertyIconResolver.PhysicalFlexDirection.TOP_TO_BOTTOM,
          'column-reverse': Elements.CSSPropertyIconResolver.PhysicalFlexDirection.LEFT_TO_RIGHT,
        },
      },
    ];

    for (const test of tests) {
      assert.deepEqual(
          Elements.CSSPropertyIconResolver.getPhysicalFlexDirections(mapFromStyle(test.style)), test.expected,
          `Test ${JSON.stringify(test.style)} failed.`);
    }
  });

  it('can rotate the icon', () => {
    assert.deepEqual(
        Elements.CSSPropertyIconResolver.rotateFlexDirectionIcon(
            Elements.CSSPropertyIconResolver.PhysicalFlexDirection.LEFT_TO_RIGHT),
        {
          iconName: 'flex-direction-icon',
          rotate: -90,
          scaleX: -1,
          scaleY: 1,
        });
    assert.deepEqual(
        Elements.CSSPropertyIconResolver.rotateFlexDirectionIcon(
            Elements.CSSPropertyIconResolver.PhysicalFlexDirection.RIGHT_TO_LEFT),
        {
          iconName: 'flex-direction-icon',
          rotate: 90,
          scaleX: 1,
          scaleY: 1,
        });
    assert.deepEqual(
        Elements.CSSPropertyIconResolver.rotateFlexDirectionIcon(
            Elements.CSSPropertyIconResolver.PhysicalFlexDirection.TOP_TO_BOTTOM),
        {
          iconName: 'flex-direction-icon',
          rotate: 0,
          scaleX: 1,
          scaleY: 1,
        });
    assert.deepEqual(
        Elements.CSSPropertyIconResolver.rotateFlexDirectionIcon(
            Elements.CSSPropertyIconResolver.PhysicalFlexDirection.BOTTOM_TO_TOP),
        {
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
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.LEFT_TO_RIGHT,
      },
      {
        style: {
          'direction': 'ltr',
          'writing-mode': 'tb',
        },
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.TOP_TO_BOTTOM,
      },
      {
        style: {
          'direction': 'ltr',
          'writing-mode': 'vertical-lr',
        },
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.TOP_TO_BOTTOM,
      },
      {
        style: {
          'direction': 'ltr',
          'writing-mode': 'vertical-rl',
        },
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.TOP_TO_BOTTOM,
      },
      {
        style: {
          'direction': 'ltr',
          'writing-mode': 'tb-rl',
        },
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.TOP_TO_BOTTOM,
      },
      {
        style: {
          'direction': 'rtl',
        },
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.RIGHT_TO_LEFT,
      },
      {
        style: {
          'direction': 'rtl',
          'writing-mode': 'tb',
        },
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.BOTTOM_TO_TOP,
      },
      {
        style: {
          'direction': 'rtl',
          'writing-mode': 'vertical-lr',
        },
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.BOTTOM_TO_TOP,
      },
      {
        style: {
          'direction': 'rtl',
          'writing-mode': 'vertical-rl',
        },
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.BOTTOM_TO_TOP,
      },
      {
        style: {
          'direction': 'rtl',
          'writing-mode': 'tb-rl',
        },
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.BOTTOM_TO_TOP,
      },
    ];
    for (const test of tests) {
      assert.deepEqual(
          Elements.CSSPropertyIconResolver.findIcon('flex-direction: row', mapFromStyle(test.style)),
          Elements.CSSPropertyIconResolver.rotateFlexDirectionIcon(test.expected),
          `Test 'flex-direction: row'(${JSON.stringify(test.style)}) failed.`);

      assert.deepEqual(
          Elements.CSSPropertyIconResolver.findIcon('flex-direction: row-reverse', mapFromStyle(test.style)),
          Elements.CSSPropertyIconResolver.rotateFlexDirectionIcon(
              Elements.CSSPropertyIconResolver.reverseDirection(test.expected)),
          `Test 'flex-direction: row-reverse'(${JSON.stringify(test.style)}) failed.`);
    }
  });

  it('can find an icon for flex-direction: column and column-reverse', () => {
    const tests = [
      {
        style: {
          'direction': 'ltr',
        },
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.TOP_TO_BOTTOM,
      },
      {
        style: {
          'writing-mode': 'vertical-rl',
        },
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.RIGHT_TO_LEFT,
      },
      {
        style: {
          'writing-mode': 'vertical-lr',
        },
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.LEFT_TO_RIGHT,
      },
    ];

    for (const test of tests) {
      assert.deepEqual(
          Elements.CSSPropertyIconResolver.findIcon('flex-direction: column', mapFromStyle(test.style)),
          Elements.CSSPropertyIconResolver.rotateFlexDirectionIcon(test.expected),
          `Test 'flex-direction: column'(${JSON.stringify(test.style)}) failed.`);

      assert.deepEqual(
          Elements.CSSPropertyIconResolver.findIcon('flex-direction: column-reverse', mapFromStyle(test.style)),
          Elements.CSSPropertyIconResolver.rotateFlexDirectionIcon(
              Elements.CSSPropertyIconResolver.reverseDirection(test.expected)),
          `Test 'flex-direction: column-reverse'(${JSON.stringify(test.style)}) failed.`);
    }
  });

  it('can rotate an icon for align-content', () => {
    const iconName = 'iconName';
    assert.deepEqual(
        Elements.CSSPropertyIconResolver.rotateAlignContentIcon(
            iconName, Elements.CSSPropertyIconResolver.PhysicalFlexDirection.LEFT_TO_RIGHT),
        {
          iconName,
          rotate: -90,
          scaleX: 1,
          scaleY: 1,
        });
    assert.deepEqual(
        Elements.CSSPropertyIconResolver.rotateAlignContentIcon(
            iconName, Elements.CSSPropertyIconResolver.PhysicalFlexDirection.RIGHT_TO_LEFT),
        {
          iconName,
          rotate: 90,
          scaleX: 1,
          scaleY: 1,
        });
    assert.deepEqual(
        Elements.CSSPropertyIconResolver.rotateAlignContentIcon(
            iconName, Elements.CSSPropertyIconResolver.PhysicalFlexDirection.TOP_TO_BOTTOM),
        {
          iconName,
          rotate: 0,
          scaleX: 1,
          scaleY: 1,
        });
    assert.deepEqual(
        Elements.CSSPropertyIconResolver.rotateAlignContentIcon(
            iconName, Elements.CSSPropertyIconResolver.PhysicalFlexDirection.BOTTOM_TO_TOP),
        {
          iconName,
          rotate: 0,
          scaleX: 1,
          scaleY: 1,
        });
  });

  it('can find an icon for align-content properties', () => {
    const tests = [
      {
        style: {
          'flex-direction': 'row',
          'align-content': 'center',
        },
        iconName: 'flex-align-content-center-icon',
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.TOP_TO_BOTTOM,
      },
      {
        style: {
          'flex-direction': 'column',
          'align-content': 'center',
        },
        iconName: 'flex-align-content-center-icon',
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.LEFT_TO_RIGHT,
      },
      {
        style: {
          'flex-direction': 'row',
          'align-content': 'center',
          'writing-mode': 'vertical-rl',
        },
        iconName: 'flex-align-content-center-icon',
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.RIGHT_TO_LEFT,
      },
      {
        style: {
          'flex-direction': 'row',
          'align-content': 'center',
          'writing-mode': 'vertical-lr',
        },
        iconName: 'flex-align-content-center-icon',
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.LEFT_TO_RIGHT,
      },
      {
        style: {
          'flex-direction': 'row-reverse',
          'align-content': 'center',
          'writing-mode': 'vertical-rl',
        },
        iconName: 'flex-align-content-center-icon',
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.RIGHT_TO_LEFT,
      },
    ];

    for (const test of tests) {
      assert.deepEqual(
          Elements.CSSPropertyIconResolver.findIcon(
              `align-content: ${test.style['align-content']}`, mapFromStyle(test.style)),
          Elements.CSSPropertyIconResolver.rotateAlignContentIcon(test.iconName, test.expected),
          `Test align-content(${JSON.stringify(test.style)}) failed.`);
    }
  });

  it('can rotate an icon for justify-content', () => {
    const iconName = 'iconName';
    assert.deepEqual(
        Elements.CSSPropertyIconResolver.rotateJustifyContentIcon(
            iconName, Elements.CSSPropertyIconResolver.PhysicalFlexDirection.LEFT_TO_RIGHT),
        {
          iconName,
          rotate: 0,
          scaleX: 1,
          scaleY: 1,
        });
    assert.deepEqual(
        Elements.CSSPropertyIconResolver.rotateJustifyContentIcon(
            iconName, Elements.CSSPropertyIconResolver.PhysicalFlexDirection.RIGHT_TO_LEFT),
        {
          iconName,
          rotate: 0,
          scaleX: -1,
          scaleY: 1,
        });
    assert.deepEqual(
        Elements.CSSPropertyIconResolver.rotateJustifyContentIcon(
            iconName, Elements.CSSPropertyIconResolver.PhysicalFlexDirection.TOP_TO_BOTTOM),
        {
          iconName,
          rotate: 90,
          scaleX: 1,
          scaleY: 1,
        });
    assert.deepEqual(
        Elements.CSSPropertyIconResolver.rotateJustifyContentIcon(
            iconName, Elements.CSSPropertyIconResolver.PhysicalFlexDirection.BOTTOM_TO_TOP),
        {
          iconName,
          rotate: -90,
          scaleX: 1,
          scaleY: 1,
        });
  });


  it('can find an icon for justify-content properties', () => {
    const tests = [
      {
        style: {
          'flex-direction': 'row',
          'justify-content': 'center',
        },
        iconName: 'flex-justify-content-center-icon',
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.LEFT_TO_RIGHT,
      },
      {
        style: {
          'flex-direction': 'column',
          'justify-content': 'center',
        },
        iconName: 'flex-justify-content-center-icon',
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.TOP_TO_BOTTOM,
      },
      {
        style: {
          'flex-direction': 'row',
          'justify-content': 'center',
          'writing-mode': 'vertical-rl',
        },
        iconName: 'flex-justify-content-center-icon',
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.TOP_TO_BOTTOM,
      },
      {
        style: {
          'flex-direction': 'row',
          'justify-content': 'center',
          'writing-mode': 'vertical-lr',
        },
        iconName: 'flex-justify-content-center-icon',
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.TOP_TO_BOTTOM,
      },
      {
        style: {
          'flex-direction': 'row-reverse',
          'justify-content': 'center',
        },
        iconName: 'flex-justify-content-center-icon',
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.RIGHT_TO_LEFT,
      },
    ];

    for (const test of tests) {
      assert.deepEqual(
          Elements.CSSPropertyIconResolver.findIcon(
              `justify-content: ${test.style['justify-content']}`, mapFromStyle(test.style)),
          Elements.CSSPropertyIconResolver.rotateJustifyContentIcon(test.iconName, test.expected),
          `Test justify-content(${JSON.stringify(test.style)}) failed.`);
    }
  });

  it('can rotate an icon for align-items', () => {
    const iconName = 'iconName';
    assert.deepEqual(
        Elements.CSSPropertyIconResolver.rotateAlignItemsIcon(
            iconName, Elements.CSSPropertyIconResolver.PhysicalFlexDirection.LEFT_TO_RIGHT),
        {
          iconName,
          rotate: -90,
          scaleX: 1,
          scaleY: 1,
        });
    assert.deepEqual(
        Elements.CSSPropertyIconResolver.rotateAlignItemsIcon(
            iconName, Elements.CSSPropertyIconResolver.PhysicalFlexDirection.RIGHT_TO_LEFT),
        {
          iconName,
          rotate: 90,
          scaleX: 1,
          scaleY: 1,
        });
    assert.deepEqual(
        Elements.CSSPropertyIconResolver.rotateAlignItemsIcon(
            iconName, Elements.CSSPropertyIconResolver.PhysicalFlexDirection.TOP_TO_BOTTOM),
        {
          iconName,
          rotate: 0,
          scaleX: 1,
          scaleY: 1,
        });
    assert.deepEqual(
        Elements.CSSPropertyIconResolver.rotateAlignItemsIcon(
            iconName, Elements.CSSPropertyIconResolver.PhysicalFlexDirection.BOTTOM_TO_TOP),
        {
          iconName,
          rotate: 0,
          scaleX: 1,
          scaleY: 1,
        });
  });


  it('can find an icon for align-items properties', () => {
    const tests = [
      {
        style: {
          'flex-direction': 'row',
          'align-items': 'flex-start',
        },
        iconName: 'flex-align-items-flex-start-icon',
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.TOP_TO_BOTTOM,
      },
      {
        style: {
          'flex-direction': 'column',
          'align-items': 'flex-start',
        },
        iconName: 'flex-align-items-flex-start-icon',
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.LEFT_TO_RIGHT,
      },
      {
        style: {
          'flex-direction': 'row',
          'align-items': 'flex-start',
          'writing-mode': 'vertical-rl',
        },
        iconName: 'flex-align-items-flex-start-icon',
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.RIGHT_TO_LEFT,
      },
      {
        style: {
          'flex-direction': 'row',
          'align-items': 'flex-start',
          'writing-mode': 'vertical-lr',
        },
        iconName: 'flex-align-items-flex-start-icon',
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.LEFT_TO_RIGHT,
      },
      {
        style: {
          'flex-direction': 'column-reverse',
          'align-items': 'flex-start',
        },
        iconName: 'flex-align-items-flex-start-icon',
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.LEFT_TO_RIGHT,
      },
    ];

    for (const test of tests) {
      assert.deepEqual(
          Elements.CSSPropertyIconResolver.findIcon(
              `align-items: ${test.style['align-items']}`, mapFromStyle(test.style)),
          Elements.CSSPropertyIconResolver.rotateAlignItemsIcon(test.iconName, test.expected),
          `Test align-items(${JSON.stringify(test.style)}) failed.`);
    }
  });

  it('can find baseline icons', () => {
    const baselineIconInfo = {
      iconName: 'baseline-icon',
      rotate: 0,
      scaleX: 1,
      scaleY: 1,
    };
    assert.deepEqual(
        Elements.CSSPropertyIconResolver.findIcon('align-items: baseline', mapFromStyle({})), baselineIconInfo,
        'Assertion for the \'align-items: baseline\' icon failed.');

    assert.deepEqual(
        Elements.CSSPropertyIconResolver.findIcon('align-self: baseline', mapFromStyle({})), baselineIconInfo,
        'Assertion for the \'align-self: baseline\' icon failed.');

    assert.deepEqual(
        Elements.CSSPropertyIconResolver.findIcon('align-content: baseline', mapFromStyle({})), baselineIconInfo,
        'Assertion for the \'align-content: baseline\' icon failed.');
  });

  it('can find an icon for align-self properties', () => {
    const tests = [
      {
        style: {
          'align-self': 'flex-start',
        },
        parentStyle: {
          'flex-direction': 'row',
        },
        iconName: 'flex-align-self-flex-start-icon',
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.TOP_TO_BOTTOM,
      },
      {
        style: {
          'align-self': 'flex-start',
        },
        parentStyle: {
          'flex-direction': 'column',
        },
        iconName: 'flex-align-self-flex-start-icon',
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.LEFT_TO_RIGHT,
      },
      {
        style: {
          'align-self': 'flex-start',
        },
        parentStyle: {
          'flex-direction': 'row',
          'writing-mode': 'vertical-rl',
        },
        iconName: 'flex-align-self-flex-start-icon',
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.RIGHT_TO_LEFT,
      },
      {
        style: {
          'align-self': 'flex-start',
        },
        parentStyle: {
          'writing-mode': 'vertical-lr',
          'flex-direction': 'row',
        },
        iconName: 'flex-align-self-flex-start-icon',
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.LEFT_TO_RIGHT,
      },
      {
        style: {
          'align-self': 'flex-start',
        },
        parentStyle: {
          'flex-direction': 'column-reverse',
        },
        iconName: 'flex-align-self-flex-start-icon',
        expected: Elements.CSSPropertyIconResolver.PhysicalFlexDirection.LEFT_TO_RIGHT,
      },
    ];

    for (const test of tests) {
      assert.deepEqual(
          Elements.CSSPropertyIconResolver.findIcon(
              `align-self: ${test.style['align-self']}`, mapFromStyle(test.style), mapFromStyle(test.parentStyle)),
          Elements.CSSPropertyIconResolver.rotateAlignItemsIcon(test.iconName, test.expected),
          `Test align-self(${JSON.stringify(test.style)}) failed.`);
    }
  });
});
