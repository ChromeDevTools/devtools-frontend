// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const path = require('path');

const rule = require('../lib/no-imports-in-directory.js');

const {RuleTester} = require('./utils/utils.js');

new RuleTester().run('no-imports-in-directory', rule, {
  valid: [
    {
      code: 'import * as SDK from \'../../../core/sdk/sdk.js\';',
      filename: 'front_end/models/trace/handlers/TestHandler.ts',
      options: [
        {
          bannedImportPaths: [
            path.join(
                __dirname,
                '..',
                '..',
                '..',
                'front_end',
                'core',
                'not-sdk',
                'sdk.js',
                ),
          ],
        },
      ],
      errors: [{messageId: 'invalidImport'}],
    },
  ],
  invalid: [
    {
      code: 'import * as SDK from \'../../../core/sdk/sdk.js\';',
      filename: 'front_end/models/trace/handlers/TestHandler.ts',
      options: [
        {
          bannedImportPaths: [
            path.join(
                __dirname,
                '..',
                '..',
                '..',
                'front_end',
                'core',
                'sdk',
                'sdk.js',
                ),
          ],
        },
      ],
      errors: [{messageId: 'invalidImport'}],
    },
    {
      code: 'import type * as SDK from \'../../../core/sdk/sdk.js\';',
      filename: 'front_end/models/trace/handlers/TestHandler.ts',
      options: [
        {
          bannedImportPaths: [
            path.join(
                __dirname,
                '..',
                '..',
                '..',
                'front_end',
                'core',
                'sdk',
                'sdk.js',
                ),
          ],
        },
      ],
      errors: [{messageId: 'invalidImport'}],
    },
    {
      code: 'import \'../../../core/sdk/sdk.js\';',
      filename: 'front_end/models/trace/handlers/TestHandler.ts',
      options: [
        {
          bannedImportPaths: [
            path.join(
                __dirname,
                '..',
                '..',
                '..',
                'front_end',
                'core',
                'sdk',
                'sdk.js',
                ),
          ],
        },
      ],
      errors: [{messageId: 'invalidImport'}],
    },
    {
      code: 'import {Foo} from \'../../../core/sdk/sdk.js\';',
      filename: 'front_end/models/trace/handlers/TestHandler.ts',
      options: [
        {
          bannedImportPaths: [
            path.join(
                __dirname,
                '..',
                '..',
                '..',
                'front_end',
                'core',
                'sdk',
                'sdk.js',
                ),
          ],
        },
      ],
      errors: [{messageId: 'invalidImport'}],
    },
  ],
});
