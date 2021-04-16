// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/components_import.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('components_import', rule, {
  valid: [
    {
      code: `
      import '../../ui/components/expandable_list/expandable_list.js';
      import * as ExpandableList from '../../ui/components/expandable_list/expandable_list.js';
      `,
      filename: 'front_end/panels/elements/foo.ts',
    },
    {
      code: `
      import '../../ui/components/expandable_list/expandable_list.js';
      import type * as ExpandableList from '../../ui/components/expandable_list/expandable_list.js';
      `,
      filename: 'front_end/panels/elements/foo.ts',
    },
    {
      code: `
      import type * as Test from '../../ui/components/render_coordinator/render_coordinator.js';
      `,
      filename: 'front_end/panels/elements/foo.ts',
    },
    {
      code: `
      import type * as Test from '../../ui/components/docs/docs.js';
      `,
      filename: 'front_end/panels/elements/foo.ts',
    },
    {
      code: `
      import type * as Test from '../../ui/components/helpers/helpers.js';
      `,
      filename: 'front_end/panels/elements/foo.ts',
    },
  ],

  invalid: [
    {
      code: 'import type * as ExpandableList from \'../../ui/components/expandable_list/expandable_list.js\';',
      filename: 'front_end/panels/elements/foo.ts',
      errors: [{
        message:
            'Every component should have a corresponding side-effect import in the same file (i.e. import \'../../ui/components/...\')'
      }],
      output: `import '../../ui/components/expandable_list/expandable_list.js';
import type * as ExpandableList from '../../ui/components/expandable_list/expandable_list.js';`
    },
  ]
});
