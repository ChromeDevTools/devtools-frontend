// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import rule from '../lib/no-document-body-mutation.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-document-body-mutation', rule, {
  valid: [
    {
      name: 'allows showing widget in newly created div',
      code: `const div = document.createElement('div');
      widget.show(div);`,
      filename: 'front_end/panels/foo/foo.test.ts',
    },
    {
      name: 'allows querying document.body',
      code: 'document.body.querySelector(\'foo\');',
      filename: 'front_end/panels/foo/foo.test.ts',
    },
  ],

  invalid: [
    {
      name: 'disallows widget.show(document.body)',
      code: 'widget.show(document.body);',
      filename: 'front_end/panels/foo/foo.test.ts',
      errors: [{messageId: 'invalidShowUsage'}],
      output: 'renderElementIntoDOM(widget);',
    },
    {
      name: 'disallows networkPanel.show(document.body)',
      code: 'networkPanel.show(document.body);',
      filename: 'front_end/panels/foo/foo.test.ts',
      errors: [{messageId: 'invalidShowUsage'}],
      output: 'renderElementIntoDOM(networkPanel);',
    },
    {
      name: 'disallows document.body.appendChild',
      code: 'document.body.appendChild(foo)',
      filename: 'front_end/panels/foo/foo.test.ts',
      errors: [{messageId: 'doNotRenderIntoBody'}],
    },
    {
      name: 'disallows document.body.append',
      code: 'document.body.append(foo)',
      filename: 'front_end/panels/foo/foo.test.ts',
      errors: [{messageId: 'doNotRenderIntoBody'}],
    },
  ],
});
