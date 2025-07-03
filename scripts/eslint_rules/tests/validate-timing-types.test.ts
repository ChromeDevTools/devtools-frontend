// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {TSESTree} from '@typescript-eslint/typescript-estree';

import rule from '../lib/validate-timing-types.ts';

import {RuleTester, typeCheckingOptions} from './utils/RuleTester.ts';

new RuleTester(typeCheckingOptions).run('validate-timing-types', rule, {
  valid: [
    {
      code: `
        type Micro = number&{_tag: 'MicroSeconds'};
        type Milli = number&{_tag: 'MilliSeconds'};

        const a = 0 as Micro;
        const b = 0 as Micro;
        const c = (b - a) as Micro;
      `,
    },
    {
      code: `
        type Micro = number&{_tag: 'MicroSeconds'};
        type Milli = number&{_tag: 'MilliSeconds'};

        const a = 0 as Micro;
        const b = 0 as Micro;
        const c: Micro = b - a;
      `,
    },
    {
      code: `
        type Micro = number&{_tag: 'MicroSeconds'};
        type Milli = number&{_tag: 'MilliSeconds'};

        const a = 0 as Micro|undefined;
        const b = 0 as Micro|undefined;
        const c = (b - a) as Micro|undefined;
      `,
    },
    {
      code: `
        type Micro = number&{_tag: 'MicroSeconds'};
        type Milli = number&{_tag: 'MilliSeconds'};

        const a = 0 as Micro|string;
        const b = 0 as Micro|string;
        const c = (b - a) as Micro;
      `,
    },
    {
      code: `
        type Micro = number&{_tag: 'MicroSeconds'};
        type Milli = number&{_tag: 'MilliSeconds'};

        const a = 0 as Micro;
        const b = 0 as Micro;
        const c = (b - a + b) as Micro;
      `,
    },
    {
      code: `
        type Micro = number&{_tag: 'MicroSeconds'};
        type Milli = number&{_tag: 'MilliSeconds'};

        const a = 0 as Milli;
        const b = 0 as Milli;
        const c = a + b;
      `,
    },
    {
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
      code: `
        type Micro = number&{_tag: 'MicroSeconds'};
        type Milli = number&{_tag: 'MilliSeconds'};

        const a = 0 as Micro;
        const b = 0 as Micro;
        const c = Math.max(0, a - a) as Micro;
      `,
    },
    {
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
