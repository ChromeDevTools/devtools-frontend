// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/check_enumerated_histograms.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('check_enumerated_histograms', rule, {
  valid: [
    {
      code: 'InspectorFrontendHostInstance.recordEnumeratedHistogram(\'someparam\', 1, foo.MAX_VALUE);',
      filename: 'front_end/components/test.ts',
    },
    {
      code:
          'InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.IssueCreated, issueCreated, IssueCreated.MAX_VALUE);',
      filename: 'front_end/components/test.ts'
    }
  ],
  invalid: [{
    code: 'InspectorFrontendHostInstance.recordEnumeratedHistogram(\'someparam\', 1, 5);',
    filename: 'front_end/components/test.ts',
    errors: [{
      message:
          'When calling \'recordEnumeratedHistogram\' the third argument should be of the form \'SomeEnum.MAX_VALUE\'.'
    }],
  }]
});
