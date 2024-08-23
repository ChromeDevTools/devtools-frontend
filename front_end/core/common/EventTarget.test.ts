// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Important: This code does not actually run any tests but is used to verify
//            that the type magic of `EventTarget` behaves as expected w.r.t
//            to the TypeScript compiler.

import * as Common from './common.js';

const enum Events {
  VOID_EVENT = 'VoidEvent',
  NUMBER_EVENT = 'NumberEvent',
  KEY_VALUE_EVENT = 'KeyValueEvent',
  BOOLEAN_EVENT = 'BooleanEvent',
  UNION_EVENT = 'UnionEvent',
}

type TestEvents = {
  [Events.VOID_EVENT]: void,
  [Events.NUMBER_EVENT]: number,
  [Events.KEY_VALUE_EVENT]: {key: string, value: number},
  [Events.BOOLEAN_EVENT]: boolean,
  [Events.UNION_EVENT]: string|null,
};

class TypedEventEmitter extends Common.ObjectWrapper.ObjectWrapper<TestEvents> {
  testValidArgumentTypes() {
    this.dispatchEventToListeners(Events.VOID_EVENT);
    this.dispatchEventToListeners(Events.NUMBER_EVENT, 5.0);
    this.dispatchEventToListeners(Events.KEY_VALUE_EVENT, {key: 'key', value: 42});
    this.dispatchEventToListeners(Events.BOOLEAN_EVENT, true);
    this.dispatchEventToListeners(Events.UNION_EVENT, 'foo');
    this.dispatchEventToListeners(Events.UNION_EVENT, null);
  }

  testInvalidArgumentTypes() {
    // @ts-expect-error undefined instead of no argument provided
    this.dispatchEventToListeners(Events.VOID_EVENT, undefined);

    // @ts-expect-error string instead of undefined provided
    this.dispatchEventToListeners(Events.VOID_EVENT, 'void');

    // @ts-expect-error string instead of number provided
    this.dispatchEventToListeners(Events.NUMBER_EVENT, 'expected number');

    // @ts-expect-error argument missing
    this.dispatchEventToListeners(Events.NUMBER_EVENT);

    // @ts-expect-error wrong object type provided as payload
    this.dispatchEventToListeners(Events.KEY_VALUE_EVENT, {key: 'key', foo: 'foo'});

    // @ts-expect-error unknown event type used
    this.dispatchEventToListeners('fake', {key: 'key', foo: 'foo'});

    // @ts-expect-error wrong payload not part of the union
    this.dispatchEventToListeners(Events.UNION_EVENT, 25);
  }

  testStringAndSymbolDisallowed() {
    // @ts-expect-error only keys of `TestEvents` are allowed.
    this.dispatchEventToListeners('foo');

    // @ts-expect-error only keys of `TestEvents` are allowed.
    this.dispatchEventToListeners(Symbol('foo'));
  }
}

class VoidTypedEventEmitter extends Common.ObjectWrapper.ObjectWrapper<void> {
  testInvalidArgumentTypes() {
    // @ts-expect-error undefined instead of no argument provided
    this.dispatchEventToListeners(Events.VOID_EVENT, undefined);

    // @ts-expect-error string instead of undefined provided
    this.dispatchEventToListeners(Events.VOID_EVENT, 'void');

    // @ts-expect-error string instead of number provided
    this.dispatchEventToListeners(Events.NUMBER_EVENT, 'expected number');

    // @ts-expect-error argument missing
    this.dispatchEventToListeners(Events.NUMBER_EVENT);

    // @ts-expect-error wrong object type provided as payload
    this.dispatchEventToListeners(Events.KEY_VALUE_EVENT, {key: 'key', foo: 'foo'});

    // @ts-expect-error unknown event type used
    this.dispatchEventToListeners('fake', {key: 'key', foo: 'foo'});

    // @ts-expect-error wrong payload not part of the union
    this.dispatchEventToListeners(Events.UNION_EVENT, 25);
  }

  testStringAndSymbolDisallowed() {
    // @ts-expect-error only keys of `TestEvents` are allowed.
    this.dispatchEventToListeners('foo');

    // @ts-expect-error only keys of `TestEvents` are allowed.
    this.dispatchEventToListeners(Symbol('foo'));
  }
}

VoidTypedEventEmitter;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class UntypedEventEmitter extends Common.ObjectWrapper.ObjectWrapper<any> {
  testDispatch() {
    this.dispatchEventToListeners('foo');
    this.dispatchEventToListeners(Symbol('number payload'), 25);
    this.dispatchEventToListeners(Events.VOID_EVENT);
    this.dispatchEventToListeners(Events.UNION_EVENT, 'foo');
  }
}

function genericListener<T>(): (arg: Common.EventTarget.EventTargetEvent<T>) => void {
  return (_arg: Common.EventTarget.EventTargetEvent<T>) => {};
}

const typedEmitter = new TypedEventEmitter();

(function testValidListeners() {
  typedEmitter.addEventListener(Events.VOID_EVENT, genericListener<void>());
  typedEmitter.addEventListener(Events.NUMBER_EVENT, genericListener<number>());
  typedEmitter.addEventListener(Events.KEY_VALUE_EVENT, genericListener<{key: string, value: number}>());
  typedEmitter.addEventListener(Events.BOOLEAN_EVENT, genericListener<boolean>());
  typedEmitter.addEventListener(Events.UNION_EVENT, genericListener<string|null>());
})();

(function testInvalidListenerArguments() {
  // @ts-expect-error
  typedEmitter.addEventListener(Events.VOID_EVENT, genericListener<number>());

  // @ts-expect-error
  typedEmitter.addEventListener(Events.NUMBER_EVENT, genericListener<void>());

  // @ts-expect-error
  typedEmitter.addEventListener(Events.KEY_VALUE_EVENT, genericListener<{foo: string}>());

  // @ts-expect-error
  typedEmitter.addEventListener(Events.UNION_EVENT, genericListener<string>());
})();

(function testInvalidListenerType() {
  // @ts-expect-error
  typedEmitter.addEventListener('foo', genericListener());

  // @ts-expect-error
  typedEmitter.addEventListener(Symbol('foo'), genericListener());
})();

(function testUnionTypeOnDispatch() {
  // @ts-expect-error
  typedEmitter.dispatchEventToListeners<Events.VOID_EVENT|Events.NUMBER_EVENT>(Events.NUMBER_EVENT, 5);

  const event: Events = Math.random() < 0.5 ? Events.NUMBER_EVENT : Events.BOOLEAN_EVENT;
  // @ts-expect-error
  typedEmitter.dispatchEventToListeners(event, true);
})();

const untypedEmitter = new UntypedEventEmitter();

(function testUntypedListeners() {
  untypedEmitter.addEventListener('foo', genericListener());
  untypedEmitter.addEventListener(Symbol('foo'), genericListener());
  untypedEmitter.addEventListener(Events.VOID_EVENT, genericListener());
})();
