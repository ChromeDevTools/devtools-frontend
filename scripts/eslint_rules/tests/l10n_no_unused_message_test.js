// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const rule = require('../lib/l10n_no_unused_message.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

const exampleWithJSDoc = `
const UIStrings = {
  /**
   * @description Some random string
   */
  foo: 'bar',
};`;

const exampleWithJSDocNoComma = `
const UIStrings = {
  /**
   * @description Some random string
   */
  foo: 'bar'
};`;

const exampleWithSiblings = `
const UIStrings = {
  /** comment 1 */
  foo1: 'foo1',
  /** comment 2 */
  foo2: 'foo2',
  /** comment 3 */
  foo3: 'foo3',
}; const someVar = UIStrings.foo2;`;

const outputWithSiblings = `
const UIStrings = {
  /** comment 2 */
  foo2: 'foo2',
}; const someVar = UIStrings.foo2;`;

const exampleWithSiblings2 = `
const UIStrings = {
  /** comment 1 */
  foo1: 'foo1',
  /** comment 2 */
  foo2: 'foo2',
  /** comment 3 */
  foo3: 'foo3',
}; const someVar = [UIStrings.foo1, UIStrings.foo3];`;

const outputWithSiblings2 = `
const UIStrings = {
  /** comment 1 */
  foo1: 'foo1',
  /** comment 3 */
  foo3: 'foo3',
}; const someVar = [UIStrings.foo1, UIStrings.foo3];`;

ruleTester.run('l10n_no_unused_message', rule, {
  valid: [
    {
      code: 'export const UIStrings = { foo: \'bar\' };',
      filename: 'front_end/module/ModuleUIStrings.ts',
    },
    {
      code: 'export const UIStrings = { foo: \'bar\' };',
      filename: 'front_end/module/ModuleUIStrings.js',
    },
    {
      code: 'const UIStrings = {foo: \'bar\' }; let someVariable = UIStrings.foo;',
      filename: 'front_end/module/test.ts',
    },
  ],
  invalid: [
    {
      // Check that trailing comma is handled.
      code: 'const UIStrings = {\n foo: \'bar\',\n};',
      filename: 'front_end/module/test.ts',
      errors: [{message: 'UIStrings message is not used.'}],
      output: 'const UIStrings = {\n};',
    },
    {
      code: 'const UIStrings = {\n  foo: \'bar\'\n};',
      filename: 'front_end/module/test.ts',
      errors: [{message: 'UIStrings message is not used.'}],
      output: 'const UIStrings = {\n};',
    },
    {
      // Check that the JSDoc before the property is also removed.
      code: exampleWithJSDoc,
      filename: 'front_end/module/test.ts',
      errors: [{message: 'UIStrings message is not used.'}],
      output: '\nconst UIStrings = {\n};',
    },
    {
      code: exampleWithJSDocNoComma,
      filename: 'front_end/module/test.ts',
      errors: [{message: 'UIStrings message is not used.'}],
      output: '\nconst UIStrings = {\n};',
    },
    {
      code: exampleWithSiblings,
      filename: 'front_end/module/test.ts',
      errors: [{message: 'UIStrings message is not used.'}, {message: 'UIStrings message is not used.'}],
      output: outputWithSiblings,
    },
    {
      code: exampleWithSiblings2,
      filename: 'front_end/module/test.ts',
      errors: [{message: 'UIStrings message is not used.'}],
      output: outputWithSiblings2,
    },
  ]
});
