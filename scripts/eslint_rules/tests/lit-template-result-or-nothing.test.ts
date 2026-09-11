// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import rule from '../lib/lit-template-result-or-nothing.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('lit-template-result-or-nothing', rule, {
  valid: [
    {
      name: 'allows Lit.LitTemplate return type',
      code: 'function foo(): Lit.LitTemplate {}',
      filename: 'front_end/components/datagrid.ts',
    },
    {
      name: 'allows Promise<Lit.LitTemplate> return type',
      code: 'function foo(): Promise<Lit.LitTemplate> {}',
      filename: 'front_end/components/datagrid.ts',
    },
    {
      name: 'allows union with Lit.LitTemplate inside Promise',
      code: 'function foo(): Promise<Lit.LitTemplate|SomeOtherType> {}',
      filename: 'front_end/components/datagrid.ts',
    },
    {
      name: 'allows union of Lit.LitTemplate and string',
      code: 'function foo(): Lit.LitTemplate|string {}',
      filename: 'front_end/components/datagrid.ts',
    },
    {
      name: 'allows union of Lit.TemplateResult and string without empty object or nothing',
      code: 'function foo(): Lit.TemplateResult|string {}',
      filename: 'front_end/components/datagrid.ts',
    },
    {
      // No return type in class method should be valid
      name: 'allows class constructor without return type',
      code: `class Foo {
        constructor() {
        }
      }`,
      filename: 'front_end/components/datagrid.ts',
    },
    {
      // No return type in class method should be valid
      name: 'allows function without return type',
      code: 'function foo() {}',
      filename: 'front_end/components/datagrid.ts',
    },
  ],
  invalid: [
    {
      name: 'disallows Lit.TemplateResult | {} union and replaces with Lit.LitTemplate',
      code: 'function foo(): Lit.TemplateResult|{} {}',
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'useLitTemplateOverEmptyObject'}],
      output: 'function foo(): Lit.LitTemplate {}',
    },
    {
      name: 'disallows Lit.TemplateResult | {} union with extra type',
      code: 'function foo(): Lit.TemplateResult|{}|number {}',
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'useLitTemplateOverEmptyObject'}],
      output: 'function foo(): Lit.LitTemplate|number {}',
    },
    {
      name: 'disallows Lit.TemplateResult | typeof Lit.nothing union and replaces with Lit.LitTemplate',
      code: 'function foo(): Lit.TemplateResult|typeof Lit.nothing {}',
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'useLitTemplateOverTypeOfNothing'}],
      output: 'function foo(): Lit.LitTemplate {}',
    },
    {
      name: 'disallows Lit.TemplateResult | typeof Lit.nothing union with extra type',
      code: 'function foo(): Lit.TemplateResult|typeof Lit.nothing|number {}',
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'useLitTemplateOverTypeOfNothing'}],
      output: 'function foo(): Lit.LitTemplate|number {}',
    },
    {
      name: 'disallows typeof Lit.nothing | Lit.TemplateResult reverse order union',
      code: 'function foo(): typeof Lit.nothing|Lit.TemplateResult {}',
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'useLitTemplateOverTypeOfNothing'}],
      output: 'function foo(): Lit.LitTemplate {}',
    },
    {
      name: 'disallows banned union on public class method',
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
      name: 'disallows banned union on private hash class method with typeof Lit.nothing',
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
      name: 'disallows banned union on private hash class method with empty object',
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
      name: 'disallows banned union inside Promise in function return type',
      code: 'function foo(): Promise<Lit.TemplateResult|{}> {}',
      filename: 'front_end/components/datagrid.ts',
      errors: [{messageId: 'useLitTemplateOverEmptyObject'}],
      output: 'function foo(): Promise<Lit.LitTemplate> {}',
    },
    {
      name: 'disallows banned union on interface property with typeof Lit.nothing',
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
      name: 'disallows banned union inside Promise on interface property',
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
      name: 'disallows banned union on type alias property with typeof Lit.nothing',
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
