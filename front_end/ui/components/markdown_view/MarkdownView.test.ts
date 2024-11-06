// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as Marked from '../../../third_party/marked/marked.js';
import * as LitHtml from '../../lit-html/lit-html.js';

import * as MarkdownView from './markdown_view.js';

const {html} = LitHtml;

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

function renderTemplateResult(templateResult: LitHtml.TemplateResult): HTMLElement {
  const container = document.createElement('container');
  LitHtml.render(templateResult, container);  // eslint-disable-line rulesdir/lit_html_host_this
  return container;
}

describeWithEnvironment('MarkdownView', () => {
  describe('tokenizer', () => {
    it('tokenizers links in single quotes', () => {
      assert.deepStrictEqual(Marked.Marked.lexer('\'https://example.com\''), [
        {
          raw: '\'https://example.com\'',
          text: '\'https://example.com\'',
          tokens: [
            {
              raw: '\'',
              text: '&#39;',
              type: 'text',
            },
            {
              href: 'https://example.com',
              raw: 'https://example.com',
              text: 'https://example.com',
              tokens: [
                {
                  raw: 'https://example.com',
                  text: 'https://example.com',
                  type: 'text',
                },
              ],
              type: 'link',
            },
            {
              raw: '\'',
              text: '&#39;',
              type: 'text',
            },
          ],
          type: 'paragraph',
        },
      ] as unknown as Marked.Marked.TokensList);
    });
  });
  describe('MarkdownLitRenderer renderToken', () => {
    const renderer = new MarkdownView.MarkdownView.MarkdownLitRenderer();

    it('wraps paragraph tokens in <p> tags', () => {
      const container = renderTemplateResult(renderer.renderToken(getFakeToken({type: 'paragraph', tokens: []})));

      assert.exists(container.querySelector('p'));
    });

    it('wraps an unordered list token in <ul> tags', () => {
      const container = renderTemplateResult(renderer.renderToken(getFakeToken({type: 'list', items: []})));

      assert.exists(container.querySelector('ul'));
    });

    it('wraps list items in <li> tags', () => {
      const container = renderTemplateResult(renderer.renderToken(getFakeToken({type: 'list_item', tokens: []})));
      assert.exists(container.querySelector('li'));
    });

    it('wraps a codespan token in <code> tags', () => {
      const container =
          renderTemplateResult(renderer.renderToken(getFakeToken({type: 'codespan', text: 'const foo = 42;'})));

      const code = container.querySelector('code');
      assert.exists(code);
      assert.deepStrictEqual(code.textContent, 'const foo = 42;');
    });

    it('renders childless text tokens as-is', () => {
      const container =
          renderTemplateResult(renderer.renderToken(getFakeToken({type: 'text', text: 'Simple text token'})));

      assert.deepStrictEqual(container.childTextNodes().length, 1);
      assert.deepStrictEqual(container.childTextNodes()[0].textContent, 'Simple text token');
    });

    it('renders nested text tokens correctly', () => {
      const container = renderTemplateResult(renderer.renderToken(getFakeToken({
        type: 'text',
        text: 'This text should not be rendered. Only the subtokens!',
        tokens: [
          getFakeToken({type: 'text', text: 'Nested raw text'}),
          getFakeToken({type: 'codespan', text: 'and a nested codespan to boot'}),
        ],
      })));

      assert.notInclude(container.textContent, 'This text should not be rendered. Only the subtokens!');
      assert.include(container.textContent, 'Nested raw text');
      assert.exists(container.querySelector('code'));
      assert.deepStrictEqual(container.querySelector('code')?.textContent, 'and a nested codespan to boot');
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
    it('sets custom classes on the token types', () => {
      renderer.setCustomClasses({em: 'custom-class'});

      const renderResult = renderer.renderToken(getFakeToken({type: 'em', text: 'em text'}));
      const container = renderTemplateResult(renderResult);
      assert.isTrue(
          container.querySelector('em')?.classList.contains('custom-class'), 'Expected custom-class to be applied');
    });
  });

  describe('MarkdownInsightRenderer renderToken', () => {
    const renderer = new MarkdownView.MarkdownView.MarkdownInsightRenderer();
    it('renders link as an x-link', () => {
      const result =
          renderer.renderToken({type: 'link', text: 'learn more', href: 'https://example.com'} as Marked.Marked.Token);
      assert((result.values[0] as HTMLElement).tagName === 'X-LINK');
    });
    it('does not render URLs with "javascript:"', () => {
      const result = renderer.renderToken(
          {type: 'link', text: 'learn more', href: 'javascript:alert("test")'} as Marked.Marked.Token);
      assert(result.values[0] === undefined);
    });
    it('does not render chrome:// URLs', () => {
      const result =
          renderer.renderToken({type: 'link', text: 'learn more', href: 'chrome://settings'} as Marked.Marked.Token);
      assert(result.values[0] === undefined);
    });
    it('does not render invalid URLs', () => {
      const result = renderer.renderToken({type: 'link', text: 'learn more', href: '123'} as Marked.Marked.Token);
      assert(result.values[0] === undefined);
    });
    it('renders images as an x-link', () => {
      const result =
          renderer.renderToken({type: 'image', text: 'learn more', href: 'https://example.com'} as Marked.Marked.Token);
      assert((result.values[0] as HTMLElement).tagName === 'X-LINK');
    });
    it('renders headers as a strong element', () => {
      const result = renderer.renderToken({type: 'heading', text: 'learn more'} as Marked.Marked.Token);
      assert(result.strings.join('').includes('<strong>'));
    });
    it('renders unsupported tokens', () => {
      const result = renderer.renderToken({type: 'html', raw: '<!DOCTYPE html>'} as Marked.Marked.Token);
      assert(result.values.join('').includes('<!DOCTYPE html>'));
    });
    it('detects language but default to provided', () => {
      let result =
          renderer.detectCodeLanguage({text: 'const int foo = "bar"', lang: 'cpp'} as Marked.Marked.Tokens.Code);
      assert.strictEqual(result, 'cpp');
      result = renderer.detectCodeLanguage({text: '', lang: 'cpp'} as Marked.Marked.Tokens.Code);
      assert.strictEqual(result, 'cpp');
    });
    it('detects JavaScript language', () => {
      let result = renderer.detectCodeLanguage({text: 'const t = 2', lang: ''} as Marked.Marked.Tokens.Code);
      assert.strictEqual(result, 'js');
      result = renderer.detectCodeLanguage({text: 'let t = 2', lang: ''} as Marked.Marked.Tokens.Code);
      assert.strictEqual(result, 'js');
      result = renderer.detectCodeLanguage({text: 'var t = 2', lang: ''} as Marked.Marked.Tokens.Code);
      assert.strictEqual(result, 'js');
      result = renderer.detectCodeLanguage({text: 'function t(){}', lang: ''} as Marked.Marked.Tokens.Code);
      assert.strictEqual(result, 'js');
      result = renderer.detectCodeLanguage({text: 'async function t(){}', lang: ''} as Marked.Marked.Tokens.Code);
      assert.strictEqual(result, 'js');
      result = renderer.detectCodeLanguage(
          {text: 'import puppeteer from "puppeteer-core"', lang: ''} as Marked.Marked.Tokens.Code);
      assert.strictEqual(result, 'js');
    });
    it('doesn`t detect JavaScript language', () => {
      let result = renderer.detectCodeLanguage({text: 'constant F', lang: ''} as Marked.Marked.Tokens.Code);
      assert.strictEqual(result, '');
      result = renderer.detectCodeLanguage({text: 'variable', lang: ''} as Marked.Marked.Tokens.Code);
      assert.strictEqual(result, '');
      result = renderer.detectCodeLanguage(
          {text: 'functions are better then classes', lang: ''} as Marked.Marked.Tokens.Code);
      assert.strictEqual(result, '');
      result = renderer.detectCodeLanguage(
          {text: 'asynchronous code it hard to understand', lang: ''} as Marked.Marked.Tokens.Code);
      assert.strictEqual(result, '');
    });
    it('detects CSS language', () => {
      let result = renderer.detectCodeLanguage({text: '.myClass {}', lang: ''} as Marked.Marked.Tokens.Code);
      assert.strictEqual(result, 'css');
      result = renderer.detectCodeLanguage({text: '.myClass{}', lang: ''} as Marked.Marked.Tokens.Code);
      assert.strictEqual(result, 'css');
      result = renderer.detectCodeLanguage({text: 'my-component {}', lang: ''} as Marked.Marked.Tokens.Code);
      assert.strictEqual(result, 'css');
      result = renderer.detectCodeLanguage({text: 'my-component::after {}', lang: ''} as Marked.Marked.Tokens.Code);
      assert.strictEqual(result, 'css');
      result = renderer.detectCodeLanguage({text: '.foo::[name="bar"] {}', lang: ''} as Marked.Marked.Tokens.Code);
      assert.strictEqual(result, 'css');
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
      (string: string, selector: 'p'|'code'|'devtools-code-block',
       renderer?: MarkdownView.MarkdownView.MarkdownLitRenderer) => {
        const component = new MarkdownView.MarkdownView.MarkdownView();
        renderElementIntoDOM(component);
        component.data = {tokens: Marked.Marked.lexer(string), renderer};
        assert.isNotNull(component.shadowRoot);
        const element = component.shadowRoot.querySelector(selector);
        return element ? element : document.createElement('span');
      };

  describe('component', () => {
    it('renders basic markdown correctly', () => {
      const component = new MarkdownView.MarkdownView.MarkdownView();
      renderElementIntoDOM(component);

      component.data = {tokens: Marked.Marked.lexer(markdownString)};

      assert.isNotNull(component.shadowRoot);

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
          'devtools-code-block');
      assert.strictEqual((codeBlock as MarkdownView.CodeBlock.CodeBlock).code, 'console.log(\'test\')');
    });

    it('renders using a custom renderer', () => {
      const codeBlock =
          renderString('`console.log()`', 'code', new class extends MarkdownView.MarkdownView.MarkdownLitRenderer {
            override templateForToken(token: Marked.Marked.Token): LitHtml.TemplateResult|null {
              if (token.type === 'codespan') {
                return html`<code>overriden</code>`;
              }
              return super.templateForToken(token as Marked.Marked.MarkedToken);
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
