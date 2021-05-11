// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ProtocolClient from '../../../../front_end/core/protocol_client/protocol_client.js';
import type {ProtocolMapping} from '../../../../front_end/generated/protocol-mapping.js'; // eslint-disable-line rulesdir/es_modules_import

import {deinitializeGlobalVars, initializeGlobalVars} from './EnvironmentHelpers.js';

import type * as SDK from '../../../../front_end/core/sdk/sdk.js';

type ProtocolCommand = keyof ProtocolMapping.Commands;
type ProtocolCommandParams<C extends ProtocolCommand> = ProtocolMapping.Commands[C]['paramsType'];
type ProtocolResponse<C extends ProtocolCommand> = ProtocolMapping.Commands[C]['returnType'];
type ProtocolCommandHandler<C extends ProtocolCommand> = (...params: ProtocolCommandParams<C>) =>
    Omit<ProtocolResponse<C>, 'getError'>;
type MessageCallback = (result: string|Object) => void;

// Note that we can't set the Function to the correct handler on the basis
// that we don't know which ProtocolCommand will be stored.
const responseMap = new Map<ProtocolCommand, Function>();
export function setMockConnectionResponseHandler<C extends ProtocolCommand>(
    command: C, handler: ProtocolCommandHandler<C>) {
  if (responseMap.get(command)) {
    throw new Error(`Response handler already set for ${command}`);
  }

  responseMap.set(command, handler);
}

export function getMockConnectionResponseHandler(method: ProtocolCommand) {
  return responseMap.get(method);
}

export function clearMockConnectionResponseHandler(method: ProtocolCommand) {
  responseMap.delete(method);
}

export function clearAllMockConnectionResponseHandlers() {
  responseMap.clear();
}

export function dispatchEvent<E extends keyof ProtocolMapping.Events>(
    target: SDK.SDKModel.Target, event: E, ...payload: ProtocolMapping.Events[E]) {
  const [domain, method] = event.split('.');
  if (!target._dispatchers[domain]) {
    throw new Error(`No dispatcher for domain "${domain}" on provided target`);
  }

  // Register the event if it doesn't exist already.
  if (!(method in target._dispatchers[domain]._eventArgs)) {
    target._dispatchers[domain].registerEvent(method, {});
  }

  target._dispatchers[domain].dispatch(method, {method, params: payload[0]});
}

function enable({reset = true} = {}) {
  if (reset) {
    responseMap.clear();
  }

  // The DevTools frontend code expects certain things to be in place
  // before it can run. This function will ensure those things are
  // minimally there.
  initializeGlobalVars({reset});

  let messageCallback: MessageCallback;
  ProtocolClient.InspectorBackend.Connection.setFactory(() => {
    return {
      setOnMessage(callback: MessageCallback) {
        messageCallback = callback;
      },

      sendRawMessage(message: string) {
        const outgoingMessage = JSON.parse(message) as {id: number, method: ProtocolCommand, params: unknown};
        const handler = responseMap.get(outgoingMessage.method);
        if (!handler) {
          return;
        }

        const result = handler.call(undefined, outgoingMessage.params);

        // Since we allow the test author to omit the getError call, we
        // need to add it in here on their behalf so that the calling code
        // will succeed.
        if (!('getError' in result)) {
          result.getError = () => undefined;
        }
        messageCallback.call(undefined, {id: outgoingMessage.id, method: outgoingMessage.method, result});
      },

      async disconnect() {
        // Included only to meet interface requirements.
      },

      _onMessage() {
        // Included only to meet interface requirements.
      },

      setOnDisconnect() {
        // Included only to meet interface requirements.
      },
    };
  });
}

function disable() {
  deinitializeGlobalVars();
  // @ts-ignore Setting back to undefined as a hard reset.
  ProtocolClient.InspectorBackend.Connection.setFactory(undefined);
}

export function describeWithMockConnection(title: string, fn: (this: Mocha.Suite) => void, opts: {reset: boolean} = {
  reset: true,
}) {
  return describe(`mock-${title}`, () => {
    beforeEach(() => enable(opts));
    afterEach(disable);
    describe(title, fn);
  });
}
