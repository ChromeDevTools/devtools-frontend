// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/check-test-definitions.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('check-test-definitions', rule, {
  valid: [
    {
      name: 'allows standard describe and it in e2e tests',
      code: `import {describe, it} from '../../shared/mocha-extensions.js';

      describe('e2e-test', async () => {
        it('normal test', async () => {
        });
      });
      `,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      name: 'allows assigning it.skip function',
      code: `import {describe, it} from '../../shared/mocha-extensions.js';

      // Explaining comment
      it.skip = function (name, callback) {
        callback(name);
      };
      `,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      name: 'allows crbug link at end of it title template',
      code: `import {describe, it} from '../../shared/mocha-extensions.js';

      describe('e2e-test', async () => {
        it(\`normal test \${withVariable} (crbug.com/1234)\`, async () => {
        });
      });
      `,
      filename: 'test/e2e/folder/file.ts',
    },
    {
      // Not complete, don't attempt to validate this yet.
      name: 'ignores incomplete it() expression',
      code: 'it()',
      filename: 'test/unittest/folder/file.ts',
    },
  ],

  invalid: [
    {
      name: 'disallows it.skip in e2e tests',
      code: `import {describe, it} from '../../shared/mocha-extensions.js';

      describe('e2e-test', async () => {
        // Explaining comment
        it.skip('normal test', async () => {
        });
      });
      `,
      filename: 'test/e2e/folder/file.ts',
      errors: [{messageId: 'disallowSkip'}],
    },
    {
      name: 'disallows it.skip with bug id prefix',
      code: `import {describe, it} from '../../shared/mocha-extensions.js';

      describe('e2e-test', async () => {
        it.skip('[crbug.com/1345] normal test', async () => {
        });
      });
      `,
      filename: 'test/e2e/folder/file.ts',
      errors: [{messageId: 'disallowSkip'}],
    },
    {
      name: 'disallows bug id at start of title template',
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
      name: 'disallows describe.skip in e2e tests',
      code: `import {describe, it} from '../../shared/mocha-extensions.js';
      describe.skip('e2e-test', async () => {
      });
      `,
      filename: 'test/e2e/folder/file.ts',
      errors: [{messageId: 'disallowSkip'}],
    },
  ],
});
