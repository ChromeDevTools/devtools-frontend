// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import * as Marked from '../../../third_party/marked/marked.js';

import * as MarkdownView from './markdown_view.js';

describeWithEnvironment('MarkdownPlaceholderLitRenderer', () => {
  it('keeps standard <devtools-markdown-view> unaware of placeholders unless tokenizeWithPlaceholders and MarkdownPlaceholderLitRenderer are used',
     () => {
       const rawMarkdown = 'Invalid value for {PLACEHOLDER_Type} attribute.';

       const baseTokens = Marked.Marked.lexer(rawMarkdown);
       const baseParagraph = baseTokens[0] as Marked.Marked.Tokens.Paragraph;
       assert.isFalse(baseParagraph.tokens?.some(t => t.type === 'placeholder'));

       const baseComponent = new MarkdownView.MarkdownView.MarkdownView();
       renderElementIntoDOM(baseComponent);
       baseComponent.data = {tokens: baseTokens};
       assert.isNull(
           baseComponent.shadowRoot?.querySelector('.markdown-placeholder'),
       );
       assert.strictEqual(
           baseComponent.shadowRoot?.querySelector('p')?.textContent?.trim(),
           'Invalid value for {PLACEHOLDER_Type} attribute.',
       );

       const placeholderTokens = MarkdownView.MarkdownPlaceholderLitRenderer.tokenizeWithPlaceholders(
           rawMarkdown,
       );
       const placeholderParagraph = placeholderTokens[0] as Marked.Marked.Tokens.Paragraph;
       assert.isTrue(
           placeholderParagraph.tokens?.some(t => t.type === 'placeholder'),
       );
     });

  it('safely renders substitution payloads as plain text without creating links or altering the Markdown AST', () => {
    const rawMarkdown = 'Check out this {PLACEHOLDER_Link} in the description.';
    const substitutions = new Map([
      ['PLACEHOLDER_Link', '[Spoofed Link](https://developer.chrome.com)'],
    ]);
    const tokens = MarkdownView.MarkdownPlaceholderLitRenderer.tokenizeWithPlaceholders(
        rawMarkdown,
        substitutions,
    );

    const component = new MarkdownView.MarkdownView.MarkdownView();
    renderElementIntoDOM(component);
    component.data = {
      tokens,
      renderer: new MarkdownView.MarkdownPlaceholderLitRenderer.MarkdownPlaceholderLitRenderer(
          substitutions,
          ),
    };

    const placeholderSpan = component.shadowRoot?.querySelector(
        '.markdown-placeholder',
    );
    assert.exists(placeholderSpan);
    assert.strictEqual(
        placeholderSpan.textContent,
        '[Spoofed Link](https://developer.chrome.com)',
    );
    assert.isNull(component.shadowRoot?.querySelector('a'));
    assert.isNull(component.shadowRoot?.querySelector('devtools-link'));
  });

  it('does not resolve links pointing to MDN (either direct URLs or registered MarkdownLinksMap keys) from placeholder text',
     () => {
       const mdnUrl = 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS';
       MarkdownView.MarkdownLinksMap.markdownLinks.set('mdnCorsKey', mdnUrl);
       MarkdownView.MarkdownLinksMap.markdownLinks.set(mdnUrl, mdnUrl);

       const rawMarkdown = 'Header info: {PLACEHOLDER_DirectMdn} and {PLACEHOLDER_MappedMdn}';
       const substitutions = new Map([
         ['PLACEHOLDER_DirectMdn', `[MDN CORS](${mdnUrl})`],
         ['PLACEHOLDER_MappedMdn', '[MDN CORS](mdnCorsKey)'],
       ]);
       const tokens = MarkdownView.MarkdownPlaceholderLitRenderer.tokenizeWithPlaceholders(
           rawMarkdown,
           substitutions,
       );

       const component = new MarkdownView.MarkdownView.MarkdownView();
       renderElementIntoDOM(component);
       component.data = {
         tokens,
         renderer: new MarkdownView.MarkdownPlaceholderLitRenderer.MarkdownPlaceholderLitRenderer(
             substitutions,
             ),
       };

       const placeholderSpans = Array.from(
           component.shadowRoot?.querySelectorAll('.markdown-placeholder') ?? [],
       );
       assert.lengthOf(placeholderSpans, 2);
       assert.strictEqual(
           placeholderSpans[0].textContent,
           `[MDN CORS](${mdnUrl})`,
       );
       assert.strictEqual(
           placeholderSpans[1].textContent,
           '[MDN CORS](mdnCorsKey)',
       );
       assert.isNull(component.shadowRoot?.querySelector('a'));
       assert.isNull(component.shadowRoot?.querySelector('devtools-link'));
     });

  it('falls back cleanly to {PLACEHOLDER_Name} when substitutions are omitted without throwing', () => {
    const rawMarkdown = 'Missing substitution for {PLACEHOLDER_Name}.';
    const tokens = MarkdownView.MarkdownPlaceholderLitRenderer.tokenizeWithPlaceholders(
        rawMarkdown,
    );

    const component = new MarkdownView.MarkdownView.MarkdownView();
    renderElementIntoDOM(component);
    assert.doesNotThrow(() => {
      component.data = {
        tokens,
        renderer: new MarkdownView.MarkdownPlaceholderLitRenderer.MarkdownPlaceholderLitRenderer(),
      };
    });

    const placeholderSpan = component.shadowRoot?.querySelector(
        '.markdown-placeholder',
    );
    assert.exists(placeholderSpan);
    assert.strictEqual(placeholderSpan.textContent, '{PLACEHOLDER_Name}');
  });

  it('validates placeholder keys and required replacements when substitutions are provided', () => {
    assert.throws(() => {
      MarkdownView.MarkdownPlaceholderLitRenderer.tokenizeWithPlaceholders(
          Marked.Marked.lexer('Missing {PLACEHOLDER_PH1}'),
          new Map(),
      );
    }, /No replacement provided for placeholder/);

    assert.throws(() => {
      MarkdownView.MarkdownPlaceholderLitRenderer.tokenizeWithPlaceholders(
          Marked.Marked.lexer('Invalid key'),
          new Map([['invalid_ph', 'foo']]),
      );
    }, /Invalid placeholder 'invalid_ph' provided/);

    assert.throws(() => {
      MarkdownView.MarkdownPlaceholderLitRenderer.tokenizeWithPlaceholders(
          Marked.Marked.lexer('No placeholders used here'),
          new Map([['PLACEHOLDER_Unused', 'foo']]),
      );
    }, /Unused replacements provided: PLACEHOLDER_Unused/);
  });

  it('resolves placeholders inside inline codespans and fenced code blocks', () => {
    const rawMarkdown = 'Inline `{PLACEHOLDER_Inline}` and block:\n\n```\n{PLACEHOLDER_Block}\n```';
    const substitutions = new Map([
      ['PLACEHOLDER_Inline', 'inline-val'],
      ['PLACEHOLDER_Block', 'initial-value: invalid'],
    ]);
    const tokens = MarkdownView.MarkdownPlaceholderLitRenderer.tokenizeWithPlaceholders(
        Marked.Marked.lexer(rawMarkdown),
        substitutions,
    );

    const component = new MarkdownView.MarkdownView.MarkdownView();
    renderElementIntoDOM(component);
    component.data = {
      tokens,
      renderer: new MarkdownView.MarkdownPlaceholderLitRenderer.MarkdownPlaceholderLitRenderer(
          substitutions,
          ),
    };

    const codeSpan = component.shadowRoot?.querySelector('code');
    assert.exists(codeSpan);
    assert.strictEqual(codeSpan.textContent, 'inline-val');

    const codeBlock = component.shadowRoot?.querySelector(
        'devtools-code-block',
    );
    assert.exists(codeBlock);
    assert.strictEqual(
        (codeBlock as MarkdownView.CodeBlock.CodeBlock).code,
        'initial-value: invalid',
    );
  });

  it('resolves placeholders inside markdown link text', () => {
    MarkdownView.MarkdownLinksMap.markdownLinks.set(
        'gracePeriodStagedControlExplainer',
        'https://example.com/opt-out',
    );
    const rawMarkdown = 'Read [more about {PLACEHOLDER_Topic}](gracePeriodStagedControlExplainer).';
    const substitutions = new Map([
      ['PLACEHOLDER_Topic', 'third-party cookies'],
    ]);
    const tokens = MarkdownView.MarkdownPlaceholderLitRenderer.tokenizeWithPlaceholders(
        Marked.Marked.lexer(rawMarkdown),
        substitutions,
    );

    const component = new MarkdownView.MarkdownView.MarkdownView();
    renderElementIntoDOM(component);
    component.data = {
      tokens,
      renderer: new MarkdownView.MarkdownPlaceholderLitRenderer.MarkdownPlaceholderLitRenderer(
          substitutions,
          ),
    };

    const link = component.shadowRoot?.querySelector('devtools-link');
    assert.exists(link);
    assert.strictEqual(link.textContent, 'more about third-party cookies');
  });

  it('resolves placeholders inside markdown table cells and image alt text', () => {
    MarkdownView.MarkdownImagesMap.markdownImages.set('test-placeholder-img', {
      src: 'Images/issue-cross-filled.svg',
      isIcon: false,
    });
    const rawMarkdown = [
      '| {PLACEHOLDER_Header} |',
      '| --- |',
      '| {PLACEHOLDER_Cell} |',
      '',
      '![Icon for {PLACEHOLDER_Alt}](test-placeholder-img)',
    ].join('\n');
    const substitutions = new Map([
      ['PLACEHOLDER_Header', 'Column Header'],
      ['PLACEHOLDER_Cell', 'Cell Value'],
      ['PLACEHOLDER_Alt', 'warning'],
    ]);
    const tokens = MarkdownView.MarkdownPlaceholderLitRenderer.tokenizeWithPlaceholders(
        Marked.Marked.lexer(rawMarkdown),
        substitutions,
    );

    const component = new MarkdownView.MarkdownView.MarkdownView();
    renderElementIntoDOM(component);
    component.data = {
      tokens,
      renderer: new MarkdownView.MarkdownPlaceholderLitRenderer.MarkdownPlaceholderLitRenderer(
          substitutions,
          ),
    };

    assert.strictEqual(
        component.shadowRoot?.querySelector('th')?.textContent?.trim(),
        'Column Header',
    );
    assert.strictEqual(
        component.shadowRoot?.querySelector('td')?.textContent?.trim(),
        'Cell Value',
    );

    const imgComponent = component.shadowRoot?.querySelector(
        'devtools-markdown-image',
    );
    assert.exists(imgComponent);
    const innerImg = imgComponent.shadowRoot?.querySelector('img');
    assert.strictEqual(innerImg?.getAttribute('alt'), 'Icon for warning');
  });
});
