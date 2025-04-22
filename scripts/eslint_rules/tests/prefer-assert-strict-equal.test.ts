// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/prefer-assert-strict-equal.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('prefer-assert-strict-equal', rule, {
  valid: [
    {
      code: 'assert(a);',
    },
    {
      code: 'assert(a, "message");',
    },
    {
      code: 'assert(a === b || c);',
    },
    {
      code: 'assert(a === b || c, "message");',
    },
    {
      code: 'assert.strictEqual(x, y);',
    },
    {
      code: 'assert.strictEqual(x, y, "message");',
    },
    {
      code: 'assert.notStrictEqual(x, y);',
    },
    {
      code: 'assert.notStrictEqual(x, y, "message");',
    },
  ],

  invalid: [
    {
      code: 'assert(x === y);',
      output: 'assert.strictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      code: 'assert(x === y, "message");',
      output: 'assert.strictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      code: 'assert.isNotFalse(x === y);',
      output: 'assert.strictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      code: 'assert.isNotFalse(x === y, "message");',
      output: 'assert.strictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      code: 'assert.isOk(x === y);',
      output: 'assert.strictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      code: 'assert.isOk(x === y, "message");',
      output: 'assert.strictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      code: 'assert.isTrue(x === y);',
      output: 'assert.strictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      code: 'assert.isTrue(x === y, "message");',
      output: 'assert.strictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      code: 'assert.ok(x === y);',
      output: 'assert.strictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      code: 'assert.ok(x === y, "message");',
      output: 'assert.strictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },

    {
      code: 'assert.isFalse(x === y);',
      output: 'assert.notStrictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      code: 'assert.isFalse(x === y, "message");',
      output: 'assert.notStrictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      code: 'assert.notOk(x === y);',
      output: 'assert.notStrictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      code: 'assert.notOk(x === y, "message");',
      output: 'assert.notStrictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      code: 'assert.isNotTrue(x === y);',
      output: 'assert.notStrictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      code: 'assert.isNotTrue(x === y, "message");',
      output: 'assert.notStrictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      code: 'assert.isNotOk(x === y);',
      output: 'assert.notStrictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      code: 'assert.isNotOk(x === y, "message");',
      output: 'assert.notStrictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },

    {
      code: 'assert(x !== y);',
      output: 'assert.notStrictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      code: 'assert(x !== y, "message");',
      output: 'assert.notStrictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      code: 'assert.isNotFalse(x !== y);',
      output: 'assert.notStrictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      code: 'assert.isNotFalse(x !== y, "message");',
      output: 'assert.notStrictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      code: 'assert.isOk(x !== y);',
      output: 'assert.notStrictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      code: 'assert.isOk(x !== y, "message");',
      output: 'assert.notStrictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      code: 'assert.isTrue(x !== y);',
      output: 'assert.notStrictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      code: 'assert.isTrue(x !== y, "message");',
      output: 'assert.notStrictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      code: 'assert.ok(x !== y);',
      output: 'assert.notStrictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      code: 'assert.ok(x !== y, "message");',
      output: 'assert.notStrictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },

    {
      code: 'assert.isFalse(x !== y);',
      output: 'assert.strictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      code: 'assert.isFalse(x !== y, "message");',
      output: 'assert.strictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      code: 'assert.notOk(x !== y);',
      output: 'assert.strictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      code: 'assert.notOk(x !== y, "message");',
      output: 'assert.strictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      code: 'assert.isNotTrue(x !== y);',
      output: 'assert.strictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      code: 'assert.isNotTrue(x !== y, "message");',
      output: 'assert.strictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      code: 'assert.isNotOk(x !== y);',
      output: 'assert.strictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      code: 'assert.isNotOk(x !== y, "message");',
      output: 'assert.strictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },

  ],
});
