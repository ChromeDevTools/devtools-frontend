// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as Application from './application.js';

describeWithMockConnection('DeviceBoundSessionsView', () => {
  const mockSessionId = 'session-id-123';
  const mockSite = 'https://example.com';

  let toLocaleStringStub: sinon.SinonStub;
  beforeEach(async () => {
    const original = Date.prototype.toLocaleString;
    toLocaleStringStub = sinon.stub(Date.prototype, 'toLocaleString').callsFake(function(this: Date) {
      return original.call(this, 'en-US', {timeZone: 'UTC'});
    });
  });
  afterEach(() => {
    toLocaleStringStub.restore();
  });

  function createMockSession(): Application.DeviceBoundSessionsModel.SessionAndEvents {
    return {
      eventsById: new Map(),
      session: {
        key: {site: mockSite, id: mockSessionId},
        refreshUrl: 'https://example.com/refresh',
        expiryDate: 1700000000,
        allowedRefreshInitiators: ['example.com', '*.example.com', 'site-embedding-example.com'],
        inclusionRules: {
          origin: 'https://example.com',
          includeSite: true,
          urlRules: [
            {
              ruleType: Protocol.Network.DeviceBoundSessionUrlRuleRuleType.Include,
              hostPattern: '*.example.com',
              pathPrefix: '/path'
            },
            {
              ruleType: Protocol.Network.DeviceBoundSessionUrlRuleRuleType.Exclude,
              hostPattern: 'example.com',
              pathPrefix: '/untrusted'
            },
          ]
        },
        cookieCravings: [
          {
            name: 'session_token',
            domain: 'example.com',
            path: '/',
            secure: false,
            httpOnly: false,
            sameSite: Protocol.Network.CookieSameSite.Strict
          },
          {name: 'session_token2', domain: '.example.com', path: '/path', secure: false, httpOnly: false},
        ],
        cachedChallenge: 'test-challenge',
      }
    };
  }

  it('fetches session details from the model and passes them to the view', async () => {
    const viewFunction = createViewFunctionStub(Application.DeviceBoundSessionsView.DeviceBoundSessionsView);
    const view = new Application.DeviceBoundSessionsView.DeviceBoundSessionsView(viewFunction);

    const mockData = createMockSession();
    const mockModel = {
      getSession: sinon.stub().returns(mockData),
      addEventListener: sinon.stub(),
      removeEventListener: sinon.stub(),
    } as unknown as Application.DeviceBoundSessionsModel.DeviceBoundSessionsModel;

    view.showSession(mockModel, mockSite, mockSessionId);
    const {sessionAndEvents} = viewFunction.input;
    assert.deepEqual(sessionAndEvents, mockData);
  });

  it('updates the view when the model triggers an event', async () => {
    const viewFunction = createViewFunctionStub(Application.DeviceBoundSessionsView.DeviceBoundSessionsView);
    const view = new Application.DeviceBoundSessionsView.DeviceBoundSessionsView(viewFunction);
    const mockData = createMockSession();

    const addEventListenerStub = sinon.stub();
    const getSessionStub = sinon.stub().returns(mockData);
    const mockModel = {
      getSession: getSessionStub,
      addEventListener: addEventListenerStub,
      removeEventListener: sinon.stub(),
    } as unknown as Application.DeviceBoundSessionsModel.DeviceBoundSessionsModel;

    view.showSession(mockModel, mockSite, mockSessionId);
    assert.deepEqual(viewFunction.input.sessionAndEvents, mockData);

    assert.exists(mockData.session);
    const newMockData = {
      ...mockData,
      session: {
        ...mockData.session,
        refreshUrl: 'https://example.com/updatedRefresh',
      }
    };
    getSessionStub.returns(newMockData);
    const eventHandler = addEventListenerStub.firstCall.args[1];
    eventHandler.call(view);
    assert.deepEqual(viewFunction.input.sessionAndEvents, newMockData);
    sinon.assert.calledTwice(getSessionStub);
  });

  it('renders session correctly', async () => {
    const viewInput = {sessionAndEvents: createMockSession()};
    const target = document.createElement('div');
    renderElementIntoDOM(target);
    Application.DeviceBoundSessionsView.DEFAULT_VIEW(viewInput, {}, target);
    await assertScreenshot('application/DeviceBoundSessionsView/session.png');
  });

  it('renders events correctly', async () => {
    const sessionAndEvents = {
      eventsById: new Map(),
      session: undefined,
    } as unknown as Application.DeviceBoundSessionsModel.SessionAndEvents;
    const date = new Date('2026-01-01T10:00:00.000Z');
    sessionAndEvents.eventsById.set('event-1', {
      event: {
        creationEventDetails: {fetchResult: Protocol.Network.DeviceBoundSessionFetchResult.Success},
        succeeded: false,
        eventId: 'event-1' as Protocol.Network.DeviceBoundSessionEventId,
        site: mockSite,
      },
      timestamp: date
    });

    const viewInput = {sessionAndEvents};
    const target = document.createElement('div');
    renderElementIntoDOM(target);
    Application.DeviceBoundSessionsView.DEFAULT_VIEW(viewInput, {}, target);
    await assertScreenshot('application/DeviceBoundSessionsView/events.png');
  });

  it('renders session and events correctly', async () => {
    const sessionAndEvents = createMockSession();
    const dates = [
      new Date('2026-01-01T10:00:00.000Z'), new Date('2026-01-02T10:00:00.000Z'), new Date('2026-01-03T10:00:00.000Z'),
      new Date('2026-01-04T10:00:00.000Z')
    ];

    sessionAndEvents.eventsById.set('event-0', {
      event: {
        succeeded: true,
        eventId: 'event-0' as Protocol.Network.DeviceBoundSessionEventId,
        site: mockSite,
        creationEventDetails: {fetchResult: Protocol.Network.DeviceBoundSessionFetchResult.Success}
      },
      timestamp: dates[0]
    });
    sessionAndEvents.eventsById.set('event-1', {
      event: {
        succeeded: false,
        eventId: 'event-1' as Protocol.Network.DeviceBoundSessionEventId,
        site: mockSite,
        challengeEventDetails:
            {challenge: 'challenge', challengeResult: Protocol.Network.ChallengeEventDetailsChallengeResult.Success}
      },
      timestamp: dates[1]
    });
    sessionAndEvents.eventsById.set('event-2', {
      event: {
        succeeded: true,
        eventId: 'event-2' as Protocol.Network.DeviceBoundSessionEventId,
        site: mockSite,
        refreshEventDetails: {
          refreshResult: Protocol.Network.RefreshEventDetailsRefreshResult.Refreshed,
          wasFullyProactiveRefresh: false
        }
      },
      timestamp: dates[2]
    });
    sessionAndEvents.eventsById.set('event-3', {
      event: {
        succeeded: false,
        eventId: 'event-3' as Protocol.Network.DeviceBoundSessionEventId,
        site: mockSite,
        terminationEventDetails: {deletionReason: Protocol.Network.TerminationEventDetailsDeletionReason.Expired}
      },
      timestamp: dates[3]
    });

    const viewInput = {sessionAndEvents};
    const target = document.createElement('div');
    renderElementIntoDOM(target);
    Application.DeviceBoundSessionsView.DEFAULT_VIEW(viewInput, {}, target);
    await assertScreenshot('application/DeviceBoundSessionsView/session_and_events.png');
  });
});
