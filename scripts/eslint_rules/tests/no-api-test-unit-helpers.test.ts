// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-api-test-unit-helpers.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-api-test-unit-helpers', rule, {
  valid: [
    {
      name: 'allows standard describe and it in test.api.ts',
      code: `
        describe('Universe API Test', () => {
          it('does something with API state', async ({inspectedPage, universe}) => {
            assert.isNotNull(universe);
          });
        });
      `,
      filename: 'front_end/foundation/Universe.test.api.ts',
    },
  ],

  invalid: [
    {
      name: 'disallows importing TestUniverse in test.api.ts',
      code: 'import { TestUniverse } from "../testing/EnvironmentHelpers.js";',
      filename: 'front_end/foundation/Universe.test.api.ts',
      errors: [
        {
          messageId: 'noTestUniverse',
        },
      ],
    },
    {
      name: 'disallows describeWithEnvironment in test.api.ts',
      code: 'describeWithEnvironment("my test", () => {});',
      filename: 'front_end/foundation/Universe.test.api.ts',
      errors: [
        {
          messageId: 'noDescribeWithEnvironment',
        },
      ],
    },
    {
      name: 'disallows new TestUniverse() in test.api.ts',
      code: 'new TestUniverse();',
      filename: 'front_end/foundation/Universe.test.api.ts',
      errors: [
        {
          messageId: 'noTestUniverse',
        },
      ],
    },
  ],
});
