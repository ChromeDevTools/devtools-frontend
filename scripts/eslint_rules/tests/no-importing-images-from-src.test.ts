// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import rule from '../lib/no-importing-images-from-src.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-importing-images-from-src', rule, {
  valid: [
    {
      code: 'const someIcon = new URL(\'../../../Images/test_icon.svg\', import.meta.url).toString()',
      filename: 'front_end/ui/components/component/file.ts',
    },
  ],

  invalid: [
    {
      code: 'const someIcon = new URL(\'../../../Images/src/test_icon.svg\', import.meta.url).toString()',
      filename: 'front_end/ui/components/component/file.ts',
      output: 'const someIcon = new URL(\'../../../Images/test_icon.svg\', import.meta.url).toString()',
      errors: [
        {
          messageId: 'imageImportUsingSrc',
        },
      ],
    },
    {
      code:
          'const someIcon = new URL(\'../../../devtools-frontend/front_end/Images/src/test_icon.svg\', import.meta.url).toString()',
      filename: 'front_end/ui/components/component/file.ts',
      output:
          'const someIcon = new URL(\'../../../devtools-frontend/front_end/Images/test_icon.svg\', import.meta.url).toString()',
      errors: [
        {
          messageId: 'imageImportUsingSrc',
        },
      ],
    },
  ],
});
