// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import type * as Puppeteer from '../../third_party/puppeteer/puppeteer.js';

import * as ProtocolClient from './protocol_client.js';
// eslint-disable-next-line @devtools/es-modules-import
import {PuppeteerDevToolsConnection} from './PuppeteerDevToolsConnection.js';

class MockPuppeteerSession {
  #id: string;
  #connection: MockPuppeteerConnection;
  #listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  constructor(id: string, connection: MockPuppeteerConnection) {
    this.#id = id;
    this.#connection = connection;
  }

  id(): string {
    return this.#id;
  }

  connection(): MockPuppeteerConnection {
    return this.#connection;
  }

  on(event: string, handler: (...args: unknown[]) => void): void {
    let handlers = this.#listeners.get(event);
    if (!handlers) {
      handlers = new Set();
      this.#listeners.set(event, handlers);
    }
    handlers.add(handler);
  }

  off(event: string, handler: (...args: unknown[]) => void): void {
    const handlers = this.#listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  emit(event: string, ...args: unknown[]): void {
    const handlers = this.#listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        handler(...args);
      }
    }
    if (event !== '*') {
      const wildcardHandlers = this.#listeners.get('*');
      if (wildcardHandlers) {
        for (const handler of wildcardHandlers) {
          handler(event, ...args);
        }
      }
    }
  }

  getListenerCount(event: string): number {
    return this.#listeners.get(event)?.size ?? 0;
  }

  send = sinon.stub();
}

class MockPuppeteerConnection {
  #sessions = new Map<string, MockPuppeteerSession>();

  addSession(session: MockPuppeteerSession): void {
    this.#sessions.set(session.id(), session);
  }

  session(sessionId: string): MockPuppeteerSession|undefined {
    return this.#sessions.get(sessionId);
  }
}

function createMockObserver(): ProtocolClient.CDPConnection.CDPConnectionObserver&{
  onEvent: sinon.SinonStub, onDisconnect: sinon.SinonStub,
}
{
  return {
    onEvent: sinon.stub(),
    onDisconnect: sinon.stub(),
  };
}

describe('PuppeteerDevToolsConnection', () => {
  let connection: MockPuppeteerConnection;
  let rootSession: MockPuppeteerSession;
  let cdpConnection: PuppeteerDevToolsConnection;

  beforeEach(() => {
    connection = new MockPuppeteerConnection();
    rootSession = new MockPuppeteerSession('root', connection);
    cdpConnection = new PuppeteerDevToolsConnection(rootSession as unknown as Puppeteer.CDPSession);
  });

  it('forwards CDP events from child sessions to observers', () => {
    const observer = createMockObserver();
    cdpConnection.observe(observer);

    const child = new MockPuppeteerSession('child-1', connection);
    connection.addSession(child);
    rootSession.emit('sessionattached', child);

    assert.strictEqual(child.getListenerCount('*'), 1);

    child.emit('Page.loadEventFired', {timestamp: 123});

    sinon.assert.calledOnceWithExactly(observer.onEvent, {
      method: 'Page.loadEventFired',
      sessionId: 'child-1',
      params: {timestamp: 123},
    });
  });

  it('forwards CDP events from root session to observers', () => {
    const observer = createMockObserver();
    cdpConnection.observe(observer);

    rootSession.emit('Page.loadEventFired', {timestamp: 456});

    sinon.assert.calledOnceWithExactly(observer.onEvent, {
      method: 'Page.loadEventFired',
      sessionId: 'root',
      params: {timestamp: 456},
    });
  });

  it('does not forward sessionattached or sessiondetached as CDP events to observers', () => {
    const observer = createMockObserver();
    cdpConnection.observe(observer);

    const child = new MockPuppeteerSession('child-1', connection);
    connection.addSession(child);
    rootSession.emit('sessionattached', child);
    rootSession.emit('sessiondetached', child);

    sinon.assert.notCalled(observer.onEvent);
  });

  it('stops forwarding events when child session detaches', () => {
    const child = new MockPuppeteerSession('child-1', connection);
    connection.addSession(child);
    rootSession.emit('sessionattached', child);

    assert.strictEqual(child.getListenerCount('*'), 1);

    rootSession.emit('sessiondetached', child);

    assert.strictEqual(child.getListenerCount('*'), 0);
  });

  it('sends command to a known child session', async () => {
    const child = new MockPuppeteerSession('child-1', connection);
    connection.addSession(child);
    rootSession.emit('sessionattached', child);

    const mockVersionResult = {
      protocolVersion: '1.3',
      product: 'chrome',
      revision: '123',
      userAgent: 'test',
      jsVersion: '10',
    };
    child.send.resolves(mockVersionResult);

    const response = await cdpConnection.send(
        'Browser.getVersion',
        undefined,
        'child-1',
    );

    sinon.assert.calledOnceWithExactly(child.send, 'Browser.getVersion', undefined);
    assert.deepEqual(response, {result: mockVersionResult});
  });

  it('returns error response when command rejects', async () => {
    const child = new MockPuppeteerSession('child-1', connection);
    connection.addSession(child);
    rootSession.emit('sessionattached', child);

    child.send.rejects(new Error('Something went wrong'));

    const response = await cdpConnection.send(
        'Browser.getVersion',
        undefined,
        'child-1',
    );

    assert.isTrue('error' in response);
    if ('error' in response) {
      assert.strictEqual(response.error.code, ProtocolClient.CDPConnection.CDPErrorStatus.SERVER_ERROR);
      assert.strictEqual(response.error.message, 'Something went wrong');
    }
  });

  it('returns SESSION_NOT_FOUND error when sending to unknown session ID', async () => {
    const response = await cdpConnection.send(
        'Browser.getVersion',
        undefined,
        'unknown-session',
    );

    assert.isTrue('error' in response);
    if ('error' in response) {
      assert.strictEqual(response.error.code, ProtocolClient.CDPConnection.CDPErrorStatus.SESSION_NOT_FOUND);
      assert.strictEqual(response.error.message, 'Unknown session unknown-session');
    }
  });

  it('throws synchronously when attempting to send on root session', () => {
    assert.throws(() => {
      void cdpConnection.send(
          'Browser.getVersion',
          undefined,
          undefined,
      );
    }, 'Attempting to send on the root session. This must not happen');
  });

  it('removes event listeners and notifies observers on dispose', () => {
    const observer = createMockObserver();
    cdpConnection.observe(observer);

    const child1 = new MockPuppeteerSession('child-1', connection);
    const child2 = new MockPuppeteerSession('child-2', connection);
    connection.addSession(child1);
    connection.addSession(child2);
    rootSession.emit('sessionattached', child1);
    rootSession.emit('sessionattached', child2);

    assert.strictEqual(rootSession.getListenerCount('sessionattached'), 1);
    assert.strictEqual(rootSession.getListenerCount('sessiondetached'), 1);
    assert.strictEqual(rootSession.getListenerCount('*'), 1);
    assert.strictEqual(child1.getListenerCount('*'), 1);
    assert.strictEqual(child2.getListenerCount('*'), 1);

    cdpConnection.dispose('Test teardown');

    assert.strictEqual(rootSession.getListenerCount('sessionattached'), 0);
    assert.strictEqual(rootSession.getListenerCount('sessiondetached'), 0);
    assert.strictEqual(rootSession.getListenerCount('*'), 0);
    assert.strictEqual(child1.getListenerCount('*'), 0);
    assert.strictEqual(child2.getListenerCount('*'), 0);
    sinon.assert.calledOnceWithExactly(observer.onDisconnect, 'Test teardown');
  });
});
