// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/prefer-private-class-members.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('prefer-private-class-members', rule, {
  valid: [
    {
      code: `class Foo {
        #method() {}
      }
      `,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: `class Foo {
        public method() {}
      }
      `,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: `class Foo {
        public field: string;
      }
      `,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: `class Foo {
        private constructor() {}
      }
      `,
      filename: 'test/e2e/folder/file.ts',
    },
  ],

  invalid: [
    {
      code: `class Foo {
        private method() {}
      }
      `,
      filename: 'test/e2e/folder/file.ts',
      errors: [{messageId: 'doNotUsePrivate'}],
    },
    {
      code: `class Foo {
        private field: string;
      }
      `,
      filename: 'test/e2e/folder/file.ts',
      errors: [{messageId: 'doNotUsePrivate'}],
    },
  ],
});
