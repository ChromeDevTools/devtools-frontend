// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {MarkdownView, renderToken} from '../../../../front_end/issues/MarkdownView.js';
import * as Marked from '../../../../front_end/marked/marked.js';
import {TemplateResult} from '../../../../front_end/third_party/lit-html/lit-html.js';
import {assertShadowRoot, renderElementIntoDOM} from '../helpers/DOMHelpers.js';

const {assert} = chai;

describe('MarkdownView', () => {
  describe('renderToken', () => {
    it('wraps paragraph tokens in <p> tags', () => {
      const renderResult = renderToken({type: 'paragraph', tokens: []});
      assert.deepStrictEqual(renderResult.strings.raw, ['<p>', '</p>']);
    });

    it('wraps an unordered list token in <ul> tags', () => {
      const renderResult = renderToken({type: 'list', items: []});
      assert.deepStrictEqual(renderResult.strings.raw, ['<ul>', '</ul>']);
    });

    it('wraps list items in <li> tags', () => {
      const renderResult = renderToken({type: 'list_item', tokens: []});
      assert.deepStrictEqual(renderResult.strings.raw, ['<li>', '</li>']);
    });

    it('wraps a codespan token in <code> tags', () => {
      const renderResult = renderToken({type: 'codespan', text: 'const foo = 42;'});
      assert.deepStrictEqual(renderResult.strings.raw, ['<code>', '</code>']);
      assert.deepStrictEqual(renderResult.values, ['const foo = 42;']);
    });

    it('renders childless text tokens as-is', () => {
      const renderResult = renderToken({type: 'text', text: 'Simple text token'});
      assert.deepStrictEqual(renderResult.values, ['Simple text token']);
    });

    it('renders nested text tokens correctly', () => {
      const renderResult = renderToken({
        type: 'text',
        text: 'This text should not be rendered. Only the subtokens!',
        tokens: [
          {type: 'text', text: 'Nested raw text'},
          {type: 'codespan', text: 'and a nested codespan to boot'},
        ],
      });

      const renderedParts = renderResult.values[0] as TemplateResult[];
      assert.strictEqual(renderedParts.length, 2);
      assert.deepStrictEqual(renderedParts[0].values, ['Nested raw text']);
      assert.deepStrictEqual(renderedParts[1].values, ['and a nested codespan to boot']);
    });

    it('throws an error for invalid or unsupported token types', () => {
      assert.throws(() => renderToken({type: 'no_way_this_is_a_valid_markdown_token'}));
    });
  });

  const paragraphText =
      'Single paragraph with a sentence of text and some list items to test that the component works end-to-end.';
  const listItemTexts = ['Simple unordered list item 1', 'Simple unordered list item 2'];
  const markdownString = `
${paragraphText}

* ${listItemTexts[0]}
* ${listItemTexts[1]}
`;

  describe('component', () => {
    it('renders basic markdown correctly', () => {
      const component = new MarkdownView();
      renderElementIntoDOM(component);

      component.data = {tokens: Marked.Marked.lexer(markdownString)};

      assertShadowRoot(component.shadowRoot);

      const paragraphs = Array.from(component.shadowRoot.querySelectorAll('p'));
      assert.strictEqual(paragraphs.length, 1);
      assert.strictEqual(paragraphs[0].innerText, paragraphText);

      const listItems = Array.from(component.shadowRoot.querySelectorAll('li'));
      assert.strictEqual(listItems.length, 2);
      assert.deepStrictEqual(listItems.map(item => item.textContent), listItemTexts);
    });
  });
});
