// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-commented-out-console.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-commented-out-console', rule, {
  valid: [
    {
      code: 'console.log("foo")',
      filename: 'front_end/componentRuleTesters/test.ts',
    },
    {
      code: '// console.group() is not filtered',
      filename: 'front_end/components/test.ts',
    },
    {
      code: '// console.warn("foo")',
      filename: 'front_end/components/test.ts',
    },
    {
      code: '// console.error("foo")',
      filename: 'front_end/components/test.ts',
    },
  ],
  invalid: [
    {
      code: '// console.log("foo")',
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'foundComment'}],
    },
  ],
});
