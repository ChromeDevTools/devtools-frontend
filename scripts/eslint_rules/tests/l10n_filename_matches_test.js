// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const path = require('path');

const rule = require('../lib/l10n_filename_matches.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('l10n_filename_matches', rule, {
  valid: [
    {
      code: 'const str_ = i18n.i18n.registerUIStrings(\'components/test.ts\', UIStrings);',
      filename: 'front_end/components/test.ts',
      options: [{rootFrontendDirectory: path.join(__dirname, '..', '..', '..', 'front_end')}]
    },
    {
      code: 'const str_ = i18n.i18n.registerUIStrings(\'components/ModuleUIStrings.js\', UIStrings);',
      filename: 'front_end/components/test.ts',
      options: [{rootFrontendDirectory: path.join(__dirname, '..', '..', '..', 'front_end')}]
    },
    {
      code: 'const str_ = i18n.i18n.registerUIStrings(\'components/ModuleUIStrings.ts\', UIStrings);',
      filename: 'front_end/components/test.ts',
      options: [{rootFrontendDirectory: path.join(__dirname, '..', '..', '..', 'front_end')}]
    },
    {
      code: 'const str_ = i18n.i18n.registerUIStrings(\'ModuleUIStrings.ts\', UIStrings);',
      filename: 'front_end/components/test.ts',
      options: [{rootFrontendDirectory: path.join(__dirname, '..', '..', '..', 'front_end', 'components')}]
    },
    {
      code: 'const str_ = i18n.i18n.registerUIStrings(\'test.ts\', UIStrings);',
      filename: 'front_end/components/test.ts',
      options: [{rootFrontendDirectory: path.join(__dirname, '..', '..', '..', 'front_end', 'components')}]
    },
  ],
  invalid: [
    {
      code: 'const str_ = i18n.i18n.registerUIStrings(\'components/foo.ts\', UIStrings);',
      filename: 'front_end/components/test.ts',
      options: [{rootFrontendDirectory: path.join(__dirname, '..', '..', '..', 'front_end')}],
      errors: [{
        message:
            'First argument to \'registerUIStrings\' call must be \'components/test.ts\' or the ModuleUIStrings.(js|ts)'
      }],
      output: 'const str_ = i18n.i18n.registerUIStrings(\'components/test.ts\', UIStrings);',
    },
    {
      code: 'const str_ = i18n.i18n.registerUIStrings(\'components/test.ts\', UIStrings);',
      filename: 'front_end/components/test.ts',
      errors: [
        {message: 'First argument to \'registerUIStrings\' call must be \'test.ts\' or the ModuleUIStrings.(js|ts)'}
      ],
      output: 'const str_ = i18n.i18n.registerUIStrings(\'test.ts\', UIStrings);',
      options: [{rootFrontendDirectory: path.join(__dirname, '..', '..', '..', 'front_end', 'components')}]
    },
  ]
});
