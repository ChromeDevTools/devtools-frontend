// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../../../front_end/core/common/common.js';
import {assertNotNullOrUndefined} from '../../../../../../../front_end/core/platform/platform.js';
import * as ColorPicker from '../../../../../../../front_end/ui/legacy/components/color_picker/color_picker.js';
import * as UI from '../../../../../../../front_end/ui/legacy/legacy.js';
import {deinitializeGlobalVars, initializeGlobalVars} from '../../../../helpers/EnvironmentHelpers.js';

const displayP3Color = Common.Color.parse('color(display-p3 1 1 1)') as Common.Color.Color;
const rgbColor = Common.Color.parse('rgb(255 0 0)') as Common.Color.Color;

describe('ColorPicker aka Spectrum', () => {
  beforeEach(async () => {
    await initializeGlobalVars();
    const forceNew = true;
    const actionRegistry = UI.ActionRegistry.ActionRegistry.instance({forceNew});
    UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew, actionRegistry});
  });

  afterEach(async () => {
    await deinitializeGlobalVars();
  });

  describe('sRGB overlay', () => {
    it('should show sRGB overlay when the format supports display-p3 colors', () => {
      const spectrum = new ColorPicker.Spectrum.Spectrum();

      spectrum.setColor(displayP3Color, Common.Color.Format.DISPLAY_P3);

      assertNotNullOrUndefined(spectrum.contentElement.querySelector('devtools-spectrum-srgb-overlay'));
    });

    it('should not show sRGB overlay when the format doesn\'t support display-p3 colors', () => {
      const spectrum = new ColorPicker.Spectrum.Spectrum();

      spectrum.setColor(rgbColor, Common.Color.Format.RGB);

      assert.isNull(spectrum.contentElement.querySelector('devtools-spectrum-srgb-overlay'));
    });
  });
});
