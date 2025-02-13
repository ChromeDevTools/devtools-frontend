// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';
const rule = require('../lib/no-new-lit-element-components.js');

const {RuleTester} = require('./utils/utils.js');

const EXPECTED_ERROR_MESSAGE = 'New LitElement components are banned.';

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
  ],
  invalid: [
    {
      code: 'class A extends LitElement {}',
      filename: 'front_end/components/test.ts',
      errors: [{message: EXPECTED_ERROR_MESSAGE}],
    },
  ],
});
