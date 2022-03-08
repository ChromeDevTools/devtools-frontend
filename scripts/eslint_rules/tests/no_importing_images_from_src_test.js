// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/no_importing_images_from_src.js');
const ruleTester = new (require('eslint').RuleTester)({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
});

ruleTester.run('no_importing_images_from_src', rule, {
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
      errors: [{
        messageId: 'imageImportUsingSrc',
      }],
    },
    {
      code:
          'const someIcon = new URL(\'../../../devtools-frontend/front_end/Images/src/test_icon.svg\', import.meta.url).toString()',
      filename: 'front_end/ui/components/component/file.ts',
      output:
          'const someIcon = new URL(\'../../../devtools-frontend/front_end/Images/test_icon.svg\', import.meta.url).toString()',
      errors: [{
        messageId: 'imageImportUsingSrc',
      }],
    },
  ],
});
