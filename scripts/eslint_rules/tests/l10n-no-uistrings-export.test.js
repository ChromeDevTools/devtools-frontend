// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';
const rule = require('../lib/l10n-no-uistrings-export.js');

const {RuleTester} = require('./utils/utils.js');

new RuleTester().run('l10n-no-uistrings-export', rule, {
  valid: [
    {
      code: 'const UIStrings = {};',
      filename: 'front_end/module/test.ts',
    },
    {
      code: 'export const UIStrings = {};',
      filename: 'front_end/module/ModuleUIStrings.ts',
    },
    {
      code: 'export const UIStrings = {};',
      filename: 'front_end/module/ModuleUIStrings.js',
    },
  ],
  invalid: [
    {
      code: 'export const UIStrings = {};',
      filename: 'front_end/module/test.ts',
      errors: [
        {
          message: 'Exporting the UIStrings object is only allowed in ModuleUIStrings.(js|ts) or trace/model/insights',
        },
      ],
      output: ' const UIStrings = {};',
    },
    {
      code: 'const UIStrings = {}; export { UIStrings };',
      filename: 'front_end/module/test.ts',
      errors: [
        {
          message: 'Exporting the UIStrings object is only allowed in ModuleUIStrings.(js|ts) or trace/model/insights',
        },
      ],
    },
  ],
});
