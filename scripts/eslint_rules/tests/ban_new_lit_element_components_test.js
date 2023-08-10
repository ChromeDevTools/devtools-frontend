// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/ban_new_lit_element_components.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

const EXPECTED_ERROR_MESSAGE = 'New LitElement components are banned.';

ruleTester.run('ban_new_lit_element_components', rule, {
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
  ]
});
