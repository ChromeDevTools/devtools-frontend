// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {Console, Events, MessageLevel} from '../../../../front_end/common/Console.js';

describe('Console', () => {
  let consoleImpl: Console;
  beforeEach(() => {
    consoleImpl = Console.instance({forceNew: true});
  });

  it('adds messages', () => {
    consoleImpl.addMessage('Foo', MessageLevel.Info, true);
    const messages = consoleImpl.messages();
    assert.strictEqual(messages.length, 1);
    assert.strictEqual(messages[0].text, 'Foo');
  });

  it('adds handles messages of all types', () => {
    const messageTypes = new Map<MessageLevel, string>([
      ['Info', 'log'],
      ['Warning', 'warn'],
      ['Error', 'error'],
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
      // @ts-ignore
      assert.strictEqual(messages[0].level, MessageLevel[type]);
    }
  });

  it('stores messages', () => {
    consoleImpl.addMessage('Foo', MessageLevel.Info, true);
    consoleImpl.addMessage('Baz', MessageLevel.Warning, true);
    consoleImpl.addMessage('Bar', MessageLevel.Error, true);
    consoleImpl.addMessage('Donkey', MessageLevel.Info, true);
    const messages = consoleImpl.messages();
    assert.strictEqual(messages.length, 4);
  });

  it('dispatches events to listeners', done => {
    const callback = ({data}: {data: {text: string}}) => {
      consoleImpl.removeEventListener(Events.MessageAdded, callback);
      assert.strictEqual(data.text, 'Foo');
      done();
    };

    consoleImpl.addEventListener(Events.MessageAdded, callback);
    consoleImpl.addMessage('Foo', MessageLevel.Info, true);
  });
});
