// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/enforce_custom_event_names.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('enforce_custom_event_names', rule, {
  valid: [
    {
      code: `export class NodeSelectedEvent extends Event {
          constructor(node) {
            super('nodeselected', {});
            this.data = node.legacyDomNode;
          }
        }`,
      filename: 'front_end/common/Importing.js',
    },
    {
      code: `export class NodeSelectedEvent extends Event {
          static eventName = 'nodeselected';

          constructor(node) {
            super(NodeSelectedEvent.eventName, {});
            this.data = node.legacyDomNode;
          }
        }`,
      filename: 'front_end/common/Importing.ts',
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
    {
      // Not using the built in Event type, but using a type that is defined in
      // the same file that is called Event. We special case this because in
      // the Performance Panel SDK we do define a custom Event class
      code: `class Event {};
export class ConstructedEvent extends Event {
  constructor(x:string) {
    super(x)
  }
}`,
      filename: 'ui/some-component.ts',
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
      errors: [{messageId: 'invalidEventName'}]
    },
    {
      code: `export class NodeSelectedEvent extends Event {
        constructor(node) {
          super('node-selected', {});
        }
      }`,
      filename: 'front_end/common/Importing.js',
      errors: [{messageId: 'invalidEventName'}]
    },
    {
      code: `export class NodeSelectedEvent extends Event {
        constructor(node) {
          const name = 'node-selected';
          super(name, {});
        }
      }`,
      filename: 'front_end/common/Importing.js',
      errors: [{messageId: 'invalidEventNameReference'}]
    },
    {
      code: `export class NodeSelectedEvent extends Event {
        static notTheRightName = 'nodeselected';
        constructor(node) {
          super(NodeSelectedEvent.notTheRightName, {});
        }
      }`,
      filename: 'front_end/common/Importing.js',
      errors: [{messageId: 'invalidEventNameReference'}]
    },
    {
      code: `export class NodeSelectedEvent extends Event {
        static eventName = someVar;
        constructor(node) {
          super(NodeSelectedEvent.eventName, {});
        }
      }`,
      filename: 'front_end/common/Importing.js',
      errors: [{messageId: 'invalidEventNameReference'}]
    },
    {
      code: `export class NodeSelectedEvent extends Event {
        static eventName = 'name-that-does-not-follow-theRules';
        constructor(node) {
          super(NodeSelectedEvent.eventName, {});
        }
      }`,
      filename: 'front_end/common/Importing.js',
      errors: [{messageId: 'invalidEventName'}]
    },
    // TODO: valid static, but the actual string is invalid
  ]
});
