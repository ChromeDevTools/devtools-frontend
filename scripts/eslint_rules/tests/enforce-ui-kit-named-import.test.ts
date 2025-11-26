// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/enforce-ui-kit-named-import.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('enforce-ui-kit-named-import', rule, {
  valid: [
    {
      code: 'import {Card} from \'../../ui/kit/kit.js\';',
      filename: 'front_end/panels/elements/elements.ts',
    },
    {
      code: 'import type {Card} from \'../../ui/kit/kit.js\';',
      filename: 'front_end/panels/elements/elements.ts',
    },
    {
      code: 'import {Card, Button} from \'../../ui/kit/kit.js\';',
      filename: 'front_end/panels/elements/elements.ts',
    },
    {
      code: 'import * as Common from \'../common/common.js\';',
      filename: 'front_end/panels/elements/elements.ts',
    },
    {
      code: 'import * as Common from \'../ui/kit.js\';',
      filename: 'front_end/panels/elements/elements.ts',
    },
  ],
  invalid: [
    {
      code: 'import * as kit from \'../../ui/kit/kit.js\';',
      filename: 'front_end/panels/elements/elements.ts',
      errors: [{messageId: 'namedKitImport'}],
    },
  ],
});
