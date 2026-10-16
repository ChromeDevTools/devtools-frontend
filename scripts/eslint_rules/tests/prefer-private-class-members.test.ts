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
    {
      name: 'allows protected method and field',
      code: `class Foo {
        protected field = 1;
        protected method() {}
      }
      `,
      filename: 'front_end/core/common/Foo.ts',
    },
    {
      name: 'allows constructor parameter properties',
      code: `class Foo {
        constructor(private readonly bar: string) {}
      }
      `,
      filename: 'front_end/models/issues_manager/Foo.ts',
    },
  ],

  invalid: [
    {
      name: 'disallows private method modifier and autofixes in-class references',
      code: `class Foo {
        private method() {}
        run() {
          this.method();
        }
      }
      `,
      output: `class Foo {
        #method() {}
        run() {
          this.#method();
        }
      }
      `,
      filename: 'test/e2e/folder/file.ts',
      errors: [{messageId: 'doNotUsePrivate'}],
    },
    {
      name: 'disallows private field modifier and autofixes in-class references',
      code: `class Foo {
        private readonly field: string;
        constructor() {
          this.field = 'hello';
        }
      }
      `,
      output: `class Foo {
        readonly #field: string;
        constructor() {
          this.#field = 'hello';
        }
      }
      `,
      filename: 'test/e2e/folder/file.ts',
      errors: [{messageId: 'doNotUsePrivate'}],
    },
    {
      name: 'reports without autofix when dynamic bracket access exists',
      code: `class Foo {
        private dispatch() {}
        constructor() {
          this['dispatch']();
        }
      }
      `,
      filename: 'front_end/core/host/InspectorFrontendHost.ts',
      errors: [{messageId: 'doNotUsePrivate'}],
    },
  ],
});
