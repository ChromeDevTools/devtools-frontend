// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithLocale} from '../../testing/EnvironmentHelpers.js';

import * as Platform from './platform.js';

describeWithLocale('NumberUtilities', () => {
  describe('clamp', () => {
    it('takes the lower bound if the number is smaller', () => {
      assert.strictEqual(5, Platform.NumberUtilities.clamp(1, 5, 10));
    });

    it('takes the upper bound if the number is larger', () => {
      assert.strictEqual(10, Platform.NumberUtilities.clamp(20, 5, 10));
    });

    it('returns the original number if it is in bounds', () => {
      assert.strictEqual(7, Platform.NumberUtilities.clamp(7, 5, 10));
    });
  });

  describe('mod', () => {
    it('returns the remainder', () => {
      const result = Platform.NumberUtilities.mod(12, 5);
      assert.strictEqual(result, 2);
    });
  });

  describe('toFixedIfFloating', () => {
    it('converts a decimal to a fixed string with 3 decimal places', () => {
      const output = Platform.NumberUtilities.toFixedIfFloating('1.23456');
      assert.strictEqual(output, '1.235');
    });

    it('leaves whole numbers alone', () => {
      const output = Platform.NumberUtilities.toFixedIfFloating('233');
      assert.strictEqual(output, '233');
    });

    it('leaves values that parse to NaN alone', () => {
      const output = Platform.NumberUtilities.toFixedIfFloating('SoNotANumber');
      assert.strictEqual(output, 'SoNotANumber');
    });

    it('leaves falsey values alone', () => {
      const output = Platform.NumberUtilities.toFixedIfFloating('');
      assert.strictEqual(output, '');
    });
  });

  describe('floor', () => {
    it('it works for integers', () => {
      assert.strictEqual(10, Platform.NumberUtilities.floor(10));
    });

    it('it rounds down float with precision', () => {
      assert.strictEqual(1.1, Platform.NumberUtilities.floor(1.1111, 1));
      assert.strictEqual(1.11, Platform.NumberUtilities.floor(1.1111, 2));
      assert.strictEqual(1.9, Platform.NumberUtilities.floor(1.9999, 1));
      assert.strictEqual(1.99, Platform.NumberUtilities.floor(1.9999, 2));
    });

    it('it can round down to the nearest 5*', () => {
      assert.strictEqual(115, Platform.NumberUtilities.floor(116.1, 1 / 5));
      assert.strictEqual(1150, Platform.NumberUtilities.floor(1167.31, 1 / 50));
    });

    it('it can round down to the nearest 10*', () => {
      assert.strictEqual(110, Platform.NumberUtilities.floor(111.1, 1 / 10));
      assert.strictEqual(1100, Platform.NumberUtilities.floor(1161.31, 1 / 100));
    });
  });

  describe('greatestCommonDivisor', () => {
    it('it works', () => {
      assert.strictEqual(0, Platform.NumberUtilities.greatestCommonDivisor(0, 0));
      assert.strictEqual(1, Platform.NumberUtilities.greatestCommonDivisor(1, 0));
      assert.strictEqual(1, Platform.NumberUtilities.greatestCommonDivisor(0, 1));
      assert.strictEqual(200, Platform.NumberUtilities.greatestCommonDivisor(600, 800));
      assert.strictEqual(200, Platform.NumberUtilities.greatestCommonDivisor(800, 600));
      assert.strictEqual(-200, Platform.NumberUtilities.greatestCommonDivisor(-800, -600));
      assert.strictEqual(1, Platform.NumberUtilities.greatestCommonDivisor(0.5, 0.5));
    });
  });

  describe('aspectRatio', () => {
    it('it works', () => {
      assert.strictEqual('0∶0', Platform.NumberUtilities.aspectRatio(0, 0));
      assert.strictEqual('0∶1', Platform.NumberUtilities.aspectRatio(0, 1));
      assert.strictEqual('1∶0', Platform.NumberUtilities.aspectRatio(1, 0));
      assert.strictEqual('1∶1', Platform.NumberUtilities.aspectRatio(1, 1));
      assert.strictEqual('4∶3', Platform.NumberUtilities.aspectRatio(800, 600));
      assert.strictEqual('3∶4', Platform.NumberUtilities.aspectRatio(600, 800));
      assert.strictEqual('4∶3', Platform.NumberUtilities.aspectRatio(-800, -600));
      assert.strictEqual('16∶9', Platform.NumberUtilities.aspectRatio(5120, 2880));
      assert.strictEqual('16∶10', Platform.NumberUtilities.aspectRatio(2560, 1600));
    });
  });

  describe('numberWithThousandSeparator', () => {
    it('separates 1000', () => {
      const inputNumber = 1000;
      const outputString = Platform.NumberUtilities.withThousandsSeparator(inputNumber);
      assert.strictEqual(outputString, '1\xA0000');
    });

    it('does not separate 1', () => {
      const inputNumber = 1;
      const outputString = Platform.NumberUtilities.withThousandsSeparator(inputNumber);
      assert.strictEqual(outputString, '1');
    });

    it('separates a billion', () => {
      const inputNumber = 7654321;
      const outputString = Platform.NumberUtilities.withThousandsSeparator(inputNumber);
      assert.strictEqual(outputString, '7\xA0654\xA0321');
    });

    it('separates decimal points', () => {
      const inputNumber = 0.0001;
      const outputString = Platform.NumberUtilities.withThousandsSeparator(inputNumber);
      assert.strictEqual(outputString, '0.0\xA0001');
    });
  });
});
