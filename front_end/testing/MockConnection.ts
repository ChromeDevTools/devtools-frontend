// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ProtocolClient from '../core/protocol_client/protocol_client.js';
import type * as SDK from '../core/sdk/sdk.js';
import type {ProtocolMapping} from '../generated/protocol-mapping.js';
import type * as ProtocolProxyApi from '../generated/protocol-proxy-api.js';

import {deinitializeGlobalVars, initializeGlobalVars} from './EnvironmentHelpers.js';

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
  // The DevTools frontend code expects certain things to be in place
  // before it can run. This function will ensure those things are
  // minimally there.
  await initializeGlobalVars({reset});
}

async function disable() {
  // Some Widgets rely on Global vars to be there so they
  // can properly remove state once they detach.
  await deinitializeGlobalVars();
}

/**
 * @deprecated use `describeWithEnvironment` instead. They are near equivalent.
 * `describeWithMockConnection` cleans up DOM and waits one more animation frame
 */
export function describeWithMockConnection(title: string, fn: (this: Mocha.Suite) => void) {
  return describe(title, function() {
    beforeEach(async () => await enable());
    fn.call(this);
    afterEach(disable);
  });
}

describeWithMockConnection.only = function(title: string, fn: (this: Mocha.Suite) => void, opts: {reset: boolean} = {
  reset: true,
}) {
  // eslint-disable-next-line mocha/no-exclusive-tests
  return describe.only(title, function() {
    beforeEach(async () => await enable(opts));
    fn.call(this);
    afterEach(disable);
  });
};
