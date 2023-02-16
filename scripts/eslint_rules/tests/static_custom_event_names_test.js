// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const rule = require('../lib/static_custom_event_names.js');
const ruleTester = new (require('eslint').RuleTester)({
  parserOptions: {ecmaVersion: 9, sourceType: 'module'},
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('static_custom_event_names', rule, {
  valid: [
    {
      code: `class FooEvent extends Event {
        static readonly eventName = 'fooevent'
        data: string;

        constructor(data: string) {
          super(FooEvent.eventName, {composed: true});
          this.data = data;
        }
      }`,
      filename: 'ui/some-component.ts',
    },
    {
      code: `class NotAnEvent {
      }`,
      filename: 'ui/some-component.ts',
    },
    {
      // Not using the built in Event type, but using a type that is defined in
      // the same file that is called Event. We special case this because in
      // the Performance Panel SDK we do define a custom Event class
      code: `class Event {};
export class ConstructedEvent extends Event {}`,
      filename: 'ui/some-component.ts',
    },
  ],

  invalid: [
    {
      // Not readonly
      code: `class FooEvent extends Event {
        eventName = 'fooevent'
        data: string;

        constructor(data: string) {
          super('fooevent', {composed: true});
          this.data = data;
        }
      }`,
      filename: 'ui/some-component.ts',
      errors: [{messageId: 'eventNameNotReadonly'}, {messageId: 'eventNameNotStatic'}]
    },
    {
      // Not static
      code: `class FooEvent extends Event {
        readonly eventName = 'fooevent'
        data: string;

        constructor(data: string) {
          super('fooevent', {composed: true});
          this.data = data;
        }
      }`,
      filename: 'ui/some-component.ts',
      errors: [{messageId: 'eventNameNotStatic'}]
    },
    {
      // Controller not using new name
      code: `class FooEvent extends Event {
        static readonly eventName = 'fooevent'
        data: string;

        constructor(data: string) {
          super();
          this.data = data;
        }
      }`,
      filename: 'ui/some-component.ts',
      errors: [{messageId: 'superEventNameWrong'}]
    },
    {
      // Missing super() call
      code: `class FooEvent extends Event {
        static readonly eventName = 'fooevent'
        data: string;

        constructor(data: string) {
          this.data = data;
        }
      }`,
      filename: 'ui/some-component.ts',
      errors: [{messageId: 'noSuperCallFound'}]
    },
    {
      // Missing constructor
      code: `class FooEvent extends Event {
        static readonly eventName = 'fooevent'
        data: string;
      }`,
      filename: 'ui/some-component.ts',
      errors: [{messageId: 'noConstructorFound'}]
    },
    {
      // Controller not using new name
      code: `class FooEvent extends Event {
        static readonly eventName = 'fooevent'
        data: string;

        constructor(data: string) {
          super(FooEvent.notRight);
          this.data = data;
        }
      }`,
      filename: 'ui/some-component.ts',
      errors: [{messageId: 'superEventNameWrong'}]
    },
    {
      // Controller not using new name
      code: `class FooEvent extends Event {
        static readonly eventName = 'fooevent'
        data: string;

        constructor(data: string) {
          super(SomeOtherClass.eventName);
          this.data = data;
        }
      }`,
      filename: 'ui/some-component.ts',
      errors: [{messageId: 'superEventNameWrong'}]
    },
    {
      // Controller not using new name and missing the property
      code: `class FooEvent extends Event {
        data: string;

        constructor(data: string) {
          super('fooevent');
          this.data = data;
        }
      }`,
      filename: 'ui/some-component.ts',
      errors: [{messageId: 'missingEventName'}],
      output: `class FooEvent extends Event {
        static readonly eventName = 'fooevent';data: string;

        constructor(data: string) {
          super(FooEvent.eventName);
          this.data = data;
        }
      }`,
    },
    {
      // Controller not using new name
      code: `class FooEvent extends Event {
        static readonly eventName = 'fooevent';
        data: string;

        constructor(data: string) {
          super('fooevent');
          this.data = data;
        }
      }`,
      filename: 'ui/some-component.ts',
      errors: [{messageId: 'superEventNameWrong'}],
      output: `class FooEvent extends Event {
        static readonly eventName = 'fooevent';
        data: string;

        constructor(data: string) {
          super(FooEvent.eventName);
          this.data = data;
        }
      }`,
    },
  ]
});
