// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import * as ProtocolClient from '../../core/protocol_client/protocol_client.js';
import type * as Protocol from '../../generated/protocol.js';

import * as PuppeteerService from './puppeteer.js';

type MockResponse = {
  result: unknown,
}|{error: ProtocolClient.CDPConnection.CDPError};

interface SentCommand {
  method: string;
  params: unknown;
  sessionId: string|undefined;
}

class MockConnection implements ProtocolClient.CDPConnection.CDPConnection {
  sent: SentCommand[] = [];
  nextResponse: MockResponse;

  constructor(nextResponse: MockResponse = {result: {}}) {
    this.nextResponse = nextResponse;
  }

  send<T extends ProtocolClient.CDPConnection.Command>(
      method: T,
      params: ProtocolClient.CDPConnection.CommandParams<T>,
      sessionId: string|undefined,
      ):
      Promise<{result: ProtocolClient.CDPConnection.CommandResult<T>}|{error: ProtocolClient.CDPConnection.CDPError}> {
    this.sent.push({method, params, sessionId});
    return Promise.resolve(this.nextResponse as {result: ProtocolClient.CDPConnection.CommandResult<T>} |
                           {error: ProtocolClient.CDPConnection.CDPError});
  }

  observe(): void {
  }

  unobserve(): void {
  }
}

const TAB_SESSION_ID = 'test-session-id' as Protocol.Target.SessionID;
const CHILD_SESSION_ID = 'child-session-id' as Protocol.Target.SessionID;
const GRANDCHILD_SESSION_ID = 'grandchild-session-id' as Protocol.Target.SessionID;
const OTHER_SESSION_ID = 'other-session-id' as Protocol.Target.SessionID;
const OTHER_CHILD_SESSION_ID = 'other-child-session-id' as Protocol.Target.SessionID;

function createAdapter(nextResponse: MockResponse = {
  result: {},
}): {
  adapter: PuppeteerService.PuppeteerConnection.PuppeteerConnectionAdapter,
  connection: MockConnection,
} {
  const connection = new MockConnection(nextResponse);
  const adapter = new PuppeteerService.PuppeteerConnection.PuppeteerConnectionAdapter(
      connection,
      TAB_SESSION_ID,
  );
  return {adapter, connection};
}

function sendCommand(
    adapter: PuppeteerService.PuppeteerConnection.PuppeteerConnectionAdapter,
    method: string,
    sessionId?: string,
    ): Promise<unknown> {
  return adapter._rawSend('some-callbacks', method, {}, sessionId);
}

function attachedToTargetEvent(options: {
  parentSessionId: string|undefined,
  childSessionId: unknown,
  type?: string,
  targetId?: string,
  targetInfo?: unknown,
}): ProtocolClient.CDPConnection.CDPEvent<'Target.attachedToTarget'> {
  const {parentSessionId, childSessionId, type = 'page', targetId, targetInfo} = options;
  const resolvedTargetInfo = targetInfo !== undefined ? targetInfo : {
    targetId: (targetId ?? `target-${String(childSessionId)}`) as Protocol.Target.TargetID,
    type,
    title: '',
    url: 'https://example.com/',
    attached: true,
    canAccessOpener: false,
  };
  return {
    method: 'Target.attachedToTarget',
    sessionId: parentSessionId,
    params: {
      sessionId: childSessionId as Protocol.Target.SessionID,
      targetInfo: resolvedTargetInfo as Protocol.Target.TargetInfo,
      waitingForDebugger: true,
    },
  };
}

async function assertSessionNotFound(promise: Promise<unknown>): Promise<void> {
  let caught: unknown;
  try {
    await promise;
  } catch (err) {
    caught = err;
  }
  assert.exists(caught, 'Expected _rawSend to reject with SESSION_NOT_FOUND');
  const error = caught as Error & {code?: number};
  assert.strictEqual(error.name, 'ProtocolError');
  assert.strictEqual(error.code, ProtocolClient.CDPConnection.CDPErrorStatus.SESSION_NOT_FOUND);
  assert.include(error.message, 'Session with given id not found');
}

