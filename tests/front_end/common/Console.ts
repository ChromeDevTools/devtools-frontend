// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const { assert } = chai;

import { default as Console, Events, MessageLevel } from '../../../front_end/common/Console.js';

describe('Console', () => {
  let consoleImpl: Console;
  beforeEach(() => {
    consoleImpl = new Console();
  });

  it('adds messages', () => {
    consoleImpl.addMessage('Foo', MessageLevel.Info, true);
    const messages = consoleImpl.messages();
    assert.equal(messages.length, 1);
    assert.equal(messages[0].text, 'Foo');
  });

  it('adds handles messages of all types', () => {
    const messageTypes = new Map<string, string>([
      ['Info', 'log'],
      ['Warning', 'warn'],
      ['Error', 'error']
    ]);

    for (const [type, method] of messageTypes) {
      consoleImpl = new Console();

      // Dispatch the message of the appropriate type.
      consoleImpl[method](type);

      // Now read the message back and check it.
      const messages = consoleImpl.messages();
      assert.equal(messages.length, 1);
      assert.equal(messages[0].text, type);
      assert.equal(messages[0].level, MessageLevel[type]);
    }
  });

  it('stores messages', () => {
    consoleImpl.addMessage('Foo', MessageLevel.Info, true);
    consoleImpl.addMessage('Baz', MessageLevel.Warning, true);
    consoleImpl.addMessage('Bar', MessageLevel.Error, true);
    consoleImpl.addMessage('Donkey', MessageLevel.Info, true);
    const messages = consoleImpl.messages();
    assert.equal(messages.length, 4);
  });

  it('dispatches events to listeners', (done) => {
    consoleImpl.addEventListener(Events.MessageAdded, ({ data }) => {
      assert.equal(data.text, 'Foo');
      done();
    });

    consoleImpl.addMessage('Foo', MessageLevel.Info, true);
  });
});
