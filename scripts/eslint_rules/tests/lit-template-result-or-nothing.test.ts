// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import rule from '../lib/lit-template-result-or-nothing.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('lit-template-result-or-nothing', rule, {
  valid: [
    {
      code: 'function foo(): Lit.LitTemplate {}',
      filename: 'front_end/components/datagrid.ts',
    },
    {
      code: 'function foo(): Promise<Lit.LitTemplate> {}',
      filename: 'front_end/components/datagrid.ts',
    },
    {
      code: 'function foo(): Promise<Lit.LitTemplate|SomeOtherType> {}',
      filename: 'front_end/components/datagrid.ts',
    },
    {
      code: 'function foo(): Lit.LitTemplate|string {}',
      filename: 'front_end/components/datagrid.ts',
    },
    {
      code: 'function foo(): Lit.TemplateResult|string {}',
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
      code: 'function foo(): Lit.TemplateResult|{} {}',
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'useLitTemplateOverEmptyObject'}],
      output: 'function foo(): Lit.LitTemplate {}',
    },
    {
      code: 'function foo(): Lit.TemplateResult|{}|number {}',
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'useLitTemplateOverEmptyObject'}],
      output: 'function foo(): Lit.LitTemplate|number {}',
    },
    {
      code: 'function foo(): Lit.TemplateResult|typeof Lit.nothing {}',
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'useLitTemplateOverTypeOfNothing'}],
      output: 'function foo(): Lit.LitTemplate {}',
    },
    {
      code: 'function foo(): Lit.TemplateResult|typeof Lit.nothing|number {}',
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'useLitTemplateOverTypeOfNothing'}],
      output: 'function foo(): Lit.LitTemplate|number {}',
    },
    {
      code: 'function foo(): typeof Lit.nothing|Lit.TemplateResult {}',
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'useLitTemplateOverTypeOfNothing'}],
      output: 'function foo(): Lit.LitTemplate {}',
    },
    {
      code: `class Bar {
        foo(): typeof Lit.nothing|Lit.TemplateResult {}
      }`,
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'useLitTemplateOverTypeOfNothing'}],
      output: `class Bar {
        foo(): Lit.LitTemplate {}
      }`,
    },
    {
      code: `class Bar {
        #foo(): typeof Lit.nothing|Lit.TemplateResult {}
      }`,
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'useLitTemplateOverTypeOfNothing'}],
      output: `class Bar {
        #foo(): Lit.LitTemplate {}
      }`,
    },
    {
      code: `class Bar {
        #foo(): Lit.TemplateResult|{} {}
      }`,
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'useLitTemplateOverEmptyObject'}],
      output: `class Bar {
        #foo(): Lit.LitTemplate {}
      }`,
    },
    {
      code: 'function foo(): Promise<Lit.TemplateResult|{}> {}',
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'useLitTemplateOverEmptyObject'}],
      output: 'function foo(): Promise<Lit.LitTemplate> {}',
    },
    {
      code: `interface Foo {
        someThing: Lit.TemplateResult|typeof Lit.nothing;
      }`,
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'useLitTemplateOverTypeOfNothing'}],
      output: `interface Foo {
        someThing: Lit.LitTemplate;
      }`,
    },
    {
      code: `interface Foo {
        someThing: Promise<Lit.TemplateResult|{}>;
      }`,
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'useLitTemplateOverEmptyObject'}],
      output: `interface Foo {
        someThing: Promise<Lit.LitTemplate>;
      }`,
    },
    {
      code: `type Foo = {
        someThing: Lit.TemplateResult|typeof Lit.nothing;
      }`,
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'useLitTemplateOverTypeOfNothing'}],
      output: `type Foo = {
        someThing: Lit.LitTemplate;
      }`,
    },
  ],
});
