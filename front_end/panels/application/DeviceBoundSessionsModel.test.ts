// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as Application from './application.js';

describeWithMockConnection('DeviceBoundSessionsModel', () => {
  let model: Application.DeviceBoundSessionsModel.DeviceBoundSessionsModel;
  let target: SDK.Target.Target;
  let networkManager: SDK.NetworkManager.NetworkManager;

  function makeSession(site: string, sessionId: string): Protocol.Network.DeviceBoundSession {
    return {
      key: {site, id: sessionId},
      refreshUrl: 'https://example1.com/refresh',
      inclusionRules: {origin: 'https://example1.com', includeSite: true, urlRules: []},
      cookieCravings: [],
      expiryDate: 1767225600,
      allowedRefreshInitiators: [],
    };
  }

  beforeEach(() => {
    target = createTarget();
    networkManager = target.model(SDK.NetworkManager.NetworkManager)!;
    model = new Application.DeviceBoundSessionsModel.DeviceBoundSessionsModel();
  });

  it('enables device bound sessions agent on model added', () => {
    const enableSpy = sinon.spy(networkManager, 'enableDeviceBoundSessions');
    new Application.DeviceBoundSessionsModel.DeviceBoundSessionsModel();

    sinon.assert.calledOnce(enableSpy);
  });

  it('stores sessions and dispatches INITIALIZE_SESSIONS event when onSessionsSet is called', () => {
    const expectedSessionAndEvents1 = makeSession('example1.com', 'session_1');
    const expectedSessionAndEvents2 = makeSession('example2.com', 'session_2');
    const sessions = [expectedSessionAndEvents1, expectedSessionAndEvents2];

    const listener = sinon.spy();
    model.addEventListener(
        Application.DeviceBoundSessionsModel.DeviceBoundSessionModelEvents.INITIALIZE_SESSIONS, listener);

    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.DeviceBoundSessionsAdded, sessions);

    sinon.assert.calledOnce(listener);
    const eventData = listener.firstCall.args[0].data;
    assert.deepEqual(eventData.sessions, sessions);

    // Verify known sessions.
    const sessionAndEvents1 = model.getSession('example1.com', 'session_1');
    assert.exists(sessionAndEvents1);
    assert.deepEqual(sessionAndEvents1?.session, expectedSessionAndEvents1);

    const sessionAndEvents2 = model.getSession('example2.com', 'session_2');
    assert.exists(sessionAndEvents2);
    assert.deepEqual(sessionAndEvents2?.session, expectedSessionAndEvents2);

    // Confirm returning undefined for unknown sessions.
    assert.isUndefined(model.getSession('unknown.com', 'session_1'));
    assert.isUndefined(model.getSession('example1.com', 'unknown_session'));
  });

  it('adds visible sites and dispatches ADD_VISIBLE_SITE event', () => {
    const listener = sinon.spy();
    model.addEventListener(
        Application.DeviceBoundSessionsModel.DeviceBoundSessionModelEvents.ADD_VISIBLE_SITE, listener);
    model.addVisibleSite('example.com');
    assert.isTrue(model.isSiteVisible('example.com'));
    assert.isFalse(model.isSiteVisible('other.com'));
    sinon.assert.calledOnce(listener);
    assert.deepEqual(listener.firstCall.args[0].data, {site: 'example.com'});
  });

  it('does not dispatch ADD_VISIBLE_SITE event if site is already visible', () => {
    model.addVisibleSite('example.com');
    const listener = sinon.spy();
    model.addEventListener(
        Application.DeviceBoundSessionsModel.DeviceBoundSessionModelEvents.ADD_VISIBLE_SITE, listener);
    model.addVisibleSite('example.com');
    sinon.assert.notCalled(listener);
  });

  it('clears visible sites and dispatches CLEAR_VISIBLE_SITES event', () => {
    model.addVisibleSite('example.com');
    assert.isTrue(model.isSiteVisible('example.com'));
    const listener = sinon.spy();
    model.addEventListener(
        Application.DeviceBoundSessionsModel.DeviceBoundSessionModelEvents.CLEAR_VISIBLE_SITES, listener);
    model.clearVisibleSites();
    assert.isFalse(model.isSiteVisible('example.com'));
    sinon.assert.calledOnce(listener);
  });
});
