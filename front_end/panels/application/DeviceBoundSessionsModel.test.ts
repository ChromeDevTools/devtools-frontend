// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
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

  it('clears visible sites and dispatches CLEAR_VISIBLE_SITES event if preserving log', () => {
    // Not cleared when preserving the log.
    Common.Settings.moduleSetting('device-bound-sessions-preserve-log').set(true);
    model.addVisibleSite('example.com');
    assert.isTrue(model.isSiteVisible('example.com'));
    const listener = sinon.spy();
    model.addEventListener(
        Application.DeviceBoundSessionsModel.DeviceBoundSessionModelEvents.CLEAR_VISIBLE_SITES, listener);
    model.clearVisibleSites();
    assert.isTrue(model.isSiteVisible('example.com'));
    sinon.assert.notCalled(listener);

    // Cleared when not preserving the log.
    Common.Settings.moduleSetting('device-bound-sessions-preserve-log').set(false);
    assert.isTrue(model.isSiteVisible('example.com'));
    model.clearVisibleSites();
    assert.isFalse(model.isSiteVisible('example.com'));
    sinon.assert.calledOnce(listener);
  });

  it('clears events and dispatches CLEAR_EVENTS event if preserving log', () => {
    const site = 'example.com';
    const event1: Protocol.Network.DeviceBoundSessionEventOccurredEvent = {
      eventId: 'event_1' as Protocol.Network.DeviceBoundSessionEventId,
      site,
      succeeded: false,
      creationEventDetails: {fetchResult: Protocol.Network.DeviceBoundSessionFetchResult.InvalidConfigJson}
    };
    const event2: Protocol.Network.DeviceBoundSessionEventOccurredEvent = {
      eventId: 'event_2' as Protocol.Network.DeviceBoundSessionEventId,
      sessionId: 'sessionId',
      site,
      succeeded: false,
      creationEventDetails: {fetchResult: Protocol.Network.DeviceBoundSessionFetchResult.InvalidConfigJson}
    };
    const event3: Protocol.Network.DeviceBoundSessionEventOccurredEvent = {
      eventId: 'event_3' as Protocol.Network.DeviceBoundSessionEventId,
      sessionId: 'otherSessionId',
      site,
      succeeded: true,
      creationEventDetails: {
        newSession: makeSession(site, 'otherSessionId'),
        fetchResult: Protocol.Network.DeviceBoundSessionFetchResult.Success
      }

    };
    const event4: Protocol.Network.DeviceBoundSessionEventOccurredEvent = {
      eventId: 'event_4' as Protocol.Network.DeviceBoundSessionEventId,
      sessionId: undefined,
      site: 'otherSite.com',
      succeeded: false,
      creationEventDetails: {fetchResult: Protocol.Network.DeviceBoundSessionFetchResult.InvalidConfigJson}
    };
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.DeviceBoundSessionEventOccurred, event1);
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.DeviceBoundSessionEventOccurred, event2);
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.DeviceBoundSessionEventOccurred, event3);
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.DeviceBoundSessionEventOccurred, event4);

    // Ensure sessions exist.
    const session1 = model.getSession(site, undefined);
    assert.exists(session1);
    const session2 = model.getSession(site, 'sessionId');
    assert.exists(session2);
    const session3 = model.getSession(site, 'otherSessionId');
    assert.exists(session3);
    const session4 = model.getSession('otherSite.com', undefined);
    assert.exists(session4);

    const listener = sinon.spy();
    model.addEventListener(Application.DeviceBoundSessionsModel.DeviceBoundSessionModelEvents.CLEAR_EVENTS, listener);

    // Events are not cleared when preserving the log.
    Common.Settings.moduleSetting('device-bound-sessions-preserve-log').set(true);
    model.clearEvents();
    sinon.assert.notCalled(listener);
    assert.exists(model.getSession(site, undefined));
    assert.exists(model.getSession(site, 'sessionId'));
    assert.exists(model.getSession(site, 'otherSessionId'));
    assert.exists(model.getSession('otherSite.com', undefined));
    assert.strictEqual(session1.eventsById.size, 1);
    assert.strictEqual(session2.eventsById.size, 1);
    assert.strictEqual(session3.eventsById.size, 1);
    assert.strictEqual(session4.eventsById.size, 1);

    // Events are cleared when not preserving the log.
    Common.Settings.moduleSetting('device-bound-sessions-preserve-log').set(false);
    model.clearEvents();
    sinon.assert.calledOnce(listener);
    assert.isUndefined(model.getSession(site, undefined));
    assert.isUndefined(model.getSession(site, 'sessionId'));
    const session = model.getSession(site, 'otherSessionId');
    assert.exists(session);
    assert.isEmpty(session.eventsById);
    assert.isUndefined(model.getSession('otherSite.com', undefined));
    const emptySessions = listener.firstCall.args[0].data.emptySessions;
    assert.strictEqual(emptySessions.size, 2);
    assert.deepEqual(emptySessions.get(site), [undefined, 'sessionId']);
    assert.deepEqual(emptySessions.get('otherSite.com'), [undefined]);
    const emptySites = listener.firstCall.args[0].data.emptySites;
    assert.strictEqual(emptySites.size, 1);
    assert.isTrue(emptySites.has('otherSite.com'));
  });

  it('handles storing events and subsequent EVENT_OCCURRED dispatches', () => {
    const site = 'example.com';
    const sessionId1 = 'session_1';
    const sessionId2 = 'session_2';

    const listener = sinon.spy();
    model.addEventListener(Application.DeviceBoundSessionsModel.DeviceBoundSessionModelEvents.EVENT_OCCURRED, listener);

    // Trigger event 1.
    const creationSession = makeSession(site, sessionId1);
    creationSession.refreshUrl = 'https://example.com/original';
    const event1: Protocol.Network.DeviceBoundSessionEventOccurredEvent = {
      eventId: 'event_1' as Protocol.Network.DeviceBoundSessionEventId,
      site,
      sessionId: sessionId1,
      succeeded: true,
      creationEventDetails:
          {newSession: creationSession, fetchResult: Protocol.Network.DeviceBoundSessionFetchResult.Success}
    };
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.DeviceBoundSessionEventOccurred, event1);
    // Verify event 1 has created the session.
    let sessionAndEvents1 = model.getSession(site, sessionId1);
    assert.exists(sessionAndEvents1);
    assert.exists(sessionAndEvents1.session);
    assert.strictEqual(sessionAndEvents1.session.refreshUrl, 'https://example.com/original');
    assert.isTrue(sessionAndEvents1.eventsById.has('event_1'));
    sinon.assert.calledOnce(listener);
    assert.deepEqual(listener.lastCall.args[0].data, {site, sessionId: sessionId1});

    // Trigger event 2 for the same site + session with a new refresh URL.
    const refreshSession = makeSession(site, sessionId1);
    refreshSession.refreshUrl = 'https://example.com/refreshed';
    const event2: Protocol.Network.DeviceBoundSessionEventOccurredEvent = {
      eventId: 'event_2' as Protocol.Network.DeviceBoundSessionEventId,
      site,
      sessionId: sessionId1,
      succeeded: true,
      refreshEventDetails: {
        refreshResult: Protocol.Network.RefreshEventDetailsRefreshResult.Refreshed,
        wasFullyProactiveRefresh: false,
        newSession: refreshSession
      }
    };
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.DeviceBoundSessionEventOccurred, event2);
    // Verify event 2 has updated the session.
    sessionAndEvents1 = model.getSession(site, sessionId1);
    assert.exists(sessionAndEvents1);
    assert.exists(sessionAndEvents1.session);
    assert.strictEqual(sessionAndEvents1.session.refreshUrl, 'https://example.com/refreshed');
    assert.isTrue(sessionAndEvents1.eventsById.has('event_2'));
    sinon.assert.calledTwice(listener);

    // Trigger event 3 for the same site but a new sessionId.
    const session2 = makeSession(site, sessionId2);
    const event3: Protocol.Network.DeviceBoundSessionEventOccurredEvent = {
      eventId: 'event_3' as Protocol.Network.DeviceBoundSessionEventId,
      site,
      sessionId: sessionId2,
      succeeded: true,
      creationEventDetails: {fetchResult: Protocol.Network.DeviceBoundSessionFetchResult.Success, newSession: session2}
    };
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.DeviceBoundSessionEventOccurred, event3);
    // Verify event 3 has created the new session.
    const sessionAndEvents2 = model.getSession(site, sessionId2);
    assert.exists(sessionAndEvents2);
    assert.exists(sessionAndEvents2.session);
    assert.strictEqual(sessionAndEvents2.session.key.id, sessionId2);
    sinon.assert.calledThrice(listener);
    assert.deepEqual(listener.lastCall.args[0].data, {site, sessionId: sessionId2});

    // Trigger event 4 for the same session which sets the cached challenge.
    const challengeString = 'custom-challenge-string';
    const event4: Protocol.Network.DeviceBoundSessionEventOccurredEvent = {
      eventId: 'event_4' as Protocol.Network.DeviceBoundSessionEventId,
      site,
      sessionId: sessionId2,
      succeeded: true,
      challengeEventDetails:
          {challenge: challengeString, challengeResult: Protocol.Network.ChallengeEventDetailsChallengeResult.Success}
    };
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.DeviceBoundSessionEventOccurred, event4);
    // Verify event 4 has set the session's cached challenge.
    assert.strictEqual(sessionAndEvents2.session.cachedChallenge, challengeString);
    assert.isTrue(sessionAndEvents2.eventsById.has('event_4'));
    sinon.assert.callCount(listener, 4);

    // Trigger event 5 for the same site + no session. This has no new session.
    const event5: Protocol.Network.DeviceBoundSessionEventOccurredEvent = {
      eventId: 'event_5' as Protocol.Network.DeviceBoundSessionEventId,
      site,
      succeeded: false,
      challengeEventDetails:
          {challenge: challengeString, challengeResult: Protocol.Network.ChallengeEventDetailsChallengeResult.Success}
    };
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.DeviceBoundSessionEventOccurred, event5);
    // Verify event 2 has updated the session.
    const noSession = model.getSession(site, undefined);
    assert.exists(noSession);
    assert.notExists(noSession.session);
    assert.isTrue(noSession.eventsById.has('event_5'));
    sinon.assert.callCount(listener, 5);

    // Dispatch all events again and confirm there are no changes.
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.DeviceBoundSessionEventOccurred, event1);
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.DeviceBoundSessionEventOccurred, event2);
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.DeviceBoundSessionEventOccurred, event3);
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.DeviceBoundSessionEventOccurred, event4);
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.DeviceBoundSessionEventOccurred, event5);
    sinon.assert.callCount(listener, 5);
    assert.strictEqual(sessionAndEvents1.eventsById.size, 2);
    assert.strictEqual(sessionAndEvents2.eventsById.size, 2);
    assert.strictEqual(noSession.eventsById.size, 1);
  });

  it('updates isSessionTerminated status correctly on termination and recreation', () => {
    const site = 'example.com';
    const sessionId = 'session_term_test';
    const listener = sinon.spy();
    model.addEventListener(Application.DeviceBoundSessionsModel.DeviceBoundSessionModelEvents.EVENT_OCCURRED, listener);

    // New session is not marked as terminated.
    const creationSession = makeSession(site, sessionId);
    const createEvent: Protocol.Network.DeviceBoundSessionEventOccurredEvent = {
      eventId: 'event1' as Protocol.Network.DeviceBoundSessionEventId,
      site,
      sessionId,
      succeeded: true,
      creationEventDetails:
          {newSession: creationSession, fetchResult: Protocol.Network.DeviceBoundSessionFetchResult.Success}
    };
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.DeviceBoundSessionEventOccurred, createEvent);

    assert.isFalse(model.isSessionTerminated(site, sessionId));
    const session = model.getSession(site, sessionId);
    assert.isFalse(session?.isSessionTerminated);

    // It is marked as terminated for a successful termination event.
    const terminationEvent: Protocol.Network.DeviceBoundSessionEventOccurredEvent = {
      eventId: 'event2' as Protocol.Network.DeviceBoundSessionEventId,
      site,
      sessionId,
      succeeded: true,
      terminationEventDetails: {deletionReason: Protocol.Network.TerminationEventDetailsDeletionReason.Expired}
    };
    networkManager.dispatchEventToListeners(
        SDK.NetworkManager.Events.DeviceBoundSessionEventOccurred, terminationEvent);

    assert.isTrue(model.isSessionTerminated(site, sessionId));
    assert.isTrue(session?.isSessionTerminated);

    // It is not unmarked as terminated if there's a failed attempt to recreate it.
    const failedRecreateEvent: Protocol.Network.DeviceBoundSessionEventOccurredEvent = {
      eventId: 'event3' as Protocol.Network.DeviceBoundSessionEventId,
      site,
      sessionId,
      succeeded: false,
      creationEventDetails:
          {newSession: creationSession, fetchResult: Protocol.Network.DeviceBoundSessionFetchResult.Success}
    };
    networkManager.dispatchEventToListeners(
        SDK.NetworkManager.Events.DeviceBoundSessionEventOccurred, failedRecreateEvent);

    assert.isTrue(model.isSessionTerminated(site, sessionId));
    assert.isTrue(session?.isSessionTerminated);

    // It is unmarked as terminated if there's a successful attempt to recreate it.
    const recreateEvent: Protocol.Network.DeviceBoundSessionEventOccurredEvent = {
      eventId: 'event4' as Protocol.Network.DeviceBoundSessionEventId,
      site,
      sessionId,
      succeeded: true,
      creationEventDetails:
          {newSession: creationSession, fetchResult: Protocol.Network.DeviceBoundSessionFetchResult.Success}
    };
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.DeviceBoundSessionEventOccurred, recreateEvent);

    assert.isFalse(model.isSessionTerminated(site, sessionId));
    assert.isFalse(session?.isSessionTerminated);
  });

  it('updates hasErrors status correctly on failed events and clear events', () => {
    const site = 'example.com';
    const sessionId = 'session_error_test';

    // New session does not have errors.
    const createEvent: Protocol.Network.DeviceBoundSessionEventOccurredEvent = {
      eventId: 'event1' as Protocol.Network.DeviceBoundSessionEventId,
      site,
      sessionId,
      succeeded: true,
      creationEventDetails: {
        newSession: makeSession(site, sessionId),
        fetchResult: Protocol.Network.DeviceBoundSessionFetchResult.Success
      }
    };
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.DeviceBoundSessionEventOccurred, createEvent);

    assert.isFalse(model.sessionHasErrors(site, sessionId));
    const session = model.getSession(site, sessionId);
    assert.isFalse(session?.hasErrors);

    // It has errors for a failed event.
    const failedEvent: Protocol.Network.DeviceBoundSessionEventOccurredEvent = {
      eventId: 'event2' as Protocol.Network.DeviceBoundSessionEventId,
      site,
      sessionId,
      succeeded: false,
      creationEventDetails: {fetchResult: Protocol.Network.DeviceBoundSessionFetchResult.InvalidConfigJson}
    };
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.DeviceBoundSessionEventOccurred, failedEvent);

    assert.isTrue(model.sessionHasErrors(site, sessionId));
    assert.isTrue(session?.hasErrors);

    // It still has errors after a subsequent successful event.
    const successEvent: Protocol.Network.DeviceBoundSessionEventOccurredEvent = {
      eventId: 'event3' as Protocol.Network.DeviceBoundSessionEventId,
      site,
      sessionId,
      succeeded: true,
      challengeEventDetails:
          {challenge: 'challenge', challengeResult: Protocol.Network.ChallengeEventDetailsChallengeResult.Success}
    };
    networkManager.dispatchEventToListeners(SDK.NetworkManager.Events.DeviceBoundSessionEventOccurred, successEvent);

    assert.isTrue(model.sessionHasErrors(site, sessionId));
    assert.isTrue(session?.hasErrors);

    const listener = sinon.spy();
    model.addEventListener(Application.DeviceBoundSessionsModel.DeviceBoundSessionModelEvents.CLEAR_EVENTS, listener);

    // Errors are not cleared when clearEvents is called when preserving the log.
    Common.Settings.moduleSetting('device-bound-sessions-preserve-log').set(true);
    model.clearEvents();
    sinon.assert.notCalled(listener);
    assert.isTrue(model.sessionHasErrors(site, sessionId));
    assert.isTrue(session?.hasErrors);

    // Errors are cleared when clearEvents is called when not preserving the log.
    Common.Settings.moduleSetting('device-bound-sessions-preserve-log').set(false);
    model.clearEvents();
    sinon.assert.calledOnce(listener);
    const noLongerFailedSessions = listener.firstCall.args[0].data.noLongerFailedSessions;
    assert.strictEqual(noLongerFailedSessions.size, 1);
    assert.deepEqual(noLongerFailedSessions.get(site), [sessionId]);
    assert.isFalse(model.sessionHasErrors(site, sessionId));
    assert.isFalse(session?.hasErrors);
  });

  it('returns false for isSessionTerminated when session does not exist', () => {
    assert.isFalse(model.isSessionTerminated('unknown-site', 'unknown-session'));
  });
});
