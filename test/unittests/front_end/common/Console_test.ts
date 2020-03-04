// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const { assert } = chai;

import * as Common from '/front_end/common/common.js';

describe('Console', () => {
  let consoleImpl: Common.Console.Console;
  beforeEach(() => {
    consoleImpl = Common.Console.Console.instance({forceNew: true});
  });

  it('adds messages', () => {
    consoleImpl.addMessage('Foo', Common.Console.MessageLevel.Info, true);
    const messages = consoleImpl.messages();
    assert.equal(messages.length, 1);
    assert.equal(messages[0].text, 'Foo');
  });

  it('adds handles messages of all types', () => {
    const messageTypes = new Map<Common.Console.MessageLevel, string>([
      ['Info', 'log'],
      ['Warning', 'warn'],
      ['Error', 'error'],
    ]);

    for (const [type, method] of messageTypes) {
      consoleImpl = Common.Console.Console.instance({forceNew: true});

      // Dispatch the message of the appropriate type.
      // @ts-ignore
      consoleImpl[method](type);

      // Now read the message back and check it.
      const messages = consoleImpl.messages();
      assert.equal(messages.length, 1);
      assert.equal(messages[0].text, type);
      // @ts-ignore
      assert.equal(messages[0].level, Common.Console.MessageLevel[type]);
    }
  });

  it('stores messages', () => {
    consoleImpl.addMessage('Foo', Common.Console.MessageLevel.Info, true);
    consoleImpl.addMessage('Baz', Common.Console.MessageLevel.Warning, true);
    consoleImpl.addMessage('Bar', Common.Console.MessageLevel.Error, true);
    consoleImpl.addMessage('Donkey', Common.Console.MessageLevel.Info, true);
    const messages = consoleImpl.messages();
    assert.equal(messages.length, 4);
  });

  it('dispatches events to listeners', done => {
    const callback = ({data}: {data: {text: string}}) => {
      consoleImpl.removeEventListener(Common.Console.Events.MessageAdded, callback);
      assert.equal(data.text, 'Foo');
      done();
    };

    consoleImpl.addEventListener(Common.Console.Events.MessageAdded, callback);
    consoleImpl.addMessage('Foo', Common.Console.MessageLevel.Info, true);
  });
});
