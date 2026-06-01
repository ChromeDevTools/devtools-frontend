// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as ProtocolClient from '../core/protocol_client/protocol_client.js';
import type * as Protocol from '../generated/protocol.js';

import {MockCDPConnection} from './MockCDPConnection.js';

describe('MockCDPConnection', () => {
  it('handles sync success results', async () => {
    const connection = new MockCDPConnection();
    connection.setSuccessHandler('Runtime.evaluate', params => {
      return {result: {type: 'number', value: params.expression.length} as unknown as Protocol.Runtime.RemoteObject};
    });

    const response = await connection.send('Runtime.evaluate', {expression: '1 + 1'}, undefined);
    if ('error' in response) {
      throw new Error('Expected success, got error');
    }
    assert.deepEqual(response.result, {result: {type: 'number', value: 5} as unknown as Protocol.Runtime.RemoteObject});
  });

  it('handles async success results', async () => {
    const connection = new MockCDPConnection();
    connection.setSuccessHandler('Runtime.evaluate', async params => {
      await new Promise(resolve => setTimeout(resolve, 0));
      return {result: {type: 'number', value: params.expression.length} as unknown as Protocol.Runtime.RemoteObject};
    });

    const response = await connection.send('Runtime.evaluate', {expression: '1 + 1'}, undefined);
    if ('error' in response) {
      throw new Error('Expected success, got error');
    }
    assert.deepEqual(response.result, {result: {type: 'number', value: 5} as unknown as Protocol.Runtime.RemoteObject});
  });

  it('handles sync failure results', async () => {
    const connection = new MockCDPConnection();
    connection.setFailureHandler('Runtime.evaluate', _params => {
      return {
        code: ProtocolClient.CDPConnection.CDPErrorStatus.INVALID_REQUEST,
        message: 'Sync error',
      };
    });

    const response = await connection.send('Runtime.evaluate', {expression: '1 + 1'}, undefined);
    if ('result' in response) {
      throw new Error('Expected error, got success');
    }
    assert.strictEqual(response.error.message, 'Sync error');
    assert.strictEqual(response.error.code, ProtocolClient.CDPConnection.CDPErrorStatus.INVALID_REQUEST);
  });

  it('handles async failure results', async () => {
    const connection = new MockCDPConnection();
    connection.setFailureHandler('Runtime.evaluate', async _params => {
      await new Promise(resolve => setTimeout(resolve, 0));
      return {
        code: ProtocolClient.CDPConnection.CDPErrorStatus.INVALID_REQUEST,
        message: 'Async error',
      };
    });

    const response = await connection.send('Runtime.evaluate', {expression: '1 + 1'}, undefined);
    if ('result' in response) {
      throw new Error('Expected error, got success');
    }
    assert.strictEqual(response.error.message, 'Async error');
    assert.strictEqual(response.error.code, ProtocolClient.CDPConnection.CDPErrorStatus.INVALID_REQUEST);
  });

  it('throws when overwriting a handler', () => {
    const connection = new MockCDPConnection();
    connection.setSuccessHandler('Runtime.evaluate', () => ({} as unknown as Protocol.Runtime.EvaluateResponse));
    assert.throws(() => {
      connection.setSuccessHandler('Runtime.evaluate', () => ({} as unknown as Protocol.Runtime.EvaluateResponse));
    }, 'MockCDPConnection already has a handler for Runtime.evaluate');
  });

  it('can clear a handler', async () => {
    const connection = new MockCDPConnection();
    connection.setSuccessHandler('Runtime.evaluate', () => ({} as unknown as Protocol.Runtime.EvaluateResponse));
    connection.setHandler('Runtime.evaluate', null);

    const response = await connection.send('Runtime.evaluate', {expression: '1 + 1'}, undefined);
    if ('result' in response) {
      throw new Error('Expected error, got success');
    }
    assert.include(response.error.message, 'not stubbed');
  });
});
