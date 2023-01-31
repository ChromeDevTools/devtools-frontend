// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const rule = require('../lib/no_it_screenshot_only_or_repeat.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('no_it_screenshot_only_or_repeat', rule, {
  valid: [
    {
      code: `itScreenshot('does a thing', () => {
        assertElementScreenshotUnchanged(element, 'foo.png');
      })`,
      filename: 'front_end/components/test.ts',
    },
  ],
  invalid: [
    {
      code: `itScreenshot.only('does a thing', () => {
        assertElementScreenshotUnchanged(element, 'foo.png');
      })`,
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'itScreenshot-only', column: 14, endColumn: 18}],
    },
    {
      code: `itScreenshot.repeat(20, 'does a thing', () => {
        assertElementScreenshotUnchanged(element, 'foo.png');
      })`,
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'itScreenshot-repeat', column: 14, endColumn: 20}],
    },
  ]
});
