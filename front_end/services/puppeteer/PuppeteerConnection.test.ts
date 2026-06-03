// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

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
});
