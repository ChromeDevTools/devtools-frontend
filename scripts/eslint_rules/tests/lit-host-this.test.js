// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/lit-host-this.js');
const tsParser = require('@typescript-eslint/parser');
const ruleTester = new (require('eslint').RuleTester)({
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    parser: tsParser,
  },
});

ruleTester.run('lit-host-this', rule, {
  valid: [
    {
      code: 'Lit.render(someHtml, this.shadow, {host: this})',
      filename: 'front_end/components/datagrid.ts',
    },
    {
      code: 'NotLitHtmlButSimilar.render(foo, bar)',
      filename: 'front_end/components/datagrid.ts',
    },
  ],
  invalid: [
    {
      code: 'Lit.render(someHtml, this.shadow)',
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'missingHostOption'}],
      output: 'Lit.render(someHtml, this.shadow, {host: this})',
    },
    {
      code: 'Lit.render(someHtml, this.shadow, { renderBefore: foo })',
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'missingHostOption'}],
      output: 'Lit.render(someHtml, this.shadow, { renderBefore: foo, host: this })',
    },
    {
      code: 'Lit.render(someHtml, this.shadow, { renderBefore: foo, })',
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'missingHostOption'}],
      output: 'Lit.render(someHtml, this.shadow, { renderBefore: foo, host: this, })',
    },
    {
      code: 'Lit.render(someHtml, this.shadow, { host: notThis })',
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'invalidHostOption'}],
    },
  ],
});
