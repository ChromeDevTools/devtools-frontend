// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import path from 'node:path';

import rule from '../lib/enforce-default-import-name.ts';

import {RuleTester} from './utils/RuleTester.ts';

const TEST_OPTIONS = [
  {
    modulePath: path.join(
        import.meta.dirname,
        '..',
        '..',
        '..',
        'front_end',
        'models',
        'trace',
        'trace.js',
        ),
    importName: 'Trace',
  },
] as const;

new RuleTester().run('enforce-default-import-name', rule, {
  valid: [
    {
      name: 'allows import with expected default name',
      code: 'import * as Trace from "../models/trace/trace.js"',
      filename: 'front_end/common/Importing.js',
      options: TEST_OPTIONS,
    },
    {
      name: 'allows different import name for different module',
      code: 'import * as TraceEngine from "../models/not-the-trace/not-the-trace.js"',
      filename: 'front_end/common/Importing.js',
      options: TEST_OPTIONS,
    },
  ],
  invalid: [
    {
      name: 'disallows incorrect import alias for module',
      code: 'import * as TraceEngine from "../models/trace/trace.js"',
      filename: 'front_end/common/Importing.js',
      options: TEST_OPTIONS,
      errors: [
        {
          messageId: 'invalidName',
        },
      ],
    },
  ],
});
