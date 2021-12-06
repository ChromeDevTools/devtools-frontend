// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const parser = require('@typescript-eslint/parser');

const utils = require('../lib/utils.js');
const {assert} = require('chai');

describe('eslint utils', () => {
  describe('isLitHtmlTemplateCall', () => {
    it('returns true if the code is LitHtml.html``', () => {
      const code = 'LitHtml.html`<span>foo</span>`';
      const parsed = parser.parse(code);
      const result = utils.isLitHtmlTemplateCall(parsed.body[0].expression);
      assert.strictEqual(result, true);
    });

    it('returns true if the code is html``', () => {
      const code = 'html`<span>foo</span>`';
      const parsed = parser.parse(code);
      const result = utils.isLitHtmlTemplateCall(parsed.body[0].expression);
      assert.strictEqual(result, true);
    });

    it('returns false if the code is LitHtml.somethingElse``', () => {
      const code = 'LitHtml.somethingElse`<span>foo</span>`';
      const parsed = parser.parse(code);
      const result = utils.isLitHtmlTemplateCall(parsed.body[0].expression);
      assert.strictEqual(result, false);
    });

    it('returns false if the code is another tagged template function``', () => {
      const code = 'notLitHtml`<span>foo</span>`';
      const parsed = parser.parse(code);
      const result = utils.isLitHtmlTemplateCall(parsed.body[0].expression);
      assert.strictEqual(result, false);
    });
  });
});
