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
            secure: true,
            httpOnly: true,
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

  it('renders session details correctly', async () => {
    const viewInput = {sessionAndEvents: createMockSession()};
    const target = document.createElement('div');
    renderElementIntoDOM(target);
    Application.DeviceBoundSessionsView.DEFAULT_VIEW(viewInput, {}, target);
    await assertScreenshot('application/DeviceBoundSessionsView/session_details.png');
  });
});
