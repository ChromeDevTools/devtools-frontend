// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as TextUtils from '../../../../../front_end/models/text_utils/text_utils.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';

describeWithEnvironment('CSSProperty', () => {
  describe('formatStyle', () => {
    const tokenizerFactory = TextUtils.CodeMirrorUtils.TokenizerFactory.instance();
    const formatStyle = (styleText: string) =>
        SDK.CSSProperty.CSSProperty.formatStyle(styleText, ' ', '', tokenizerFactory);

    it('formats a style declaration with a single trailing semicolon correctly', () => {
      assert.strictEqual(formatStyle('color: red;'), '\n color: red;\n');
    });

    it('formats a style declaration with multiple trailing semicolons correctly', () => {
      assert.strictEqual(formatStyle('color: red;;;'), '\n color: red;\n');
    });

    it('formats two style declarations correctly', () => {
      assert.strictEqual(formatStyle('color: red;;;color: blue'), '\n color: red;\n color: blue;\n');
    });

    it('formats multiple style declarations correctly', () => {
      assert.strictEqual(formatStyle('color: var(-);margin: 0;padding:0'), '\n color: var(-);margin: 0;padding:0\n');
    });

    it('formats style declarations with comments correctly', () => {
      assert.strictEqual(
          formatStyle('color: red;/* a comment */;color: blue'), '\n color: red;/* a comment */\n color: blue;\n');
    });

    it('formats an empty decalaration correctly', () => {
      assert.strictEqual(formatStyle(':; color: red; color: blue'), ':;\n color: red;\n color: blue;\n');
    });

    it('formats an empty decalaration correctly and doesn\'t format comments', () => {
      assert.strictEqual(
          formatStyle('color: red;/* a comment;;; */ :; color: blue;'),
          '\n color: red;/* a comment;;; */ :;\n color: blue;\n');
    });

    it('formats a decalaration with line names correctly', () => {
      assert.strictEqual(
          formatStyle('grid: [first-row-start] "a a" 10px [first-row-end] [second-row-start] "b b" 20px / 100px'),
          '\n grid: [first-row-start] "a a" 10px [first-row-end] [second-row-start] "b b" 20px / 100px;\n');
    });
  });
});
