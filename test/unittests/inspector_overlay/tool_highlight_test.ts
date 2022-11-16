// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {createElementDescription, type ElementInfo} from '../../../inspector_overlay/tool_highlight.js';

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
    elementInfo.style['background-color'] = '#01010100';
    elementInfo.style['background-color-css-text'] = 'lab(10 0 0)';
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
});
