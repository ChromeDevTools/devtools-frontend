// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as IssuesModule from '../../../../front_end/issues/issues.js';
import {describeWithEnvironment} from '../helpers/EnvironmentHelpers.js';
import {TemplateResult} from '../../../../front_end/third_party/lit-html/lit-html.js';
import * as Marked from '../../../../front_end/third_party/marked/marked.js';
import {assertShadowRoot, renderElementIntoDOM} from '../helpers/DOMHelpers.js';

const {assert} = chai;

describeWithEnvironment('MarkdownView', async () => {
  let Issues: typeof IssuesModule;
  before(async () => {
    Issues = await import('../../../../front_end/issues/issues.js');
  });

  describe('renderToken', async () => {
    it('wraps paragraph tokens in <p> tags', () => {
      const renderResult = Issues.MarkdownView.renderToken({type: 'paragraph', tokens: []});
      assert.deepStrictEqual(renderResult.strings.raw, ['<p>', '</p>']);
    });

    it('wraps an unordered list token in <ul> tags', () => {
      const renderResult = Issues.MarkdownView.renderToken({type: 'list', items: []});
      assert.deepStrictEqual(renderResult.strings.raw, ['<ul>', '</ul>']);
    });

    it('wraps list items in <li> tags', () => {
      const renderResult = Issues.MarkdownView.renderToken({type: 'list_item', tokens: []});
      assert.deepStrictEqual(renderResult.strings.raw, ['<li>', '</li>']);
    });

    it('wraps a codespan token in <code> tags', () => {
      const renderResult = Issues.MarkdownView.renderToken({type: 'codespan', text: 'const foo = 42;'});
      assert.deepStrictEqual(renderResult.strings.raw, ['<code>', '</code>']);
      assert.deepStrictEqual(renderResult.values, ['const foo = 42;']);
    });

    it('renders childless text tokens as-is', () => {
      const renderResult = Issues.MarkdownView.renderToken({type: 'text', text: 'Simple text token'});
      assert.deepStrictEqual(renderResult.values, ['Simple text token']);
    });

    it('renders nested text tokens correctly', () => {
      const renderResult = Issues.MarkdownView.renderToken({
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
      assert.throws(() => Issues.MarkdownView.renderToken({type: 'no_way_this_is_a_valid_markdown_token'}));
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
      const component = new Issues.MarkdownView.MarkdownView();
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

  const renderString = (string: string, selector: 'p'|'code'): HTMLElement => {
    const component = new Issues.MarkdownView.MarkdownView();
    renderElementIntoDOM(component);
    component.data = {tokens: Marked.Marked.lexer(string)};
    assertShadowRoot(component.shadowRoot);
    const element = component.shadowRoot.querySelector(selector);
    return element ? element : document.createElement('span');
  };

  describe('escaping', () => {
    it('renders basic escaped non-html tag', () => {
      const paragraph = renderString('<123>', 'p');
      assert.strictEqual(paragraph.innerText, '<123>');
    });

    it('renders all unescaped chars', () => {
      const paragraph = renderString('<>&\'"', 'p');
      assert.strictEqual(paragraph.innerText, '<>&\'"');
    });

    it('renders all escaped chars', () => {
      const paragraph = renderString('&lt;&gt;&amp;&#39;&quot;', 'p');
      assert.strictEqual(paragraph.innerText, '<>&\'"');
    });

    it('renders basic escaped tag inside codespan', () => {
      const codeBlock = renderString('`<123>`', 'code');
      assert.strictEqual(codeBlock.innerText, '<123>');
    });
  });
});
