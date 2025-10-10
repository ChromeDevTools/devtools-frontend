// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/require-super-calls-in-overridden-methods.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('require-super-calls-in-overridden-methods', rule, {
  valid: [
    {
      code: `
      export class Component extends UI.Widget.Widget {
        override wasShown(): void {}
      }
      `,
      options: [
        {methodNames: []},
      ],
    },
    {
      code: `
      export class Component extends UI.Widget.Widget {
        override wasShown(): void { super.willHide(); }
      }
      `,
      options: [
        {methodNames: []},
      ],
    },
    {
      code: `
      export class Component extends UI.Widget.Widget {
        override wasShown(): void { super.wasShown(); }
      }
      `,
      options: [
        {methodNames: []},
      ],
    },
    {
      code: `
      export class Component extends UI.Widget.Widget {
        override wasShown(): void { super.wasShown(); }
      }
      `,
      options: [
        {methodNames: ['wasShown']},
      ],
    },
    {
      code: `
      export class Component extends UI.Widget.Widget {
        override wasShown(): void {
          super.wasShown();
          this.doSetUp();
        }
        override willHide(): void {
          this.doTearDown();
          super.willHide();
        }
      }
      `,
      options: [
        {methodNames: ['wasShown', 'willHide']},
      ],
    },
    {
      code: `
      export class Component extends UI.Widget.Widget {
        override wasShown(): void {
          this.foo();
          super.wasShown();
          this.bar(1);
        }
        override willHide(): void {
          this.foz();
          super.willHide();
          this.baz(1);
        }
      }
      `,
      options: [
        {methodNames: ['wasShown', 'willHide']},
      ],
    },
    {
      code: `
      export class Widget {
        wasShown(): void {
        }
        willHide(): void {
        }
      }
      `,
      options: [
        {methodNames: ['wasShown', 'willHide']},
      ],
    },
  ],
  invalid: [
    {
      code: `
      export class Component extends UI.Widget.Widget {
        override wasShown(): void { }
      }
      `,
      options: [
        {methodNames: ['wasShown']},
      ],
      errors: [{messageId: 'missingSuperCall'}],
      output: `
      export class Component extends UI.Widget.Widget {
        override wasShown(): void { super.wasShown(); }
      }
      `,
    },
    {
      code: `
      export class Component extends UI.Widget.Widget {
        override wasShown(): void { super.willHide(); }
      }
      `,
      options: [
        {methodNames: ['wasShown']},
      ],
      errors: [{messageId: 'missingSuperCall'}],
      output: `
      export class Component extends UI.Widget.Widget {
        override wasShown(): void { super.wasShown(); super.willHide(); }
      }
      `,
    },
    {
      code: `
      export class Component extends UI.Widget.Widget {
        override wasShown(): void { this.doSetUp(); }
        override willHide(): void { this.doTearDown(); }
      }
      `,
      options: [
        {methodNames: ['wasShown', 'willHide']},
      ],
      errors: [
        {messageId: 'missingSuperCall', data: {methodName: 'wasShown'}},
        {messageId: 'missingSuperCall', data: {methodName: 'willHide'}},
      ],
      output: `
      export class Component extends UI.Widget.Widget {
        override wasShown(): void { super.wasShown(); this.doSetUp(); }
        override willHide(): void { super.willHide(); this.doTearDown(); }
      }
      `,
    },
    {
      code: `
      export class Component extends UI.Widget.Widget {
        override wasShown(): void { }
        override willHide(): void { }
      }
      `,
      options: [
        {methodNames: ['wasShown', 'willHide']},
      ],
      errors: [
        {messageId: 'missingSuperCall', data: {methodName: 'wasShown'}},
        {messageId: 'missingSuperCall', data: {methodName: 'willHide'}},
      ],
      output: `
      export class Component extends UI.Widget.Widget {
        override wasShown(): void { super.wasShown(); }
        override willHide(): void { super.willHide(); }
      }
      `,
    },
  ],
});
