// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import rule from '../lib/no-importing-images-from-src.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('no-importing-images-from-src', rule, {
  valid: [
    {
      name: 'allows importing image without src/ path segment',
      code: 'const someIcon = new URL(\'../../../Images/test_icon.svg\', import.meta.url).toString()',
      filename: 'front_end/ui/components/component/file.ts',
    },
  ],

  invalid: [
    {
      name: 'disallows importing image with src/ in relative path',
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
      name: 'disallows importing image with src/ in devtools-frontend path',
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
