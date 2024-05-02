// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Common from './common.js';

const Console = Common.Console.Console;

describe('Console', () => {
  let consoleImpl: Common.Console.Console;
  beforeEach(() => {
    consoleImpl = Console.instance({forceNew: true});
  });

  it('adds messages', () => {
    consoleImpl.addMessage('Foo', Common.Console.MessageLevel.Info, true);
    const messages = consoleImpl.messages();
    assert.strictEqual(messages.length, 1);
    assert.strictEqual(messages[0].text, 'Foo');
  });

  it('adds handles messages of all types', () => {
    const messageTypes = new Map<Common.Console.MessageLevel, string>([
      [Common.Console.MessageLevel.Info, 'log'],
      [Common.Console.MessageLevel.Warning, 'warn'],
      [Common.Console.MessageLevel.Error, 'error'],
    ]);

    for (const [type, method] of messageTypes) {
      consoleImpl = Console.instance({forceNew: true});

      // Dispatch the message of the appropriate type.
      // @ts-ignore
      consoleImpl[method](type);

      // Now read the message back and check it.
      const messages = consoleImpl.messages();
      assert.strictEqual(messages.length, 1);
      assert.strictEqual(messages[0].text, type);
      assert.strictEqual(messages[0].level, type);
    }
  });

  it('stores messages', () => {
    consoleImpl.addMessage('Foo', Common.Console.MessageLevel.Info, true);
    consoleImpl.addMessage('Baz', Common.Console.MessageLevel.Warning, true);
    consoleImpl.addMessage('Bar', Common.Console.MessageLevel.Error, true);
    consoleImpl.addMessage('Donkey', Common.Console.MessageLevel.Info, true);
    const messages = consoleImpl.messages();
    assert.strictEqual(messages.length, 4);
  });

  it('dispatches events to listeners', done => {
    const callback = ({data}: Common.EventTarget.EventTargetEvent<Common.Console.Message>) => {
      consoleImpl.removeEventListener(Common.Console.Events.MessageAdded, callback);
      assert.strictEqual(data.text, 'Foo');
      done();
    };

    consoleImpl.addEventListener(Common.Console.Events.MessageAdded, callback);
    consoleImpl.addMessage('Foo', Common.Console.MessageLevel.Info, true);
  });
});
