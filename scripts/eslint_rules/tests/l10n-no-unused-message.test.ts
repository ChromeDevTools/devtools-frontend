// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/l10n-no-unused-message.ts';

import {RuleTester} from './utils/RuleTester.ts';

const exampleWithJSDoc = `
const UIStrings = {
  /**
   * @description Some random string
   */
  foo: 'bar',
} as const;`;

const exampleWithJSDocNoComma = `
const UIStrings = {
  /**
   * @description Some random string
   */
  foo: 'bar'
} as const;`;

const exampleWithSiblings = `
const UIStrings = {
  /** comment 1 */
  foo1: 'foo1',
  /** comment 2 */
  foo2: 'foo2',
  /** comment 3 */
  foo3: 'foo3',
} as const; const someVar = UIStrings.foo2;`;

const outputWithSiblings = `
const UIStrings = {
  /** comment 2 */
  foo2: 'foo2',
} as const; const someVar = UIStrings.foo2;`;

const exampleWithSiblings2 = `
const UIStrings = {
  /** comment 1 */
  foo1: 'foo1',
  /** comment 2 */
  foo2: 'foo2',
  /** comment 3 */
  foo3: 'foo3',
} as const; const someVar = [UIStrings.foo1, UIStrings.foo3];`;

const outputWithSiblings2 = `
const UIStrings = {
  /** comment 1 */
  foo1: 'foo1',
  /** comment 3 */
  foo3: 'foo3',
} as const; const someVar = [UIStrings.foo1, UIStrings.foo3];`;

new RuleTester().run('l10n-no-unused-message', rule, {
  valid: [
    {
      code: 'export const UIStrings = { foo: \'bar\' } as const;',
      filename: 'front_end/module/ModuleUIStrings.ts',
    },
    {
      code: 'export const UIStrings = { foo: \'bar\' } as const;',
      filename: 'front_end/module/ModuleUIStrings.js',
    },
    {
      code: 'const UIStrings = {foo: \'bar\' } as const; let someVariable = UIStrings.foo;',
      filename: 'front_end/module/test.ts',
    },
    {
      code: 'const UIStrings = {foo: \'bar\' } as const;',
      // Emulate Window path
      filename: 'front_end\\models\\trace\\insights\\Cache.ts',
    },
  ],
  invalid: [
    {
      // Check that trailing comma is handled.
      code: 'const UIStrings = {\n foo: \'bar\',\n} as const;',
      filename: 'front_end/module/test.ts',
      errors: [{messageId: 'unusedMessage'}],
      output: 'const UIStrings = {\n} as const;',
    },
    {
      code: 'const UIStrings = {\n  foo: \'bar\'\n} as const;',
      filename: 'front_end/module/test.ts',
      errors: [{messageId: 'unusedMessage'}],
      output: 'const UIStrings = {\n} as const;',
    },
    {
      // Check that the JSDoc before the property is also removed.
      code: exampleWithJSDoc,
      filename: 'front_end/module/test.ts',
      errors: [{messageId: 'unusedMessage'}],
      output: '\nconst UIStrings = {\n} as const;',
    },
    {
      code: exampleWithJSDocNoComma,
      filename: 'front_end/module/test.ts',
      errors: [{messageId: 'unusedMessage'}],
      output: '\nconst UIStrings = {\n} as const;',
    },
    {
      code: exampleWithSiblings,
      filename: 'front_end/module/test.ts',
      errors: [{messageId: 'unusedMessage'}, {messageId: 'unusedMessage'}],
      output: outputWithSiblings,
    },
    {
      code: exampleWithSiblings2,
      filename: 'front_end/module/test.ts',
      errors: [{messageId: 'unusedMessage'}],
      output: outputWithSiblings2,
    },
  ],
});
