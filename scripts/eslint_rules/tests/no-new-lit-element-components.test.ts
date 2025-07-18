// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-new-lit-element-components.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-new-lit-element-components', rule, {
  valid: [
    {
      code: 'class A extends B {}',
      filename: 'front_end/components/test.ts',
    },
    {
      code: 'class A extends LitElement {}',
      filename: 'front_end/panels/recorder/test.ts',
    },
    {
      code: 'class A extends LitElement {}',
      filename: '/usr/local/domain/home/user/devtools/devtools-frontend/front_end/panels/recorder/test.ts',
    },
  ],
  invalid: [
    {
      code: 'class A extends LitElement {}',
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'noNewLitElementComponents'}],
    },
  ],
});
