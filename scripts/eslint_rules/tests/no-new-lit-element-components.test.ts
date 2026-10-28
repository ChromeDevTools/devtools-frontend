// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/no-new-lit-element-components.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-new-lit-element-components', rule, {
  valid: [
    {
      name: 'allows extending non-LitElement class',
      code: 'class A extends B {}',
      filename: 'front_end/components/test.ts',
    },
  ],
  invalid: [
    {
      name: 'disallows extending LitElement',
      code: 'class A extends LitElement {}',
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'noNewLitElementComponents'}],
    },
    {
      name: 'disallows extending Lit.LitElement',
      code: 'class A extends Lit.LitElement {}',
      filename: 'front_end/ui/components/suggestion_input/SuggestionInput.ts',
      errors: [{messageId: 'noNewLitElementComponents'}],
    },
  ],
});
