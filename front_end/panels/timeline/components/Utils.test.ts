// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Trace from '../../../models/trace/trace.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';

import * as Utils from './Utils.js';

describeWithEnvironment('Utils', () => {
  describe('NumberWithUnit', () => {
    const {NumberWithUnit} = Utils;

    it('renders number with unit (formatMicroSecondsAsSeconds)', () => {
      const result = NumberWithUnit.formatMicroSecondsAsSeconds(100_000 as Trace.Types.Timing.MicroSeconds);
      assert.strictEqual(result.text, '0.10s');
      assert.strictEqual(result.element.textContent, '0.10s');
      assert.strictEqual(result.element.querySelector('.unit')?.textContent, 's');
    });

    it('renders number with unit (formatMicroSecondsAsMillisFixed)', () => {
      const result = NumberWithUnit.formatMicroSecondsAsMillisFixed(100_000 as Trace.Types.Timing.MicroSeconds);
      assert.strictEqual(result.text, '100ms');
      assert.strictEqual(result.element.textContent, '100ms');
      assert.strictEqual(result.element.querySelector('.unit')?.textContent, 'ms');
    });

    it('parse', () => {
      // en
      assert.deepStrictEqual(NumberWithUnit.parse('100[s]()'), {firstPart: '100', unitPart: 's', lastPart: ''});
      assert.deepStrictEqual(NumberWithUnit.parse('100 [s]()'), {firstPart: '100 ', unitPart: 's', lastPart: ''});

      // Decimal separators
      assert.deepStrictEqual(
          NumberWithUnit.parse('100.123[ms]()'), {firstPart: '100.123', unitPart: 'ms', lastPart: ''});
      assert.deepStrictEqual(NumberWithUnit.parse('100,2[s]()'), {firstPart: '100,2', unitPart: 's', lastPart: ''});

      // zh
      assert.deepStrictEqual(NumberWithUnit.parse('100[毫秒]()'), {firstPart: '100', unitPart: '毫秒', lastPart: ''});
      // zh-Hans-CN-u-nu-hanidec
      assert.deepStrictEqual(
          NumberWithUnit.parse('一〇〇[毫秒]()'), {firstPart: '一〇〇', unitPart: '毫秒', lastPart: ''});

      // ar-SA (RTL language, but the UIString still places the number first in the string)
      assert.deepStrictEqual(
          NumberWithUnit.parse('١٠٠[ملي ثانية]()'), {firstPart: '١٠٠', unitPart: 'ملي ثانية', lastPart: ''});

      // ar
      assert.deepStrictEqual(
          NumberWithUnit.parse('100[ملي ثانية]()'), {firstPart: '100', unitPart: 'ملي ثانية', lastPart: ''});

      // sw (only one that places unit first)
      assert.deepStrictEqual(NumberWithUnit.parse('[Sek]()100'), {firstPart: '', unitPart: 'Sek', lastPart: '100'});
      assert.deepStrictEqual(NumberWithUnit.parse('[Sek]() 100'), {firstPart: '', unitPart: 'Sek', lastPart: ' 100'});

      // error cases
      assert.deepStrictEqual(NumberWithUnit.parse(''), null);
      assert.deepStrictEqual(NumberWithUnit.parse('100s'), null);
      assert.deepStrictEqual(NumberWithUnit.parse('100[s]('), null);
      assert.deepStrictEqual(NumberWithUnit.parse('100[s]'), null);
      assert.deepStrictEqual(NumberWithUnit.parse('100[s'), null);
      assert.deepStrictEqual(NumberWithUnit.parse('100 s]('), null);
    });
  });
});
