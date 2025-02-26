// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/prefer-assert-is-ok.js');

const {RuleTester} = require('./utils/utils.js');

new RuleTester().run('prefer-assert-is-ok', rule, {
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
      code: 'assert.ok(foo);',
      output: 'assert.isOk(foo);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsOk',
        },
      ],
    },
    {
      code: 'assert.ok(foo, "message");',
      output: 'assert.isOk(foo, "message");',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsOk',
        },
      ],
    },
    {
      code: 'assert.notOk(foo);',
      output: 'assert.isNotOk(foo);',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsNotOk',
        },
      ],
    },
    {
      code: 'assert.notOk(foo, "message");',
      output: 'assert.isNotOk(foo, "message");',
      filename: 'foo.ts',
      errors: [
        {
          messageId: 'useAssertIsNotOk',
        },
      ],
    },
  ],
});
