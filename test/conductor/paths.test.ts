// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import * as path from 'node:path';

import {GEN_DIR, resolveBuildTestId, SOURCE_ROOT} from './paths.js';

describe('paths', () => {
  describe('resolveBuildTestId', () => {
    it('keeps script tests under SOURCE_ROOT with their original extension', () => {
      assert.strictEqual(
          resolveBuildTestId('scripts/build/tests/plugins.test.js:suite:case'),
          `${path.join(SOURCE_ROOT, 'scripts', 'build', 'tests', 'plugins.test.js')}:suite:case`,
      );
      assert.strictEqual(
          resolveBuildTestId('test/ai_evals/report/report-helpers.test.ts:suite:case'),
          `${path.join(SOURCE_ROOT, 'test', 'ai_evals', 'report', 'report-helpers.test.ts')}:suite:case`,
      );
      assert.strictEqual(
          resolveBuildTestId('test/conductor/test_config.test.ts:suite:case'),
          `${path.join(SOURCE_ROOT, 'test', 'conductor', 'test_config.test.ts')}:suite:case`,
      );
      assert.strictEqual(
          resolveBuildTestId('test/conductor/test_config.test.ts'),
          path.join(SOURCE_ROOT, 'test', 'conductor', 'test_config.test.ts'),
      );
    });

    it('maps compiled tests to GEN_DIR with a .js extension', () => {
      assert.strictEqual(
          resolveBuildTestId('front_end/core/common/Color.test.ts:suite:case'),
          `${path.join(GEN_DIR, 'front_end', 'core', 'common', 'Color.test.js')}:suite:case`,
      );
      assert.strictEqual(
          resolveBuildTestId('test/e2e/console/console-errors.test.ts'),
          path.join(GEN_DIR, 'test', 'e2e', 'console', 'console-errors.test.js'),
      );
    });
  });
});
