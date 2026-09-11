// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/prefer-assert-strict-equal.ts';

import {RuleTester, typeCheckingOptions} from './utils/RuleTester.ts';

new RuleTester(typeCheckingOptions).run('prefer-assert-strict-equal', rule, {
  valid: [
    {
      name: 'allows assert(a)',
      code: 'assert(a);',
    },
    {
      name: 'allows assert(a, message)',
      code: 'assert(a, "message");',
    },
    {
      name: 'allows assert(a === b || c)',
      code: 'assert(a === b || c);',
    },
    {
      name: 'allows assert(a === b || c, message)',
      code: 'assert(a === b || c, "message");',
    },
    {
      name: 'allows assert.strictEqual(x, y)',
      code: 'assert.strictEqual(x, y);',
    },
    {
      name: 'allows assert.strictEqual(x, y, message)',
      code: 'assert.strictEqual(x, y, "message");',
    },
    {
      name: 'allows assert.notStrictEqual(x, y)',
      code: 'assert.notStrictEqual(x, y);',
    },
    {
      name: 'allows assert.notStrictEqual(x, y, message)',
      code: 'assert.notStrictEqual(x, y, "message");',
    },
    {
      name: 'allows property comparison assertion on typed object',
      code: `
      let x: {y:number};
      assert(x.y === z, "message");`,
    },
  ],

  invalid: [
    {
      name: 'flags assert(x === y)',
      code: 'assert(x === y);',
      output: 'assert.strictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert(x === y, message)',
      code: 'assert(x === y, "message");',
      output: 'assert.strictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert.isNotFalse(x === y)',
      code: 'assert.isNotFalse(x === y);',
      output: 'assert.strictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert.isNotFalse(x === y, message)',
      code: 'assert.isNotFalse(x === y, "message");',
      output: 'assert.strictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert.isOk(x === y)',
      code: 'assert.isOk(x === y);',
      output: 'assert.strictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert.isOk(x === y, message)',
      code: 'assert.isOk(x === y, "message");',
      output: 'assert.strictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert.isTrue(x === y)',
      code: 'assert.isTrue(x === y);',
      output: 'assert.strictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert.isTrue(x === y, message)',
      code: 'assert.isTrue(x === y, "message");',
      output: 'assert.strictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert.ok(x === y)',
      code: 'assert.ok(x === y);',
      output: 'assert.strictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert.ok(x === y, message)',
      code: 'assert.ok(x === y, "message");',
      output: 'assert.strictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },

    {
      name: 'flags assert.isFalse(x === y)',
      code: 'assert.isFalse(x === y);',
      output: 'assert.notStrictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert.isFalse(x === y, message)',
      code: 'assert.isFalse(x === y, "message");',
      output: 'assert.notStrictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert.notOk(x === y)',
      code: 'assert.notOk(x === y);',
      output: 'assert.notStrictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert.notOk(x === y, message)',
      code: 'assert.notOk(x === y, "message");',
      output: 'assert.notStrictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert.isNotTrue(x === y)',
      code: 'assert.isNotTrue(x === y);',
      output: 'assert.notStrictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert.isNotTrue(x === y, message)',
      code: 'assert.isNotTrue(x === y, "message");',
      output: 'assert.notStrictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert.isNotOk(x === y)',
      code: 'assert.isNotOk(x === y);',
      output: 'assert.notStrictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert.isNotOk(x === y, message)',
      code: 'assert.isNotOk(x === y, "message");',
      output: 'assert.notStrictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },

    {
      name: 'flags assert(x !== y)',
      code: 'assert(x !== y);',
      output: 'assert.notStrictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert(x !== y, message)',
      code: 'assert(x !== y, "message");',
      output: 'assert.notStrictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert.isNotFalse(x !== y)',
      code: 'assert.isNotFalse(x !== y);',
      output: 'assert.notStrictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert.isNotFalse(x !== y, message)',
      code: 'assert.isNotFalse(x !== y, "message");',
      output: 'assert.notStrictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert.isOk(x !== y)',
      code: 'assert.isOk(x !== y);',
      output: 'assert.notStrictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert.isOk(x !== y, message)',
      code: 'assert.isOk(x !== y, "message");',
      output: 'assert.notStrictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert.isTrue(x !== y)',
      code: 'assert.isTrue(x !== y);',
      output: 'assert.notStrictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert.isTrue(x !== y, message)',
      code: 'assert.isTrue(x !== y, "message");',
      output: 'assert.notStrictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert.ok(x !== y)',
      code: 'assert.ok(x !== y);',
      output: 'assert.notStrictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert.ok(x !== y, message)',
      code: 'assert.ok(x !== y, "message");',
      output: 'assert.notStrictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },

    {
      name: 'flags assert.isFalse(x !== y)',
      code: 'assert.isFalse(x !== y);',
      output: 'assert.strictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert.isFalse(x !== y, message)',
      code: 'assert.isFalse(x !== y, "message");',
      output: 'assert.strictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert.notOk(x !== y)',
      code: 'assert.notOk(x !== y);',
      output: 'assert.strictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert.notOk(x !== y, message)',
      code: 'assert.notOk(x !== y, "message");',
      output: 'assert.strictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert.isNotTrue(x !== y)',
      code: 'assert.isNotTrue(x !== y);',
      output: 'assert.strictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert.isNotTrue(x !== y, message)',
      code: 'assert.isNotTrue(x !== y, "message");',
      output: 'assert.strictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert.isNotOk(x !== y)',
      code: 'assert.isNotOk(x !== y);',
      output: 'assert.strictEqual(x, y);',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      name: 'flags assert.isNotOk(x !== y, message)',
      code: 'assert.isNotOk(x !== y, "message");',
      output: 'assert.strictEqual(x, y, "message");',
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      name: 'flags typed object assertion assert(x === z, message)',
      code: `
      let x: {y: {z: number}};
      assert(x === z, "message");`,
      output: `
      let x: {y: {z: number}};
      assert.strictEqual(x, z, "message");`,
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      name: 'flags typed object property assertion assert(x.y === z, message)',
      code: `
      let x: {y: {z: number}};
      assert(x.y === z, "message");`,
      output: `
      let x: {y: {z: number}};
      assert.strictEqual(x.y, z, "message");`,
      errors: [
        {
          messageId: 'useAssertStrictEqual',
        },
      ],
    },
    {
      name: 'flags typed object property assertion assert(x.y !== z, message)',
      code: `
      let x: {y:number};
      assert(x.y !== z, "message");`,
      output: `
      let x: {y:number};
      assert.notStrictEqual(x.y, z, "message");`,
      errors: [
        {
          messageId: 'useAssertNotStrictEqual',
        },
      ],
    },
  ],
});
