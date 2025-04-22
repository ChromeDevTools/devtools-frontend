// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import rule from '../lib/no-assert-equal.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-assert-equal', rule, {
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
          messageId: 'noAssertEqual',
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
          messageId: 'noAssertEqual',
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
          messageId: 'noAssertEqual',
        },
      ],
    },
  ],
});
