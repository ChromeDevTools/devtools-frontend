// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/avoid_assert_equal.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
});

ruleTester.run('avoid_assert_equal', rule, {
  valid: [
    {
      code: `import {assert} from 'chai';

      it('normal test', async () => {
        assert.strictEqual(2, 2);
      });
      `,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: `import {assert} from 'chai';

      it('normal test', async () => {
        assert.deepEqual({}, {})
      });
      `,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: `import {assert} from 'chai';

      it('normal test', async () => {
        assert.deepEqual([], [])
      });
      `,
      filename: 'test/e2e/folder/file.ts',
    },
  ],

  invalid: [
    {
      code: `import {assert} from 'chai';

      it('normal test', async () => {
        assert.equal(2, 2)
      });
      `,
      output: `import {assert} from 'chai';

      it('normal test', async () => {
        assert.strictEqual(2, 2)
      });
      `,
      filename: 'test/e2e/folder/file.ts',
      errors: [
        {
          message: 'assert.equal is non-strict. Use assert.strictEqual or assert.deepEqual to compare objects',
        },
      ],
    },
    {
      code: `import {assert} from 'chai';

      it('normal test', async () => {
        assert.equal({}, {})
      });
      `,
      output: `import {assert} from 'chai';

      it('normal test', async () => {
        assert.deepEqual({}, {})
      });
      `,
      filename: 'test/e2e/folder/file.ts',
      errors: [
        {
          message: 'assert.equal is non-strict. Use assert.strictEqual or assert.deepEqual to compare objects',
        },
      ],
    },
    {
      code: `import {assert} from 'chai';

      it('normal test', async () => {
        assert.equal([], [])
      });
      `,
      output: `import {assert} from 'chai';

      it('normal test', async () => {
        assert.deepEqual([], [])
      });
      `,
      filename: 'test/e2e/folder/file.ts',
      errors: [
        {
          message: 'assert.equal is non-strict. Use assert.strictEqual or assert.deepEqual to compare objects',
        },
      ],
    },
  ],
});
