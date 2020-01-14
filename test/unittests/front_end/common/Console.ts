// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const { assert } = chai;

import * as Common from '/front_end/common/common.js';

describe('Console', () => {
  let consoleImpl: Common.Console.Console;
  beforeEach(() => {
    consoleImpl = new Common.Console.Console();
  });

  it('adds messages', () => {
    consoleImpl.addMessage('Foo', Common.Console.MessageLevel.Info, true);
    const messages = consoleImpl.messages();
    assert.equal(messages.length, 1);
    assert.equal(messages[0].text, 'Foo');
  });

  it('adds handles messages of all types', () => {
    const messageTypes = new Map<string, string>([
      ['Info', 'log'],
      ['Warning', 'warn'],
      ['Error', 'error'],
    ]);

    for (const [type, method] of messageTypes) {
      consoleImpl = new Common.Console.Console();

      // Dispatch the message of the appropriate type.
      consoleImpl[method](type);

      // Now read the message back and check it.
      const messages = consoleImpl.messages();
      assert.equal(messages.length, 1);
      assert.equal(messages[0].text, type);
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
    consoleImpl.addEventListener(Common.Console.Events.MessageAdded, ({data}) => {
      assert.equal(data.text, 'Foo');
      done();
    });

    consoleImpl.addMessage('Foo', Common.Console.MessageLevel.Info, true);
  });
});
