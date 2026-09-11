// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-dynamic-preamble.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-dynamic-preamble', rule, {
  valid: [
    {
      name: 'allows const string literal preamble variable in AiAgent',
      code: `
        const preamble = 'static preamble';
        class MyAgent extends AiAgent {
          readonly preamble = preamble;
        }
      `,
    },
    {
      name: 'allows const template literal preamble without substitution in AiAgent',
      code: `
        const preamble = \`static preamble\`;
        class MyAgent extends AiAgent {
          readonly preamble = preamble;
        }
      `,
    },
    {
      name: 'allows direct string literal preamble in AiAgent',
      code: `
        class MyAgent extends AiAgent {
          readonly preamble = 'static preamble';
        }
      `,
    },
    {
      name: 'allows direct template literal preamble without substitution in AiAgent',
      code: `
        class MyAgent extends AiAgent {
          readonly preamble = \`static preamble\`;
        }
      `,
    },
    {
      name: 'allows dynamic preamble in non-AiAgent class',
      code: `
        class NotAnAgent {
          readonly preamble = \`dynamic \${foo}\`;
        }
      `,
    },
  ],
  invalid: [
    {
      name: 'disallows template literal with substitution directly on AiAgent preamble',
      code: `
        class MyAgent extends AiAgent {
          readonly preamble = \`dynamic \${foo}\`;
        }
      `,
      errors: [{messageId: 'dynamicPreamble'}],
    },
    {
      name: 'disallows referencing template literal with substitution in AiAgent preamble',
      code: `
        const preamble = \`dynamic \${foo}\`;
        class MyAgent extends AiAgent {
          readonly preamble = preamble;
        }
      `,
      errors: [{messageId: 'dynamicPreamble'}],
    },
    {
      name: 'disallows referencing let variable in AiAgent preamble',
      code: `
        let preamble = 'static';
        class MyAgent extends AiAgent {
          readonly preamble = preamble;
        }
      `,
      errors: [{messageId: 'dynamicPreamble'}],
    },
    {
      name: 'disallows referencing function call in AiAgent preamble',
      code: `
        const preamble = someFunction();
        class MyAgent extends AiAgent {
          readonly preamble = preamble;
        }
      `,
      errors: [{messageId: 'dynamicPreamble'}],
    },
  ],
});
