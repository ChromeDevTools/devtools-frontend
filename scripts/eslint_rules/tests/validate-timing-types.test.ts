// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {TSESTree} from '@typescript-eslint/typescript-estree';

import rule from '../lib/validate-timing-types.ts';

import {RuleTester, typeCheckingOptions} from './utils/RuleTester.ts';

new RuleTester(typeCheckingOptions).run('validate-timing-types', rule, {
  valid: [
    {
      name: 'allows subtracting micro from micro with cast',
      code: `
        type Micro = number&{_tag: 'MicroSeconds'};
        type Milli = number&{_tag: 'MilliSeconds'};

        const a = 0 as Micro;
        const b = 0 as Micro;
        const c = (b - a) as Micro;
      `,
    },
    {
      name: 'allows subtracting micro from micro with explicit type annotation',
      code: `
        type Micro = number&{_tag: 'MicroSeconds'};
        type Milli = number&{_tag: 'MilliSeconds'};

        const a = 0 as Micro;
        const b = 0 as Micro;
        const c: Micro = b - a;
      `,
    },
    {
      name: 'allows subtracting micro or undefined from micro or undefined',
      code: `
        type Micro = number&{_tag: 'MicroSeconds'};
        type Milli = number&{_tag: 'MilliSeconds'};

        const a = 0 as Micro|undefined;
        const b = 0 as Micro|undefined;
        const c = (b - a) as Micro|undefined;
      `,
    },
    {
      name: 'allows subtracting union with micro when cast to micro',
      code: `
        type Micro = number&{_tag: 'MicroSeconds'};
        type Milli = number&{_tag: 'MilliSeconds'};

        const a = 0 as Micro|string;
        const b = 0 as Micro|string;
        const c = (b - a) as Micro;
      `,
    },
    {
      name: 'allows chaining subtraction and addition of micro',
      code: `
        type Micro = number&{_tag: 'MicroSeconds'};
        type Milli = number&{_tag: 'MilliSeconds'};

        const a = 0 as Micro;
        const b = 0 as Micro;
        const c = (b - a + b) as Micro;
      `,
    },
    {
      name: 'allows adding milli to milli',
      code: `
        type Micro = number&{_tag: 'MicroSeconds'};
        type Milli = number&{_tag: 'MilliSeconds'};

        const a = 0 as Milli;
        const b = 0 as Milli;
        const c = a + b;
      `,
    },
    {
      name: 'allows reduce accumulator matching timing type',
      code: `
        type Micro = number&{_tag: 'MicroSeconds'};
        type Milli = number&{_tag: 'MilliSeconds'};

        const a = 0 as Micro;
        const b = 0 as Milli;
        const c = [].reduce((acc, summary) => acc + b, 0) as Milli;
        const d: Micro = [].reduce((acc, summary) => acc + a, 0);
      `,
    },
    {
      name: 'allows Math.max with matching timing types and cast',
      code: `
        type Micro = number&{_tag: 'MicroSeconds'};
        type Milli = number&{_tag: 'MilliSeconds'};

        const a = 0 as Micro;
        const b = 0 as Micro;
        const c = Math.max(0, a - a) as Micro;
      `,
    },
    {
      name: 'allows Math.max with expressions having matching timing types',
      code: `
        type Micro = number&{_tag: 'MicroSeconds'};
        type Milli = number&{_tag: 'MilliSeconds'};

        const a = 0 as Micro;
        const b = 0 as Micro;
        Math.max(0, a - a, b - b);
      `,
    },
  ],

  invalid: [
    {
      name: 'disallows subtracting micro from micro and casting to milli',
      code: `
        type Micro = number&{_tag: 'MicroSeconds'};
        type Milli = number&{_tag: 'MilliSeconds'};

        const a = 0 as Micro;
        const b = 0 as Micro;
        const c = (b - a) as Milli;
      `,
      errors: [
        {
          // @ts-expect-error It's not on the types, but this is totally fine.
          message: 'Expected: (Milli - Milli) -> Milli, but got: (Micro - Micro) -> Milli',
          type: TSESTree.AST_NODE_TYPES.BinaryExpression,
        },
      ],
    },
    {
      name: 'disallows adding micro and micro and casting to milli',
      code: `
        type Micro = number&{_tag: 'MicroSeconds'};
        type Milli = number&{_tag: 'MilliSeconds'};

        const a = 0 as Micro;
        const b = 0 as Micro;
        const c = (b + a) as Milli;
      `,
      errors: [
        {
          // @ts-expect-error It's not on the types, but this is totally fine.
          message: 'Expected: (Milli + Milli) -> Milli, but got: (Micro + Micro) -> Milli',
          type: TSESTree.AST_NODE_TYPES.BinaryExpression,
        },
      ],
    },
    {
      name: 'disallows subtracting micro from micro and annotating as milli',
      code: `
        type Micro = number&{_tag: 'MicroSeconds'};
        type Milli = number&{_tag: 'MilliSeconds'};

        const a = 0 as Micro;
        const b = 0 as Micro;
        const c: Milli = b - a;
      `,
      errors: [
        {
          // @ts-expect-error It's not on the types, but this is totally fine.
          message: 'Expected: (Milli - Milli) -> Milli, but got: (Micro - Micro) -> Milli',
          type: TSESTree.AST_NODE_TYPES.BinaryExpression,
        },
      ],
    },
    {
      name: 'disallows assigning micro subtraction to milli variable',
      code: `
        type Micro = number&{_tag: 'MicroSeconds'};
        type Milli = number&{_tag: 'MilliSeconds'};

        const a = 0 as Micro;
        const b = 0 as Micro;
        let c: Milli = 0;
        c = b - a;
      `,
      errors: [
        {
          // @ts-expect-error It's not on the types, but this is totally fine.
          message: 'Expected: (Milli - Milli) -> Milli, but got: (Micro - Micro) -> Milli',
          type: TSESTree.AST_NODE_TYPES.BinaryExpression,
        },
      ],
    },
    {
      name: 'disallows chaining micro operations and casting to milli',
      code: `
        type Micro = number&{_tag: 'MicroSeconds'};
        type Milli = number&{_tag: 'MilliSeconds'};

        const a = 0 as Micro;
        const b = 0 as Micro;
        const c = (b - a + b) as Milli;
      `,
      errors: [
        {
          // @ts-expect-error It's not on the types, but this is totally fine.
          message: 'Expected: Milli, but got: Micro',
          type: TSESTree.AST_NODE_TYPES.BinaryExpression,
          column: 20,
          endColumn: 29,
        },
      ],
    },
    {
      name: 'disallows adding micro and milli',
      code: `
        type Micro = number&{_tag: 'MicroSeconds'};
        type Milli = number&{_tag: 'MilliSeconds'};

        const a = 0 as Micro;
        const b = 0 as Milli;
        const c = a + b;
      `,
      errors: [
        {
          // @ts-expect-error It's not on the types, but this is totally fine.
          message: 'Type mismatch: (Micro + Milli)',
          type: TSESTree.AST_NODE_TYPES.BinaryExpression,
        },
      ],
    },
    {
      name: 'disallows reduce with mismatched accumulator and timing type',
      code: `
        type Micro = number&{_tag: 'MicroSeconds'};
        type Milli = number&{_tag: 'MilliSeconds'};

        const a = 0 as Micro;
        const b = 0 as Milli;
        const c = [].reduce((acc, summary) => acc + a, 0) as Milli;
        const d: Micro = [].reduce((acc, summary) => acc + b, 0);
      `,
      errors: [
        {
          // @ts-expect-error It's not on the types, but this is totally fine.
          message: 'Type mismatch: expected Milli, got Micro from reduce function',
          type: TSESTree.AST_NODE_TYPES.CallExpression,
        },
        {
          // @ts-expect-error It's not on the types, but this is totally fine.
          message: 'Type mismatch: expected Micro, got Milli from reduce function',
          type: TSESTree.AST_NODE_TYPES.CallExpression,
        },
      ],
    },
    {
      name: 'disallows reduce callback returning mismatched timing type',
      code: `
        type Micro = number&{_tag: 'MicroSeconds'};
        type Milli = number&{_tag: 'MilliSeconds'};

        const a = 0 as Micro;
        const b = [].reduce((acc, summary) => {
          if (a > 50) return 0;
          return a + acc;
        }, 0) as Milli;
      `,
      errors: [
        {
          // @ts-expect-error It's not on the types, but this is totally fine.
          message: 'Type mismatch: expected Milli, got Micro from reduce function',
          type: TSESTree.AST_NODE_TYPES.CallExpression,
        },
      ],
    },
    {
      name: 'disallows Math.max with micro result cast to milli',
      code: `
        type Micro = number&{_tag: 'MicroSeconds'};
        type Milli = number&{_tag: 'MilliSeconds'};

        const a = 0 as Micro;
        const b = 0 as Micro;
        const c = Math.max(0, a - a) as Milli;
      `,
      errors: [
        {
          // @ts-expect-error It's not on the types, but this is totally fine.
          message: 'Type mismatch: expected Milli, got Micro from Math.max function',
          type: TSESTree.AST_NODE_TYPES.CallExpression,
        },
      ],
    },
    {
      name: 'disallows Math.max with mismatched argument timing types',
      code: `
        type Micro = number&{_tag: 'MicroSeconds'};
        type Milli = number&{_tag: 'MilliSeconds'};

        const a = 0 as Micro;
        const b = 0 as Milli;
        Math.max(0, a - a, b - b);
      `,
      errors: [
        {
          // @ts-expect-error It's not on the types, but this is totally fine.
          message: 'Type mismatch: the parameters of Math.max do not all match in type. Got: Micro, Milli',
          type: TSESTree.AST_NODE_TYPES.CallExpression,
        },
      ],
    },
  ],
});
