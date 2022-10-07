// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ProtocolClient from '../../../../front_end/core/protocol_client/protocol_client.js';

// eslint-disable-next-line rulesdir/es_modules_import
import {type ProtocolMapping} from '../../../../front_end/generated/protocol-mapping.js';
import type * as ProtocolProxyApi from '../../../../front_end/generated/protocol-proxy-api.js';

import {deinitializeGlobalVars, initializeGlobalVars} from './EnvironmentHelpers.js';

import type * as SDK from '../../../../front_end/core/sdk/sdk.js';

export type ProtocolCommand = keyof ProtocolMapping.Commands;
export type ProtocolCommandParams<C extends ProtocolCommand> = ProtocolMapping.Commands[C]['paramsType'];
export type ProtocolResponse<C extends ProtocolCommand> = ProtocolMapping.Commands[C]['returnType'];
export type ProtocolCommandHandler<C extends ProtocolCommand> = (...params: ProtocolCommandParams<C>) =>
    Omit<ProtocolResponse<C>, 'getError'>;
export type MessageCallback = (result: string|Object) => void;

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
    target: SDK.Target.Target, eventName: E, ...payload: ProtocolMapping.Events[E]) {
  const event = eventName as ProtocolClient.InspectorBackend.QualifiedName;
  const [domain] = ProtocolClient.InspectorBackend.splitQualifiedName(event);

  const registeredEvents =
      ProtocolClient.InspectorBackend.inspectorBackend.getOrCreateEventParameterNamesForDomainForTesting(
          domain as keyof ProtocolProxyApi.ProtocolDispatchers);
  const eventParameterNames = registeredEvents.get(event);
  if (!eventParameterNames) {
    // The event is not registered, fake-register with empty parameters.
    registeredEvents.set(event, []);
  }

  target.dispatch({method: event, params: payload[0]});
}

async function enable({reset = true} = {}) {
  if (reset) {
    responseMap.clear();
  }

  // The DevTools frontend code expects certain things to be in place
  // before it can run. This function will ensure those things are
  // minimally there.
  await initializeGlobalVars({reset});

  let messageCallback: MessageCallback;
  ProtocolClient.InspectorBackend.Connection.setFactory(() => {
    return {
      setOnMessage(callback: MessageCallback) {
        messageCallback = callback;
      },

      sendRawMessage(message: string) {
        void (async () => {
          const outgoingMessage =
              JSON.parse(message) as {id: number, method: ProtocolCommand, params: unknown, sessionId: string};
          const handler = responseMap.get(outgoingMessage.method);
          if (!handler) {
            return;
          }

          const result = await handler.call(undefined, outgoingMessage.params);

          // Since we allow the test author to omit the getError call, we
          // need to add it in here on their behalf so that the calling code
          // will succeed.
          if (!('getError' in result)) {
            result.getError = () => undefined;
          }
          messageCallback.call(
              undefined,
              {id: outgoingMessage.id, method: outgoingMessage.method, result, sessionId: outgoingMessage.sessionId});
        })();
      },

      async disconnect() {
        // Included only to meet interface requirements.
      },

      onMessage() {
        // Included only to meet interface requirements.
      },

      setOnDisconnect() {
        // Included only to meet interface requirements.
      },
    };
  });
}

async function disable() {
  await deinitializeGlobalVars();
  // @ts-ignore Setting back to undefined as a hard reset.
  ProtocolClient.InspectorBackend.Connection.setFactory(undefined);
}

export function describeWithMockConnection(title: string, fn: (this: Mocha.Suite) => void, opts: {reset: boolean} = {
  reset: true,
}) {
  return describe(`mock-${title}`, () => {
    beforeEach(async () => await enable(opts));
    afterEach(disable);
    describe(title, fn);
  });
}

describeWithMockConnection.only = function(title: string, fn: (this: Mocha.Suite) => void, opts: {reset: boolean} = {
  reset: true,
}) {
  // eslint-disable-next-line mocha/no-exclusive-tests
  return describe.only(`mock-${title}`, () => {
    beforeEach(async () => await enable(opts));
    afterEach(disable);
    describe(title, fn);
  });
};
