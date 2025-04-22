// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/prefer-assert-instance-of.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('prefer-assert-instance-of', rule, {
  valid: [
    {
      code: 'assert(a);',
    },
    {
      code: 'assert(a, "message");',
    },
    {
      code: 'assert.instanceOf(foo, Foo);',
    },
    {
      code: 'assert.instanceOf(foo, Foo, "message");',
    },
    {
      code: 'assert.notInstanceOf(foo, Foo);',
    },
    {
      code: 'assert.notInstanceOf(foo, Foo, "message");',
    },
  ],

  invalid: [
    {
      code: 'assert(foo instanceof Foo);',
      output: 'assert.instanceOf(foo, Foo);',
      errors: [
        {
          messageId: 'useAssertInstanceOf',
        },
      ],
    },
    {
      code: 'assert(foo instanceof Foo, "message");',
      output: 'assert.instanceOf(foo, Foo, "message");',
      errors: [
        {
          messageId: 'useAssertInstanceOf',
        },
      ],
    },
    {
      code: 'assert.isNotFalse(foo instanceof Foo);',
      output: 'assert.instanceOf(foo, Foo);',
      errors: [
        {
          messageId: 'useAssertInstanceOf',
        },
      ],
    },
    {
      code: 'assert.isNotFalse(foo instanceof Foo, "message");',
      output: 'assert.instanceOf(foo, Foo, "message");',
      errors: [
        {
          messageId: 'useAssertInstanceOf',
        },
      ],
    },
    {
      code: 'assert.isOk(foo instanceof Foo);',
      output: 'assert.instanceOf(foo, Foo);',
      errors: [
        {
          messageId: 'useAssertInstanceOf',
        },
      ],
    },
    {
      code: 'assert.isOk(foo instanceof Foo, "message");',
      output: 'assert.instanceOf(foo, Foo, "message");',
      errors: [
        {
          messageId: 'useAssertInstanceOf',
        },
      ],
    },
    {
      code: 'assert.isTrue(foo instanceof Foo);',
      output: 'assert.instanceOf(foo, Foo);',
      errors: [
        {
          messageId: 'useAssertInstanceOf',
        },
      ],
    },
    {
      code: 'assert.isTrue(foo instanceof Foo, "message");',
      output: 'assert.instanceOf(foo, Foo, "message");',
      errors: [
        {
          messageId: 'useAssertInstanceOf',
        },
      ],
    },
    {
      code: 'assert.ok(foo instanceof Foo);',
      output: 'assert.instanceOf(foo, Foo);',
      errors: [
        {
          messageId: 'useAssertInstanceOf',
        },
      ],
    },
    {
      code: 'assert.ok(foo instanceof Foo, "message");',
      output: 'assert.instanceOf(foo, Foo, "message");',
      errors: [
        {
          messageId: 'useAssertInstanceOf',
        },
      ],
    },
    {
      code: 'assert.isFalse(foo instanceof Foo);',
      output: 'assert.notInstanceOf(foo, Foo);',
      errors: [
        {
          messageId: 'useAssertNotInstanceOf',
        },
      ],
    },
    {
      code: 'assert.isFalse(foo instanceof Foo, "message");',
      output: 'assert.notInstanceOf(foo, Foo, "message");',
      errors: [
        {
          messageId: 'useAssertNotInstanceOf',
        },
      ],
    },
    {
      code: 'assert.isNotOk(foo instanceof Foo);',
      output: 'assert.notInstanceOf(foo, Foo);',
      errors: [
        {
          messageId: 'useAssertNotInstanceOf',
        },
      ],
    },
    {
      code: 'assert.isNotOk(foo instanceof Foo, "message");',
      output: 'assert.notInstanceOf(foo, Foo, "message");',
      errors: [
        {
          messageId: 'useAssertNotInstanceOf',
        },
      ],
    },
    {
      code: 'assert.isNotTrue(foo instanceof Foo);',
      output: 'assert.notInstanceOf(foo, Foo);',
      errors: [
        {
          messageId: 'useAssertNotInstanceOf',
        },
      ],
    },
    {
      code: 'assert.isNotTrue(foo instanceof Foo, "message");',
      output: 'assert.notInstanceOf(foo, Foo, "message");',
      errors: [
        {
          messageId: 'useAssertNotInstanceOf',
        },
      ],
    },
    {
      code: 'assert.notOk(foo instanceof Foo);',
      output: 'assert.notInstanceOf(foo, Foo);',
      errors: [
        {
          messageId: 'useAssertNotInstanceOf',
        },
      ],
    },
    {
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
