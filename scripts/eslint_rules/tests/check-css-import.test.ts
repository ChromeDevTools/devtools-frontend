// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/check-css-import.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('check-css-import', rule, {
  valid: [
    {
      name: 'allows importing existing css.js file in same directory',
      code: 'import styles from \'./check_css_import_test_file.css.js\';',
      filename: 'scripts/eslint_rules/tests/file.ts',
    },
    {
      name: 'allows importing existing css.js file via relative path',
      code: 'import styles from \'../../../scripts/eslint_rules/tests/check_css_import_test_file.css.js\';',
      filename: 'front_end/ui/components/file.ts',
    },
  ],

  invalid: [
    {
      // Files that do not exist are caught
      name: 'disallows importing non-existent css.js file',
      code: 'import styles from \'styles.css.js\';',
      filename: 'front_end/ui/components/component/file.ts',
      errors: [
        {
          messageId: 'fileDoesNotExist',
        },
      ],
    },
    {
      // Filename typos are caught
      name: 'disallows importing css.js file with typo in path',
      code: 'import styles from \'../../../scripts/eslint_rules/test/check_css_import_tests_file.css.js\';',
      filename: 'front_end/ui/components/icon_button/file.ts',
      errors: [
        {
          messageId: 'fileDoesNotExist',
        },
      ],
    },
  ],
});
