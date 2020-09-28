// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ThemeSupport from '../../../../front_end/theme_support/theme_support.js';
import * as ComponentHelpers from '../../../../front_end/component_helpers/component_helpers.js';
const {assert} = chai;

describe('ComponentHelpers', () => {
  describe('getStylesheets', () => {
    it('returns a single stylesheet with the contents of the resource', () => {
      const sheets = ComponentHelpers.GetStylesheet.getStyleSheets('ui/inspectorCommon.css');
      assert.lengthOf(sheets, 1);
      assert.instanceOf(sheets[0], CSSStyleSheet);
    });

    it('caches the stylesheet rather than constructing it every time', () => {
      const firstCallSheet = ComponentHelpers.GetStylesheet.getStyleSheets('ui/inspectorCommon.css')[0];
      const secondCallSheet = ComponentHelpers.GetStylesheet.getStyleSheets('ui/inspectorCommon.css')[0];
      assert.strictEqual(firstCallSheet, secondCallSheet);
    });

    describe('patching stylesheets', () => {
      beforeEach(() => {
        // Patch theme support to return a patch in all cases, necessary for testing these
        // particular set of behaviors.
        ThemeSupport.ThemeSupport.instance().themeStyleSheet = () => {
          return 'p { color: red; }';
        };
      });

      it('returns the original and the patched stylesheet if there is a themed stylesheet and the option is set',
         () => {
           const sheets =
               ComponentHelpers.GetStylesheet.getStyleSheets('ui/inspectorCommon.css', {patchThemeSupport: true});
           assert.lengthOf(sheets, 2);
           assert.instanceOf(sheets[0], CSSStyleSheet);
           assert.instanceOf(sheets[1], CSSStyleSheet);
         });

      it('does not patch by default', () => {
        const sheets = ComponentHelpers.GetStylesheet.getStyleSheets('ui/inspectorCommon.css');
        assert.lengthOf(sheets, 1);
        assert.instanceOf(sheets[0], CSSStyleSheet);
      });
    });
  });
});
