// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const parser = require('@typescript-eslint/parser');
const {assert} = require('chai');

const utils = require('../lib/utils.js');

describe('eslint utils', () => {
  describe('isLitHtmlTemplateCall', () => {
    it('returns true if the code is Lit.html``', () => {
      const code = 'Lit.html`<span>foo</span>`';
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

    it('returns false if the code is Lit.somethingElse``', () => {
      const code = 'Lit.somethingElse`<span>foo</span>`';
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

  describe('isLitHtmlRenderCall', () => {
    it('returns true if the code is Lit.render()', () => {
      const code = 'Lit.render(Lit.html``, this.#shadow)';
      const parsed = parser.parse(code);
      const result = utils.isLitHtmlRenderCall(parsed.body[0].expression);
      assert.strictEqual(result, true);
    });

    it('returns true if the code is render()', () => {
      const code = 'render(html``, this.#shadow)';
      const parsed = parser.parse(code);
      const result = utils.isLitHtmlRenderCall(parsed.body[0].expression);
      assert.strictEqual(result, true);
    });

    it('returns false if the code is not render()', () => {
      const code = 'notRender(html``, this.#shadow)';
      const parsed = parser.parse(code);
      const result = utils.isLitHtmlRenderCall(parsed.body[0].expression);
      assert.strictEqual(result, false);
    });

    it('returns false if the code is Lit.notRender()', () => {
      const code = 'Lit.notRender(html``, this.#shadow)';
      const parsed = parser.parse(code);
      const result = utils.isLitHtmlRenderCall(parsed.body[0].expression);
      assert.strictEqual(result, false);
    });
  });
});