describe('PuppeteerConnectionAdapter', () => {
  it('throws when constructed with an empty session id', () => {
    const connection = new MockConnection();
    assert.throws(
        () => new PuppeteerService.PuppeteerConnection.PuppeteerConnectionAdapter(
            connection,
            '' as Protocol.Target.SessionID,
            ),
        /non-empty sessionId/,
    );
  });

  it('throws ProtocolError on CDP error', async () => {
    const {adapter} = createAdapter({
      error: {
        message: 'Something went wrong',
        code: -32000,
        data: 'Some data',
      },
    });

    try {
      await sendCommand(adapter, 'Some.method');
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
    const {adapter, connection} = createAdapter();

    await sendCommand(adapter, 'Input.dispatchMouseEvent');
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
      const result = await sendCommand(adapter, method).then(() => null, (err: Error) => err);
      assert.strictEqual(result, error, `${method} must be rejected`);
    }
    await sendCommand(adapter, 'Fetch.disable');
    await sendCommand(adapter, 'Runtime.disable');

    assert.deepEqual(
        connection.sent.map(command => command.method),
        ['Input.dispatchMouseEvent', 'Fetch.disable', 'Runtime.disable'],
    );
  });

  describe('session routing', () => {
    it('maps undefined sessionId to the adapter session', async () => {
      const {adapter, connection} = createAdapter();

      await sendCommand(adapter, 'Target.setAutoAttach');

      assert.deepEqual(connection.sent, [{method: 'Target.setAutoAttach', params: {}, sessionId: TAB_SESSION_ID}]);
    });

    it('rejects empty or unknown session ids', async () => {
      const {adapter, connection} = createAdapter();
      const invalidIds = ['', OTHER_SESSION_ID, TAB_SESSION_ID, null as unknown as string];

      for (const sessionId of invalidIds) {
        await assertSessionNotFound(sendCommand(adapter, 'Target.setAutoAttach', sessionId));
      }
      assert.isEmpty(connection.sent);
    });

    it('ignores events from unknown or root sessions', () => {
      const {adapter} = createAdapter();

      adapter.onEvent(attachedToTargetEvent({
        parentSessionId: OTHER_SESSION_ID,
        childSessionId: OTHER_CHILD_SESSION_ID,
      }));
      adapter.onEvent(attachedToTargetEvent({
        parentSessionId: undefined,
        childSessionId: GRANDCHILD_SESSION_ID,
      }));

      assert.isNull(adapter.session(OTHER_CHILD_SESSION_ID));
      assert.isNull(adapter.session(GRANDCHILD_SESSION_ID));
    });

    it('does not mutate shared event objects when forwarding to the default session', () => {
      const {adapter} = createAdapter();
      const attachEvent = attachedToTargetEvent({
        parentSessionId: TAB_SESSION_ID,
        childSessionId: CHILD_SESSION_ID,
      });

      adapter.onEvent(attachEvent);

      assert.strictEqual(attachEvent.sessionId, TAB_SESSION_ID);
      assert.isOk(adapter.session(CHILD_SESSION_ID));
    });

    it('forwards commands for attached child and grandchild sessions', async () => {
      const {adapter, connection} = createAdapter();

      adapter.onEvent(attachedToTargetEvent({
        parentSessionId: TAB_SESSION_ID,
        childSessionId: CHILD_SESSION_ID,
      }));
      adapter.onEvent(attachedToTargetEvent({
        parentSessionId: CHILD_SESSION_ID,
        childSessionId: GRANDCHILD_SESSION_ID,
        type: 'iframe',
      }));

      assert.isOk(adapter.session(CHILD_SESSION_ID));
      assert.isOk(adapter.session(GRANDCHILD_SESSION_ID));

      await sendCommand(adapter, 'Runtime.enable', CHILD_SESSION_ID);
      await sendCommand(adapter, 'Runtime.enable', GRANDCHILD_SESSION_ID);

      assert.deepEqual(connection.sent, [
        {method: 'Runtime.enable', params: {}, sessionId: CHILD_SESSION_ID},
        {method: 'Runtime.enable', params: {}, sessionId: GRANDCHILD_SESSION_ID},
      ]);
    });

    it('rejects commands after a child session detaches', async () => {
      const {adapter, connection} = createAdapter();

      adapter.onEvent(attachedToTargetEvent({
        parentSessionId: TAB_SESSION_ID,
        childSessionId: CHILD_SESSION_ID,
      }));
      adapter.onEvent({
        method: 'Target.detachedFromTarget',
        sessionId: TAB_SESSION_ID,
        params: {sessionId: CHILD_SESSION_ID},
      });

      assert.isNull(adapter.session(CHILD_SESSION_ID));
      await assertSessionNotFound(sendCommand(adapter, 'Runtime.enable', CHILD_SESSION_ID));
      assert.isEmpty(connection.sent);
    });
  });

  describe('Target.attachedToTarget validation', () => {
    it('drops events with invalid or colliding child session ids', async () => {
      const {adapter, connection} = createAdapter();
      adapter.onEvent(attachedToTargetEvent({
        parentSessionId: TAB_SESSION_ID,
        childSessionId: CHILD_SESSION_ID,
        targetId: 'target-main',
      }));
      const originalChildSession = adapter.session(CHILD_SESSION_ID);
      assert.isOk(originalChildSession);

      const invalidChildIds = ['', undefined, null, TAB_SESSION_ID, CHILD_SESSION_ID];
      for (const childSessionId of invalidChildIds) {
        adapter.onEvent(attachedToTargetEvent({
          parentSessionId: CHILD_SESSION_ID,
          childSessionId,
          type: 'iframe',
        }));
      }

      assert.isNull(adapter.session(''));
      assert.isNull(adapter.session(undefined as unknown as string));
      assert.isNull(adapter.session(null as unknown as string));
      assert.isNull(adapter.session(TAB_SESSION_ID));
      assert.strictEqual(adapter.session(CHILD_SESSION_ID), originalChildSession);

      await assertSessionNotFound(sendCommand(adapter, 'Target.setAutoAttach', ''));
      await assertSessionNotFound(sendCommand(adapter, 'Target.setAutoAttach', TAB_SESSION_ID));
      assert.isEmpty(connection.sent);
    });

    it('drops events with malformed targetInfo', async () => {
      const {adapter, connection} = createAdapter();
      adapter.onEvent(attachedToTargetEvent({
        parentSessionId: TAB_SESSION_ID,
        childSessionId: CHILD_SESSION_ID,
      }));

      const malformedCases = [
        {childSessionId: 'bad-array', targetInfo: []},
        {childSessionId: 'bad-empty', targetInfo: {}},
        {childSessionId: 'bad-target-id', targetInfo: {targetId: '', type: 'iframe', url: 'https://a.test/'}},
        {childSessionId: 'bad-type', targetInfo: {targetId: 't', type: '', url: 'https://a.test/'}},
        {childSessionId: 'bad-url', targetInfo: {targetId: 't', type: 'iframe', url: 123}},
      ];
      for (const {childSessionId, targetInfo} of malformedCases) {
        adapter.onEvent(attachedToTargetEvent({
          parentSessionId: CHILD_SESSION_ID,
          childSessionId,
          targetInfo,
        }));

        assert.isNull(adapter.session(childSessionId), `Expected forged session ${childSessionId} to be rejected`);
        await assertSessionNotFound(sendCommand(adapter, 'Runtime.enable', childSessionId));
      }
      assert.isEmpty(connection.sent);
    });
  });

  describe('dispose()', () => {
    it('rejects commands after dispose()', async () => {
      const {adapter, connection} = createAdapter();
      adapter.onEvent(attachedToTargetEvent({
        parentSessionId: TAB_SESSION_ID,
        childSessionId: CHILD_SESSION_ID,
      }));
      await sendCommand(adapter, 'Target.setAutoAttach');
      await sendCommand(adapter, 'Runtime.enable', CHILD_SESSION_ID);
      assert.lengthOf(connection.sent, 2);

      adapter.dispose();
      connection.sent = [];

      await assertSessionNotFound(sendCommand(adapter, 'Target.setAutoAttach'));
      await assertSessionNotFound(sendCommand(adapter, 'Runtime.enable', CHILD_SESSION_ID));
      assert.isEmpty(connection.sent);
    });

    it('ignores events after dispose()', () => {
      const {adapter} = createAdapter();

      adapter.dispose();
      adapter.onEvent(attachedToTargetEvent({
        parentSessionId: TAB_SESSION_ID,
        childSessionId: CHILD_SESSION_ID,
      }));

      assert.isNull(adapter.session(CHILD_SESSION_ID));
    });
  });
});
