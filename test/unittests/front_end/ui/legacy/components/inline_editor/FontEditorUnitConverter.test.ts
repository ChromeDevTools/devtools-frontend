// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as InlineEditor from '../../../../../../../front_end/ui/legacy/components/inline_editor/inline_editor.js';

const {assert} = chai;

describe('FontEditorUnitConverter', () => {
  it('converts px to em as expected', async () => {
    const pxToEm = await InlineEditor.FontEditorUnitConverter.getUnitConversionMultiplier('px', 'em', false);
    assert.strictEqual(pxToEm, 0.0625, 'Unexpected multiplier returned for conversion: px to em');
  });

  it('converts px to rem as expected', async () => {
    const pxToRem = await InlineEditor.FontEditorUnitConverter.getUnitConversionMultiplier('px', 'rem', false);
    assert.strictEqual(pxToRem, 0.0625, 'Unexpected multiplier returned for conversion: px to rem');
  });

  it('converts px to % as expected', async () => {
    const pxToPerc = await InlineEditor.FontEditorUnitConverter.getUnitConversionMultiplier('px', '%', false);
    assert.strictEqual(pxToPerc, 6.25, 'Unexpected multiplier returned for conversion: px to %');
  });

  it('converts px to cm as expected', async () => {
    const pxToCm = await InlineEditor.FontEditorUnitConverter.getUnitConversionMultiplier('px', 'cm', false);
    assert.strictEqual(pxToCm, 1 / 37.795, 'Unexpected multiplier returned for conversion: px to cm');
  });

  it('converts px to mm as expected', async () => {
    const pxToMm = await InlineEditor.FontEditorUnitConverter.getUnitConversionMultiplier('px', 'mm', false);
    assert.strictEqual(pxToMm, 1 / 3.7795, 'Unexpected multiplier returned for conversion: px to mm');
  });

  it('converts px to in as expected', async () => {
    const pxToIn = await InlineEditor.FontEditorUnitConverter.getUnitConversionMultiplier('px', 'in', false);
    assert.strictEqual(pxToIn, 1 / 96, 'Unexpected multiplier returned for conversion: px to in');
  });

  it('converts px to pt as expected', async () => {
    const pxToPt = await InlineEditor.FontEditorUnitConverter.getUnitConversionMultiplier('px', 'pt', false);
    assert.strictEqual(pxToPt, 3 / 4, 'Unexpected multiplier returned for conversion: px to pt');
  });

  it('converts px to pc as expected', async () => {
    const pxToPc = await InlineEditor.FontEditorUnitConverter.getUnitConversionMultiplier('px', 'pc', false);
    assert.strictEqual(pxToPc, 1 / 16, 'Unexpected multiplier returned for conversion: px to pc');
  });
});
