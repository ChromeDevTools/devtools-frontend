// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/kebab_case_events.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
});

ruleTester.run('kebab_case_events', rule, {
  valid: [
    {
      code: `export class NodeSelectedEvent extends Event {
          constructor(node) {
            super('node-selected', {});
            this.data = node.legacyDomNode;
          }
        }`,
      filename: 'front_end/common/Importing.js',
    },
    {
      code: `export class SelectEvent extends Event {
          constructor(node) {
            super('select', {});
            this.data = node.legacyDomNode;
          }
        }`,
      filename: 'front_end/common/Importing.js',
    },
    {
      // To make sure we're only linting classes that extend Event
      code: `export class SelectEvent extends SomethingElse {
          constructor() {
            super('noRulesApplyHere');
          }
        }`,
      filename: 'front_end/common/Importing.js',
    },
  ],

  invalid: [
    {
      code: `export class NodeSelectedEvent extends Event {
        constructor(node) {
          super('nodeSelected', {});
        }
      }`,
      filename: 'front_end/common/Importing.js',
      errors: [{message: 'Custom events must be named in kebab-case.'}]
    },
    {
      code: `export class NodeSelectedEvent extends Event {
        constructor(node) {
          const name = 'node-selected';
          super(name, {});
        }
      }`,
      filename: 'front_end/common/Importing.js',
      errors: [{message: 'The super() call for a custom event must be a string literal.'}]
    },
  ]
});
