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

  it('builds the correct tree hierarchy on INITIALIZE_SESSIONS event only for visible sites', () => {
    const root = new Application.DeviceBoundSessionsTreeElement.RootTreeElement(mockPanel, model);
    root.onbind();

    model.addVisibleSite('example1.com');
    model.addVisibleSite('example2.com');

    const sessions = [
      makeSession('example1.com', 'session_1'),
      makeSession('example1.com', 'session_2'),
      makeSession('example2.com', 'session_3'),
      makeSession('hidden.com', 'session_4'),
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

  it('adds a tree element when a site becomes visible after data is already loaded', () => {
    const root = new Application.DeviceBoundSessionsTreeElement.RootTreeElement(mockPanel, model);
    root.onbind();

    const sessions = [
      makeSession('example1.com', 'session_1'),
      makeSession('example2.com', 'session_1'),
      makeSession('example2.com', 'session_2'),
      makeSession('hidden.com', 'session_3'),
    ];
    model.dispatchEventToListeners(
        Application.DeviceBoundSessionsModel.DeviceBoundSessionModelEvents.INITIALIZE_SESSIONS, {sessions});
    assert.strictEqual(root.childCount(), 0);

    model.addVisibleSite('example1.com');
    model.addVisibleSite('example2.com');
    assert.strictEqual(root.childCount(), 2);
    const siteNode1 = root.children()[0];
    assert.strictEqual(siteNode1.title, 'example1.com');
    assert.strictEqual(siteNode1.childCount(), 1);
    assert.strictEqual(siteNode1.children()[0].title, 'session_1');
    const siteNode2 = root.children()[1];
    assert.strictEqual(siteNode2.title, 'example2.com');
    assert.strictEqual(siteNode2.childCount(), 2);
    assert.strictEqual(siteNode2.children()[0].title, 'session_1');
    assert.strictEqual(siteNode2.children()[1].title, 'session_2');
  });

  it('removes empty tree elements on CLEAR_EVENTS', () => {
    const root = new Application.DeviceBoundSessionsTreeElement.RootTreeElement(mockPanel, model);
    root.onbind();
    model.addVisibleSite('example1.com');
    model.addVisibleSite('example2.com');

    model.dispatchEventToListeners(
        Application.DeviceBoundSessionsModel.DeviceBoundSessionModelEvents.EVENT_OCCURRED,
        {site: 'example1.com', sessionId: undefined});
    model.dispatchEventToListeners(
        Application.DeviceBoundSessionsModel.DeviceBoundSessionModelEvents.EVENT_OCCURRED,
        {site: 'example1.com', sessionId: 'session_1'});
    model.dispatchEventToListeners(
        Application.DeviceBoundSessionsModel.DeviceBoundSessionModelEvents.EVENT_OCCURRED,
        {site: 'example1.com', sessionId: 'session_2'});
    model.dispatchEventToListeners(
        Application.DeviceBoundSessionsModel.DeviceBoundSessionModelEvents.EVENT_OCCURRED,
        {site: 'example2.com', sessionId: 'session_1'});
    model.dispatchEventToListeners(
        Application.DeviceBoundSessionsModel.DeviceBoundSessionModelEvents.EVENT_OCCURRED,
        {site: 'hidden.com', sessionId: 'session_1'});

    assert.strictEqual(root.childCount(), 2);
    const siteNode1 = root.children()[0];
    const siteNode2 = root.children()[1];
    assert.strictEqual(siteNode1.title, 'example1.com');
    assert.strictEqual(siteNode2.title, 'example2.com');
    assert.strictEqual(siteNode1.childCount(), 3);
    assert.strictEqual(siteNode2.childCount(), 1);
    assert.strictEqual(siteNode1.children()[0].title, 'No session');
    assert.strictEqual(siteNode1.children()[1].title, 'session_1');
    assert.strictEqual(siteNode1.children()[2].title, 'session_2');
    assert.strictEqual(siteNode2.children()[0].title, 'session_1');

    model.dispatchEventToListeners(Application.DeviceBoundSessionsModel.DeviceBoundSessionModelEvents.CLEAR_EVENTS, {
      emptySessions: new Map([
        ['example1.com', [undefined, 'session_1']],
        ['example2.com', ['session_1']],
        ['hidden.com', ['session_1']],
      ]),
      emptySites: new Set(['example2.com', 'hidden.com'])
    });

    model.addVisibleSite('hidden.com');

    assert.strictEqual(root.childCount(), 1);
    const siteNode = root.children()[0];
    assert.strictEqual(siteNode.title, 'example1.com');
    assert.strictEqual(siteNode.children()[0].title, 'session_2');
  });

  it('removes a tree element if visible sites are cleared', () => {
    const root = new Application.DeviceBoundSessionsTreeElement.RootTreeElement(mockPanel, model);
    root.onbind();

    model.addVisibleSite('example.com');
    const session = makeSession('example.com', 'session_1');
    model.dispatchEventToListeners(
        Application.DeviceBoundSessionsModel.DeviceBoundSessionModelEvents.INITIALIZE_SESSIONS, {sessions: [session]});
    assert.strictEqual(root.childCount(), 1);
    model.clearVisibleSites();
    assert.strictEqual(root.childCount(), 0);
  });

  it('does not duplicate sites or sessions if data is re-sent', () => {
    const root = new Application.DeviceBoundSessionsTreeElement.RootTreeElement(mockPanel, model);
    root.onbind();

    model.addVisibleSite('example1.com');
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

    model.addVisibleSite('example.com');
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

  it('shows the default view when a site tree element is selected', () => {
    const showDefaultSpy = sinon.spy();
    mockPanel.showDeviceBoundSessionDefault = showDefaultSpy;
    const root = new Application.DeviceBoundSessionsTreeElement.RootTreeElement(mockPanel, model);
    root.onbind();

    model.addVisibleSite('example.com');
    const session = makeSession('example.com', 'session-123');
    model.dispatchEventToListeners(
        Application.DeviceBoundSessionsModel.DeviceBoundSessionModelEvents.INITIALIZE_SESSIONS, {sessions: [session]});

    assert.strictEqual(root.childCount(), 1);
    const siteNode = root.children()[0];
    siteNode.onselect(false);

    sinon.assert.calledOnce(showDefaultSpy);
    sinon.assert.calledWith(
        showDefaultSpy, model, 'Device bound sessions',
        'On this page you can view device bound sessions and associated events');
  });

  it('shows the default view when the root tree element is selected', () => {
    const showDefaultSpy = sinon.spy();
    mockPanel.showDeviceBoundSessionDefault = showDefaultSpy;
    const root = new Application.DeviceBoundSessionsTreeElement.RootTreeElement(mockPanel, model);
    root.onbind();

    root.onselect(false);

    sinon.assert.calledOnce(showDefaultSpy);
    sinon.assert.calledWith(
        showDefaultSpy, model, 'Device bound sessions',
        'On this page you can view device bound sessions and associated events');
  });

  it('adds a tree element when EVENT_OCCURRED fires for a new session', () => {
    const root = new Application.DeviceBoundSessionsTreeElement.RootTreeElement(mockPanel, model);
    root.onbind();

    model.addVisibleSite('example1.com');
    model.addVisibleSite('example2.com');
    assert.strictEqual(root.childCount(), 0);

    // An event occurs that adds a new site + session.
    model.dispatchEventToListeners(
        Application.DeviceBoundSessionsModel.DeviceBoundSessionModelEvents.EVENT_OCCURRED,
        {site: 'example1.com', sessionId: 'session_1'});
    assert.strictEqual(root.childCount(), 1);
    const siteNode1 = root.children()[0];
    assert.strictEqual(siteNode1.title, 'example1.com');
    assert.strictEqual(siteNode1.childCount(), 1);
    assert.strictEqual(siteNode1.children()[0].title, 'session_1');

    // An event occurs that adds a new session to the existing site.
    model.dispatchEventToListeners(
        Application.DeviceBoundSessionsModel.DeviceBoundSessionModelEvents.EVENT_OCCURRED,
        {site: 'example1.com', sessionId: 'session_2'});
    assert.strictEqual(root.childCount(), 1);
    const siteNode2 = root.children()[0];
    assert.strictEqual(siteNode2.title, 'example1.com');
    assert.strictEqual(siteNode2.childCount(), 2);
    assert.strictEqual(siteNode2.children()[0].title, 'session_1');
    assert.strictEqual(siteNode2.children()[1].title, 'session_2');

    // An event occurs that adds a "no session" to the existing site.
    model.dispatchEventToListeners(
        Application.DeviceBoundSessionsModel.DeviceBoundSessionModelEvents.EVENT_OCCURRED, {site: 'example1.com'});
    assert.strictEqual(root.childCount(), 1);
    const siteNode3 = root.children()[0];
    assert.strictEqual(siteNode3.title, 'example1.com');
    assert.strictEqual(siteNode3.childCount(), 3);
    assert.strictEqual(siteNode3.children()[0].title, 'No session');
    assert.strictEqual(siteNode3.children()[1].title, 'session_1');
    assert.strictEqual(siteNode3.children()[2].title, 'session_2');

    // An event occurs that adds a "no session" to a new site.
    model.dispatchEventToListeners(
        Application.DeviceBoundSessionsModel.DeviceBoundSessionModelEvents.EVENT_OCCURRED, {site: 'example2.com'});
    assert.strictEqual(root.childCount(), 2);
    assert.strictEqual(root.children()[0].title, 'example1.com');
    const siteNode4 = root.children()[1];
    assert.strictEqual(siteNode4.title, 'example2.com');
    assert.strictEqual(siteNode4.childCount(), 1);
    assert.strictEqual(siteNode4.children()[0].title, 'No session');

    // An event occurs that adds a new session + site but it is not visible.
    model.dispatchEventToListeners(
        Application.DeviceBoundSessionsModel.DeviceBoundSessionModelEvents.EVENT_OCCURRED,
        {site: 'hidden.com', sessionId: 'hidden_session'});
    assert.strictEqual(root.childCount(), 2);
    assert.strictEqual(root.children()[0].title, 'example1.com');
    assert.strictEqual(root.children()[1].title, 'example2.com');
  });
});
