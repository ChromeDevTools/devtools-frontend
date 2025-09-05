// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UnitFormatters from './UnitFormatters.js';

describe('UnitFormatters', () => {
  describe('seconds', () => {
    it('formats values > 1s as seconds', () => {
      assert.strictEqual(UnitFormatters.seconds(1.234), '1.2\xA0s');
    });

    it('formats values < 1s as milliseconds', () => {
      assert.strictEqual(UnitFormatters.seconds(0.1234), '123.4\xA0ms');
    });

    it('formats values < 1ms as milliseconds', () => {
      assert.strictEqual(UnitFormatters.seconds(0.0001234), '0.1\xA0ms');
    });

    it('formats values < 100µs as microseconds with decimals', () => {
      assert.strictEqual(UnitFormatters.seconds(0.0000123), '12.3\xA0μs');
    });

    it('handles zero', () => {
      assert.strictEqual(UnitFormatters.seconds(0), '0\xA0s');
    });

    it('handles large numbers', () => {
      assert.strictEqual(UnitFormatters.seconds(Infinity), '-');
      assert.strictEqual(UnitFormatters.seconds(Number.MAX_VALUE), '-');
    });
  });

  describe('millis', () => {
    it('formats milliseconds', () => {
      assert.strictEqual(UnitFormatters.millis(123.45), '123.5\xA0ms');
    });

    it('handles zero', () => {
      assert.strictEqual(UnitFormatters.millis(0), '0\xA0ms');
    });

    it('handles large numbers', () => {
      assert.strictEqual(UnitFormatters.millis(Infinity), '-');
      assert.strictEqual(UnitFormatters.millis(Number.MAX_VALUE), '-');
    });
  });

  describe('micros', () => {
    it('formats microseconds < 100 with one decimal place', () => {
      assert.strictEqual(UnitFormatters.micros(12.34), '12.3\xA0μs');
    });

    it('formats microseconds >= 100 as milliseconds', () => {
      assert.strictEqual(UnitFormatters.micros(123.4), '0.1\xA0ms');
      assert.strictEqual(UnitFormatters.micros(1234.5), '1.2\xA0ms');
    });

    it('formats 0 as an integer', () => {
      assert.strictEqual(UnitFormatters.micros(0), '0\xA0μs');
    });

    it('handles large numbers', () => {
      assert.strictEqual(UnitFormatters.micros(Infinity), '-');
      assert.strictEqual(UnitFormatters.micros(Number.MAX_VALUE), '-');
    });
  });

  describe('bytes', () => {
    it('formats bytes', () => {
      assert.strictEqual(UnitFormatters.bytes(123), '123\xA0B');
    });

    it('formats kilobytes', () => {
      assert.strictEqual(UnitFormatters.bytes(12345), '12.3\xA0kB');
    });

    it('formats megabytes', () => {
      assert.strictEqual(UnitFormatters.bytes(12345678), '12.3\xA0MB');
    });

    it('handles zero', () => {
      assert.strictEqual(UnitFormatters.bytes(0), '0\xA0B');
    });
  });
});
