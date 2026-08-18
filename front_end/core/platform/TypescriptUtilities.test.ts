// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as Platform from './platform.js';

describe('TypescriptUtilities', () => {
  describe('assertNotNullOrUndefined', () => {
    it('does not throw for non-nullish values', () => {
      const testCases: unknown[] = [0, '', false, 42, 'text', {}, [], {key: 'value'}];
      for (const testCase of testCases) {
        assert.doesNotThrow(() => Platform.assertNotNullOrUndefined(testCase));
      }
    });

    it('throws for null and undefined, including the value in the message', () => {
      assert.throws(
          () => Platform.assertNotNullOrUndefined(null),
          'Expected given value to not be null/undefined but it was: null',
      );
      assert.throws(
          () => Platform.assertNotNullOrUndefined(undefined),
          'Expected given value to not be null/undefined but it was: undefined',
      );
    });

    it('appends the custom message on a new line when provided', () => {
      assert.throws(
          () => Platform.assertNotNullOrUndefined(null, 'extra context'),
          /Expected given value to not be null\/undefined but it was: null\nextra context/,
      );
    });

    it('does not append anything when no custom message is provided', () => {
      assert.throws(
          () => Platform.assertNotNullOrUndefined(null),
          /but it was: null$/,
      );
    });
  });

  describe('assertNever', () => {
    it('throws with the provided message', () => {
      assert.throws(
          () => Platform.assertNever('unreachable' as never, 'should not happen'),
          'should not happen',
      );
    });
  });
});
