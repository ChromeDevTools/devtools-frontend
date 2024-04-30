// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from './sdk.js';

describe('ServerSentEventsParser', () => {
  let parser: SDK.ServerSentEventProtocol.ServerSentEventsParser;
  let events: Array<{eventId: string, eventType: string, data: string}>;

  /**
   * Encodes `str` first as UTF-8 and then as Base64 to simulate CDP.
   * @returns A promise that fulfills when the parser is done handling the chunk.
   */
  function enqueue(str: string, options?: {prefixBOM?: true}): Promise<void> {
    const maybeBom = options?.prefixBOM ? [0xef, 0xbb, 0xbf] : [];
    const bytes = new TextEncoder().encode(str);
    return parser.addBase64Chunk(window.btoa(String.fromCodePoint(...maybeBom, ...bytes)));
  }

  /**
   * Same as `enqueue` but feeds the resulting bytes one by one into the parser.
   */
  async function enqueueOneByOne(str: string, options?: {prefixBOM?: true}): Promise<void> {
    if (options?.prefixBOM) {
      await parser.addBase64Chunk(window.btoa('\xef'));
      await parser.addBase64Chunk(window.btoa('\xbb'));
      await parser.addBase64Chunk(window.btoa('\xbf'));
    }

    const bytes = new TextEncoder().encode(str);
    for (let i = 0; i < bytes.length; ++i) {
      await parser.addBase64Chunk(window.btoa(String.fromCodePoint(bytes[i])));
    }
  }

  beforeEach(() => {
    events = [];
    parser = new SDK.ServerSentEventProtocol.ServerSentEventsParser((eventType, data, eventId) => {
      events.push({eventType, data, eventId});
    });
  });

  it('does not dispatch an event for empty messages', async () => {
    await enqueue('\n');

    assert.lengthOf(events, 0);
  });

  it('dispatches an event for simple messages', async () => {
    await enqueue('data:hello\n\n');

    assert.lengthOf(events, 1);
    assert.strictEqual(events[0].eventType, 'message');
    assert.strictEqual(events[0].eventId, '');
    assert.strictEqual(events[0].data, 'hello');
  });

  it('accumulates data fields', async () => {
    await enqueue('data:hello\ndata:bye\n\n');

    assert.lengthOf(events, 1);
    assert.strictEqual(events[0].eventType, 'message');
    assert.strictEqual(events[0].eventId, '');
    assert.strictEqual(events[0].data, 'hello\nbye');
  });

  it('dispatches an event with the right id if one was set', async () => {
    await enqueue('id:42\ndata:hello\n\n');

    assert.lengthOf(events, 1);
    assert.strictEqual(events[0].eventType, 'message');
    assert.strictEqual(events[0].eventId, '42');
    assert.strictEqual(events[0].data, 'hello');
  });

  it('remembers the id even when data is empty and no event is dispatched', async () => {
    await enqueue('id:42\n\n');
    assert.lengthOf(events, 0);

    await enqueue('data:hello\n\n');

    assert.lengthOf(events, 1);
    assert.strictEqual(events[0].eventType, 'message');
    assert.strictEqual(events[0].eventId, '42');
    assert.strictEqual(events[0].data, 'hello');
  });

  it('supports custom event types', async () => {
    await enqueue('event:foo\ndata:hello\n\n');

    assert.lengthOf(events, 1);
    assert.strictEqual(events[0].eventType, 'foo');
    assert.strictEqual(events[0].eventId, '');
    assert.strictEqual(events[0].data, 'hello');
  });

  it('resets the event type after dispatching it', async () => {
    await enqueue('event:foo\ndata:hello\n\ndata:bye\n\n');

    assert.lengthOf(events, 2);
    assert.strictEqual(events[0].eventType, 'foo');
    assert.strictEqual(events[0].data, 'hello');

    assert.strictEqual(events[1].eventType, 'message');
    assert.strictEqual(events[1].data, 'bye');
  });

  it('does not accumulate event fields', async () => {
    await enqueue('data:hello\nevent:foo\nevent:bar\n\n');

    assert.lengthOf(events, 1);
    assert.strictEqual(events[0].eventType, 'bar');
    assert.strictEqual(events[0].data, 'hello');
  });

  it('does not reset the id after dispatching it', async () => {
    await enqueue('id:42\ndata:hello\n\ndata:bye\n\n');

    assert.lengthOf(events, 2);
    assert.strictEqual(events[0].eventId, '42');
    assert.strictEqual(events[0].data, 'hello');

    assert.strictEqual(events[1].eventId, '42');
    assert.strictEqual(events[1].data, 'bye');
  });

  it('ignores the retry field', async () => {
    await enqueue('retry:9999\n\n');

    assert.lengthOf(events, 0);
  });

  it('supports different types of newlines', async () => {
    await enqueue('data:hello\r\n\rdata:bye\r\r');

    assert.lengthOf(events, 2);
  });

  it('ignores unrecognized fields', async () => {
    await enqueue('data:hello\nfoo:bar\nanotherRandomFIeld\n\n');

    assert.lengthOf(events, 1);
    assert.strictEqual(events[0].eventType, 'message');
    assert.strictEqual(events[0].eventId, '');
    assert.strictEqual(events[0].data, 'hello');
  });

  it('ignores comments', async () => {
    await enqueue('data:hello\n:comment one\n:comment two\n\n');

    assert.lengthOf(events, 1);
    assert.strictEqual(events[0].eventType, 'message');
    assert.strictEqual(events[0].eventId, '');
    assert.strictEqual(events[0].data, 'hello');
  });

  it('ignores BOM', async () => {
    // This line are the first bytes, so the BOM should be ignored.
    await enqueue('data:hello\n', {prefixBOM: true});
    // In this line the BOM bytes are part of the field name.
    await enqueue('data:bye\n', {prefixBOM: true});
    await enqueue('\n');

    assert.lengthOf(events, 1);
    assert.strictEqual(events[0].eventType, 'message');
    assert.strictEqual(events[0].eventId, '');
    assert.strictEqual(events[0].data, 'hello');
  });

  it('ignores BOM (one-by-one)', async () => {
    // This line are the first bytes, so the BOM should be ignored.
    await enqueueOneByOne('data:hello\n', {prefixBOM: true});
    // In this line the BOM bytes are part of the field name.
    await enqueueOneByOne('data:bye\n', {prefixBOM: true});
    await enqueueOneByOne('\n');

    assert.lengthOf(events, 1);
    assert.strictEqual(events[0].eventType, 'message');
    assert.strictEqual(events[0].eventId, '');
    assert.strictEqual(events[0].data, 'hello');
  });

  it('treats lines without a colon as field name only', async () => {
    await enqueue('data:hello\nevent:foo\nevent\n\n');

    assert.lengthOf(events, 1);
    assert.strictEqual(events[0].eventType, 'message');
    assert.strictEqual(events[0].data, 'hello');
  });

  it('skips at most one leading space for field values', async () => {
    await enqueue('data:  hello  \nevent:  type \n\n');

    assert.lengthOf(events, 1);
    assert.strictEqual(events[0].eventType, ' type ');
    assert.strictEqual(events[0].data, ' hello  ');
  });

  it('works correctly if data is received one byte at a time', async () => {
    await enqueueOneByOne('data:hello\r\ndata:world\revent:a\revent:b\nid:4\n\nid:8\ndata:bye\r\n\r');

    assert.lengthOf(events, 2);
    assert.strictEqual(events[0].eventType, 'b');
    assert.strictEqual(events[0].eventId, '4');
    assert.strictEqual(events[0].data, 'hello\nworld');

    assert.strictEqual(events[1].eventType, 'message');
    assert.strictEqual(events[1].eventId, '8');
    assert.strictEqual(events[1].data, 'bye');
  });

  it('handles non-ASCII characters correctly', async () => {
    await enqueue('data:Iñtërnâtiônàlizætiøn☃𝌆\n\n');

    assert.lengthOf(events, 1);
    assert.strictEqual(events[0].eventType, 'message');
    assert.strictEqual(events[0].data, 'Iñtërnâtiônàlizætiøn☃𝌆');
  });
});
