// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/check-test-definitions.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('check-test-definitions', rule, {
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
    },
    {
      code: `import {describe, it} from '../../shared/mocha-extensions.js';

      describe('e2e-test', async () => {
        it(\`normal test \${withVariable} (crbug.com/1234)\`, async () => {
        });
      });
      `,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: `import {describe, it} from '../../shared/mocha-extensions.js';
      // Explaining comment
      describe.skip('[crbug.com/123456]: e2e-test', async () => {
      });
      `,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      code: `import {describe, it} from '../../shared/mocha-extensions.js';

      describe('e2e-test', async () => {
        // Explaining comment
        it.skipOnPlatforms(['mac'], '[crbug.com/123456]: e2e-test', async () => {
        });
      });
      `,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      // Not complete, don't attempt to validate this yet.
      code: 'it()',
      filename: 'test/unittest/folder/file.ts',
    },
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
      errors: [{messageId: 'missingBugId'}],
    },
    {
      code: `import {describe, it} from '../../shared/mocha-extensions.js';

      describe('e2e-test', async () => {
        it.skip('[crbug.com/1345] normal test', async () => {
        });
      });
      `,
      filename: 'test/e2e/folder/file.ts',
      errors: [{messageId: 'comment'}],
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
      errors: [{messageId: 'missingBugId'}],
    },
    {
      code: `import {describe, it} from '../../shared/mocha-extensions.js';

      describe('e2e-test', async () => {
        it(\`[crbug.com/1234] normal test \${withVariable}\`, async () => {
        });
      });
      `,
      filename: 'test/e2e/folder/file.ts',
      errors: [{messageId: 'extraBugId'}],
    },
    {
      code: `import {describe, it} from '../../shared/mocha-extensions.js';
      describe.skip('e2e-test', async () => {
      });
      `,
      filename: 'test/e2e/folder/file.ts',
      errors: [{messageId: 'missingBugId'}, {messageId: 'comment'}],
    },
    {
      code: `import {describe, it} from '../../shared/mocha-extensions.js';
      describe('e2e-test', async () => {
        it.skipOnPlatforms(['mac'], 'e2e-test', async () => {
        });
      });
      `,
      filename: 'test/e2e/folder/file.ts',
      errors: [{messageId: 'missingBugId'}, {messageId: 'comment'}],
    },
  ],
});
