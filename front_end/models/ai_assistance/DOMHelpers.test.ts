// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import * as AiAssistance from './ai_assistance.js';

describe('DOMHelpers', () => {
  describe('stringifyObjectOnThePage', () => {
    describe('HTMLElement', () => {
      it('serializes plain nodes without options', () => {
        const el = document.createElement('div');
        assert.deepEqual(AiAssistance.DOMHelpers.stringifyObjectOnThePage.call(el), {
          json: '"<div></div>"',
          elements: [],
        });
      });

      it('serializes nodes with classes', () => {
        const el = document.createElement('div');
        el.classList.add('section');
        el.classList.add('section-main');
        assert.deepEqual(AiAssistance.DOMHelpers.stringifyObjectOnThePage.call(el), {
          json: '"<div class=\\"section section-main\\"></div>"',
          elements: [],
        });
      });

      it('serializes nodes with id', () => {
        const el = document.createElement('div');
        el.id = 'promotion-section';
        assert.deepEqual(AiAssistance.DOMHelpers.stringifyObjectOnThePage.call(el), {
          json: '"<div id=\\"promotion-section\\"></div>"',
          elements: [],
        });
      });

      it('serializes nodes with class and id', () => {
        const el = document.createElement('div');
        el.id = 'promotion-section';
        el.classList.add('section');
        assert.deepEqual(AiAssistance.DOMHelpers.stringifyObjectOnThePage.call(el), {
          json: '"<div id=\\"promotion-section\\" class=\\"section\\"></div>"',
          elements: [],
        });
      });

      it('serializes nodes with children', () => {
        const el = document.createElement('div');
        const p = document.createElement('p');
        el.appendChild(p);
        assert.deepEqual(AiAssistance.DOMHelpers.stringifyObjectOnThePage.call(el), {
          json: '"<div>...</div>"',
          elements: [],
        });
      });
    });

    it('serializes arrays correctly', () => {
      assert.deepEqual(AiAssistance.DOMHelpers.stringifyObjectOnThePage.call([]), {json: '[]', elements: []});
      assert.deepEqual(AiAssistance.DOMHelpers.stringifyObjectOnThePage.call([1]), {json: '[1]', elements: []});
      assert.deepEqual(AiAssistance.DOMHelpers.stringifyObjectOnThePage.call([1, 2]), {json: '[1,2]', elements: []});
      assert.deepEqual(AiAssistance.DOMHelpers.stringifyObjectOnThePage.call([{key: 1}]), {
        json: '[{"key":1}]',
        elements: [],
      });
    });

    it('serializes objects correctly', () => {
      assert.deepEqual(AiAssistance.DOMHelpers.stringifyObjectOnThePage.call({key: 'str'}), {
        json: '{"key":"str"}',
        elements: [],
      });
      assert.deepEqual(
          AiAssistance.DOMHelpers.stringifyObjectOnThePage.call({key: 'str', secondKey: 'str2'}),
          {json: '{"key":"str","secondKey":"str2"}', elements: []},
      );
      assert.deepEqual(AiAssistance.DOMHelpers.stringifyObjectOnThePage.call({key: 1}), {
        json: '{"key":1}',
        elements: [],
      });
    });

    it('stops serializing cycles', () => {
      const obj: {a: number, itself?: object} = {a: 1};
      obj.itself = obj;
      assert.deepEqual(AiAssistance.DOMHelpers.stringifyObjectOnThePage.call(obj), {
        json: '{"a":1,"itself":"(cycle)"}',
        elements: [],
      });
    });

    it('omits number keys for CSSStyleDeclaration', () => {
      const {json, elements} = AiAssistance.DOMHelpers.stringifyObjectOnThePage.call(getComputedStyle(document.body));
      if (json === undefined) {
        assert.fail('Expected JSON string');
      }
      const parsedResult = JSON.parse(json);
      assert.isUndefined(parsedResult[0]);
      assert.deepEqual(elements, []);
    });

    it('serializes SVGElement without options as plain JSON with empty elements', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'icon';
      svg.classList.add('logo');
      assert.deepEqual(AiAssistance.DOMHelpers.stringifyObjectOnThePage.call(svg), {
        json: '"<svg id=\\"icon\\" class=\\"logo\\"></svg>"',
        elements: [],
      });
    });

    it('serializes a plain object with options and collects no elements', () => {
      const result = AiAssistance.DOMHelpers.stringifyObjectOnThePage.call(
          {key: 'str'},
          {maxElements: 50, uidPlaceholderPrefix: '__uid_'},
      );
      assert.deepEqual(result, {
        json: '{"key":"str"}',
        elements: [],
      });
    });

    it('collects elements and emits indexed placeholder prefixes when options are provided', () => {
      const el1 = document.createElement('div');
      el1.id = 'hero';
      el1.classList.add('banner');
      el1.appendChild(document.createElement('p'));
      const el2 = document.createElement('span');
      const result = AiAssistance.DOMHelpers.stringifyObjectOnThePage.call(
          {first: el1, second: el2},
          {maxElements: 50, uidPlaceholderPrefix: '__uid_'},
      );
      assert.strictEqual(
          result.json,
          '{"first":"__uid_0__<div id=\\"hero\\" class=\\"banner\\">...</div>","second":"__uid_1__<span></span>"}',
      );
      assert.deepEqual(result.elements, [el1, el2]);
    });

    it('deduplicates repeated element references as cycles while collecting handles', () => {
      const el1 = document.createElement('div');
      const el2 = document.createElement('span');
      const result = AiAssistance.DOMHelpers.stringifyObjectOnThePage.call(
          {first: el1, list: [el2, el1]},
          {maxElements: 50, uidPlaceholderPrefix: '__uid_'},
      );
      assert.strictEqual(
          result.json,
          '{"first":"__uid_0__<div></div>","list":["__uid_1__<span></span>","(cycle)"]}',
      );
      assert.deepEqual(result.elements, [el1, el2]);
    });

    it('stops collecting elements and emitting placeholders once maxElements is reached', () => {
      const el1 = document.createElement('div');
      const el2 = document.createElement('span');
      const el3 = document.createElement('p');
      const result = AiAssistance.DOMHelpers.stringifyObjectOnThePage.call(
          [el1, el2, el3],
          {maxElements: 2, uidPlaceholderPrefix: '__uid_'},
      );
      assert.strictEqual(
          result.json,
          '["__uid_0__<div></div>","__uid_1__<span></span>","<p></p>"]',
      );
      assert.deepEqual(result.elements, [el1, el2]);
    });

    it('snapshots a live HTMLCollection with options before subsequent DOM mutations', () => {
      const container = document.createElement('div');
      const first = document.createElement('div');
      first.id = 'first';
      const second = document.createElement('span');
      second.id = 'second';
      container.append(first, second);

      const result = AiAssistance.DOMHelpers.stringifyObjectOnThePage.call(
          container.children,
          {maxElements: 50, uidPlaceholderPrefix: '__uid_'},
      );
      const prepended = document.createElement('p');
      prepended.id = 'prepended';
      container.prepend(prepended);

      assert.strictEqual(
          result.json,
          '{"0":"__uid_0__<div id=\\"first\\"></div>","1":"__uid_1__<span id=\\"second\\"></span>"}',
      );
      assert.deepEqual(result.elements, [first, second]);
    });

    it('returns undefined json and empty elements for non-JSON-serializable values', () => {
      const result = AiAssistance.DOMHelpers.stringifyObjectOnThePage.call({toJSON: () => undefined});
      assert.deepEqual(result, {json: undefined, elements: []});
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

    it('preserves !important priority across longhand, shorthand, and var() declarations', async () => {
      const sanitized = await AiAssistance.DOMHelpers.sanitizeStyleChanges('div', {
        height: 'auto !important',
        padding: '10px 20px !important',
        color: 'var(--theme-text, blue) !important',
        fontSize: '14px',
      });
      assert.deepEqual(sanitized, {
        height: 'auto !important',
        padding: '10px 20px !important',
        color: 'var(--theme-text, blue) !important',
        'font-size': '14px',
      });
    });

    it('rejects invalid CSS declarations and disallowed URL functions with !important', async () => {
      const sanitized = await AiAssistance.DOMHelpers.sanitizeStyleChanges('div', {
        color: 'red !important',
        width: '!important',
        backgroundColor: 'not-a-valid-color-value !important',
        backgroundImage: 'url("https://attacker.example/leak") !important',
      });
      assert.deepEqual(sanitized, {
        color: 'red !important',
      });
    });

    it('sanitizes mixed-priority shorthand and longhand declarations independently', async () => {
      const sanitized = await AiAssistance.DOMHelpers.sanitizeStyleChanges('div', {
        padding: '10px',
        paddingTop: '20px !important',
        margin: '8px !important',
        marginBottom: '0px',
      });
      assert.deepEqual(sanitized, {
        padding: '10px',
        'padding-top': '20px !important',
        margin: '8px !important',
        'margin-bottom': '0px',
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
