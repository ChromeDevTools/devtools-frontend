// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/custom_element_component_definition.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
});

ruleTester.run('custom_element_component_definition', rule, {
  valid: [
    {
      code: `
        ComponentHelpers.CustomElements.defineComponent('devtools-resources-frame-details-view', FrameDetailsReportView);
      `,
      filename: 'front_end/ui/components/component/file.ts',
    },
  ],

  invalid: [
    {
      code: `
        customElements.define('devtools-data-grid', DataGrid);
      `,
      filename: 'front_end/ui/components/component/file.ts',
      errors: [{
        message:
            'do not use customElements.define() to define a component. Use the CustomElements.defineComponent() function in front_end/ui/components/helper instead.'
      }],
    },
  ]
});
