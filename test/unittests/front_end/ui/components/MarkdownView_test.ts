// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Marked from '../../../../../front_end/third_party/marked/marked.js';
import * as MarkdownView from '../../../../../front_end/ui/components/markdown_view/markdown_view.js';
import * as LitHtml from '../../../../../front_end/ui/lit-html/lit-html.js';
import {assertShadowRoot, renderElementIntoDOM} from '../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';

const {assert} = chai;

type TestToken = {
  type: string,
  tokens?: Marked.Marked.Token[],
  text?: string,
  href?: string,
  items?: Object[],
  depth?: number,
};

function getFakeToken(token: TestToken): Marked.Marked.Token {
  return token as unknown as Marked.Marked.Token;
}

describeWithEnvironment('MarkdownView', async () => {
  describe('renderToken', async () => {
    const renderer = new MarkdownView.MarkdownView.MarkdownLitRenderer();

    it('wraps paragraph tokens in <p> tags', () => {
      const renderResult = renderer.renderToken(getFakeToken({type: 'paragraph', tokens: []}));
      assert.deepStrictEqual(renderResult.strings.raw, ['<p>', '']);
    });

    it('wraps an unordered list token in <ul> tags', () => {
      const renderResult = renderer.renderToken(getFakeToken({type: 'list', items: []}));
      assert.deepStrictEqual(renderResult.strings.raw, ['<ul>', '</ul>']);
    });

    it('wraps list items in <li> tags', () => {
      const renderResult = renderer.renderToken(getFakeToken({type: 'list_item', tokens: []}));
      assert.deepStrictEqual(renderResult.strings.raw, ['<li>', '']);
    });

    it('wraps a codespan token in <code> tags', () => {
      const renderResult = renderer.renderToken(getFakeToken({type: 'codespan', text: 'const foo = 42;'}));
      assert.deepStrictEqual(renderResult.strings.raw, ['<code>', '</code>']);
      assert.deepStrictEqual(renderResult.values, ['const foo = 42;']);
    });

    it('renders childless text tokens as-is', () => {
      const renderResult = renderer.renderToken(getFakeToken({type: 'text', text: 'Simple text token'}));
      assert.deepStrictEqual(renderResult.values, ['Simple text token']);
    });

    it('renders nested text tokens correctly', () => {
      const renderResult = renderer.renderToken(getFakeToken({
        type: 'text',
        text: 'This text should not be rendered. Only the subtokens!',
        tokens: [
          getFakeToken({type: 'text', text: 'Nested raw text'}),
          getFakeToken({type: 'codespan', text: 'and a nested codespan to boot'}),
        ],
      }));

      const renderedParts = renderResult.values[0] as LitHtml.TemplateResult[];
      assert.strictEqual(renderedParts.length, 2);
      assert.deepStrictEqual(renderedParts[0].values, ['Nested raw text']);
      assert.deepStrictEqual(renderedParts[1].values, ['and a nested codespan to boot']);
    });

    it('throws an error for invalid or unsupported token types', () => {
      assert.throws(() => renderer.renderToken(getFakeToken({type: 'no_way_this_is_a_valid_markdown_token'})));
    });

    it('renders link with valid key', () => {
      MarkdownView.MarkdownLinksMap.markdownLinks.set('exampleLink', 'https://web.dev/');
      const renderResult =
          renderer.renderToken(getFakeToken({type: 'link', text: 'learn more', href: 'exampleLink'})).strings.join('');

      assert.isTrue(renderResult.includes('<devtools-markdown-link'));
    });

    it('throws an error if invalid link key is provided', () => {
      assert.throws(() => MarkdownView.MarkdownLinksMap.getMarkdownLink('testErrorLink'));
    });

    it('renders icon with valid key', () => {
      MarkdownView.MarkdownImagesMap.markdownImages.set('testExampleImage', {
        src: 'devices',
        isIcon: true,
      });
      const renderResult =
          renderer.renderToken(getFakeToken({type: 'image', text: 'phone', href: 'testExampleImage'})).strings.join('');
      assert.isTrue(renderResult.includes('<devtools-markdown-image'));
    });

    it('renders image with valid key', () => {
      MarkdownView.MarkdownImagesMap.markdownImages.set('exampleImage', {
        src: 'Images/phone-logo.png',
        isIcon: false,
      });
      const renderResult =
          renderer.renderToken(getFakeToken({type: 'image', text: 'phone', href: 'exampleImage'})).strings.join('');
      assert.isTrue(renderResult.includes('<devtools-markdown-image'));
    });

    it('throws an error if invalid image key is provided', () => {
      assert.throws(() => MarkdownView.MarkdownImagesMap.getMarkdownImage('testErrorImageLink'));
    });
    it('renders a heading correctly', () => {
      const renderResult =
          renderer.renderToken(getFakeToken({type: 'heading', text: 'a heading text', depth: 3})).strings.join('');

      assert.isTrue(renderResult.includes('<h3'));
    });
    it('renders strong correctly', () => {
      const renderResult = renderer.renderToken(getFakeToken({type: 'strong', text: 'a strong text'})).strings.join('');

      assert.isTrue(renderResult.includes('<strong'));
    });
    it('renders em correctly', () => {
      const renderResult = renderer.renderToken(getFakeToken({type: 'em', text: 'em text'})).strings.join('');

      assert.isTrue(renderResult.includes('<em'));
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

  const renderString =
      (string: string, selector: 'p'|'code', renderer?: MarkdownView.MarkdownView.MarkdownLitRenderer): HTMLElement => {
        const component = new MarkdownView.MarkdownView.MarkdownView();
        renderElementIntoDOM(component);
        component.data = {tokens: Marked.Marked.lexer(string), renderer};
        assertShadowRoot(component.shadowRoot);
        const element = component.shadowRoot.querySelector(selector);
        return element ? element : document.createElement('span');
      };

  describe('component', () => {
    it('renders basic markdown correctly', () => {
      const component = new MarkdownView.MarkdownView.MarkdownView();
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

    it('renders a codeblock', () => {
      const codeBlock = renderString(
          `\`\`\`
console.log('test')
\`\`\``,
          'code');
      assert.strictEqual(codeBlock.innerText, 'console.log(\'test\')');
    });

    it('renders using a custom renderer', () => {
      const codeBlock =
          renderString('`console.log()`', 'code', new class extends MarkdownView.MarkdownView.MarkdownLitRenderer {
            override templateForToken(token: Marked.Marked.Token): LitHtml.TemplateResult|null {
              if (token.type === 'codespan') {
                return LitHtml.html`<code>overriden</code>`;
              }
              return super.templateForToken(token);
            }
          }());
      assert.strictEqual(codeBlock.innerText, 'overriden');
    });
  });

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
