// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/prefer-chai-assert.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('prefer-chai-assert', rule, {
  valid: [
    {
      code: `import {assert} from 'chai';`,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: `import {assert, type AssertionError} from 'chai';`,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: `import {expect} from 'something-else';`,
      filename: 'test/e2e/folder/file.ts',
    },
  ],

  invalid: [
    {
      code: `import {expect} from 'chai';`,
      filename: 'test/e2e/folder/file.ts',
      errors: [
        {
          messageId: 'noChaiExpect',
        },
      ],
    },
    {
      code: `import {assert, expect} from 'chai';`,
      filename: 'test/e2e/folder/file.ts',
      errors: [
        {
          messageId: 'noChaiExpect',
        },
      ],
    },
    {
      code: `import chai from 'chai';`,
      filename: 'test/e2e/folder/file.ts',
      errors: [
        {
          messageId: 'noChaiDefault',
        },
      ],
    },
    {
      code: `import * as chai from 'chai';`,
      filename: 'test/e2e/folder/file.ts',
      errors: [
        {
          messageId: 'noChaiNamespace',
        },
      ],
    },
  ],
});
