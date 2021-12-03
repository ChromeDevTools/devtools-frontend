// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const rule = require('../lib/no_only_eslint_tests.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
});

ruleTester.run('no_only_eslint_tests', rule, {
  valid: [
    {
      code: `ruleTester.run('my_eslint_rule', rule, {
        valid: [{
          code: 'foo',
          filename: 'foo.ts',
        }]
      })`,
      filename: 'scripts/eslint_rules/tests/foo_test.js',
    },
    {
      code: `ruleTester.run('my_eslint_rule', rule, {
        invalid: [{
          code: 'foo',
          filename: 'foo.ts',
        }]
      })`,
      filename: 'scripts/eslint_rules/tests/foo_test.js',
    },
  ],

  invalid: [
    {
      code: `ruleTester.run('my_eslint_rule', rule, {
        valid: [{
          only: true,
          code: 'foo',
          filename: 'foo.ts',
        }]
      })`,
      filename: 'scripts/eslint_rules/tests/foo_test.js',
      errors: [{messageId: 'noOnlyInESLintTest'}],
    },
    {
      code: `ruleTester.run('my_eslint_rule', rule, {
        invalid: [{
          only: true,
          code: 'foo',
          filename: 'foo.ts',
          errors: [{ messagId: 'foo' }]
        }]
      })`,
      filename: 'scripts/eslint_rules/tests/foo_test.js',
      errors: [{messageId: 'noOnlyInESLintTest'}],
    },
    {
      code: `ruleTester.run('my_eslint_rule', rule, {
        valid: [{
          only: true,
          code: 'foo',
          filename: 'foo.ts',
        }],
        invalid: [{
          only: true,
          code: 'foo',
          filename: 'foo.ts',
          errors: [{ messagId: 'foo' }]
        }]
      })`,
      filename: 'scripts/eslint_rules/tests/foo_test.js',
      errors: [{messageId: 'noOnlyInESLintTest'}, {messageId: 'noOnlyInESLintTest'}],
    },
    {
      code: `ruleTester.run('my_eslint_rule', rule, {
        valid: [{
          only: true,
          code: 'foo',
          filename: 'foo.ts',
        }, {
          code: 'foo',
          filename: 'foo.ts',
        }],
        invalid: [{
          only: true,
          code: 'foo',
          filename: 'foo.ts',
          errors: [{ messagId: 'foo' }]
        }]
      })`,
      filename: 'scripts/eslint_rules/tests/foo_test.js',
      errors: [{messageId: 'noOnlyInESLintTest'}, {messageId: 'noOnlyInESLintTest'}],
    },
  ]
});
