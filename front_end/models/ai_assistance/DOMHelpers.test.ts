// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import * as AiAssistance from './ai_assistance.js';

describe('DOMHelpers', () => {
  describe('stringifyObjectOnThePage', () => {
    describe('HTMLElement', () => {
      it('should work with plain nodes', async () => {
        const el = document.createElement('div');
        assert.strictEqual(AiAssistance.DOMHelpers.stringifyObjectOnThePage.apply(el), '"<div></div>"');
      });

      it('should serialize node with classes', async () => {
        const el = document.createElement('div');
        el.classList.add('section');
        el.classList.add('section-main');
        assert.strictEqual(AiAssistance.DOMHelpers.stringifyObjectOnThePage.apply(el),
                           '"<div class=\\"section section-main\\"></div>"');
      });

      it('should serialize node with id', async () => {
        const el = document.createElement('div');
        el.id = 'promotion-section';
        assert.strictEqual(AiAssistance.DOMHelpers.stringifyObjectOnThePage.apply(el),
                           '"<div id=\\"promotion-section\\"></div>"');
      });

      it('should serialize node with class and id', async () => {
        const el = document.createElement('div');
        el.id = 'promotion-section';
        el.classList.add('section');
        assert.strictEqual(AiAssistance.DOMHelpers.stringifyObjectOnThePage.apply(el),
                           '"<div id=\\"promotion-section\\" class=\\"section\\"></div>"');
      });

      it('should serialize node with children', async () => {
        const el = document.createElement('div');
        const p = document.createElement('p');
        el.appendChild(p);
        assert.strictEqual(AiAssistance.DOMHelpers.stringifyObjectOnThePage.apply(el), '"<div>...</div>"');
      });
    });

    it('should serialize arrays correctly', async () => {
      assert.strictEqual(AiAssistance.DOMHelpers.stringifyObjectOnThePage.apply([]), '[]');
      assert.strictEqual(AiAssistance.DOMHelpers.stringifyObjectOnThePage.apply([1]), '[1]');
      assert.strictEqual(AiAssistance.DOMHelpers.stringifyObjectOnThePage.apply([1, 2]), '[1,2]');
      assert.strictEqual(AiAssistance.DOMHelpers.stringifyObjectOnThePage.apply([{key: 1}]), '[{"key":1}]');
    });

    it('should serialize objects correctly', async () => {
      assert.strictEqual(AiAssistance.DOMHelpers.stringifyObjectOnThePage.apply({key: 'str'}), '{"key":"str"}');
      assert.strictEqual(AiAssistance.DOMHelpers.stringifyObjectOnThePage.apply({key: 'str', secondKey: 'str2'}),
                         '{"key":"str","secondKey":"str2"}');
      assert.strictEqual(AiAssistance.DOMHelpers.stringifyObjectOnThePage.apply({key: 1}), '{"key":1}');
    });

    it('should not continue serializing cycles', async () => {
      const obj: {a: number, itself?: object} = {a: 1};
      obj.itself = obj;
      assert.strictEqual(AiAssistance.DOMHelpers.stringifyObjectOnThePage.apply(obj), '{"a":1,"itself":"(cycle)"}');
    });

    it('should not include number keys for CSSStyleDeclaration', async () => {
      const result = AiAssistance.DOMHelpers.stringifyObjectOnThePage.apply(getComputedStyle(document.body));
      const parsedResult = JSON.parse(result);
      assert.isUndefined(parsedResult[0]);
    });
  });

  describe('sanitizeStyleChanges', () => {
    it('converts camelCase keys to kebab-case and retains valid CSS declarations', async () => {
      const sanitized = await AiAssistance.DOMHelpers.sanitizeStyleChanges('div', {
        backgroundColor: 'red',
        fontSize: '14px',
      });
      assert.deepEqual(sanitized, {
        'background-color': 'red',
        'font-size': '14px',
      });
    });

    it('drops invalid CSS property names and values', async () => {
      const sanitized = await AiAssistance.DOMHelpers.sanitizeStyleChanges('div', {
        color: 'not-a-valid-color-value',
        unknownProperty: '123',
      });
      assert.deepEqual(sanitized, {});
    });

    it('rejects CSS values containing url(), image-set(), src(), or CSS-escaped url() functions', async () => {
      const sanitized = await AiAssistance.DOMHelpers.sanitizeStyleChanges('div', {
        color: 'red',
        backgroundImage: 'url("https://attacker.example/leak")',
        borderImageSource: 'image-set("https://attacker.example/leak.png" 1x)',
        maskImage: '-webkit-image-set(url("https://attacker.example/leak.png") 1x)',
        cursor: 'src("https://attacker.example/cursor.png"), pointer',
        listStyleImage: '\\75\\72\\6c("https://attacker.example/escaped")',
      });
      assert.deepEqual(sanitized, {
        color: 'red',
      });
    });

    it('retains valid var() custom property references', async () => {
      const sanitized = await AiAssistance.DOMHelpers.sanitizeStyleChanges('div', {
        color: 'var(--theme-text, blue)',
      });
      assert.deepEqual(sanitized, {
        color: 'var(--theme-text, blue)',
      });
    });

    it('retains single-quoted strings that CSSOM serializes with escaped double quotes', async () => {
      const sanitized = await AiAssistance.DOMHelpers.sanitizeStyleChanges('div', {
        content: '\'"AI"\'',
      });
      assert.deepEqual(sanitized, {
        content: '"\\"AI\\""',
      });
    });

    it('rejects CSS backslash-escaped url() functions inside var() declarations', async () => {
      const sanitized = await AiAssistance.DOMHelpers.sanitizeStyleChanges('div', {
        color: 'red',
        backgroundImage: 'var(--unset, \\75\\72\\6c("https://attacker.example/leak"))',
        maskImage: 'var(--unset, ur\\l("https://attacker.example/leak"))',
      });
      assert.deepEqual(sanitized, {
        color: 'red',
      });
    });

    it('rejects CSS values containing /* comment openers', async () => {
      const sanitized = await AiAssistance.DOMHelpers.sanitizeStyleChanges('div', {
        color: 'red',
        content: '"/*" url("https://attacker.example/leak?*/")',
        borderImage: 'var(--unset, stretch/**/url("https://attacker.example/leak"))',
        backgroundColor: 'blue /* comment */',
      });
      assert.deepEqual(sanitized, {
        color: 'red',
      });
    });
  });

  describe('removeInlineStyleProperties', () => {
    it('removes matching kebab-case and camelCase properties while preserving others', () => {
      const updated = AiAssistance.DOMHelpers.removeInlineStyleProperties(
          'color: blue; background-color: yellow; font-size: 16px;',
          {color: 'red', backgroundColor: 'green'},
      );
      assert.strictEqual(updated, 'font-size: 16px;');
    });

    it('returns empty string when all inline properties are removed', () => {
      const updated = AiAssistance.DOMHelpers.removeInlineStyleProperties(
          'color: blue;',
          {color: 'red'},
      );
      assert.strictEqual(updated, '');
    });
  });

  describe('adoptStyleSheetInShadowRoot', () => {
    it('appends a new adopted stylesheet to a shadow root alongside existing stylesheets', () => {
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({mode: 'open'});
      const child = document.createElement('button');
      shadowRoot.appendChild(child);

      const preExistingSheet = new CSSStyleSheet();
      preExistingSheet.replaceSync('button { padding: 4px; }');
      // eslint-disable-next-line @devtools/no-adopted-style-sheets
      shadowRoot.adoptedStyleSheets = [preExistingSheet];

      AiAssistance.DOMHelpers.adoptStyleSheetInShadowRoot.call(
          child,
          'ai-style-change',
          '.ai-style-change-1 { button& { color: red; } }',
      );

      // eslint-disable-next-line @devtools/no-adopted-style-sheets
      assert.lengthOf(shadowRoot.adoptedStyleSheets, 2);
      // eslint-disable-next-line @devtools/no-adopted-style-sheets
      assert.include(shadowRoot.adoptedStyleSheets[1].cssRules[0].cssText, 'color: red');
    });

    it('updates an existing AI stylesheet in place when surrounded by non-AI stylesheets', () => {
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({mode: 'open'});
      const child = document.createElement('button');
      shadowRoot.appendChild(child);

      const preExistingSheet = new CSSStyleSheet();
      preExistingSheet.replaceSync('button { padding: 4px; }');
      const existingAiSheet = new CSSStyleSheet();
      existingAiSheet.replaceSync('.ai-style-change-1 { button& { color: red; } }');
      const trailingSheet = new CSSStyleSheet();
      trailingSheet.replaceSync('button { margin: 2px; }');
      // eslint-disable-next-line @devtools/no-adopted-style-sheets
      shadowRoot.adoptedStyleSheets = [preExistingSheet, existingAiSheet, trailingSheet];

      AiAssistance.DOMHelpers.adoptStyleSheetInShadowRoot.call(
          child,
          'ai-style-change',
          '.ai-style-change-1 { button& { color: blue; } }',
      );

      // eslint-disable-next-line @devtools/no-adopted-style-sheets
      assert.lengthOf(shadowRoot.adoptedStyleSheets, 3);
      // eslint-disable-next-line @devtools/no-adopted-style-sheets
      assert.include(shadowRoot.adoptedStyleSheets[1].cssRules[0].cssText, 'color: blue');
    });

    it('no-ops when element is not inside a ShadowRoot', () => {
      const el = document.createElement('div');
      assert.doesNotThrow(() => {
        AiAssistance.DOMHelpers.adoptStyleSheetInShadowRoot.call(
            el,
            'ai-style-change',
            '.ai-style-change-1 { div& { color: red; } }',
        );
      });
    });
  });
});
