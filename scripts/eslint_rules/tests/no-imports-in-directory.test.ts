// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import path from 'path';

import rule from '../lib/no-imports-in-directory.ts';

import {RuleTester} from './utils/RuleTester.ts';

const NOT_SDK_PATH = path.join(
    // @ts-expect-error
    import.meta.dirname,
    '..',
    '..',
    '..',
    'front_end',
    'core',
    'not-sdk',
    'sdk.js',
);

const SDK_PATH = path.join(
    // @ts-expect-error
    import.meta.dirname,
    '..',
    '..',
    '..',
    'front_end',
    'core',
    'sdk',
    'sdk.js',
);

new RuleTester().run('no-imports-in-directory', rule, {
  valid: [
    {
      code: 'import * as SDK from \'../../../core/sdk/sdk.js\';',
      filename: 'front_end/models/trace/handlers/TestHandler.ts',
      options: [
        {
          bannedImportPaths: [{
            bannedPath: NOT_SDK_PATH,
            allowTypeImports: false,
          }],
        },
      ],
    },
    {
      code: 'import type * as SDK from \'../../../core/sdk/sdk.js\';',
      filename: 'front_end/models/trace/handlers/TestHandler.ts',
      options: [
        {
          bannedImportPaths: [{
            bannedPath: SDK_PATH,
            allowTypeImports: true,
          }],
        },
      ],
    },
  ],
  invalid: [
    {
      code: 'import * as SDK from \'../../../core/sdk/sdk.js\';',
      filename: 'front_end/models/trace/handlers/TestHandler.ts',
      options: [
        {
          bannedImportPaths: [{bannedPath: SDK_PATH, allowTypeImports: false}],
        },
      ],
      errors: [{messageId: 'invalidImport'}],
    },
    {
      code: 'import type * as SDK from \'../../../core/sdk/sdk.js\';',
      filename: 'front_end/models/trace/handlers/TestHandler.ts',
      options: [
        {
          bannedImportPaths: [{bannedPath: SDK_PATH, allowTypeImports: false}],
        },
      ],
      errors: [{messageId: 'invalidImport'}],
    },
    {
      code: 'import \'../../../core/sdk/sdk.js\';',
      filename: 'front_end/models/trace/handlers/TestHandler.ts',
      options: [
        {
          bannedImportPaths: [{bannedPath: SDK_PATH, allowTypeImports: false}],
        },
      ],
      errors: [{messageId: 'invalidImport'}],
    },
    {
      code: 'import {Foo} from \'../../../core/sdk/sdk.js\';',
      filename: 'front_end/models/trace/handlers/TestHandler.ts',
      options: [
        {
          bannedImportPaths: [{bannedPath: SDK_PATH, allowTypeImports: false}],
        },
      ],
      errors: [{messageId: 'invalidImport'}],
    },
  ],
});
