// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../../front_end/common/common.js';
import * as ThemeSupport from '../../../../front_end/theme_support/theme_support.js';
import * as ComponentHelpers from '../../../../front_end/component_helpers/component_helpers.js';
const {assert} = chai;

const newThemeSupport = () => {
  // Theme support is necessary for the helpers, so ensure that an instance exists prior to
  // each test being executed.
  const setting = {
    get() {
      return 'default';
    },
  } as Common.Settings.Setting<string>;
  ThemeSupport.ThemeSupport.instance({forceNew: true, setting});
};

describe('ComponentHelpers', () => {
  before(newThemeSupport);

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
      before(() => {
        // Patch theme support to return a patch in all cases, necessary for testing these
        // particular set of behaviors.
        ThemeSupport.ThemeSupport.instance().themeStyleSheet = () => {
          return 'p { color: red; }';
        };
      });

      after(newThemeSupport);

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
