// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/enforce-custom-event-names.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('enforce-custom-event-names', rule, {
  valid: [
    {
      name: 'allows lowercase event name string literal in super call',
      code: `export class NodeSelectedEvent extends Event {
          constructor(node) {
            super('nodeselected', {});
            this.data = node.legacyDomNode;
          }
        }`,
      filename: 'front_end/common/Importing.js',
    },
    {
      name: 'allows static eventName property reference in super call',
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
      name: 'allows standard lowercase event name',
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
      name: 'allows arbitrary super arguments when extending non-Event class',
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
      name: 'allows subclass of locally declared Event class',
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
      name: 'disallows camelCase event name in super call',
      code: `export class NodeSelectedEvent extends Event {
        constructor(node) {
          super('nodeSelected', {});
        }
      }`,
      filename: 'front_end/common/Importing.js',
      errors: [{messageId: 'invalidEventName'}],
    },
    {
      name: 'disallows hyphenated event name in super call',
      code: `export class NodeSelectedEvent extends Event {
        constructor(node) {
          super('node-selected', {});
        }
      }`,
      filename: 'front_end/common/Importing.js',
      errors: [{messageId: 'invalidEventName'}],
    },
    {
      name: 'disallows local variable reference for event name',
      code: `export class NodeSelectedEvent extends Event {
        constructor(node) {
          const name = 'node-selected';
          super(name, {});
        }
      }`,
      filename: 'front_end/common/Importing.js',
      errors: [{messageId: 'invalidEventNameReference'}],
    },
    {
      name: 'disallows static property with wrong name for event name',
      code: `export class NodeSelectedEvent extends Event {
        static notTheRightName = 'nodeselected';
        constructor(node) {
          super(NodeSelectedEvent.notTheRightName, {});
        }
      }`,
      filename: 'front_end/common/Importing.js',
      errors: [{messageId: 'invalidEventNameReference'}],
    },
    {
      name: 'disallows non-literal static eventName value',
      code: `export class NodeSelectedEvent extends Event {
        static eventName = someVar;
        constructor(node) {
          super(NodeSelectedEvent.eventName, {});
        }
      }`,
      filename: 'front_end/common/Importing.js',
      errors: [{messageId: 'invalidEventNameReference'}],
    },
    {
      name: 'disallows static eventName with invalid formatting',
      code: `export class NodeSelectedEvent extends Event {
        static eventName = 'name-that-does-not-follow-theRules';
        constructor(node) {
          super(NodeSelectedEvent.eventName, {});
        }
      }`,
      filename: 'front_end/common/Importing.js',
      errors: [{messageId: 'invalidEventName'}],
    },
    // TODO: valid static, but the actual string is invalid
  ],
});
