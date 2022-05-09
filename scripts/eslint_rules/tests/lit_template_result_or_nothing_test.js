// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/lit_template_result_or_nothing.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('lit_template_result_or_nothing', rule, {
  valid: [
    {
      code: 'function foo(): LitHtml.LitTemplate {}',
      filename: 'front_end/components/datagrid.ts',
    },
    {
      code: 'function foo(): Promise<LitHtml.LitTemplate> {}',
      filename: 'front_end/components/datagrid.ts',
    },
    {
      code: 'function foo(): Promise<LitHtml.LitTemplate|SomeOtherType> {}',
      filename: 'front_end/components/datagrid.ts',
    },
    {
      code: 'function foo(): LitHtml.LitTemplate|string {}',
      filename: 'front_end/components/datagrid.ts',
    },
    {
      code: 'function foo(): LitHtml.TemplateResult|string {}',
      filename: 'front_end/components/datagrid.ts',
    },
    {
      // No return type in class method should be valid
      code: `class Foo {
        constructor() {
        }
      }`,
      filename: 'front_end/components/datagrid.ts',
    },
    {
      // No return type in class method should be valid
      code: 'function foo() {}',
      filename: 'front_end/components/datagrid.ts',
    },
  ],
  invalid: [
    {
      code: 'function foo(): LitHtml.TemplateResult|{} {}',
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'useLitTemplateOverEmptyObject'}],
      output: 'function foo(): LitHtml.LitTemplate {}',
    },
    {
      code: 'function foo(): LitHtml.TemplateResult|{}|number {}',
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'useLitTemplateOverEmptyObject'}],
      output: 'function foo(): LitHtml.LitTemplate|number {}',
    },
    {
      code: 'function foo(): LitHtml.TemplateResult|typeof LitHtml.nothing {}',
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'useLitTemplateOverTypeOfNothing'}],
      output: 'function foo(): LitHtml.LitTemplate {}',
    },
    {
      code: 'function foo(): LitHtml.TemplateResult|typeof LitHtml.nothing|number {}',
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'useLitTemplateOverTypeOfNothing'}],
      output: 'function foo(): LitHtml.LitTemplate|number {}',
    },
    {
      code: 'function foo(): typeof LitHtml.nothing|LitHtml.TemplateResult {}',
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'useLitTemplateOverTypeOfNothing'}],
      output: 'function foo(): LitHtml.LitTemplate {}',
    },
    {
      code: `class Bar {
        foo(): typeof LitHtml.nothing|LitHtml.TemplateResult {}
      }`,
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'useLitTemplateOverTypeOfNothing'}],
      output: `class Bar {
        foo(): LitHtml.LitTemplate {}
      }`,
    },
    {
      code: `class Bar {
        #foo(): typeof LitHtml.nothing|LitHtml.TemplateResult {}
      }`,
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'useLitTemplateOverTypeOfNothing'}],
      output: `class Bar {
        #foo(): LitHtml.LitTemplate {}
      }`,
    },
    {
      code: `class Bar {
        #foo(): LitHtml.TemplateResult|{} {}
      }`,
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'useLitTemplateOverEmptyObject'}],
      output: `class Bar {
        #foo(): LitHtml.LitTemplate {}
      }`,
    },
    {
      code: 'function foo(): Promise<LitHtml.TemplateResult|{}> {}',
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'useLitTemplateOverEmptyObject'}],
      output: 'function foo(): Promise<LitHtml.LitTemplate> {}',
    },
    {
      code: `interface Foo {
        someThing: LitHtml.TemplateResult|typeof LitHtml.nothing;
      }`,
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'useLitTemplateOverTypeOfNothing'}],
      output: `interface Foo {
        someThing: LitHtml.LitTemplate;
      }`,
    },
    {
      code: `interface Foo {
        someThing: Promise<LitHtml.TemplateResult|{}>;
      }`,
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'useLitTemplateOverEmptyObject'}],
      output: `interface Foo {
        someThing: Promise<LitHtml.LitTemplate>;
      }`,
    },
    {
      code: `type Foo = {
        someThing: LitHtml.TemplateResult|typeof LitHtml.nothing;
      }`,
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'useLitTemplateOverTypeOfNothing'}],
      output: `type Foo = {
        someThing: LitHtml.LitTemplate;
      }`,
    },
  ]
});
