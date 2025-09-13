// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/check-was-shown-methods.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('check-was-shown-methods', rule, {
  valid: [
    {
      code: `
      export class Component extends UI.Widget.Widget {
        wasShown(): void {
          super.wasShown();
          if (typeof this._frameIndex === 'number') {
            this._server.notifyViewShown(this._id, this._frameIndex);
          }
        }
      }
      `,
      filename: 'front_end/components/test.ts',
    },
    {
      code: `
      export class Component extends UI.Widget.Widget {
        wasShown(): void {
          super.wasShown();
        }
      }
      `,
      filename: 'front_end/components/test.ts',
    },
    {
      code: `
      export class Component extends UI.Widget.Widget {
        wasShown(): void {
          super.wasShown();
          this.shadowRoot.adoptedStyleSheets = [componentStyles];
        }
      }
      `,
      filename: 'front_end/components/test.ts',
    },
    {
      code: `
      export class Component extends HTMLElement {
        wasShown(): void {
        }
      }
      `,
      filename: 'front_end/components/test.ts',
    },
    {
      code: `
      export class CharacterIdMap<T> {
      }
      `,
      filename: 'front_end/components/test.ts',
    },
  ],
  invalid: [
    {
      code: `
      export class Component extends UI.Widget.Widget {
        wasShown(): void {
          if (typeof this._frameIndex === 'number') {
            this._server.notifyViewShown(this._id, this._frameIndex);
          }
        }
      }
      `,
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'superFirstCall'}],
    },
    {
      code: `
      export class Component extends UI.Widget.Widget {
        wasShown(): void {
          if (typeof this._frameIndex === 'number') {
            this._server.notifyViewShown(this._id, this._frameIndex);
          }
          super.wasShown();
        }
      }
      `,
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'superFirstCall'}],
    },
    {
      code: `
      export class Component extends UI.Widget.Widget {
        wasShown(): void {
          this.shadowRoot.adoptedStyleSheets = [componentStyles];
          super.wasShown();
        }
      }
      `,
      filename: 'front_end/components/test.ts',
      errors: [{messageId: 'superFirstCall'}],
    },
  ],
});
