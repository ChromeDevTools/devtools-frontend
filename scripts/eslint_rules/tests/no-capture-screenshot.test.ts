// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-capture-screenshot.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-capture-screenshot', rule, {
  valid: [
    {
      code: 'foo.bar()',
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: 'captureScreenshot()',
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: 'this.captureScreenshot("my screenshot");',
      filename: 'test/e2e/folder/file.ts',
    },
  ],

  invalid: [
    {
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
