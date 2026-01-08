// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as Application from './application.js';
import type {ResourcesPanel} from './ResourcesPanel.js';

describeWithMockConnection('DeviceBoundSessionsTreeElement', () => {
  let model: Application.DeviceBoundSessionsModel.DeviceBoundSessionsModel;
  let target: SDK.Target.Target;
  let mockPanel: ResourcesPanel;

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
    const networkManager = target.model(SDK.NetworkManager.NetworkManager)!;
    model = new Application.DeviceBoundSessionsModel.DeviceBoundSessionsModel();
    model.modelAdded(networkManager);
    mockPanel = {} as unknown as ResourcesPanel;
  });

  it('builds the correct tree hierarchy on INITIALIZE_SESSIONS event', () => {
    const root = new Application.DeviceBoundSessionsTreeElement.RootTreeElement(mockPanel, model);
    root.onbind();

    const sessions = [
      makeSession('example1.com', 'session_1'),
      makeSession('example1.com', 'session_2'),
      makeSession('example2.com', 'session_3'),
    ];

    model.dispatchEventToListeners(
        Application.DeviceBoundSessionsModel.DeviceBoundSessionModelEvents.INITIALIZE_SESSIONS, {sessions});

    // Verify site nodes.
    assert.strictEqual(root.childCount(), 2);
    const site1Node = root.children()[0];
    const site2Node = root.children()[1];
    assert.strictEqual(site1Node.title, 'example1.com');
    assert.strictEqual(site2Node.title, 'example2.com');

    // Verify session nodes under example1.com.
    assert.strictEqual(site1Node.childCount(), 2);
    assert.strictEqual(site1Node.children()[0].title, 'session_1');
    assert.strictEqual(site1Node.children()[1].title, 'session_2');

    // Verify session nodes under example2.com.
    assert.strictEqual(site2Node.childCount(), 1);
    assert.strictEqual(site2Node.children()[0].title, 'session_3');
  });

  it('does not duplicate sites or sessions if data is re-sent', () => {
    const root = new Application.DeviceBoundSessionsTreeElement.RootTreeElement(mockPanel, model);
    root.onbind();

    const session = makeSession('example1.com', 'session_1');

    // First event.
    model.dispatchEventToListeners(
        Application.DeviceBoundSessionsModel.DeviceBoundSessionModelEvents.INITIALIZE_SESSIONS, {sessions: [session]});
    assert.strictEqual(root.childCount(), 1);
    assert.strictEqual(root.children()[0].childCount(), 1);

    // Second event.
    model.dispatchEventToListeners(
        Application.DeviceBoundSessionsModel.DeviceBoundSessionModelEvents.INITIALIZE_SESSIONS, {sessions: [session]});
    assert.strictEqual(root.childCount(), 1);
    assert.strictEqual(root.children()[0].childCount(), 1);
  });

  it('shows the details view when a session tree element is selected', () => {
    const showSessionSpy = sinon.spy();
    mockPanel.showDeviceBoundSession = showSessionSpy;
    const root = new Application.DeviceBoundSessionsTreeElement.RootTreeElement(mockPanel, model);
    root.onbind();

    const session = makeSession('example.com', 'session-123');
    model.dispatchEventToListeners(
        Application.DeviceBoundSessionsModel.DeviceBoundSessionModelEvents.INITIALIZE_SESSIONS, {sessions: [session]});

    assert.strictEqual(root.childCount(), 1);
    const siteNode = root.children()[0];
    assert.strictEqual(siteNode.childCount(), 1);
    const sessionNode = siteNode.children()[0];
    sessionNode.onselect(false);

    sinon.assert.calledOnce(showSessionSpy);
    sinon.assert.calledWith(showSessionSpy, model, 'example.com', 'session-123');
  });
});
