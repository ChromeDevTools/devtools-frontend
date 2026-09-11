// Copyright 2021 The Chromium Authors
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
      name: 'allows unused messages in ModuleUIStrings.ts',
      code: 'export const UIStrings = { foo: \'bar\' } as const;',
      filename: 'front_end/module/ModuleUIStrings.ts',
    },
    {
      name: 'allows unused messages in ModuleUIStrings.js',
      code: 'export const UIStrings = { foo: \'bar\' } as const;',
      filename: 'front_end/module/ModuleUIStrings.js',
    },
    {
      name: 'allows used messages in UIStrings',
      code: 'const UIStrings = {foo: \'bar\' } as const; let someVariable = UIStrings.foo;',
      filename: 'front_end/module/test.ts',
    },
    {
      name: 'allows unused messages in models/trace/insights with Windows path',
      code: 'const UIStrings = {foo: \'bar\' } as const;',
      // Emulate Window path
      filename: 'front_end\\models\\trace\\insights\\Cache.ts',
    },
  ],
  invalid: [
    {
      // Check that trailing comma is handled.
      name: 'disallows unused message with trailing comma',
      code: 'const UIStrings = {\n foo: \'bar\',\n} as const;',
      filename: 'front_end/module/test.ts',
      errors: [{messageId: 'unusedMessage'}],
      output: 'const UIStrings = {\n} as const;',
    },
    {
      name: 'disallows unused message without trailing comma',
      code: 'const UIStrings = {\n  foo: \'bar\'\n} as const;',
      filename: 'front_end/module/test.ts',
      errors: [{messageId: 'unusedMessage'}],
      output: 'const UIStrings = {\n} as const;',
    },
    {
      // Check that the JSDoc before the property is also removed.
      name: 'disallows unused message with JSDoc comment',
      code: exampleWithJSDoc,
      filename: 'front_end/module/test.ts',
      errors: [{messageId: 'unusedMessage'}],
      output: '\nconst UIStrings = {\n} as const;',
    },
    {
      name: 'disallows unused message with JSDoc comment and no comma',
      code: exampleWithJSDocNoComma,
      filename: 'front_end/module/test.ts',
      errors: [{messageId: 'unusedMessage'}],
      output: '\nconst UIStrings = {\n} as const;',
    },
    {
      name: 'disallows multiple unused messages among used messages',
      code: exampleWithSiblings,
      filename: 'front_end/module/test.ts',
      errors: [{messageId: 'unusedMessage'}, {messageId: 'unusedMessage'}],
      output: outputWithSiblings,
    },
    {
      name: 'disallows middle unused message when outer messages are used',
      code: exampleWithSiblings2,
      filename: 'front_end/module/test.ts',
      errors: [{messageId: 'unusedMessage'}],
      output: outputWithSiblings2,
    },
  ],
});
