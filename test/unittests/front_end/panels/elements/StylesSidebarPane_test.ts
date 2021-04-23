// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ElementsModule from '../../../../../front_end/panels/elements/elements.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';

const {assert} = chai;

describeWithEnvironment('StylesSidebarPane', async () => {
  let Elements: typeof ElementsModule;
  before(async () => {
    Elements = await import('../../../../../front_end/panels/elements/elements.js');
  });

  it('unescapes CSS strings', () => {
    assert.strictEqual(
        Elements.StylesSidebarPane.unescapeCssString(
            String.raw`"I\F1 t\EB rn\E2 ti\F4 n\E0 liz\E6 ti\F8 n\2603 \1F308  can be \t\r\ic\k\y"`),
        '"I\xF1t\xEBrn\xE2ti\xF4n\xE0liz\xE6ti\xF8n\u2603\u{1F308} can be tricky"');
    assert.strictEqual(
        Elements.StylesSidebarPane.unescapeCssString(String.raw`"_\DBFF_\\DBFF_\\\DBFF_\\\\DBFF_\\\\\DBFF_"`),
        '"_\uFFFD_\\DBFF_\\\\DBFF_\\\\\\DBFF_\\\\\\\\DBFF_"');
    assert.strictEqual(
        Elements.StylesSidebarPane.unescapeCssString(String.raw`"\0_\DBFF_\DFFF_\110000"`),
        '"\uFFFD_\uFFFD_\uFFFD_\uFFFD"', 'U+0000, lone surrogates, and values above U+10FFFF should become U+FFFD');
    assert.strictEqual(
        Elements.StylesSidebarPane.unescapeCssString(String.raw`"_\D83C\DF08_"`), '"_\uFFFD\uFFFD_"',
        'surrogates should not be combined');
    assert.strictEqual(
        Elements.StylesSidebarPane.unescapeCssString('"_\\41\n_\\41\t_\\41\x20_"'), '"_A_A_A_"',
        'certain trailing whitespace characters should be consumed as part of the escape sequence');
  });
});
