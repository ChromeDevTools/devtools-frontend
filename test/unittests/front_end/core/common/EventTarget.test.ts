// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Important: This code does not actually run any tests but is used to verify
//            that the type magic of `EventTarget` behaves as expected w.r.t
//            to the TypeScript compiler.

import * as Common from '../../../../../front_end/core/common/common.js';

const enum Events {
  VoidEvent = 'VoidEvent',
  NumberEvent = 'NumberEvent',
  KeyValueEvent = 'KeyValueEvent',
  BooleanEvent = 'BooleanEvent',
  UnionEvent = 'UnionEvent',
}

type TestEvents = {
  [Events.VoidEvent]: void,
  [Events.NumberEvent]: number,
  [Events.KeyValueEvent]: {key: string, value: number},
  [Events.BooleanEvent]: boolean,
  [Events.UnionEvent]: string|null,
};

class TypedEventEmitter extends Common.ObjectWrapper.ObjectWrapper<TestEvents> {
  testValidArgumentTypes() {
    this.dispatchEventToListeners(Events.VoidEvent);
    this.dispatchEventToListeners(Events.NumberEvent, 5.0);
    this.dispatchEventToListeners(Events.KeyValueEvent, {key: 'key', value: 42});
    this.dispatchEventToListeners(Events.BooleanEvent, true);
    this.dispatchEventToListeners(Events.UnionEvent, 'foo');
    this.dispatchEventToListeners(Events.UnionEvent, null);
  }

  testInvalidArgumentTypes() {
    // @ts-expect-error undefined instead of no argument provided
    this.dispatchEventToListeners(Events.VoidEvent, undefined);

    // @ts-expect-error string instead of undefined provided
    this.dispatchEventToListeners(Events.VoidEvent, 'void');

    // @ts-expect-error string instead of number provided
    this.dispatchEventToListeners(Events.NumberEvent, 'expected number');

    // @ts-expect-error argument missing
    this.dispatchEventToListeners(Events.NumberEvent);

    // @ts-expect-error wrong object type provided as payload
    this.dispatchEventToListeners(Events.KeyValueEvent, {key: 'key', foo: 'foo'});

    // @ts-expect-error unknown event type used
    this.dispatchEventToListeners('fake', {key: 'key', foo: 'foo'});

    // @ts-expect-error wrong payload not part of the union
    this.dispatchEventToListeners(Events.UnionEvent, 25);
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
    this.dispatchEventToListeners(Events.VoidEvent, undefined);

    // @ts-expect-error string instead of undefined provided
    this.dispatchEventToListeners(Events.VoidEvent, 'void');

    // @ts-expect-error string instead of number provided
    this.dispatchEventToListeners(Events.NumberEvent, 'expected number');

    // @ts-expect-error argument missing
    this.dispatchEventToListeners(Events.NumberEvent);

    // @ts-expect-error wrong object type provided as payload
    this.dispatchEventToListeners(Events.KeyValueEvent, {key: 'key', foo: 'foo'});

    // @ts-expect-error unknown event type used
    this.dispatchEventToListeners('fake', {key: 'key', foo: 'foo'});

    // @ts-expect-error wrong payload not part of the union
    this.dispatchEventToListeners(Events.UnionEvent, 25);
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
    this.dispatchEventToListeners(Events.VoidEvent);
    this.dispatchEventToListeners(Events.UnionEvent, 'foo');
  }
}

function genericListener<T>(): (arg: Common.EventTarget.EventTargetEvent<T>) => void {
  return (_arg: Common.EventTarget.EventTargetEvent<T>) => {};
}

const typedEmitter = new TypedEventEmitter();

(function testValidListeners() {
  typedEmitter.addEventListener(Events.VoidEvent, genericListener<void>());
  typedEmitter.addEventListener(Events.NumberEvent, genericListener<number>());
  typedEmitter.addEventListener(Events.KeyValueEvent, genericListener<{key: string, value: number}>());
  typedEmitter.addEventListener(Events.BooleanEvent, genericListener<boolean>());
  typedEmitter.addEventListener(Events.UnionEvent, genericListener<string|null>());
})();

(function testInvalidListenerArguments() {
  // @ts-expect-error
  typedEmitter.addEventListener(Events.VoidEvent, genericListener<number>());

  // @ts-expect-error
  typedEmitter.addEventListener(Events.NumberEvent, genericListener<void>());

  // @ts-expect-error
  typedEmitter.addEventListener(Events.KeyValueEvent, genericListener<{foo: string}>());

  // @ts-expect-error
  typedEmitter.addEventListener(Events.UnionEvent, genericListener<string>());
})();

(function testInvalidListenerType() {
  // @ts-expect-error
  typedEmitter.addEventListener('foo', genericListener());

  // @ts-expect-error
  typedEmitter.addEventListener(Symbol('foo'), genericListener());
})();

(function testUnionTypeOnDispatch() {
  // @ts-expect-error
  typedEmitter.dispatchEventToListeners<Events.VoidEvent|Events.NumberEvent>(Events.NumberEvent, 5);

  const event: Events = Math.random() < 0.5 ? Events.NumberEvent : Events.BooleanEvent;
  // @ts-expect-error
  typedEmitter.dispatchEventToListeners(event, true);
})();

const untypedEmitter = new UntypedEventEmitter();

(function testUntypedListeners() {
  untypedEmitter.addEventListener('foo', genericListener());
  untypedEmitter.addEventListener(Symbol('foo'), genericListener());
  untypedEmitter.addEventListener(Events.VoidEvent, genericListener());
})();
