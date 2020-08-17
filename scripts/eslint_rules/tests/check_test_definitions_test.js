// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/check_test_definitions.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
});

ruleTester.run('check_e2e_tests', rule, {
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
    {
      code: `import {describe, it} from '../../shared/mocha-extensions.js';

      describe('e2e-test', async () => {
        // Explaining comment
        it.skip('[crbug.com/123456] normal test', async () => {
        });
      });
      `,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: `import {describe, it} from '../../shared/mocha-extensions.js';

      describe('e2e-test', async () => {
        // Explaining comment
        it.skip(\`[crbug.com/123456] normal test \${withVariable}\`, async () => {
        });
      });
      `,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: `import {describe, it} from '../../shared/mocha-extensions.js';

      // Explaining comment
      it.skip = function (name, callback) {
        callback(name);
      };
      `,
      filename: 'test/e2e/folder/file.ts',
    }
  ],

  invalid: [
    {
      code: `import {describe, it} from '../../shared/mocha-extensions.js';

      describe('e2e-test', async () => {
        // Explaining comment
        it.skip('normal test', async () => {
        });
      });
      `,
      filename: 'test/e2e/folder/file.ts',
      errors: [{message: rule.meta.messages.description}],
    },
    {
      code: `import {describe, it} from '../../shared/mocha-extensions.js';

      describe('e2e-test', async () => {
        it.skip('[crbug.com/1345] normal test', async () => {
        });
      });
      `,
      filename: 'test/e2e/folder/file.ts',
      errors: [{message: rule.meta.messages.comment}],
    },
    {
      code: `import {describe, it} from '../../shared/mocha-extensions.js';

      describe('e2e-test', async () => {
        // Explaining comment
        it.skip(\`normal test \${withVariable}\`, async () => {
        });
      });
      `,
      filename: 'test/e2e/folder/file.ts',
      errors: [{message: rule.meta.messages.description}],
    },
  ]
});
