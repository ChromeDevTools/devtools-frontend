// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from './common.js';

const Console = Common.Console.Console;

describe('Console', () => {
  describe('addMessage', () => {
    it('adds messages', () => {
      const console = Console.instance({forceNew: true});
      console.addMessage('Foo', Common.Console.MessageLevel.INFO, true);
      const messages = console.messages();
      assert.lengthOf(messages, 1);
      assert.strictEqual(messages[0].text, 'Foo');
      assert.strictEqual(messages[0].level, Common.Console.MessageLevel.INFO);
      assert.strictEqual(messages[0].show, true);
    });

    it('stores messages', () => {
      const console = Console.instance({forceNew: true});
      console.addMessage('Foo', Common.Console.MessageLevel.INFO, true);
      console.addMessage('Baz', Common.Console.MessageLevel.WARNING, true);
      console.addMessage('Bar', Common.Console.MessageLevel.ERROR, true);
      console.addMessage('Donkey', Common.Console.MessageLevel.INFO, true);
      const messages = console.messages();
      assert.strictEqual(messages.length, 4);
    });

    it('dispatches events to listeners', done => {
      const console = Console.instance({forceNew: true});
      const callback = ({data}: Common.EventTarget.EventTargetEvent<Common.Console.Message>) => {
        console.removeEventListener(Common.Console.Events.MESSAGE_ADDED, callback);
        assert.strictEqual(data.text, 'Foo');
        done();
      };

      console.addEventListener(Common.Console.Events.MESSAGE_ADDED, callback);
      console.addMessage('Foo', Common.Console.MessageLevel.INFO, true);
    });
  });

  describe('log', () => {
    it('adds messages with level Info', () => {
      const console = Console.instance({forceNew: true});
      console.log('Lorem Ipsum');
      const messages = console.messages();
      assert.lengthOf(messages, 1);
      assert.strictEqual(messages[0].show, false);  // Infos don't popup the Console panel by default
      assert.strictEqual(messages[0].level, Common.Console.MessageLevel.INFO);
    });
  });

  describe('warn', () => {
    it('adds messages with level Warning', () => {
      const console = Console.instance({forceNew: true});
      console.warn('Lorem Ipsum');
      const messages = console.messages();
      assert.lengthOf(messages, 1);
      assert.strictEqual(messages[0].show, false);  // Warnings don't popup the Console panel by default
      assert.strictEqual(messages[0].level, Common.Console.MessageLevel.WARNING);
    });
  });

  describe('error', () => {
    it('adds messages with level Error', () => {
      const console = Console.instance({forceNew: true});
      console.error('Lorem Ipsum');
      const messages = console.messages();
      assert.lengthOf(messages, 1);
      assert.strictEqual(messages[0].show, true);  // Errors popup the Console panel by default
      assert.strictEqual(messages[0].level, Common.Console.MessageLevel.ERROR);
    });

    it('can control whether to pop up the Console panel', () => {
      const console = Console.instance({forceNew: true});
      console.error('Bar', false);
      console.error('Baz', true);
      const messages = console.messages();
      assert.lengthOf(messages, 2);
      assert.strictEqual(messages[0].show, false);
      assert.strictEqual(messages[1].show, true);
    });
  });
});
