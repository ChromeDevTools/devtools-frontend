// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-commented-out-console.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-commented-out-console', rule, {
  valid: [
    {
      name: 'allows uncommented console.log',
      code: 'console.log("foo")',
      filename: 'front_end/componentRuleTesters/test.ts',
    },
    {
      name: 'allows commented console.group',
      code: '// console.group() is not filtered',
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows commented console.warn',
      code: '// console.warn("foo")',
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows commented console.error',
      code: '// console.error("foo")',
      filename: 'front_end/components/test.ts',
    },
  ],
  invalid: [
    {
      name: 'disallows commented console.log',
      code: '// console.log("foo")',
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'foundComment'}],
    },
  ],
});
