// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/prefer-chai-assert.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('prefer-chai-assert', rule, {
  valid: [
    {
      name: 'allows importing assert from chai',
      code: `import {assert} from 'chai';`,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      name: 'allows importing assert and type AssertionError from chai',
      code: `import {assert, type AssertionError} from 'chai';`,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      name: 'allows importing expect from non-chai module',
      code: `import {expect} from 'something-else';`,
      filename: 'test/e2e/folder/file.ts',
    },
  ],

  invalid: [
    {
      name: 'disallows importing expect from chai',
      code: `import {expect} from 'chai';`,
      filename: 'test/e2e/folder/file.ts',
      errors: [
        {
          messageId: 'noChaiExpect',
        },
      ],
    },
    {
      name: 'disallows importing assert and expect together from chai',
      code: `import {assert, expect} from 'chai';`,
      filename: 'test/e2e/folder/file.ts',
      errors: [
        {
          messageId: 'noChaiExpect',
        },
      ],
    },
    {
      name: 'disallows default import from chai',
      code: `import chai from 'chai';`,
      filename: 'test/e2e/folder/file.ts',
      errors: [
        {
          messageId: 'noChaiDefault',
        },
      ],
    },
    {
      name: 'disallows namespace import from chai',
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
