// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ObjectUI from '../../../../../../../front_end/ui/legacy/components/object_ui/object_ui.js';

const {assert} = chai;

describe('JavaScriptREPL', () => {
  describe('preprocessExpression', () => {
    it('wraps object literals in ()', () => {
      const expr = '{a : 10}';
      const processedExpr = ObjectUI.JavaScriptREPL.JavaScriptREPL.preprocessExpression(expr);
      assert.strictEqual(`(${expr})`, processedExpr);
    });

    it('ignores whitespace', () => {
      const expr = ' \n {  a : 10  } \t ';
      const processedExpr = ObjectUI.JavaScriptREPL.JavaScriptREPL.preprocessExpression(expr);
      assert.strictEqual(`(${expr})`, processedExpr);
    });

    it('leaves blocks untouched', () => {
      const expr = '{ a = 10 }';
      const processedExpr = ObjectUI.JavaScriptREPL.JavaScriptREPL.preprocessExpression(expr);
      assert.strictEqual(expr, processedExpr);
    });
  });
});
