// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const rule = require('../lib/screenshot_assertion_in_it_screenshot.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('screenshot_assertion_in_it_screenshot', rule, {
  valid: [
    {
      code: `itScreenshot('does a thing', () => {
        assertElementScreenshotUnchanged(element, 'foo.png');
      })
      `,
      filename: 'front_end/components/test.ts',
    },
    {
      code: `itScreenshot('does a thing', async () => {
        assertElementScreenshotUnchanged(element, 'foo.png');
      })
      `,
      filename: 'front_end/components/test.ts',
    },
    {
      code: `itScreenshot('does a thing', async () => {
        await assertElementScreenshotUnchanged(element, 'foo.png');
      })
      `,
      filename: 'front_end/components/test.ts',
    },
    {
      code: `it('does a thing', async () => {
        assert.strictEqual(1, 1);
      })
      `,
      filename: 'front_end/components/test.ts',
    },
    {
      code: `itScreenshot('does a thing', async function() {
        await assertElementScreenshotUnchanged(element, 'foo.png');
      });
      `,
      filename: 'front_end/components/test.ts',
    },
  ],
  invalid: [
    {
      code: `it('does a thing', () => {
        assertElementScreenshotUnchanged(element, 'foo.png');
      })`,
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'itScreenshotRequired'}],
      output: `itScreenshot('does a thing', () => {
        assertElementScreenshotUnchanged(element, 'foo.png');
      })`,
    },
    {
      code: `it('does a thing', async () => {
        await assertElementScreenshotUnchanged(element, 'foo.png');
      })`,
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'itScreenshotRequired'}],
      output: `itScreenshot('does a thing', async () => {
        await assertElementScreenshotUnchanged(element, 'foo.png');
      })`,
    },
    {
      code: `it('does a thing', async function() {
        await assertElementScreenshotUnchanged(element, 'foo.png');
      })`,
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'itScreenshotRequired'}],
      output: `itScreenshot('does a thing', async function() {
        await assertElementScreenshotUnchanged(element, 'foo.png');
      })`,
    },
  ]
});
