// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as UI from '../legacy.js';

describe('measuredScrollbarWidth', () => {
  let style: HTMLStyleElement;
  before(() => {
    UI.Utils.resetMeasuredScrollbarWidthForTest();
  });
  after(() => {
    style.remove();
  });

  it('provides a default value', () => {
    const expectedDefaultWidth = 16;
    assert.strictEqual(UI.Utils.measuredScrollbarWidth(), expectedDefaultWidth);
  });

  it('calculates specific widths correctly', () => {
    const width = 20;

    // Enforce custom width on scrollbars to test.
    style = document.createElement('style');
    style.textContent = `::-webkit-scrollbar {
      appearance: none;
      width: ${width}px;
    }`;
    document.head.appendChild(style);
    assert.strictEqual(UI.Utils.measuredScrollbarWidth(document), width);

    // Remove the styles and try again to detect that cached values are used.
    style.remove();
    assert.strictEqual(UI.Utils.measuredScrollbarWidth(document), width);
  });
});
