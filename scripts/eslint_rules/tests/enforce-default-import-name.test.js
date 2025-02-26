// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const path = require('path');

const rule = require('../lib/enforce-default-import-name.js');

const {RuleTester} = require('./utils/utils.js');

const TEST_OPTIONS = [
  {
    modulePath: path.join(
        __dirname,
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
];

new RuleTester().run('enforce-default-import-name', rule, {
  valid: [
    {
      code: 'import * as Trace from "../models/trace/trace.js"',
      filename: 'front_end/common/Importing.js',
      options: TEST_OPTIONS,
    },
    {
      code: 'import * as TraceEngine from "../models/not-the-trace/not-the-trace.js"',
      filename: 'front_end/common/Importing.js',
      options: TEST_OPTIONS,
    },
  ],
  invalid: [
    {
      code: 'import * as TraceEngine from "../models/trace/trace.js"',
      filename: 'front_end/common/Importing.js',
      options: TEST_OPTIONS,
      errors: [
        {
          message: 'When importing ../models/trace/trace.js, the name used must be Trace',
        },
      ],
    },
  ],
});
