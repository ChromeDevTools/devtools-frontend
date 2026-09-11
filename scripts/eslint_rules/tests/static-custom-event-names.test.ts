// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import rule from '../lib/static-custom-event-names.ts';

import {RuleTester} from './utils/RuleTester.ts';

new RuleTester().run('static-custom-event-names', rule, {
  valid: [
    {
      name: 'allows static readonly eventName in Event subclass',
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
      name: 'allows non-Event class without eventName',
      code: `class NotAnEvent {
      }`,
      filename: 'ui/some-component.ts',
    },
    {
      // Not using the built in Event type, but using a type that is defined in
      // the same file that is called Event. We special case this because in
      // the Performance Panel SDK we do define a custom Event class
      name: 'allows subclass of local Event type',
      code: `class Event {};
export class ConstructedEvent extends Event {}`,
      filename: 'ui/some-component.ts',
    },
  ],

  invalid: [
    {
      // Not readonly
      name: 'disallows instance non-readonly eventName property',
      code: `class FooEvent extends Event {
        eventName = 'fooevent'
        data: string;

        constructor(data: string) {
          super('fooevent', {composed: true});
          this.data = data;
        }
      }`,
      filename: 'ui/some-component.ts',
      errors: [
        {messageId: 'eventNameNotReadonly'},
        {messageId: 'eventNameNotStatic'},
      ],
    },
    {
      // Not static
      name: 'disallows non-static readonly eventName property',
      code: `class FooEvent extends Event {
        readonly eventName = 'fooevent'
        data: string;

        constructor(data: string) {
          super('fooevent', {composed: true});
          this.data = data;
        }
      }`,
      filename: 'ui/some-component.ts',
      errors: [{messageId: 'eventNameNotStatic'}],
    },
    {
      // Controller not using new name
      name: 'disallows super call with no arguments',
      code: `class FooEvent extends Event {
        static readonly eventName = 'fooevent'
        data: string;

        constructor(data: string) {
          super();
          this.data = data;
        }
      }`,
      filename: 'ui/some-component.ts',
      errors: [{messageId: 'superEventNameWrong'}],
    },
    {
      // Missing super() call
      name: 'disallows missing super call in constructor',
      code: `class FooEvent extends Event {
        static readonly eventName = 'fooevent'
        data: string;

        constructor(data: string) {
          this.data = data;
        }
      }`,
      filename: 'ui/some-component.ts',
      errors: [{messageId: 'noSuperCallFound'}],
    },
    {
      // Missing constructor
      name: 'disallows Event subclass without constructor',
      code: `class FooEvent extends Event {
        static readonly eventName = 'fooevent'
        data: string;
      }`,
      filename: 'ui/some-component.ts',
      errors: [{messageId: 'noConstructorFound'}],
    },
    {
      // Controller not using new name
      name: 'disallows wrong property access in super call',
      code: `class FooEvent extends Event {
        static readonly eventName = 'fooevent'
        data: string;

        constructor(data: string) {
          super(FooEvent.notRight);
          this.data = data;
        }
      }`,
      filename: 'ui/some-component.ts',
      errors: [{messageId: 'superEventNameWrong'}],
    },
    {
      // Controller not using new name
      name: 'disallows other class eventName in super call',
      code: `class FooEvent extends Event {
        static readonly eventName = 'fooevent'
        data: string;

        constructor(data: string) {
          super(SomeOtherClass.eventName);
          this.data = data;
        }
      }`,
      filename: 'ui/some-component.ts',
      errors: [{messageId: 'superEventNameWrong'}],
    },
    {
      // Controller not using new name and missing the property
      name: 'disallows missing static readonly eventName property and raw string in super',
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
      name: 'disallows raw string in super when static readonly eventName exists',
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
  ],
});
