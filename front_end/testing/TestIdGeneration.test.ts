// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  computeBuildTestId,
  escapeTestIdBlock,
  formatFailedTestsSummary,
  generateExactTestId,
} from './TestIdGeneration.js';

describe('TestIdGeneration', () => {
  describe('escapeTestIdBlock', () => {
    it('converts to lowercase', () => {
      assert.strictEqual(escapeTestIdBlock('HELLO'), 'hello');
    });

    it('replaces spaces with underscores', () => {
      assert.strictEqual(escapeTestIdBlock('hello world   test'), 'hello_world_test');
    });

    it('replaces colons with underscores', () => {
      assert.strictEqual(escapeTestIdBlock('hello:world::test'), 'hello_world__test');
    });

    it('replaces specific non-printable characters', () => {
      // \n, \r, and \t are matched by \s+ and replaced by underscore before replaceNonPrintable
      assert.strictEqual(escapeTestIdBlock('a\nb'), 'a_lf_b');
      assert.strictEqual(escapeTestIdBlock('a\rb'), 'a_cr_b');
      assert.strictEqual(escapeTestIdBlock('a\tb'), 'a_tab_b');
      assert.strictEqual(escapeTestIdBlock('a\x00b'), 'a_null_b');
      assert.strictEqual(escapeTestIdBlock('a\x07b'), 'a_bell_b');
    });

    it('strips other non-printable characters', () => {
      // \x08 is backspace, a control character (category C)
      assert.strictEqual(escapeTestIdBlock('a\x08b'), 'ab');
    });

    it('replaces double quote characters', () => {
      assert.strictEqual(escapeTestIdBlock('a"b'), 'a_dblquote_b');
    });

    it('handles combinations of replacements', () => {
      assert.strictEqual(escapeTestIdBlock('  HELLO: world\n'), '_hello__world_lf_');
    });

    it('handles strange dashes correctly', () => {
      assert.strictEqual(escapeTestIdBlock('PerformanceAgent – call tree focus'), 'performanceagent_call_tree_focus');
      assert.strictEqual(escapeTestIdBlock('PerformanceAgent — call tree focus'), 'performanceagent_call_tree_focus');
      assert.strictEqual(escapeTestIdBlock('PerformanceAgent ⸺ call tree focus'), 'performanceagent_call_tree_focus');
      assert.strictEqual(escapeTestIdBlock('PerformanceAgent ⸻ call tree focus'), 'performanceagent_call_tree_focus');
    });
  });

  describe('computeBuildTestId', () => {
    it('computes correct test id', () => {
      const file = '/base/test.ts';
      const titlePath = ['Suite', 'sub suite', 'test:case'];
      const result = computeBuildTestId(file, titlePath);
      assert.strictEqual(result, '/base/test.ts:suite:sub_suite:test_case');
    });
  });

  describe('generateExactTestId', () => {
    it('computes correct exact test id from file inside genDir', () => {
      const genDir = '/gen';
      const file = '/gen/front_end/my_test.js';
      const titlePath = ['Suite', 'test case'];
      const result = generateExactTestId(genDir, file, titlePath);
      assert.deepEqual(result, {
        exactTestId: 'front_end/my_test.ts:suite:test_case',
        coarseName: 'front_end/',
        fineName: 'my_test.ts',
        caseName: 'suite:test_case',
      });
    });

    it('computes correct exact test id from file outside genDir', () => {
      const genDir = '/gen';
      const file = '/other/front_end/my_test.js';
      const titlePath = ['Suite', 'test case'];
      const result = generateExactTestId(genDir, file, titlePath);
      assert.deepEqual(result, {
        exactTestId: '/other/front_end/my_test.ts:suite:test_case',
        coarseName: '/other/front_end/',
        fineName: 'my_test.ts',
        caseName: 'suite:test_case',
      });
    });

    it('normalizes backslashes', () => {
      const genDir = 'C:\\gen';
      const file = 'C:\\gen\\front_end\\my_test.js';
      const titlePath = ['test'];
      const result = generateExactTestId(genDir, file, titlePath);
      assert.deepEqual(result, {
        exactTestId: 'front_end/my_test.ts:test',
        coarseName: 'front_end/',
        fineName: 'my_test.ts',
        caseName: 'test',
      });
    });

    it('handles root relative files correctly', () => {
      const genDir = '/gen';
      const file = '/my_test.js';
      const titlePath = ['test'];
      const result = generateExactTestId(genDir, file, titlePath);
      assert.deepEqual(result, {
        exactTestId: '/my_test.ts:test',
        coarseName: '/',
        fineName: 'my_test.ts',
        caseName: 'test',
      });
    });

    it('handles files with no directory correctly', () => {
      const genDir = '/gen';
      const file = 'my_test.js';
      const titlePath = ['test'];
      const result = generateExactTestId(genDir, file, titlePath);
      assert.deepEqual(result, {
        exactTestId: 'my_test.ts:test',
        coarseName: '',
        fineName: 'my_test.ts',
        caseName: 'test',
      });
    });

    it('throws when exactTestId is too long', () => {
      const genDir = '/gen';
      const file = '/gen/front_end/my_test.js';
      const titlePath = ['a'.repeat(600)];
      assert.throws(() => generateExactTestId(genDir, file, titlePath), /Test ID is too long/);
    });
  });

  describe('formatFailedTestsSummary', () => {
    it('returns empty string when there are no failed tests', () => {
      assert.strictEqual(formatFailedTestsSummary([]), '');
      assert.strictEqual(formatFailedTestsSummary(new Set()), '');
    });

    it('formats a single failed test correctly', () => {
      const failed = ['front_end/core/common/Color.test.ts:color:parses_hex'];
      const expected =
          '\nFailed tests (1):\n  front_end/core/common/Color.test.ts:color:parses_hex\n\nTo rerun:\n  npm run test -- front_end/core/common/Color.test.ts:color:parses_hex\n\n';
      assert.strictEqual(formatFailedTestsSummary(failed), expected);
    });

    it('formats multiple failed tests correctly', () => {
      const failed = new Set([
        'front_end/core/common/Color.test.ts:color:parses_hex',
        'test/e2e/console/console-log.test.ts:the_console_tab:shows_console_messages',
      ]);
      const expected =
          '\nFailed tests (2):\n  front_end/core/common/Color.test.ts:color:parses_hex\n  test/e2e/console/console-log.test.ts:the_console_tab:shows_console_messages\n\nTo rerun:\n  npm run test -- front_end/core/common/Color.test.ts:color:parses_hex test/e2e/console/console-log.test.ts:the_console_tab:shows_console_messages\n\n';
      assert.strictEqual(formatFailedTestsSummary(failed), expected);
    });
  });
});
