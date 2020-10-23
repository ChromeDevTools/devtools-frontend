// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {findIcon} from '../../../../front_end/elements/CSSPropertyIconResolver.js';

const {assert} = chai;

describe('CSSPropertyIconResolver', () => {
  function mapFromStyle(style: {[key: string]: string|undefined}) {
    const result = new Map();
    for (const key of Object.keys(style)) {
      result.set(key, style[key]);
    }
    return result;
  }

  it('can find an icon for flex-direction row', () => {
    const tests = [
      {
        text: 'flex-direction: row',
        style: {
          'direction': 'ltr',
        },
        expected: {
          // left to right
          iconName: 'flex-direction-icon',
          rotate: -90,
          scaleX: -1,
          scaleY: 1,
        },
      },
      {
        text: 'flex-direction: row',
        style: {
          'direction': 'ltr',
          'writing-mode': 'tb',
        },
        expected: {
          // top to bottom
          iconName: 'flex-direction-icon',
          rotate: 0,
          scaleX: 1,
          scaleY: 1,
        },
      },
      {
        text: 'flex-direction: row',
        style: {
          'direction': 'ltr',
          'writing-mode': 'vertical-lr',
        },
        expected: {
          // top to bottom
          iconName: 'flex-direction-icon',
          rotate: 0,
          scaleX: 1,
          scaleY: 1,
        },
      },
      {
        text: 'flex-direction: row',
        style: {
          'direction': 'ltr',
          'writing-mode': 'vertical-rl',
        },
        expected: {
          // top to bottom
          iconName: 'flex-direction-icon',
          rotate: 0,
          scaleX: 1,
          scaleY: 1,
        },
      },
      {
        text: 'flex-direction: row',
        style: {
          'direction': 'ltr',
          'writing-mode': 'tb-rl',
        },
        expected: {
          // top to bottom
          iconName: 'flex-direction-icon',
          rotate: 0,
          scaleX: 1,
          scaleY: 1,
        },
      },
      {
        text: 'flex-direction: row',
        style: {
          'direction': 'rtl',
        },
        expected: {
          // right to left
          iconName: 'flex-direction-icon',
          rotate: 90,
          scaleX: 1,
          scaleY: 1,
        },
      },
      {
        text: 'flex-direction: row',
        style: {
          'direction': 'rtl',
          'writing-mode': 'tb',
        },
        expected: {
          // bottom to top
          iconName: 'flex-direction-icon',
          rotate: 0,
          scaleX: 1,
          scaleY: -1,
        },
      },
      {
        text: 'flex-direction: row',
        style: {
          'direction': 'rtl',
          'writing-mode': 'vertical-lr',
        },
        expected: {
          // bottom to top
          iconName: 'flex-direction-icon',
          rotate: 0,
          scaleX: 1,
          scaleY: -1,
        },
      },
      {
        text: 'flex-direction: row',
        style: {
          'direction': 'rtl',
          'writing-mode': 'vertical-rl',
        },
        expected: {
          // bottom to top
          iconName: 'flex-direction-icon',
          rotate: 0,
          scaleX: 1,
          scaleY: -1,
        },
      },
      {
        text: 'flex-direction: row',
        style: {
          'direction': 'rtl',
          'writing-mode': 'tb-rl',
        },
        expected: {
          // bottom to top
          iconName: 'flex-direction-icon',
          rotate: 0,
          scaleX: 1,
          scaleY: -1,
        },
      },
    ];
    for (const test of tests) {
      assert.deepEqual(
          findIcon(test.text, mapFromStyle(test.style)), test.expected,
          `Test ${test.text} (${JSON.stringify(test.style)}) failed.`);
    }
  });
});
