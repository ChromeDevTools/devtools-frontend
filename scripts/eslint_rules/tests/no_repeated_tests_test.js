// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/no_repeated_tests.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
});

ruleTester.run('no_repeated_tests', rule, {
  valid: [
    {
      code: `import {describe, it} from '../../shared/mocha-extensions.js';

      describe('e2e-test', async () => {
        it('normal test', async () => {
        });
      });
      `,
      filename: 'test/e2e/folder/file.ts',
    },
  ],

  invalid: [
    {
      code: `import {describe, it} from '../../shared/mocha-extensions.js';

      describe('e2e-test', async () => {
        it.repeat(5, 'with repeat#', async () => {
        });
      });
      `,
      filename: 'test/e2e/folder/file.ts',
      errors: [{message: 'Unexpected repeated mocha test'}],
    },
    {
      code: `import {describe, it} from '../../shared/mocha-extensions.js';

      describe('e2e-test', async () => {
        it.repeat('forgot the repeat#', async () => {
        });
      });
      `,
      filename: 'test/e2e/folder/file.ts',
      errors: [{message: 'Unexpected repeated mocha test'}],
    },
  ]
});
