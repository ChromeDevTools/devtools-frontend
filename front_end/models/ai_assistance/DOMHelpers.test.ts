// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

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
});
