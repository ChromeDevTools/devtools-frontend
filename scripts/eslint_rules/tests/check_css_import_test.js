// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/check_css_import.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
});

ruleTester.run('check_css_import', rule, {
  valid: [
    {
      code: 'import styles from \'./check_css_import_test_file.css.js\';',
      filename: 'scripts/eslint_rules/tests/file.ts',
    },
    {
      code: 'import styles from \'./check_css_import_test_file.css.legacy.js\';',
      filename: 'scripts/eslint_rules/tests/file.ts',
    },
    {
      code: 'import styles from \'../../../scripts/eslint_rules/tests/check_css_import_test_file.css.js\';',
      filename: 'front_end/ui/components/file.ts',
    },
  ],

  invalid: [
    {
      // Files that do not exist are caught
      code: 'import styles from \'styles.css.js\';',
      filename: 'front_end/ui/components/component/file.ts',
      errors: [{
        message: 'File styles.css does not exist. Check you are importing the correct file.',
      }],
    },
    {
      // Files that do not exist are caught
      code: 'import styles from \'styles.css.legacy.js\';',
      filename: 'front_end/ui/components/component/file.ts',
      errors: [{
        message: 'File styles.css does not exist. Check you are importing the correct file.',
      }],
    },
    {
      // Filename typos are caught
      code: 'import styles from \'../../../scripts/eslint_rules/test/check_css_import_tests_file.css.js\';',
      filename: 'front_end/ui/components/icon_button/file.ts',
      errors: [{
        message: 'File check_css_import_tests_file.css does not exist. Check you are importing the correct file.',
      }],
    },
  ],
});
