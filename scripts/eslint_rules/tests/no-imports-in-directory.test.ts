// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import path from 'node:path';

import rule from '../lib/no-imports-in-directory.ts';

import {RuleTester} from './utils/RuleTester.ts';

const NOT_SDK_PATH = path.join(
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
      name: 'allows import not in banned paths',
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
      name: 'allows type import when allowTypeImports is true',
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
      name: 'disallows value import of banned path',
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
      name: 'disallows type import when allowTypeImports is false',
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
      name: 'disallows side-effect import of banned path',
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
      name: 'disallows named import of banned path',
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
