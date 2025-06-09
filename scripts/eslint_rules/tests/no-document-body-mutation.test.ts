// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import rule from '../lib/no-document-body-mutation.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-document-body-mutation', rule, {
  valid: [
    {
      code: `const div = document.createElement('div');
      widget.show(div);`,
      filename: 'front_end/panels/foo/foo.test.ts',
    },
    {
      code: 'document.body.querySelector(\'foo\');',
      filename: 'front_end/panels/foo/foo.test.ts',
    },
  ],

  invalid: [
    {
      code: 'widget.show(document.body);',
      filename: 'front_end/panels/foo/foo.test.ts',
      errors: [{messageId: 'invalidShowUsage'}],
      output: 'renderElementIntoDOM(widget);'
    },
    {
      code: 'networkPanel.show(document.body);',
      filename: 'front_end/panels/foo/foo.test.ts',
      errors: [{messageId: 'invalidShowUsage'}],
      output: 'renderElementIntoDOM(networkPanel);'
    },
    {
      code: 'document.body.appendChild(foo)',
      filename: 'front_end/panels/foo/foo.test.ts',
      errors: [{messageId: 'doNotRenderIntoBody'}],
    },
    {
      code: 'document.body.append(foo)',
      filename: 'front_end/panels/foo/foo.test.ts',
      errors: [{messageId: 'doNotRenderIntoBody'}],
    },
  ],
});
