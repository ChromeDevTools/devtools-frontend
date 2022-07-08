// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/custom_element_definitions_location.js');
const path = require('path');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('custom_element_definitions_location', rule, {
  valid: [
    {
      code: 'class Foo extends HTMLElement {}',
      filename: 'front_end/ui/components/foo/Foo.ts',
      options: [{rootFrontendDirectory: path.join(__dirname, '..', '..', '..', 'front_end')}]
    },
    {
      code: 'class Foo extends HTMLElement {}',
      filename: 'front_end/panels/issues/components/Foo.ts',
      options: [{rootFrontendDirectory: path.join(__dirname, '..', '..', '..', 'front_end')}]
    },
    {
      code: 'class Foo extends HTMLElement {}',
      filename: 'front_end/panels/issues/components/nested/folder/Foo.ts',
      options: [{rootFrontendDirectory: path.join(__dirname, '..', '..', '..', 'front_end')}]
    },
    {
      code: 'class Foo extends HTMLElement {}',
      filename: 'front_end/panels/performance/library/components/metrics/Metric.ts',
      options: [{rootFrontendDirectory: path.join(__dirname, '..', '..', '..', 'front_end')}]
    },
    {
      code: 'class Foo extends OtherClass {}',
      filename: 'front_end/models/some/Model.ts',
      options: [{rootFrontendDirectory: path.join(__dirname, '..', '..', '..', 'front_end')}]
    },
  ],
  invalid: [
    {
      code: 'class Foo extends HTMLElement {}',
      filename: 'front_end/panels/issues/IssuesPanel.ts',
      errors: [{messageId: 'definitionInWrongFolder'}],
      options: [{rootFrontendDirectory: path.join(__dirname, '..', '..', '..', 'front_end')}]
    },
    {
      code: 'class Foo extends HTMLElement {}',
      filename: 'front_end/models/bindings/Bindings.ts',
      errors: [{messageId: 'definitionInWrongFolder'}],
      options: [{rootFrontendDirectory: path.join(__dirname, '..', '..', '..', 'front_end')}]
    },
  ]
});
