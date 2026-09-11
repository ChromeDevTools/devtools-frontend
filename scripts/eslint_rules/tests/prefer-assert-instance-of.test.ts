// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/prefer-assert-instance-of.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('prefer-assert-instance-of', rule, {
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
      name: 'allows assert.instanceOf(foo, Foo)',
      code: 'assert.instanceOf(foo, Foo);',
    },
    {
      name: 'allows assert.instanceOf(foo, Foo, message)',
      code: 'assert.instanceOf(foo, Foo, "message");',
    },
    {
      name: 'allows assert.notInstanceOf(foo, Foo)',
      code: 'assert.notInstanceOf(foo, Foo);',
    },
    {
      name: 'allows assert.notInstanceOf(foo, Foo, message)',
      code: 'assert.notInstanceOf(foo, Foo, "message");',
    },
  ],

  invalid: [
    {
      name: 'flags assert(foo instanceof Foo)',
      code: 'assert(foo instanceof Foo);',
      output: 'assert.instanceOf(foo, Foo);',
      errors: [
        {
          messageId: 'useAssertInstanceOf',
        },
      ],
    },
    {
      name: 'flags assert(foo instanceof Foo, message)',
      code: 'assert(foo instanceof Foo, "message");',
      output: 'assert.instanceOf(foo, Foo, "message");',
      errors: [
        {
          messageId: 'useAssertInstanceOf',
        },
      ],
    },
    {
      name: 'flags assert.isNotFalse(foo instanceof Foo)',
      code: 'assert.isNotFalse(foo instanceof Foo);',
      output: 'assert.instanceOf(foo, Foo);',
      errors: [
        {
          messageId: 'useAssertInstanceOf',
        },
      ],
    },
    {
      name: 'flags assert.isNotFalse(foo instanceof Foo, message)',
      code: 'assert.isNotFalse(foo instanceof Foo, "message");',
      output: 'assert.instanceOf(foo, Foo, "message");',
      errors: [
        {
          messageId: 'useAssertInstanceOf',
        },
      ],
    },
    {
      name: 'flags assert.isOk(foo instanceof Foo)',
      code: 'assert.isOk(foo instanceof Foo);',
      output: 'assert.instanceOf(foo, Foo);',
      errors: [
        {
          messageId: 'useAssertInstanceOf',
        },
      ],
    },
    {
      name: 'flags assert.isOk(foo instanceof Foo, message)',
      code: 'assert.isOk(foo instanceof Foo, "message");',
      output: 'assert.instanceOf(foo, Foo, "message");',
      errors: [
        {
          messageId: 'useAssertInstanceOf',
        },
      ],
    },
    {
      name: 'flags assert.isTrue(foo instanceof Foo)',
      code: 'assert.isTrue(foo instanceof Foo);',
      output: 'assert.instanceOf(foo, Foo);',
      errors: [
        {
          messageId: 'useAssertInstanceOf',
        },
      ],
    },
    {
      name: 'flags assert.isTrue(foo instanceof Foo, message)',
      code: 'assert.isTrue(foo instanceof Foo, "message");',
      output: 'assert.instanceOf(foo, Foo, "message");',
      errors: [
        {
          messageId: 'useAssertInstanceOf',
        },
      ],
    },
    {
      name: 'flags assert.ok(foo instanceof Foo)',
      code: 'assert.ok(foo instanceof Foo);',
      output: 'assert.instanceOf(foo, Foo);',
      errors: [
        {
          messageId: 'useAssertInstanceOf',
        },
      ],
    },
    {
      name: 'flags assert.ok(foo instanceof Foo, message)',
      code: 'assert.ok(foo instanceof Foo, "message");',
      output: 'assert.instanceOf(foo, Foo, "message");',
      errors: [
        {
          messageId: 'useAssertInstanceOf',
        },
      ],
    },
    {
      name: 'flags assert.isFalse(foo instanceof Foo)',
      code: 'assert.isFalse(foo instanceof Foo);',
      output: 'assert.notInstanceOf(foo, Foo);',
      errors: [
        {
          messageId: 'useAssertNotInstanceOf',
        },
      ],
    },
    {
      name: 'flags assert.isFalse(foo instanceof Foo, message)',
      code: 'assert.isFalse(foo instanceof Foo, "message");',
      output: 'assert.notInstanceOf(foo, Foo, "message");',
      errors: [
        {
          messageId: 'useAssertNotInstanceOf',
        },
      ],
    },
    {
      name: 'flags assert.isNotOk(foo instanceof Foo)',
      code: 'assert.isNotOk(foo instanceof Foo);',
      output: 'assert.notInstanceOf(foo, Foo);',
      errors: [
        {
          messageId: 'useAssertNotInstanceOf',
        },
      ],
    },
    {
      name: 'flags assert.isNotOk(foo instanceof Foo, message)',
      code: 'assert.isNotOk(foo instanceof Foo, "message");',
      output: 'assert.notInstanceOf(foo, Foo, "message");',
      errors: [
        {
          messageId: 'useAssertNotInstanceOf',
        },
      ],
    },
    {
      name: 'flags assert.isNotTrue(foo instanceof Foo)',
      code: 'assert.isNotTrue(foo instanceof Foo);',
      output: 'assert.notInstanceOf(foo, Foo);',
      errors: [
        {
          messageId: 'useAssertNotInstanceOf',
        },
      ],
    },
    {
      name: 'flags assert.isNotTrue(foo instanceof Foo, message)',
      code: 'assert.isNotTrue(foo instanceof Foo, "message");',
      output: 'assert.notInstanceOf(foo, Foo, "message");',
      errors: [
        {
          messageId: 'useAssertNotInstanceOf',
        },
      ],
    },
    {
      name: 'flags assert.notOk(foo instanceof Foo)',
      code: 'assert.notOk(foo instanceof Foo);',
      output: 'assert.notInstanceOf(foo, Foo);',
      errors: [
        {
          messageId: 'useAssertNotInstanceOf',
        },
      ],
    },
    {
      name: 'flags assert.notOk(foo instanceof Foo, message)',
      code: 'assert.notOk(foo instanceof Foo, "message");',
      output: 'assert.notInstanceOf(foo, Foo, "message");',
      errors: [
        {
          messageId: 'useAssertNotInstanceOf',
        },
      ],
    },
  ],
});
