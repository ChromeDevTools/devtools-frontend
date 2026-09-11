// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import rule from '../lib/no-assert-equal.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-assert-equal', rule, {
  valid: [
    {
      name: 'allows assert.strictEqual for primitives',
      code: `import {assert} from 'chai';

      it('normal test', async () => {
        assert.strictEqual(2, 2);
      });
      `,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      name: 'allows assert.deepEqual for object literals',
      code: `import {assert} from 'chai';

      it('normal test', async () => {
        assert.deepEqual({}, {})
      });
      `,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      name: 'allows assert.deepEqual for array literals',
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
      name: 'disallows assert.equal with primitives and fixes to strictEqual',
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
          messageId: 'noAssertEqual',
        },
      ],
    },
    {
      name: 'disallows assert.equal with object literals and fixes to deepEqual',
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
          messageId: 'noAssertEqual',
        },
      ],
    },
    {
      name: 'disallows assert.equal with array literals and fixes to deepEqual',
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
          messageId: 'noAssertEqual',
        },
      ],
    },
  ],
});
