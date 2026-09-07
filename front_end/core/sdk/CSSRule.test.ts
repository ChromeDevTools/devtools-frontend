// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Protocol from '../../generated/protocol.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';

import * as SDK from './sdk.js';

describe('CSSStyleRule', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  describe('constructResolvedSelector', () => {
    function createMockRule(selectorText: string, nestingSelectors?: string[]): SDK.CSSRule.CSSStyleRule {
      return new SDK.CSSRule.CSSStyleRule({} as SDK.CSSModel.CSSModel, {
        origin: Protocol.CSS.StyleSheetOrigin.Regular,
        selectorList: {selectors: [{text: selectorText}], text: selectorText},
        nestingSelectors,
        style: {cssProperties: [], shorthandEntries: []},
      });
    }

    it('returns the selector unchanged when there are no nesting selectors', () => {
      assert.strictEqual(
          createMockRule('.card').constructResolvedSelector(),
          '.card',
      );
      assert.strictEqual(
          createMockRule('.card', []).constructResolvedSelector(),
          '.card',
      );
    });

    it('resolves singly-nested selector with &', () => {
      assert.strictEqual(
          createMockRule('& .title', ['.card']).constructResolvedSelector(),
          ':is(.card) .title',
      );
    });

    it('resolves singly-nested selector with direct child combinator', () => {
      assert.strictEqual(
          createMockRule('& > .child', ['.card']).constructResolvedSelector(),
          ':is(.card) > .child',
      );
    });

    it('resolves doubly-nested selectors', () => {
      const rule = createMockRule('& .title', ['& .card', '.container']);
      assert.strictEqual(
          rule.constructResolvedSelector(),
          ':is(:is(.container) .card) .title',
      );
      assert.strictEqual(
          rule.constructResolvedSelector(0),
          ':is(.container) .card',
      );
      assert.strictEqual(
          rule.constructResolvedSelector(1),
          '.container',
      );
    });

    it('resolves selectors with comma-separated parent selectors', () => {
      assert.strictEqual(
          createMockRule('& .title', ['.header, .sidebar']).constructResolvedSelector(),
          ':is(.header, .sidebar) .title',
      );
    });

    it('resolves nested selectors without explicit &', () => {
      assert.strictEqual(
          createMockRule('.title', ['.card']).constructResolvedSelector(),
          ':is(.card) .title',
      );
      assert.strictEqual(
          createMockRule('> .child', ['.card']).constructResolvedSelector(),
          ':is(.card) > .child',
      );
    });

    it('handles pseudo-elements correctly', () => {
      assert.strictEqual(
          createMockRule('&::before', ['.card']).constructResolvedSelector(),
          ':is(.card)::before',
      );
      assert.strictEqual(
          createMockRule('& .child', ['.card::before']).constructResolvedSelector(),
          ':is(.card) .child',
      );
    });

    it('returns undefined for out-of-bounds nesting indices', () => {
      const rule = createMockRule('& .title', ['.card']);
      assert.isUndefined(rule.constructResolvedSelector(-1));
      assert.isUndefined(rule.constructResolvedSelector(5));
    });
  });
});
