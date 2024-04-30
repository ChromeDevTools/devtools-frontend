// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/compare_arrays_with_assert_deepequal.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
});

ruleTester.run('compare_arrays_with_assert_deepequal', rule, {
  valid: [
    {
      code: `import {assert} from 'chai';

      it('normal test', async () => {
        assert.deepEqual(someResult, [2]);
      });
      `,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: `import {assert} from 'chai';

      it('normal test', async () => {
        assert.sameMembers(someResult, [2]);
      });
      `,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: `import {assert} from 'chai';

      it('normal test', async () => {
        assert.sameDeepMembers(someResult, [2]);
      });
      `,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: `import {assert} from 'chai';

      it('normal test', async () => {
        assert.includeMembers(someResult, [2]);
      });
      `,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: `import {assert} from 'chai';

      it('normal test', async () => {
        assert.strictEqual(false, false);
      });
      `,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: `import {assert} from 'chai';

      it('normal test', async () => {
        assert.deepStrictEqual(false, false);
      });
      `,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: `import {assert} from 'chai';

      it('normal test', async () => {
        assert.isDefined(true);
      });
      `,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: `import {assert} from 'chai';

      it('normal test', async () => {
        assert.containsAllKeys(someResult, [2, 3]);
      });
      `,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: `import {assert} from 'chai';

      it('normal test', async () => {
        assert.hasAllKeys(someResult, [2, 3]);
      });
      `,
      filename: 'test/e2e/folder/file.ts',
    },
  ],

  invalid: [
    {
      code: `import {assert} from 'chai';

      it('normal test', async () => {
        assert.equal(someResult, [2]);
      });
      `,
      filename: 'test/e2e/folder/file.ts',
      errors: [
        {message: 'Use assert.deepEqual (or similar assertion method that performs deep comparisons) to compare arrays'}
      ],
    },
  ]
});
