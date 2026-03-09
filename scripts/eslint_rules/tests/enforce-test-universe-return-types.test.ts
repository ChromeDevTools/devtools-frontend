// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/enforce-test-universe-return-types.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('enforce-test-universe-return-types', rule, {
  valid: [
    {
      code: `
        export class TestUniverse {
          constructor() {}
          createTarget(): SDK.Target.Target {}
          get cssWorkspaceBinding(): Bindings.CSSWorkspaceBinding.CSSWorkspaceBinding {}
          get settings(): Common.Settings.Settings {}
        }
      `,
      filename: 'front_end/testing/TestUniverse.ts',
    },
  ],

  invalid: [
    {
      code: `
        export class TestUniverse {
          get someString(): string { return 'foo'; }
          get someOther(): Other.Type { return x; }
          method(): void {}
          noReturnType() {}
        }
      `,
      filename: 'front_end/testing/TestUniverse.ts',
      errors: [
        {messageId: 'disallowedReturnType', data: {type: 'string'}},
        {messageId: 'disallowedReturnType', data: {type: 'Other.Type'}},
        {messageId: 'disallowedReturnType', data: {type: 'void'}},
        {messageId: 'noReturnType', data: {method: 'noReturnType'}},
      ],
    },
  ],
});
