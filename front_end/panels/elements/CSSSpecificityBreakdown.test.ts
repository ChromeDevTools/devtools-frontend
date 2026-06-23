// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';

import * as Elements from './elements.js';

const {formatSpecificitySummary, formatSpecificityTooltip, getSpecificityBreakdown, getSpecificityBreakdownLines} =
    Elements.CSSSpecificityBreakdown;

describe('CSSSpecificityBreakdown', () => {
  setupLocaleHooks();

  describe('getSpecificityBreakdown', () => {
    it('groups protocol-provided contributions by specificity bucket', () => {
      const specificity = {
        a: 1,
        b: 2,
        c: 1,
        components: [
          {text: 'div', a: 0, b: 0, c: 1},
          {text: '#main', a: 1, b: 0, c: 0},
          {text: '.active', a: 0, b: 1, c: 0},
          {text: ':hover', a: 0, b: 1, c: 0},
        ],
      };

      const breakdown = getSpecificityBreakdown(specificity);
      assert.deepEqual(breakdown.ids, ['#main']);
      assert.deepEqual(breakdown.classes, ['.active', ':hover']);
      assert.deepEqual(breakdown.types, ['div']);
    });

    it('keeps a component in multiple buckets when it contributes to each', () => {
      const specificity = {
        a: 1,
        b: 1,
        c: 0,
        components: [
          {text: ':nth-child(2 of #hero)', a: 1, b: 1, c: 0},
        ],
      };

      const breakdown = getSpecificityBreakdown(specificity);
      assert.deepEqual(breakdown.ids, [':nth-child(2 of #hero)']);
      assert.deepEqual(breakdown.classes, [':nth-child(2 of #hero)']);
      assert.deepEqual(breakdown.types, []);
    });
  });

  describe('formatSpecificitySummary', () => {
    it('formats the summary line', () => {
      assert.strictEqual(formatSpecificitySummary({a: 1, b: 2, c: 3}), 'Specificity: (1,2,3)');
    });
  });

  describe('getSpecificityBreakdownLines', () => {
    it('returns bucket lines in a stable order', () => {
      const specificity = {
        a: 1,
        b: 1,
        c: 1,
        components: [
          {text: 'div', a: 0, b: 0, c: 1},
          {text: '#main', a: 1, b: 0, c: 0},
          {text: '.active', a: 0, b: 1, c: 0},
        ],
      };

      assert.deepEqual(getSpecificityBreakdownLines(specificity), [
        '(a) ID-like: #main',
        '(b) Class-like: .active',
        '(c) Type-like: div',
      ]);
    });
  });

  describe('formatSpecificityTooltip', () => {
    it('formats protocol-provided bucket labels', () => {
      const specificity = {
        a: 1,
        b: 1,
        c: 1,
        components: [
          {text: 'div', a: 0, b: 0, c: 1},
          {text: '#main', a: 1, b: 0, c: 0},
          {text: '.active', a: 0, b: 1, c: 0},
        ],
      };

      const result = formatSpecificityTooltip(specificity);
      assert.strictEqual(result,
                         'Specificity: (1,1,1)\n(a) ID-like: #main\n(b) Class-like: .active\n(c) Type-like: div');
    });

    it('formats repeated contributions with multipliers', () => {
      const specificity = {
        a: 2,
        b: 0,
        c: 0,
        components: [
          {text: ':is(#a, #b)', a: 2, b: 0, c: 0},
        ],
      };

      const result = formatSpecificityTooltip(specificity);
      assert.strictEqual(result, 'Specificity: (2,0,0)\n(a) ID-like: :is(#a, #b) x2');
    });

    it('shows totals when no component breakdown is available', () => {
      const result = formatSpecificityTooltip({a: 0, b: 1, c: 0});
      assert.strictEqual(result, 'Specificity: (0,1,0)');
    });
  });
});
