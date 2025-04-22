// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/enforce-ui-strings-as-const.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('enforce-ui-strings-as-const', rule, {
  valid: [
    {
      code: 'const UIStrings = {} as const;',
    },
    {
      code: 'const UIStringsNotTranslate = {} as const;',
    },
    {code: 'const NotAUIStrings = {}'}
  ],
  invalid: [
    {
      code: 'const UIStrings = {};',
      errors: [
        {messageId: 'invalidUIStringsObject'},
      ],
      output: 'const UIStrings = {} as const;',
    },
    {
      code: 'const UIStringsNotTranslate = {};',
      errors: [
        {messageId: 'invalidUIStringsObject'},
      ],
      output: 'const UIStringsNotTranslate = {} as const;'
    },
  ],
});
