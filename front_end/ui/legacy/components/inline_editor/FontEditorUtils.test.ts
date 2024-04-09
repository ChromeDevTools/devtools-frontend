// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as InlineEditor from './inline_editor.js';

describe('FontEditorUtils', () => {
  it('getRoundingPrecision rounds units as expected', () => {
    let roundingPrecisionValue = InlineEditor.FontEditorUtils.getRoundingPrecision(1);
    assert.strictEqual(roundingPrecisionValue, 0, 'getRoundingPrecision returned unexpected results for value: 1');

    roundingPrecisionValue = InlineEditor.FontEditorUtils.getRoundingPrecision(.1);
    assert.strictEqual(roundingPrecisionValue, 1, 'getRoundingPrecision returned unexpected results for value: .1');

    roundingPrecisionValue = InlineEditor.FontEditorUtils.getRoundingPrecision(.01);
    assert.strictEqual(roundingPrecisionValue, 2, 'getRoundingPrecision returned unexpected results for value: .01');

    roundingPrecisionValue = InlineEditor.FontEditorUtils.getRoundingPrecision(.001);
    assert.strictEqual(roundingPrecisionValue, 3, 'getRoundingPrecision returned unexpected results for value: .001');

    roundingPrecisionValue = InlineEditor.FontEditorUtils.getRoundingPrecision(500);
    assert.strictEqual(roundingPrecisionValue, 0, 'getRoundingPrecision returned unexpected results for value: 500');

    roundingPrecisionValue = InlineEditor.FontEditorUtils.getRoundingPrecision(-500);
    assert.strictEqual(roundingPrecisionValue, 0, 'getRoundingPrecision returned unexpected results for value: -500');
  });
});
