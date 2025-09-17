// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as AiAssistance from '../ai_assistance.js';

describe('AiAssistance', () => {
  describe('seconds', () => {
    it('formats values > 1s as seconds', () => {
      assert.strictEqual(AiAssistance.seconds(1.234), '1.2\xA0s');
    });

    it('formats values < 1s as milliseconds', () => {
      assert.strictEqual(AiAssistance.seconds(0.1234), '123\xA0ms');
    });

    it('formats values < 1ms as milliseconds', () => {
      assert.strictEqual(AiAssistance.seconds(0.0001234), '0.1\xA0ms');
    });

    it('formats values < 100µs as microseconds with decimals', () => {
      assert.strictEqual(AiAssistance.seconds(0.0000123), '12\xA0μs');
    });

    it('handles zero', () => {
      assert.strictEqual(AiAssistance.seconds(0), '0\xA0s');
    });

    it('handles large numbers', () => {
      assert.strictEqual(AiAssistance.seconds(Infinity), '-');
      assert.strictEqual(AiAssistance.seconds(Number.MAX_VALUE), '-');
    });
  });

  describe('millis', () => {
    it('formats milliseconds', () => {
      assert.strictEqual(AiAssistance.millis(123.45), '123\xA0ms');
    });

    it('formats milliseconds of less than 1 with a decimal place', () => {
      assert.strictEqual(AiAssistance.millis(0.12), '0.1\xA0ms');
    });

    it('handles zero', () => {
      assert.strictEqual(AiAssistance.millis(0), '0\xA0ms');
    });

    it('handles large numbers', () => {
      assert.strictEqual(AiAssistance.millis(Infinity), '-');
      assert.strictEqual(AiAssistance.millis(Number.MAX_VALUE), '-');
    });
  });

  describe('micros', () => {
    it('formats microseconds < 100 aas microseconds', () => {
      assert.strictEqual(AiAssistance.micros(12.34), '12\xA0μs');
    });

    it('formats microseconds >= 100 as milliseconds', () => {
      assert.strictEqual(AiAssistance.micros(123.4), '0.1\xA0ms');
      assert.strictEqual(AiAssistance.micros(1234.5), '1\xA0ms');
    });

    it('formats 0 as an integer', () => {
      assert.strictEqual(AiAssistance.micros(0), '0\xA0μs');
    });

    it('handles large numbers', () => {
      assert.strictEqual(AiAssistance.micros(Infinity), '-');
      assert.strictEqual(AiAssistance.micros(Number.MAX_VALUE), '-');
    });
  });

  describe('bytes', () => {
    it('formats bytes', () => {
      assert.strictEqual(AiAssistance.bytes(123), '123\xA0B');
    });

    it('formats kilobytes', () => {
      assert.strictEqual(AiAssistance.bytes(12345), '12.3\xA0kB');
    });

    it('formats megabytes', () => {
      assert.strictEqual(AiAssistance.bytes(12345678), '12.3\xA0MB');
    });

    it('handles zero', () => {
      assert.strictEqual(AiAssistance.bytes(0), '0\xA0B');
    });
  });
});
