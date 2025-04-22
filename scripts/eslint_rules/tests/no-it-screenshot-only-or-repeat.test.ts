// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-it-screenshot-only-or-repeat.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-it-screenshot-only-or-repeat', rule, {
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
  ],
});
