// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-assert-deep-strict-equal.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-assert-deep-strict-equal', rule, {
  valid: [
    {
      code: 'assert.deepEqual(array, [1, 2]);',
      filename: 'foo.ts',
    },
    {
      code: 'bar.deepStrictEqual(array, [1, 2]);',
      filename: 'foo.ts',
    },
    {
      code: 'foo.assert.deepStrictEqual(array, [1, 2]);',
      filename: 'foo.ts',
    },
    {
      code: 'const fn = assert.deepStrictEqual;',
      filename: 'foo.ts',
    },
  ],

  invalid: [
    {
      code: 'assert.deepStrictEqual(array, [1, 2]);',
      output: 'assert.deepEqual(array, [1, 2]);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'unexpectedAssertDeepStrictEqual',
        },
      ],
    },
    {
      code: 'assert.deepStrictEqual(array, [1, 2], "Some message");',
      output: 'assert.deepEqual(array, [1, 2], "Some message");',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'unexpectedAssertDeepStrictEqual',
        },
      ],
    },
  ],
});
