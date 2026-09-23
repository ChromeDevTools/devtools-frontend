// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import parser from '@typescript-eslint/parser';
import {assert} from 'chai';

import {isLitHtmlRenderCall, isLitHtmlTemplateCall} from '../lib/utils/lit.ts';

function getParsedExpression(code: string) {
  const parsed = parser.parse(code).body[0];

  if (parsed.type !== 'ExpressionStatement') {
    throw new Error('Not an expression');
  }
  return parsed.expression;
}

describe('eslint utils', () => {
  describe('isLitHtmlTemplateCall', () => {
    it('returns true if the code is Lit.html``', () => {
      const code = 'Lit.html`<span>foo</span>`';
      const expression = getParsedExpression(code);
      const result = isLitHtmlTemplateCall(expression);
      assert.isTrue(result);
    });

    it('returns true if the code is html``', () => {
      const code = 'html`<span>foo</span>`';
      const expression = getParsedExpression(code);
      const result = isLitHtmlTemplateCall(expression);
      assert.isTrue(result);
    });

    it('returns false if the code is Lit.somethingElse``', () => {
      const code = 'Lit.somethingElse`<span>foo</span>`';
      const expression = getParsedExpression(code);
      const result = isLitHtmlTemplateCall(expression);
      assert.isFalse(result);
    });

    it('returns false if the code is another tagged template function``', () => {
      const code = 'notLitHtml`<span>foo</span>`';
      const expression = getParsedExpression(code);
      const result = isLitHtmlTemplateCall(expression);
      assert.isFalse(result);
    });
  });

  describe('isLitHtmlRenderCall', () => {
    it('returns true if the code is Lit.render()', () => {
      const code = 'Lit.render(Lit.html``, this.#shadow)';
      const expression = getParsedExpression(code);
      const result = isLitHtmlRenderCall(expression);
      assert.isTrue(result);
    });

    it('returns true if the code is render()', () => {
      const code = 'render(html``, this.#shadow)';
      const expression = getParsedExpression(code);
      const result = isLitHtmlRenderCall(expression);
      assert.isTrue(result);
    });

    it('returns false if the code is not render()', () => {
      const code = 'notRender(html``, this.#shadow)';
      const expression = getParsedExpression(code);
      const result = isLitHtmlRenderCall(expression);
      assert.isFalse(result);
    });

    it('returns false if the code is Lit.notRender()', () => {
      const code = 'Lit.notRender(html``, this.#shadow)';
      const expression = getParsedExpression(code);
      const result = isLitHtmlRenderCall(expression);
      assert.isFalse(result);
    });
  });
});
