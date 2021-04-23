// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';

describe('CSSPropertyParser', () => {
  describe('stripComments', () => {
    const stripComments = SDK.CSSPropertyParser.stripComments;

    it('should strip a single comment', () => {
      assert.strictEqual(stripComments('text /* comment */ text'), 'text  text');
    });

    it('should strip a multiline comment', () => {
      assert.strictEqual(
          stripComments(`text /* comment
      some other comment */ text`),
          'text  text');
    });

    it('should strip a comment with a comment start string', () => {
      assert.strictEqual(stripComments('text /* comment /* comment */ text'), 'text  text');
    });

    it('should strip multiple commnets', () => {
      assert.strictEqual(stripComments('text /* comment */ text /* comment */ text'), 'text  text  text');
    });
  });

  describe('parseFontVariationSettings', () => {
    const parseFontVariationSettings = SDK.CSSPropertyParser.parseFontVariationSettings;

    it('should parse settings with a single value', () => {
      assert.deepEqual(parseFontVariationSettings('"wght" 10'), [{tag: 'wght', value: 10}]);
    });

    it('should parse settings with multiple values', () => {
      assert.deepEqual(
          parseFontVariationSettings('"wght" 10, "wdth" 20'), [{tag: 'wght', value: 10}, {tag: 'wdth', value: 20}]);
    });

    it('should parse settings with a single float value', () => {
      assert.deepEqual(parseFontVariationSettings('"wght" 5.5'), [{tag: 'wght', value: 5.5}]);
    });
  });

  describe('parseFontFamily', () => {
    const parseFontFamily = SDK.CSSPropertyParser.parseFontFamily;

    it('should parse a single unquoted name', () => {
      assert.deepEqual(parseFontFamily('Arial'), ['Arial']);
    });

    it('should parse a double quoted name with spaces', () => {
      assert.deepEqual(parseFontFamily('"Some font"'), ['Some font']);
    });

    it('should parse a single quoted name with spaces', () => {
      assert.deepEqual(parseFontFamily('\'Some font\''), ['Some font']);
    });

    it('should parse multiple names', () => {
      assert.deepEqual(parseFontFamily('  Arial  , "Some font" , serif'), ['Arial', 'Some font', 'serif']);
    });
  });
});
