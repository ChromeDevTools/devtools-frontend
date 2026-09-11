// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/require-super-calls-in-overridden-methods.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('require-super-calls-in-overridden-methods', rule, {
  valid: [
    {
      name: 'allows missing super call when methodNames option is empty',
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
      name: 'allows different super method call when methodNames option is empty',
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
      name: 'super.wasShown() called with empty methodNames option',
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
      name: 'super.wasShown() called with wasShown option',
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
      name: 'allows wasShown and willHide with super calls at start and end',
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
      name: 'allows wasShown and willHide with super calls between statements',
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
      name: 'allows non-override methods without super calls',
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
      name: 'disallows missing super.wasShown call in empty body',
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
      name: 'disallows calling wrong super method instead of required method',
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
      name: 'disallows missing super calls when both methods contain setup/teardown statements',
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
      name: 'disallows missing super calls when both methods have empty bodies',
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
