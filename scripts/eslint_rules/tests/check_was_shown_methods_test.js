// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/check_was_shown_methods.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

const EXPECTED_ERROR_MESSAGE = 'Please make sure the first call in wasShown is to super.wasShown().';

ruleTester.run('check_was_shown_methods', rule, {
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
      filename: 'front_end/components/test.ts'
    },
    {
      code: `
      export class CharacterIdMap<T> {
      }
      `,
      filename: 'front_end/components/test.ts'
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
      errors: [{message: EXPECTED_ERROR_MESSAGE}]
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
      errors: [{message: EXPECTED_ERROR_MESSAGE}]
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
      errors: [{message: EXPECTED_ERROR_MESSAGE}]
    }
  ]
});
