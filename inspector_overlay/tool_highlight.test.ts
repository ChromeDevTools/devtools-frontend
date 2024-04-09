// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {createElementDescription, type ElementInfo} from './tool_highlight.js';

function defaultElementInfo(): ElementInfo {
  return {
    tagName: '',
    idValue: '',
    nodeWidth: 0,
    nodeHeight: 0,
    isLocked: false,
    isLockedAncestor: false,
    style: {},
    showAccessibilityInfo: false,
    isKeyboardFocusable: false,
    accessibleName: '',
    accessibleRole: '',
  };
}

describe('tool_highlight', () => {
  it('shows the css-text if present', () => {
    const elementInfo = defaultElementInfo();
    elementInfo.style['color'] = '#ffffffff';
    elementInfo.style['color-css-text'] = 'lab(100 0 0)';
    elementInfo.style['color-unclamped-rgba'] = [1, 1, 1, 1];
    elementInfo.style['background-color'] = '#010101FF';
    elementInfo.style['background-color-css-text'] = 'lab(10 0 0)';
    elementInfo.style['background-color-unclamped-rgba'] = [0.1, 0.1, 0.1, 1];
    for (const colorFormat of ['original', 'rgb', 'hsl', 'hwb']) {
      // createElementDescription should be called with 'original' as colorFormat, but let's check that that doesn't
      // matter.
      const element = createElementDescription(elementInfo, colorFormat);
      const colorRows = element.getElementsByClassName('element-info-value-color');
      assert.deepEqual(colorRows.length, 2);
      assert.deepEqual(colorRows.item(0)?.textContent, 'lab(100 0 0)');
      assert.deepEqual(colorRows.item(1)?.textContent, 'lab(10 0 0)');
    }
  });

  it('shows contrast info for out of gamut colors', () => {
    const elementInfo = defaultElementInfo();
    elementInfo.contrast = {
      backgroundColor: '#010101FF',
      backgroundColorUnclampedRgba: [0.1, 0.1, 0.1, 1],
      backgroundColorCssText: 'lab(10 0 0)',
      fontSize: '12px',
      fontWeight: '400',
      contrastAlgorithm: 'aaa',
      textOpacity: 1,
    };
    elementInfo.style['color'] = '#ffffffff';
    elementInfo.style['color-css-text'] = 'lch(100 82 0)';
    elementInfo.style['color-unclamped-rgba'] = [1.55, 0.7, 1.02, 1];
    elementInfo.style['background-color'] = '#010101FF';
    elementInfo.style['background-color-css-text'] = 'lab(10 0 0)';
    elementInfo.style['background-color-unclamped-rgba'] = [0.1, 0.1, 0.1, 1];
    elementInfo.showAccessibilityInfo = true;
    for (const colorFormat of ['original', 'rgb', 'hsl', 'hwb']) {
      // createElementDescription should be called with 'original' as colorFormat, but let's check that that doesn't
      // matter.
      const element = createElementDescription(elementInfo, colorFormat);
      const contrastRow = element.querySelector('.element-info-value-contrast');
      assert.deepEqual(contrastRow?.textContent, 'Aa17.12');
    }
  });

  it('does not show transparent color in Color row', () => {
    const elementInfo = defaultElementInfo();
    elementInfo.style['color'] = '#ffffffff';
    elementInfo.style['color-css-text'] = 'lab(100 0 0)';
    elementInfo.style['color-unclamped-rgba'] = [1, 1, 1, 0];
    elementInfo.style['background-color'] = '#010101FF';
    elementInfo.style['background-color-css-text'] = 'lab(10 0 0)';
    elementInfo.style['background-color-unclamped-rgba'] = [0.1, 0.1, 0.1, 1];
    for (const colorFormat of ['original', 'rgb', 'hsl', 'hwb']) {
      // createElementDescription should be called with 'original' as colorFormat, but let's check that that doesn't
      // matter.
      const element = createElementDescription(elementInfo, colorFormat);
      const colorRows = element.getElementsByClassName('element-info-value-color');
      assert.deepEqual(colorRows.length, 1);
      assert.deepEqual(colorRows.item(0)?.textContent, 'lab(10 0 0)');
    }
  });

  it('does not show transparent color in Background row', () => {
    const elementInfo = defaultElementInfo();
    elementInfo.style['color'] = '#ffffffff';
    elementInfo.style['color-css-text'] = 'lab(100 0 0)';
    elementInfo.style['color-unclamped-rgba'] = [1, 1, 1, 1];
    elementInfo.style['background-color'] = '#01010100';
    elementInfo.style['background-color-css-text'] = 'lab(10 0 0)';
    elementInfo.style['background-color-unclamped-rgba'] = [0.1, 0.1, 0.1, 0];
    for (const colorFormat of ['original', 'rgb', 'hsl', 'hwb']) {
      // createElementDescription should be called with 'original' as colorFormat, but let's check that that doesn't
      // matter.
      const element = createElementDescription(elementInfo, colorFormat);
      const colorRows = element.getElementsByClassName('element-info-value-color');
      assert.deepEqual(colorRows.length, 1);
      assert.deepEqual(colorRows.item(0)?.textContent, 'lab(100 0 0)');
    }
  });
});
