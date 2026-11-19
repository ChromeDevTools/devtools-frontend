// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import type * as ProtocolClient from '../../core/protocol_client/protocol_client.js';
import type * as Protocol from '../../generated/protocol.js';

import * as PuppeteerService from './puppeteer.js';

class MockConnection implements ProtocolClient.CDPConnection.CDPConnection {
  send<T extends ProtocolClient.CDPConnection.Command>(
      _method: T, _params: ProtocolClient.CDPConnection.CommandParams<T>, _sessionId: string|undefined):
      Promise<{result: ProtocolClient.CDPConnection.CommandResult<T>}|{error: ProtocolClient.CDPConnection.CDPError}> {
    return Promise.resolve({
      error: {
        message: 'Something went wrong',
        code: -32000,
        data: 'Some data',
      },
    });
  }
  observe(_observer: ProtocolClient.CDPConnection.CDPConnectionObserver): void {
  }
  unobserve(_observer: ProtocolClient.CDPConnection.CDPConnectionObserver): void {
  }
}

describe('PuppeteerConnectionAdapter', () => {
  it('throws ProtocolError on CDP error', async () => {
    const connection = new MockConnection();
    const adapter = new PuppeteerService.PuppeteerConnection.PuppeteerConnectionAdapter(
        connection,
        'test-session-id' as Protocol.Target.SessionID,
    );

    try {
      await adapter._rawSend('some-callbacks', 'Some.method', {});
      assert.fail('Expected _rawSend to throw');
    } catch (err) {
      const error = err as Error & {code?: number, data?: string};
      assert.strictEqual(error.name, 'ProtocolError');
      assert.strictEqual(error.message, 'Something went wrong');
      assert.strictEqual(error.code, -32000);
      assert.strictEqual(error.data, 'Some data');
    }
  });

  it('rejects page input commands after blockPageInput() and sends other commands', async () => {
    const connection = new MockConnection();
    const sent: string[] = [];
    connection.send = ((method: string) => {
                        sent.push(method);
                        return Promise.resolve({result: {}});
                      }) as typeof connection.send;
    const adapter = new PuppeteerService.PuppeteerConnection.PuppeteerConnectionAdapter(
        connection,
        'test-session-id' as Protocol.Target.SessionID,
    );

    await adapter._rawSend('some-callbacks', 'Input.dispatchMouseEvent', {});
    const error = new Error('Navigation is not allowed');
    adapter.blockPageInput(error);

    const blockedMethods = [
      'Input.dispatchMouseEvent',
      'Input.insertText',
      'Runtime.evaluate',
      'Runtime.getProperties',
      'DOM.scrollIntoViewIfNeeded',
      'Page.navigate',
    ];
    for (const method of blockedMethods) {
      const result = await adapter._rawSend('some-callbacks', method, {}).then(() => null, (err: Error) => err);
      assert.strictEqual(result, error, `${method} must be rejected`);
    }
    await adapter._rawSend('some-callbacks', 'Fetch.disable', {});
    await adapter._rawSend('some-callbacks', 'Runtime.disable', {});

    assert.deepEqual(sent, ['Input.dispatchMouseEvent', 'Fetch.disable', 'Runtime.disable']);
  });
});
