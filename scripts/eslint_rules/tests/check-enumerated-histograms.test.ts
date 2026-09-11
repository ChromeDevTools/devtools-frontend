// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import rule from '../lib/check-enumerated-histograms.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('check-enumerated-histograms', rule, {
  valid: [
    {
      name: 'allows recordEnumeratedHistogram with MAX_VALUE property on object',
      code: 'InspectorFrontendHostInstance.recordEnumeratedHistogram(\'someparam\', 1, foo.MAX_VALUE);',
      filename: 'front_end/components/test.ts',
    },
    {
      name: 'allows recordEnumeratedHistogram with enum MAX_VALUE',
      code:
          'InspectorFrontendHostInstance.recordEnumeratedHistogram(EnumeratedHistogram.IssueCreated, issueCreated, IssueCreated.MAX_VALUE);',
      filename: 'front_end/components/test.ts',
    },
  ],
  invalid: [
    {
      name: 'disallows recordEnumeratedHistogram with raw number literal for max',
      code: 'InspectorFrontendHostInstance.recordEnumeratedHistogram(\'someparam\', 1, 5);',
      filename: 'front_end/components/test.ts',
      errors: [
        {
          messageId: 'invalidArgument',
        },
      ],
    },
  ],
});
