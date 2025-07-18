// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Deprecation from '../../../generated/Deprecation.js';
/* eslint-disable rulesdir/es-modules-import */
// @ts-expect-error
import ISSUE_DESCRIPTIONS from '../../../models/issues_manager/description_list.json' with {type : 'json'};
/* eslint-enable rulesdir/es-modules-import */
import * as IssuesManager from '../../../models/issues_manager/issues_manager.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as Marked from '../../../third_party/marked/marked.js';
import * as Lit from '../../lit/lit.js';

import * as MarkdownView from './markdown_view.js';

const {html} = Lit;

interface TestToken {
  type: string;
  tokens?: Marked.Marked.Token[];
  text?: string;
  href?: string;
  items?: Object[];
  depth?: number;
}

function getFakeToken(token: TestToken): Marked.Marked.Token {
  return token as unknown as Marked.Marked.Token;
}

function renderTemplateResult(templateResult: Lit.TemplateResult): HTMLElement {
  const container = document.createElement('container');
  Lit.render(templateResult, container);
  return container;
}

describeWithEnvironment('MarkdownView', () => {
  describe('tokenizer', () => {
    it('tokenizers links in single quotes', () => {
      assert.deepEqual(Marked.Marked.lexer('\'https://example.test\''), [
        {
          raw: '\'https://example.test\'',
          text: '\'https://example.test\'',
          tokens: [
            {
              raw: '\'',
              text: '&#39;',
              type: 'text',
            },
            {
              href: 'https://example.test',
              raw: 'https://example.test',
              text: 'https://example.test',
              tokens: [
                {
                  raw: 'https://example.test',
                  text: 'https://example.test',
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
      assert.deepEqual(code.textContent, 'const foo = 42;');
    });

    it('renders childless text tokens as-is', () => {
      const container =
          renderTemplateResult(renderer.renderToken(getFakeToken({type: 'text', text: 'Simple text token'})));

      assert.lengthOf(container.childTextNodes(), 1);
      assert.deepEqual(container.childTextNodes()[0].textContent, 'Simple text token');
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
      assert.deepEqual(container.querySelector('code')?.textContent, 'and a nested codespan to boot');
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
      renderer.addCustomClasses({em: 'custom-class'});

      const renderResult = renderer.renderToken(getFakeToken({type: 'em', text: 'em text'}));
      const container = renderTemplateResult(renderResult);
      assert.isTrue(
          container.querySelector('em')?.classList.contains('custom-class'), 'Expected custom-class to be applied');
    });
  });

  describe('MarkdownInsightRenderer renderToken', () => {
    const renderer = new MarkdownView.MarkdownView.MarkdownInsightRenderer();
    it('renders link as texts', () => {
      const result =
          renderer.renderToken({type: 'link', text: 'learn more', href: 'https://example.test'} as Marked.Marked.Token);
      assert.strictEqual(result.values[0], 'learn more');
    });
    it('renders link urls as texts', () => {
      const result = renderer.renderToken({type: 'link', href: 'https://example.test'} as Marked.Marked.Token);
      assert.strictEqual(result.values[0], 'https://example.test');
    });
    it('does not render URLs with "javascript:"', () => {
      const result = renderer.renderToken(
          {type: 'link', text: 'learn more', href: 'javascript:alert("test")'} as Marked.Marked.Token);
      assert.isUndefined(result.values[0]);
    });
    it('does not render chrome:// URLs', () => {
      const result =
          renderer.renderToken({type: 'link', text: 'learn more', href: 'chrome://settings'} as Marked.Marked.Token);
      assert.isUndefined(result.values[0]);
    });
    it('does not render invalid URLs', () => {
      const result = renderer.renderToken({type: 'link', text: 'learn more', href: '123'} as Marked.Marked.Token);
      assert.isUndefined(result.values[0]);
    });
    it('renders images as text', () => {
      const result = renderer.renderToken(
          {type: 'image', text: 'learn more', href: 'https://example.test'} as Marked.Marked.Token);
      assert.strictEqual(result.values[0], 'learn more');
    });
    it('renders image urls as text', () => {
      const result = renderer.renderToken({type: 'image', href: 'https://example.test'} as Marked.Marked.Token);
      assert.strictEqual(result.values[0], 'https://example.test');
    });
    it('renders headings as headings with the `insight` class', () => {
      const renderResult = renderer.renderToken(getFakeToken({type: 'heading', text: 'a heading text', depth: 3}));
      const container = renderTemplateResult(renderResult);
      assert.isTrue(
          container.querySelector('h3')?.classList.contains('insight'), 'Expected `insight`-class to be applied');
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

    it('doesn`t detects JSON as CSS language', () => {
      let result = renderer.detectCodeLanguage({text: '{ "test": "test" }', lang: ''} as Marked.Marked.Tokens.Code);
      assert.strictEqual(result, '');
      result = renderer.detectCodeLanguage({text: '{}', lang: ''} as Marked.Marked.Tokens.Code);
      assert.strictEqual(result, '');
      result = renderer.detectCodeLanguage({text: '{\n"test": "test"\n}', lang: ''} as Marked.Marked.Tokens.Code);
      assert.strictEqual(result, '');
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
      assert.lengthOf(paragraphs, 1);
      assert.strictEqual(paragraphs[0].innerText, paragraphText);

      const listItems = Array.from(component.shadowRoot.querySelectorAll('li'));
      assert.lengthOf(listItems, 2);
      assert.deepEqual(listItems.map(item => item.textContent), listItemTexts);
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
            override templateForToken(token: Marked.Marked.Token): Lit.TemplateResult|null {
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

// eslint-disable-next-line rulesdir/l10n-filename-matches
const strDeprecation = i18n.i18n.registerUIStrings('generated/Deprecation.ts', Deprecation.UIStrings);
const i18nDeprecationString = i18n.i18n.getLocalizedString.bind(undefined, strDeprecation);

describeWithEnvironment('Issue description smoke test', () => {
  // These tests load all the markdown issue descriptions and render each of them once, to make sure
  // syntax and links are valid.
  (ISSUE_DESCRIPTIONS as string[]).forEach(descriptionFile => {
    it(`renders ${descriptionFile} without throwing`, async () => {
      let descriptionContent = await IssuesManager.MarkdownIssueDescription.getMarkdownFileContent(descriptionFile);
      descriptionContent = descriptionContent.replaceAll(
          /\{(PLACEHOLDER_[a-zA-Z][a-zA-Z0-9]*)\}/g, '$1');  // Identity substitute placeholders.
      const issueDescription =
          IssuesManager.MarkdownIssueDescription.createIssueDescriptionFromRawMarkdown(descriptionContent, {
            file: descriptionFile,
            links: [],
          });

      assert.isNotEmpty(issueDescription.title, 'Title of a markdown description must never be empty');

      if (issueDescription.markdown.length === 0) {
        // Some markdown descriptions only have a title and no text. In that case
        // we don't have anything to render anyway.
        return;
      }

      const component = new MarkdownView.MarkdownView.MarkdownView();
      renderElementIntoDOM(component);
      component.data = {tokens: issueDescription.markdown};

      assert.isNotEmpty(component.shadowRoot!.deepTextContent());
    });
  });

  Object.keys(Deprecation.DEPRECATIONS_METADATA).forEach(deprecation => {
    // TODO(crbug.com/430801230): Re-enable these tests once the descriptions are fixed on the chromium side.
    if ([
          'CanRequestURLHTTPContainingNewline', 'CookieWithTruncatingChar', 'H1UserAgentFontSizeInSection',
          'RequestedSubresourceWithEmbeddedCredentials'
        ].includes(deprecation)) {
      return;
    }

    it(`renders the deprecation description for ${deprecation} without throwing`, async () => {
      const description = (Deprecation.UIStrings as Record<string, string>)[deprecation];
      const issueDescription = await IssuesManager.MarkdownIssueDescription.createIssueDescriptionFromMarkdown({
        file: 'deprecation.md',
        links: [],
        substitutions: new Map([
          ['PLACEHOLDER_title', 'Deprecated feature used'],
          ['PLACEHOLDER_message', i18nDeprecationString(description)],
        ]),
      });

      assert.isNotEmpty(issueDescription.title);
      assert.isNotEmpty(issueDescription.markdown);

      const component = new MarkdownView.MarkdownView.MarkdownView();
      renderElementIntoDOM(component);
      component.data = {tokens: issueDescription.markdown};

      assert.isNotEmpty(component.shadowRoot!.deepTextContent());
    });
  });
});
