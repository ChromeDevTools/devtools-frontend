// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/prefer-private-class-members.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('prefer-private-class-members', rule, {
  valid: [
    {
      name: 'allows private hash method',
      code: `class Foo {
        #method() {}
      }
      `,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      name: 'allows public method',
      code: `class Foo {
        public method() {}
      }
      `,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      name: 'allows public field',
      code: `class Foo {
        public field: string;
      }
      `,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      name: 'allows private constructor',
      code: `class Foo {
        private constructor() {}
      }
      `,
      filename: 'test/e2e/folder/file.ts',
    },
  ],

  invalid: [
    {
      name: 'disallows private method modifier',
      code: `class Foo {
        private method() {}
      }
      `,
      filename: 'test/e2e/folder/file.ts',
      errors: [{messageId: 'doNotUsePrivate'}],
    },
    {
      name: 'disallows private field modifier',
      code: `class Foo {
        private field: string;
      }
      `,
      filename: 'test/e2e/folder/file.ts',
      errors: [{messageId: 'doNotUsePrivate'}],
    },
  ],
});
