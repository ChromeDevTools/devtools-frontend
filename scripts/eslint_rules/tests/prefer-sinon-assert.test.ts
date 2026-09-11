// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/prefer-sinon-assert.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('prefer-sinon-assert', rule, {
  valid: [
    {
      name: 'allows assert(a)',
      code: 'assert(a);',
      filename: 'foo.ts',
    },
    {
      name: 'allows assert(a, message)',
      code: 'assert(a, "message");',
      filename: 'foo.ts',
    },
    {
      name: 'allows assert.isOk(a)',
      code: 'assert.isOk(a);',
      filename: 'foo.ts',
    },
    {
      name: 'allows assert.isOk(a, message)',
      code: 'assert.isOk(a, "message");',
      filename: 'foo.ts',
    },
    {
      name: 'allows assert.isNotOk(a)',
      code: 'assert.isNotOk(a);',
      filename: 'foo.ts',
    },
    {
      name: 'allows assert.isNotOk(a, message)',
      code: 'assert.isNotOk(a, "message");',
      filename: 'foo.ts',
    },
    {
      name: 'allows sinon.assert.calledWith(spy, arg1, arg2)',
      code: 'sinon.assert.calledWith(spy, arg1, arg2);',
      filename: 'foo.ts',
    },
  ],

  invalid: [
    {
      name: 'flags assert(spy.notCalled)',
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
      name: 'flags assert.isOk(obj.spy.notCalled)',
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
      name: 'flags assert.isTrue(obj.spy().notCalled)',
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
      name: 'flags assert(spy.called)',
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
      name: 'flags assert.isOk(obj.spy.called)',
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
      name: 'flags assert.isTrue(obj.spy().called)',
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
      name: 'flags assert(spy.calledOnce)',
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
      name: 'flags assert(spy.calledTwice)',
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
      name: 'flags assert(spy.calledThrice)',
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
      name: 'flags assert(spy.calledOn(obj))',
      code: 'assert(spy.calledOn(obj));',
      output: 'sinon.assert.calledOn(spy, obj);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useSinonAssertInsteadOfAssert',
        },
      ],
    },
    {
      name: 'flags assert(spy.alwaysCalledOn(obj))',
      code: 'assert(spy.alwaysCalledOn(obj));',
      output: 'sinon.assert.alwaysCalledOn(spy, obj);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useSinonAssertInsteadOfAssert',
        },
      ],
    },
    {
      name: 'flags assert(spy.calledWith(x))',
      code: 'assert(spy.calledWith(x));',
      output: 'sinon.assert.calledWith(spy, x);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useSinonAssertInsteadOfAssert',
        },
      ],
    },
    {
      name: 'flags assert(spy.calledWith(x, y))',
      code: 'assert(spy.calledWith(x, y));',
      output: 'sinon.assert.calledWith(spy, x, y);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useSinonAssertInsteadOfAssert',
        },
      ],
    },
    {
      name: 'flags assert(spy.calledWith([x, y], {a: 4, b: 2}))',
      code: 'assert(spy.calledWith([x, y], {a: 4, b: 2}));',
      output: 'sinon.assert.calledWith(spy, [x, y], {a: 4, b: 2});',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useSinonAssertInsteadOfAssert',
        },
      ],
    },
    {
      name: 'flags assert(spy.calledWithExactly(x))',
      code: 'assert(spy.calledWithExactly(x));',
      output: 'sinon.assert.calledWithExactly(spy, x);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useSinonAssertInsteadOfAssert',
        },
      ],
    },
    {
      name: 'flags assert(spy.calledOnceWithExactly(x))',
      code: 'assert(spy.calledOnceWithExactly(x));',
      output: 'sinon.assert.calledOnceWithExactly(spy, x);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useSinonAssertInsteadOfAssert',
        },
      ],
    },
    {
      name: 'flags assert(spy.alwaysCalledWith(x))',
      code: 'assert(spy.alwaysCalledWith(x));',
      output: 'sinon.assert.alwaysCalledWith(spy, x);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useSinonAssertInsteadOfAssert',
        },
      ],
    },
    {
      name: 'flags assert(spy.alwaysCalledWithExactly(x))',
      code: 'assert(spy.alwaysCalledWithExactly(x));',
      output: 'sinon.assert.alwaysCalledWithExactly(spy, x);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useSinonAssertInsteadOfAssert',
        },
      ],
    },
    {
      name: 'flags assert(spy.neverCalledWith(x))',
      code: 'assert(spy.neverCalledWith(x));',
      output: 'sinon.assert.neverCalledWith(spy, x);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useSinonAssertInsteadOfAssert',
        },
      ],
    },
    {
      name: 'flags assert(spy.calledWithMatch(x))',
      code: 'assert(spy.calledWithMatch(x));',
      output: 'sinon.assert.calledWithMatch(spy, x);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useSinonAssertInsteadOfAssert',
        },
      ],
    },
    {
      name: 'flags assert(spy.calledOnceWithMatch(x))',
      code: 'assert(spy.calledOnceWithMatch(x));',
      output: 'sinon.assert.calledOnceWithMatch(spy, x);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useSinonAssertInsteadOfAssert',
        },
      ],
    },
    {
      name: 'flags assert(spy.alwaysCalledWithMatch(x))',
      code: 'assert(spy.alwaysCalledWithMatch(x));',
      output: 'sinon.assert.alwaysCalledWithMatch(spy, x);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useSinonAssertInsteadOfAssert',
        },
      ],
    },
    {
      name: 'flags assert(!spy.called)',
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
      name: 'flags assert.isFalse(spy.called)',
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
      name: 'flags assert.isNotOk(spy.called)',
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
      name: 'flags assert(!spy.notCalled)',
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
      name: 'flags assert.isFalse(spy.notCalled)',
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
      name: 'flags assert.isNotOk(spy.notCalled)',
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
      name: 'flags assert.strictEqual(spy.callCount, 5)',
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
