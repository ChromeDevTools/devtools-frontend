// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Protocol from '../../generated/protocol.js';
import {assertScreenshot, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {cleanTestDOM} from '../../testing/DOMHooks.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Application from './application.js';

describeWithEnvironment('DeviceBoundSessionsView', () => {
  const mockSessionId = 'session-id-123';
  const mockSite = 'https://example.com';

  let toLocaleStringStub: sinon.SinonStub;
  beforeEach(async () => {
    const original = Date.prototype.toLocaleString;
    toLocaleStringStub = sinon.stub(Date.prototype, 'toLocaleString').callsFake(function(this: Date) {
      return original.call(this, 'en-US', {timeZone: 'UTC'});
    });
  });
  afterEach(async () => {
    toLocaleStringStub.restore();
    cleanTestDOM();
    await raf();
  });

  function createMockSession(): Application.DeviceBoundSessionsModel.SessionAndEvents {
    return {
      eventsById: new Map(),
      isSessionTerminated: false,
      hasErrors: false,
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

  function createMockSessionAndEvents(): Application.DeviceBoundSessionsModel.SessionAndEvents {
    const sessionAndEvents = createMockSession();

    const dates = [
      new Date('2026-01-01T10:00:00.000Z'), new Date('2026-01-02T10:00:00.000Z'), new Date('2026-01-03T10:00:00.000Z'),
      new Date('2026-01-04T10:00:00.000Z')
    ];

    sessionAndEvents.eventsById.set('creation-full', {
      event: {
        eventId: 'creation-full' as Protocol.Network.DeviceBoundSessionEventId,
        site: mockSite,
        sessionId: mockSessionId,
        succeeded: true,
        creationEventDetails: {
          fetchResult: Protocol.Network.DeviceBoundSessionFetchResult.Success,
          newSession: sessionAndEvents.session,
          failedRequest: {
            requestUrl: 'https://example.com/creation-fail',
            netError: 'net::ERR_FAILED',
            responseError: 400,
            responseErrorBody: '{"error": {"message": "Creation failed body", "details": {"inner": "more info"}}}'
          }
        }
      },
      timestamp: dates[0]
    });
    sessionAndEvents.eventsById.set('creation-min', {
      event: {
        eventId: 'creation-min' as Protocol.Network.DeviceBoundSessionEventId,
        site: mockSite,
        sessionId: mockSessionId,
        succeeded: false,
        creationEventDetails: {fetchResult: Protocol.Network.DeviceBoundSessionFetchResult.KeyError}
      },
      timestamp: dates[0]
    });
    sessionAndEvents.eventsById.set('refresh-full', {
      event: {
        eventId: 'event-full' as Protocol.Network.DeviceBoundSessionEventId,
        site: mockSite,
        sessionId: mockSessionId,
        succeeded: true,
        refreshEventDetails: {
          refreshResult: Protocol.Network.RefreshEventDetailsRefreshResult.Refreshed,
          wasFullyProactiveRefresh: false,
          fetchResult: Protocol.Network.DeviceBoundSessionFetchResult.Success,
          newSession: sessionAndEvents.session,
          failedRequest: {
            requestUrl: 'https://example.com/refresh-fail',
            netError: 'net::ERR_ABORTED',
            responseError: 500,
            responseErrorBody: '{"error": {"message": "Refresh failed body", "otherDetails": {"inner": "more info"}}}'
          }
        }
      },
      timestamp: dates[1]
    });
    sessionAndEvents.eventsById.set('refresh-min', {
      event: {
        eventId: 'event-min' as Protocol.Network.DeviceBoundSessionEventId,
        site: mockSite,
        sessionId: mockSessionId,
        succeeded: false,
        refreshEventDetails: {
          refreshResult: Protocol.Network.RefreshEventDetailsRefreshResult.FatalError,
          wasFullyProactiveRefresh: true
        }
      },
      timestamp: dates[1]
    });
    sessionAndEvents.eventsById.set('challenge', {
      event: {
        succeeded: false,
        eventId: 'challlenge' as Protocol.Network.DeviceBoundSessionEventId,
        site: mockSite,
        sessionId: mockSessionId,
        challengeEventDetails:
            {challenge: 'challenge', challengeResult: Protocol.Network.ChallengeEventDetailsChallengeResult.Success}
      },
      timestamp: dates[2]
    });
    sessionAndEvents.eventsById.set('termination', {
      event: {
        succeeded: false,
        eventId: 'termination' as Protocol.Network.DeviceBoundSessionEventId,
        sessionId: mockSessionId,
        site: mockSite,
        terminationEventDetails: {deletionReason: Protocol.Network.TerminationEventDetailsDeletionReason.Expired}
      },
      timestamp: dates[3]
    });
    sessionAndEvents.eventsById.set('invalid-failed-request-body-invalid-json', {
      event: {
        eventId: 'invalid-failed-request-invalid-json' as Protocol.Network.DeviceBoundSessionEventId,
        site: mockSite,
        sessionId: mockSessionId,
        succeeded: false,
        refreshEventDetails: {
          refreshResult: Protocol.Network.RefreshEventDetailsRefreshResult.FatalError,
          wasFullyProactiveRefresh: false,
          failedRequest: {
            requestUrl: 'https://example.com/refresh-body-issue',
            responseErrorBody: '{"error": {"message": "JSON does not parse", "otherDetails": {"inner": "more info"'
          }
        }
      },
      timestamp: dates[0]
    });
    sessionAndEvents.eventsById.set('invalid-failed-request-body-string', {
      event: {
        eventId: 'invalid-failed-request-body-string' as Protocol.Network.DeviceBoundSessionEventId,
        site: mockSite,
        sessionId: mockSessionId,
        succeeded: false,
        refreshEventDetails: {
          refreshResult: Protocol.Network.RefreshEventDetailsRefreshResult.FatalError,
          wasFullyProactiveRefresh: false,
          failedRequest: {requestUrl: 'https://example.com/refresh-body-issue', responseErrorBody: 'justAString'}
        }
      },
      timestamp: dates[0]
    });
    sessionAndEvents.eventsById.set('invalid-failed-request-body-boolean', {
      event: {
        eventId: 'invalid-failed-request-body-boolean' as Protocol.Network.DeviceBoundSessionEventId,
        site: mockSite,
        sessionId: mockSessionId,
        succeeded: false,
        refreshEventDetails: {
          refreshResult: Protocol.Network.RefreshEventDetailsRefreshResult.FatalError,
          wasFullyProactiveRefresh: false,
          failedRequest: {requestUrl: 'https://example.com/refresh-body-issue', responseErrorBody: 'true'}
        }
      },
      timestamp: dates[0]
    });
    sessionAndEvents.eventsById.set('invalid-failed-request-body-number', {
      event: {
        eventId: 'invalid-failed-request-body-number' as Protocol.Network.DeviceBoundSessionEventId,
        site: mockSite,
        sessionId: mockSessionId,
        succeeded: false,
        refreshEventDetails: {
          refreshResult: Protocol.Network.RefreshEventDetailsRefreshResult.FatalError,
          wasFullyProactiveRefresh: false,
          failedRequest: {requestUrl: 'https://example.com/refresh-body-issue', responseErrorBody: '12345'}
        }
      },
      timestamp: dates[0]
    });
    sessionAndEvents.eventsById.set('invalid-failed-request-body-null', {
      event: {
        eventId: 'invalid-failed-request-body-null' as Protocol.Network.DeviceBoundSessionEventId,
        site: mockSite,
        sessionId: mockSessionId,
        succeeded: false,
        refreshEventDetails: {
          refreshResult: Protocol.Network.RefreshEventDetailsRefreshResult.FatalError,
          wasFullyProactiveRefresh: false,
          failedRequest: {requestUrl: 'https://example.com/refresh-body-issue', responseErrorBody: 'null'}
        }
      },
      timestamp: dates[0]
    });
    sessionAndEvents.eventsById.set('minimal-failed-request', {
      event: {
        eventId: 'minimal-failed-request' as Protocol.Network.DeviceBoundSessionEventId,
        site: mockSite,
        sessionId: mockSessionId,
        succeeded: false,
        refreshEventDetails: {
          refreshResult: Protocol.Network.RefreshEventDetailsRefreshResult.FatalError,
          wasFullyProactiveRefresh: false,
          failedRequest: {requestUrl: 'https://example.com/only-request-url'}
        }
      },
      timestamp: dates[0]
    });
    return sessionAndEvents;
  }

  function createSetting() {
    return Common.Settings.Settings.instance().createSetting('device-bound-sessions-preserve-log', false);
  }

  it('fetches session details from the model and passes them to the view', async () => {
    const viewFunction = createViewFunctionStub(Application.DeviceBoundSessionsView.DeviceBoundSessionsView);
    const view = new Application.DeviceBoundSessionsView.DeviceBoundSessionsView(viewFunction);

    const mockData = createMockSession();
    const mockModel = {
      getSession: sinon.stub().returns(mockData),
      addEventListener: sinon.stub(),
      removeEventListener: sinon.stub(),
      getPreserveLogSetting: sinon.stub().returns(createSetting()),
    } as unknown as Application.DeviceBoundSessionsModel.DeviceBoundSessionsModel;

    view.showSession(mockModel, mockSite, mockSessionId);
    const {sessionAndEvents, preserveLogSetting} = viewFunction.input;
    assert.deepEqual(sessionAndEvents, mockData);
    assert.exists(preserveLogSetting);
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
      getPreserveLogSetting: sinon.stub().returns(createSetting()),
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
  it('shows default view with title and description', async () => {
    const viewFunction = createViewFunctionStub(Application.DeviceBoundSessionsView.DeviceBoundSessionsView);
    const view = new Application.DeviceBoundSessionsView.DeviceBoundSessionsView(viewFunction);
    const mockModel = {
      addEventListener: sinon.stub(),
      removeEventListener: sinon.stub(),
      getPreserveLogSetting: sinon.stub().returns(createSetting()),
    } as unknown as Application.DeviceBoundSessionsModel.DeviceBoundSessionsModel;

    view.showDefault(mockModel, 'Default Title', 'Default Description');

    const {defaultTitle, defaultDescription, sessionAndEvents} = viewFunction.input;
    assert.strictEqual(defaultTitle, 'Default Title');
    assert.strictEqual(defaultDescription, 'Default Description');
    assert.isUndefined(sessionAndEvents);
  });

  it('switches between session view and default view correctly', async () => {
    const viewFunction = createViewFunctionStub(Application.DeviceBoundSessionsView.DeviceBoundSessionsView);
    const view = new Application.DeviceBoundSessionsView.DeviceBoundSessionsView(viewFunction);
    const mockData = createMockSession();
    const mockModel = {
      getSession: sinon.stub().returns(mockData),
      addEventListener: sinon.stub(),
      removeEventListener: sinon.stub(),
      getPreserveLogSetting: sinon.stub().returns(createSetting()),
    } as unknown as Application.DeviceBoundSessionsModel.DeviceBoundSessionsModel;

    view.showSession(mockModel, mockSite, mockSessionId);
    assert.exists(viewFunction.input.sessionAndEvents);
    assert.isUndefined(viewFunction.input.defaultTitle);
    assert.isUndefined(viewFunction.input.defaultDescription);

    view.showDefault(mockModel, 'Default Title', 'Default Description');
    assert.isUndefined(viewFunction.input.sessionAndEvents);
    assert.strictEqual(viewFunction.input.defaultTitle, 'Default Title');
    assert.strictEqual(viewFunction.input.defaultDescription, 'Default Description');

    view.showSession(mockModel, mockSite, mockSessionId);
    assert.exists(viewFunction.input.sessionAndEvents);
    assert.isUndefined(viewFunction.input.defaultTitle);
    assert.isUndefined(viewFunction.input.defaultDescription);
  });

  it('passes the selected event to the view when onEventRowSelected is called', () => {
    const viewFunction = sinon.stub();
    const component = new Application.DeviceBoundSessionsView.DeviceBoundSessionsView(viewFunction);

    const mockModel = {
      getSession: sinon.stub().returns({session: null, eventsById: new Map()}),
      addEventListener: sinon.stub(),
      removeEventListener: sinon.stub(),
      getPreserveLogSetting: sinon.stub().returns(createSetting()),
    } as unknown as Application.DeviceBoundSessionsModel.DeviceBoundSessionsModel;

    const mockEvent = {creationEventDetails: {fetchResult: Protocol.Network.DeviceBoundSessionFetchResult.Success}} as
        Protocol.Network.DeviceBoundSessionEventOccurredEvent;

    component.showSession(mockModel, 'example.com');

    sinon.assert.calledOnce(viewFunction);
    const firstCallInput = viewFunction.lastCall.args[0];
    assert.isUndefined(firstCallInput.selectedEvent);
    assert.isFunction(firstCallInput.onEventRowSelected);

    firstCallInput.onEventRowSelected(mockEvent);

    sinon.assert.calledTwice(viewFunction);
    const secondCallInput = viewFunction.lastCall.args[0];
    assert.strictEqual(secondCallInput.selectedEvent, mockEvent);
  });

  it('only deselects the event grid row when selectedEvent is undefined', async () => {
    const sessionAndEvents = createMockSessionAndEvents();
    const eventWrapper1 = sessionAndEvents.eventsById.get('creation-full');
    const eventWrapper2 = sessionAndEvents.eventsById.get('refresh-full');
    assert.exists(eventWrapper1);
    assert.exists(eventWrapper2);

    const viewInput = {
      sessionAndEvents,
      preserveLogSetting: createSetting(),
      selectedEvent: undefined,
      onEventRowSelected: () => {},
    };

    const targetWidget = new UI.Widget.VBox();
    renderElementIntoDOM(targetWidget);
    Application.DeviceBoundSessionsView.DEFAULT_VIEW(viewInput, {}, targetWidget.contentElement);

    const dataGrid = customElements.get('devtools-data-grid');
    assert.exists(dataGrid);
    assert.isFunction(dataGrid.prototype.deselectRow);
    const deselectSpy = sinon.spy(dataGrid.prototype, 'deselectRow');

    Application.DeviceBoundSessionsView.DEFAULT_VIEW(
        {...viewInput, selectedEvent: eventWrapper1.event}, {}, targetWidget.contentElement);
    sinon.assert.notCalled(deselectSpy);
    Application.DeviceBoundSessionsView.DEFAULT_VIEW(
        {...viewInput, selectedEvent: eventWrapper2.event}, {}, targetWidget.contentElement);
    sinon.assert.notCalled(deselectSpy);
    Application.DeviceBoundSessionsView.DEFAULT_VIEW(viewInput, {}, targetWidget.contentElement);
    sinon.assert.calledOnce(deselectSpy);

    deselectSpy.restore();
  });

  it('renders session correctly', async () => {
    const viewInput = {
      sessionAndEvents: createMockSession(),
      preserveLogSetting: createSetting(),
      selectedEvent: undefined,
      onEventRowSelected: () => {},
    };
    const targetWidget = new UI.Widget.VBox();
    targetWidget.element.style.width = '800px';
    targetWidget.element.style.height = '800px';
    renderElementIntoDOM(targetWidget);
    Application.DeviceBoundSessionsView.DEFAULT_VIEW(viewInput, {}, targetWidget.contentElement);
    await assertScreenshot('application/DeviceBoundSessionsView/session.png');
  });

  it('renders events correctly', async () => {
    const sessionAndEvents: Application.DeviceBoundSessionsModel.SessionAndEvents = {
      eventsById: new Map(),
      isSessionTerminated: false,
      hasErrors: false,
      session: undefined,
    };
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

    const viewInput = {
      sessionAndEvents,
      preserveLogSetting: createSetting(),
      selectedEvent: undefined,
      onEventRowSelected: () => {},
    };
    const targetWidget = new UI.Widget.VBox();
    targetWidget.element.style.width = '800px';
    targetWidget.element.style.height = '400px';
    renderElementIntoDOM(targetWidget);
    Application.DeviceBoundSessionsView.DEFAULT_VIEW(viewInput, {}, targetWidget.contentElement);
    await assertScreenshot('application/DeviceBoundSessionsView/events.png');
  });

  it('renders session and events correctly', async () => {
    const sessionAndEvents = createMockSessionAndEvents();
    const viewInput = {
      sessionAndEvents,
      preserveLogSetting: createSetting(),
      selectedEvent: undefined,
      onEventRowSelected: () => {},
    };
    const targetWidget = new UI.Widget.VBox();
    targetWidget.element.style.width = '800px';
    targetWidget.element.style.height = '850px';
    renderElementIntoDOM(targetWidget);
    Application.DeviceBoundSessionsView.DEFAULT_VIEW(viewInput, {}, targetWidget.contentElement);
    await assertScreenshot('application/DeviceBoundSessionsView/session_and_events.png');
  });

  it('renders the default view correctly', async () => {
    const viewInput = {
      defaultTitle: 'Default Title',
      defaultDescription: 'Default Description',
      preserveLogSetting: createSetting(),
    };
    const targetWidget = new UI.Widget.VBox();
    targetWidget.element.style.width = '300px';
    targetWidget.element.style.height = '300px';
    renderElementIntoDOM(targetWidget);
    Application.DeviceBoundSessionsView.DEFAULT_VIEW(viewInput, {}, targetWidget.contentElement);
    await assertScreenshot('application/DeviceBoundSessionsView/default_view.png');
  });

  it('renders event details default view correctly', async () => {
    const sessionAndEvents = createMockSessionAndEvents();
    const selectedEvent = sessionAndEvents.eventsById.get('creation-min');
    assert.isDefined(selectedEvent);
    const viewInput = {
      sessionAndEvents,
      preserveLogSetting: createSetting(),
      selectedEvent: selectedEvent.event,
      onEventRowSelected: () => {},
    };
    const targetWidget = new UI.Widget.VBox();
    targetWidget.element.style.width = '800px';
    targetWidget.element.style.height = '800px';

    renderElementIntoDOM(targetWidget);
    Application.DeviceBoundSessionsView.DEFAULT_VIEW(viewInput, {}, targetWidget.contentElement);
    await assertScreenshot(`application/DeviceBoundSessionsView/session_and_events_and_event_details.png`);
  });

  // These just display the event details portion because otherwise the height
  // is cropped and not all details are shown.
  async function runEventDetailsTest(eventId: string, screenshotFileName: string) {
    const sessionAndEvents = createMockSessionAndEvents();
    const selectedEvent = sessionAndEvents.eventsById.get(eventId);
    assert.isDefined(selectedEvent);
    const viewInput = {
      sessionAndEvents,
      preserveLogSetting: createSetting(),
      selectedEvent: selectedEvent.event,
      onEventRowSelected: () => {},
    };
    const target = document.createElement('div');
    Application.DeviceBoundSessionsView.DEFAULT_VIEW(viewInput, {}, target);
    const eventDetailContents = target.querySelector('.device-bound-session-sidebar');
    assert.isNotNull(eventDetailContents);

    const targetWidget = new UI.Widget.VBox();
    renderElementIntoDOM(targetWidget);
    targetWidget.contentElement.appendChild(eventDetailContents);
    await assertScreenshot(screenshotFileName);
  }
  it('renders creation full details correctly', async () => {
    await runEventDetailsTest('creation-full', 'application/DeviceBoundSessionsView/creation_full_event_details.png');
  });
  it('renders creation minimal event details correctly', async () => {
    await runEventDetailsTest('creation-min', 'application/DeviceBoundSessionsView/creation_min_event_details.png');
  });
  it('renders refresh full details correctly', async () => {
    await runEventDetailsTest('refresh-full', 'application/DeviceBoundSessionsView/refresh_full_event_details.png');
  });
  it('renders refresh minimal details correctly', async () => {
    await runEventDetailsTest('refresh-min', 'application/DeviceBoundSessionsView/refresh_min_event_details.png');
  });
  it('renders challenge event details correctly', async () => {
    await runEventDetailsTest('challenge', 'application/DeviceBoundSessionsView/challenge_event_details.png');
  });
  it('renders termination event details correctly', async () => {
    await runEventDetailsTest('termination', 'application/DeviceBoundSessionsView/termination_event_details.png');
  });
  it('renders invalid json failed request body correctly', async () => {
    await runEventDetailsTest(
        'invalid-failed-request-body-invalid-json',
        'application/DeviceBoundSessionsView/invalid_failed_request_body_invalid_json_event_details.png');
  });
  it('renders string failed request body correctly', async () => {
    await runEventDetailsTest(
        'invalid-failed-request-body-string',
        'application/DeviceBoundSessionsView/invalid_failed_request_body_string_event_details.png');
  });
  it('renders boolean failed request body correctly', async () => {
    await runEventDetailsTest(
        'invalid-failed-request-body-boolean',
        'application/DeviceBoundSessionsView/invalid_failed_request_body_boolean_event_details.png');
  });
  it('renders number failed request body correctly', async () => {
    await runEventDetailsTest(
        'invalid-failed-request-body-number',
        'application/DeviceBoundSessionsView/invalid_failed_request_body_number_event_details.png');
  });
  it('renders null failed request body correctly', async () => {
    await runEventDetailsTest(
        'invalid-failed-request-body-null',
        'application/DeviceBoundSessionsView/invalid_failed_request_body_null_event_details.png');
  });
  it('renders minimal failed request correctly', async () => {
    await runEventDetailsTest(
        'minimal-failed-request', 'application/DeviceBoundSessionsView/minimal_failed_request_event_details.png');
  });
});
