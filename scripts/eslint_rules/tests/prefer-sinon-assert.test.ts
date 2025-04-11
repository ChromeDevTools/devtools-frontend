// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/prefer-sinon-assert.ts';

import {RuleTester} from './utils/tsUtils.ts';

new RuleTester().run('prefer-sinon-assert', rule, {
  valid: [
    {
      code: 'assert(a);',
      filename: 'foo.ts',
    },
    {
      code: 'assert(a, "message");',
      filename: 'foo.ts',
    },
    {
      code: 'assert.isOk(a);',
      filename: 'foo.ts',
    },
    {
      code: 'assert.isOk(a, "message");',
      filename: 'foo.ts',
    },
    {
      code: 'assert.isNotOk(a);',
      filename: 'foo.ts',
    },
    {
      code: 'assert.isNotOk(a, "message");',
      filename: 'foo.ts',
    },
  ],

  invalid: [
    {
      code: 'assert(spy.notCalled);',
      output: 'sinon.assert.notCalled(spy);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useSinonAssertInsteadOfAssert',
        },
      ],
    },
    {
      code: 'assert.isOk(obj.spy.notCalled);',
      output: 'sinon.assert.notCalled(obj.spy);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useSinonAssertInsteadOfAssert',
        },
      ],
    },
    {
      code: 'assert.isTrue(obj.spy().notCalled);',
      output: 'sinon.assert.notCalled(obj.spy());',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useSinonAssertInsteadOfAssert',
        },
      ],
    },
    {
      code: 'assert(spy.called);',
      output: 'sinon.assert.called(spy);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useSinonAssertInsteadOfAssert',
        },
      ],
    },
    {
      code: 'assert.isOk(obj.spy.called);',
      output: 'sinon.assert.called(obj.spy);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useSinonAssertInsteadOfAssert',
        },
      ],
    },
    {
      code: 'assert.isTrue(obj.spy().called);',
      output: 'sinon.assert.called(obj.spy());',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useSinonAssertInsteadOfAssert',
        },
      ],
    },
    {
      code: 'assert(spy.calledOnce);',
      output: 'sinon.assert.calledOnce(spy);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useSinonAssertInsteadOfAssert',
        },
      ],
    },
    {
      code: 'assert(spy.calledTwice);',
      output: 'sinon.assert.calledTwice(spy);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useSinonAssertInsteadOfAssert',
        },
      ],
    },
    {
      code: 'assert(spy.calledThrice);',
      output: 'sinon.assert.calledThrice(spy);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useSinonAssertInsteadOfAssert',
        },
      ],
    },
    {
      code: 'assert(!spy.called);',
      output: 'sinon.assert.notCalled(spy);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useSinonAssertNotCalledInsteadOfAssert',
        },
      ],
    },
    {
      code: 'assert.isFalse(spy.called);',
      output: 'sinon.assert.notCalled(spy);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useSinonAssertNotCalledInsteadOfAssert',
        },
      ],
    },
    {
      code: 'assert.isNotOk(spy.called);',
      output: 'sinon.assert.notCalled(spy);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useSinonAssertNotCalledInsteadOfAssert',
        },
      ],
    },
    {
      code: 'assert(!spy.notCalled);',
      output: 'sinon.assert.called(spy);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useSinonAssertCalledInsteadOfAssert',
        },
      ],
    },
    {
      code: 'assert.isFalse(spy.notCalled);',
      output: 'sinon.assert.called(spy);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useSinonAssertCalledInsteadOfAssert',
        },
      ],
    },
    {
      code: 'assert.isNotOk(spy.notCalled);',
      output: 'sinon.assert.called(spy);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useSinonAssertCalledInsteadOfAssert',
        },
      ],
    },
    {
      code: 'assert.strictEqual(spy.callCount, 5);',
      output: 'sinon.assert.callCount(spy, 5);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useSinonAssertCallCountInsteadOfAssert',
        },
      ],
    },
  ],
});
