// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as Application from './application.js';

describeWithMockConnection('ServiceWorkersView', () => {
  let target: SDK.Target.Target;
  let view: Application.ServiceWorkersView.ServiceWorkersView;

  beforeEach(() => {
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    target = createTarget({parentTarget: tabTarget});
  });

  afterEach(() => {
    view.detach();
  });

  it('shows service worker registrations', async () => {
    view = new Application.ServiceWorkersView.ServiceWorkersView();
    view.markAsRoot();
    view.show(document.body);
    const serviceWorkersManager = target.model(SDK.ServiceWorkerManager.ServiceWorkerManager);
    assert.exists(serviceWorkersManager);
    const securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager);
    assert.exists(securityOriginManager);
    const ORIGIN = 'example.com';
    sinon.stub(securityOriginManager, 'securityOrigins').returns([ORIGIN]);
    const SCOPE_URL = 'SCOPE_URL';
    serviceWorkersManager.dispatchEventToListeners(SDK.ServiceWorkerManager.Events.REGISTRATION_UPDATED, {
      scopeURL: SCOPE_URL,
      securityOrigin: ORIGIN,
      versionsByMode: () => new Map(),
      fingerprint: () => {},
    } as SDK.ServiceWorkerManager.ServiceWorkerRegistration);

    const sectionTitle = view.currentWorkersView.contentElement.querySelector('.report-section-title');
    assert.exists(sectionTitle);
    assert.strictEqual(sectionTitle.textContent, SCOPE_URL);
  });

  describe('router info', () => {
    const registrationId = 'fake-sw-id' as Protocol.ServiceWorker.RegistrationID;
    const origin = 'https://example.com';
    const routerRules = [
      {
        condition: {urlPattern: '/foo/bar'},
        source: ['network'],
        id: 1,
      },
      {
        condition: {urlPattern: '/baz'},
        source: ['fetch-event'],
        id: 2,
      },
    ];
    let serviceWorkersManager: SDK.ServiceWorkerManager.ServiceWorkerManager|null;

    const hasRouterField = () => {
      return Array.from(view.currentWorkersView.contentElement.querySelectorAll('.report-field')).some(field => {
        return field.querySelector('.report-field-name')?.textContent === 'Routers';
      });
    };

    beforeEach(() => {
      Application.ServiceWorkersView.setThrottleDisabledForDebugging(true);
      view = new Application.ServiceWorkersView.ServiceWorkersView();
      view.markAsRoot();
      view.show(document.body);

      serviceWorkersManager = target.model(SDK.ServiceWorkerManager.ServiceWorkerManager);
      assert.exists(serviceWorkersManager);

      const securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager);
      assert.exists(securityOriginManager);
      sinon.stub(securityOriginManager, 'securityOrigins').returns([origin]);
    });

    it('shows the router field if active version has at least one router rule', async () => {
      const payload:
          Protocol.ServiceWorker.ServiceWorkerRegistration = {registrationId, scopeURL: origin, isDeleted: false};
      const registration: SDK.ServiceWorkerManager.ServiceWorkerRegistration =
          new SDK.ServiceWorkerManager.ServiceWorkerRegistration(payload);

      const versionId = 1;
      const versionPayload: Protocol.ServiceWorker.ServiceWorkerVersion = {
        registrationId,
        versionId: versionId.toString(),
        scriptURL: '',
        status: Protocol.ServiceWorker.ServiceWorkerVersionStatus.Activated,
        runningStatus: Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Running,
        routerRules: JSON.stringify(routerRules),
      };
      registration.updateVersion(versionPayload);
      serviceWorkersManager?.dispatchEventToListeners(
          SDK.ServiceWorkerManager.Events.REGISTRATION_UPDATED, registration);
      assert.isTrue(hasRouterField());
    });

    it('does not show the router field if active version does not have router rules', async () => {
      const payload:
          Protocol.ServiceWorker.ServiceWorkerRegistration = {registrationId, scopeURL: origin, isDeleted: false};
      const registration: SDK.ServiceWorkerManager.ServiceWorkerRegistration =
          new SDK.ServiceWorkerManager.ServiceWorkerRegistration(payload);

      let versionId = 1;
      const versionPayload: Protocol.ServiceWorker.ServiceWorkerVersion = {
        registrationId,
        versionId: versionId.toString(),
        scriptURL: '',
        status: Protocol.ServiceWorker.ServiceWorkerVersionStatus.Activated,
        runningStatus: Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Running,
      };
      registration.updateVersion(versionPayload);
      serviceWorkersManager?.dispatchEventToListeners(
          SDK.ServiceWorkerManager.Events.REGISTRATION_UPDATED, registration);
      assert.isFalse(hasRouterField());

      // Update the version with the empty router rules.
      versionId++;
      registration.updateVersion(Object.assign({}, versionPayload, {
        versionId: versionId.toString(),
        routerRules: JSON.stringify([]),
      }));
      registration.updateVersion(versionPayload);
      serviceWorkersManager?.dispatchEventToListeners(
          SDK.ServiceWorkerManager.Events.REGISTRATION_UPDATED, registration);
      assert.isFalse(hasRouterField());
    });

    it('does not show the router field if there is no active version', async () => {
      const payload:
          Protocol.ServiceWorker.ServiceWorkerRegistration = {registrationId, scopeURL: origin, isDeleted: false};
      const registration: SDK.ServiceWorkerManager.ServiceWorkerRegistration =
          new SDK.ServiceWorkerManager.ServiceWorkerRegistration(payload);

      let versionId = 0;
      const versionPayload: Protocol.ServiceWorker.ServiceWorkerVersion = {
        registrationId,
        versionId: versionId.toString(),
        scriptURL: '',
        status: Protocol.ServiceWorker.ServiceWorkerVersionStatus.New,
        runningStatus: Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Starting,
        routerRules: JSON.stringify(routerRules),
      };

      const updateAndDispatchEvent = (status: Protocol.ServiceWorker.ServiceWorkerVersionStatus) => {
        versionId++;
        registration.updateVersion(Object.assign({}, versionPayload, {versionId: versionId.toString(), status}));
        serviceWorkersManager?.dispatchEventToListeners(
            SDK.ServiceWorkerManager.Events.REGISTRATION_UPDATED, registration);
      };

      updateAndDispatchEvent(Protocol.ServiceWorker.ServiceWorkerVersionStatus.New);
      assert.isFalse(hasRouterField());

      updateAndDispatchEvent(Protocol.ServiceWorker.ServiceWorkerVersionStatus.Redundant);
      assert.isFalse(hasRouterField());

      updateAndDispatchEvent(Protocol.ServiceWorker.ServiceWorkerVersionStatus.Installing);
      assert.isFalse(hasRouterField());

      updateAndDispatchEvent(Protocol.ServiceWorker.ServiceWorkerVersionStatus.Installed);
      assert.isFalse(hasRouterField());

      updateAndDispatchEvent(Protocol.ServiceWorker.ServiceWorkerVersionStatus.Activating);
      assert.isTrue(hasRouterField());

      updateAndDispatchEvent(Protocol.ServiceWorker.ServiceWorkerVersionStatus.Activated);
      assert.isTrue(hasRouterField());
    });
  });
});
