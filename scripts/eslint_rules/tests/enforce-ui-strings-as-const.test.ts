// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/enforce-ui-strings-as-const.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('enforce-ui-strings-as-const', rule, {
  valid: [
    {
      name: 'allows UIStrings defined as const',
      code: 'const UIStrings = {} as const;',
    },
    {
      name: 'allows UIStringsNotTranslate defined as const',
      code: 'const UIStringsNotTranslate = {} as const;',
    },
    {
      name: 'allows other object without as const',
      code: 'const NotAUIStrings = {}',
    },
  ],
  invalid: [
    {
      name: 'disallows UIStrings without as const',
      code: 'const UIStrings = {};',
      errors: [
        {messageId: 'invalidUIStringsObject'},
      ],
      output: 'const UIStrings = {} as const;',
    },
    {
      name: 'disallows UIStringsNotTranslate without as const',
      code: 'const UIStringsNotTranslate = {};',
      errors: [
        {messageId: 'invalidUIStringsObject'},
      ],
      output: 'const UIStringsNotTranslate = {} as const;',
    },
  ],
});
