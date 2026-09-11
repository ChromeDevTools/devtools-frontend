// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-capture-screenshot.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-capture-screenshot', rule, {
  valid: [
    {
      name: 'allows other method calls',
      code: 'foo.bar()',
      filename: 'test/e2e/folder/file.ts',
    },
    {
      name: 'allows standalone captureScreenshot call',
      code: 'captureScreenshot()',
      filename: 'test/e2e/folder/file.ts',
    },
    {
      name: 'allows this.captureScreenshot call',
      code: 'this.captureScreenshot("my screenshot");',
      filename: 'test/e2e/folder/file.ts',
    },
  ],

  invalid: [
    {
      name: 'disallows devToolsPage.captureScreenshot',
      code: 'await devToolsPage.captureScreenshot();',
      filename: 'test/e2e/folder/file.ts',
      errors: [
        {
          messageId: 'unexpectedCaptureScreenshot',
        },
      ],
    },

  ],
});
