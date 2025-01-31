// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const tsParser = require('@typescript-eslint/parser');

const rule = require('../lib/no-new-lit-element-components.js');
const ruleTester = new (require('eslint').RuleTester)({
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    parser: tsParser,
  },
});

const EXPECTED_ERROR_MESSAGE = 'New LitElement components are banned.';

ruleTester.run('no-new-lit-element-components', rule, {
  valid: [
    {
      code: 'class A extends B {}',
      filename: 'front_end/components/test.ts',
    },
    {
      code: 'class A extends LitElement {}',
      filename: 'front_end/panels/recorder/test.ts',
    },
  ],
  invalid: [
    {
      code: 'class A extends LitElement {}',
      filename: 'front_end/components/test.ts',
      errors: [{message: EXPECTED_ERROR_MESSAGE}],
    },
  ],
});
