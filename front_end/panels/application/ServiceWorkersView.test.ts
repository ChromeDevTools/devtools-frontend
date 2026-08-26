// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as Application from './application.js';

describeWithEnvironment('ServiceWorkersView', () => {
  let target: SDK.Target.Target;
  let view: Application.ServiceWorkersView.ServiceWorkersView;

  beforeEach(() => {
    Application.ServiceWorkersView.setThrottleDisabledForDebugging(true);
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    target = createTarget({parentTarget: tabTarget});
    sinon.stub(SDK.TargetManager.TargetManager.instance(), 'primaryPageTarget').returns(target);
    Common.Settings.registerSettingExtension({
      category: Common.Settings.SettingCategory.MOBILE,
      settingName: 'service-worker-update-on-reload',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
    });
  });

  afterEach(() => {
    view.detach();
  });

  it('shows service worker registrations', async () => {
    view = new Application.ServiceWorkersView.ServiceWorkersView();
    renderElementIntoDOM(view, {includeCommonStyles: true});
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

    await view.updateComplete;

    const sectionTitle = view.contentElement.querySelector('devtools-report-section-header');
    assert.exists(sectionTitle);
    assert.include(sectionTitle.textContent, SCOPE_URL);
    await assertScreenshot('application/service-workers-view-basic.png');
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
      return Array.from(view.contentElement.querySelectorAll('.report-field')).some(field => {
        return field.querySelector('.report-field-name')?.textContent === 'Routers';
      });
    };

    beforeEach(() => {

      view = new Application.ServiceWorkersView.ServiceWorkersView();
      renderElementIntoDOM(view);

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
      await view.updateComplete;
      assert.isTrue(hasRouterField());
    });

    it('shows the router field if active version has at least one typed router rule', async () => {
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
        typedRouterRules: [
          {
            condition: {urlPattern: '/foo/bar'},
            source: {type: Protocol.ServiceWorker.ServiceWorkerRouterSourceType.Network},
            id: 1,
          },
        ],
      };
      registration.updateVersion(versionPayload);
      serviceWorkersManager?.dispatchEventToListeners(SDK.ServiceWorkerManager.Events.REGISTRATION_UPDATED,
                                                      registration);
      await view.updateComplete;
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
      await view.updateComplete;
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
      await view.updateComplete;
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

      const updateAndDispatchEvent = async (status: Protocol.ServiceWorker.ServiceWorkerVersionStatus) => {
        versionId++;
        registration.updateVersion(Object.assign({}, versionPayload, {versionId: versionId.toString(), status}));
        serviceWorkersManager?.dispatchEventToListeners(
            SDK.ServiceWorkerManager.Events.REGISTRATION_UPDATED, registration);
        await view.updateComplete;
      };

      await updateAndDispatchEvent(Protocol.ServiceWorker.ServiceWorkerVersionStatus.New);
      assert.isFalse(hasRouterField());

      await updateAndDispatchEvent(Protocol.ServiceWorker.ServiceWorkerVersionStatus.Redundant);
      assert.isFalse(hasRouterField());

      await updateAndDispatchEvent(Protocol.ServiceWorker.ServiceWorkerVersionStatus.Installing);
      assert.isFalse(hasRouterField());

      await updateAndDispatchEvent(Protocol.ServiceWorker.ServiceWorkerVersionStatus.Installed);
      assert.isFalse(hasRouterField());

      await updateAndDispatchEvent(Protocol.ServiceWorker.ServiceWorkerVersionStatus.Activating);
      assert.isTrue(hasRouterField());

      await updateAndDispatchEvent(Protocol.ServiceWorker.ServiceWorkerVersionStatus.Activated);
      assert.isTrue(hasRouterField());
    });
  });

  it('shows active worker when registration has both active and redundant workers', async () => {
    Application.ServiceWorkersView.setThrottleDisabledForDebugging(true);
    view = new Application.ServiceWorkersView.ServiceWorkersView();
    renderElementIntoDOM(view);
    const serviceWorkersManager = target.model(SDK.ServiceWorkerManager.ServiceWorkerManager);
    assert.exists(serviceWorkersManager);
    const securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager);
    assert.exists(securityOriginManager);

    const SCOPE = 'https://example.com/scope/';
    const registration = new SDK.ServiceWorkerManager.ServiceWorkerRegistration({
      registrationId: 'sw-1' as Protocol.ServiceWorker.RegistrationID,
      scopeURL: SCOPE,
      isDeleted: false,
    });

    sinon.stub(securityOriginManager, 'securityOrigins').returns([registration.securityOrigin]);

    // Add redundant version
    registration.updateVersion({
      registrationId: 'sw-1' as Protocol.ServiceWorker.RegistrationID,
      versionId: '1',
      scriptURL: 'https://example.com/sw.js',
      status: Protocol.ServiceWorker.ServiceWorkerVersionStatus.Redundant,
      runningStatus: Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Stopped,
    });

    // Add active version
    registration.updateVersion({
      registrationId: 'sw-1' as Protocol.ServiceWorker.RegistrationID,
      versionId: '2',
      scriptURL: 'https://example.com/sw.js',
      status: Protocol.ServiceWorker.ServiceWorkerVersionStatus.Activated,
      runningStatus: Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Running,
    });

    serviceWorkersManager.dispatchEventToListeners(SDK.ServiceWorkerManager.Events.REGISTRATION_UPDATED, registration);
    await view.updateComplete;

    const content = view.contentElement.textContent;
    assert.include(content, SCOPE);
    assert.include(content, '#2 activated');
    assert.notInclude(content, '#1 is redundant');
  });

  it('handles multiple service worker registrations and updates', async () => {
    Application.ServiceWorkersView.setThrottleDisabledForDebugging(true);
    view = new Application.ServiceWorkersView.ServiceWorkersView();
    renderElementIntoDOM(view);
    const serviceWorkersManager = target.model(SDK.ServiceWorkerManager.ServiceWorkerManager);
    assert.exists(serviceWorkersManager);
    const securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager);
    assert.exists(securityOriginManager);

    const SCOPE_1 = 'https://example.com/scope1/';
    const SCOPE_2 = 'https://example.com/scope2/';

    // Dispatch registration 1
    const registration1 = new SDK.ServiceWorkerManager.ServiceWorkerRegistration({
      registrationId: 'sw-1' as Protocol.ServiceWorker.RegistrationID,
      scopeURL: SCOPE_1,
      isDeleted: false,
    });

    sinon.stub(securityOriginManager, 'securityOrigins').returns([registration1.securityOrigin]);
    registration1.updateVersion({
      registrationId: 'sw-1' as Protocol.ServiceWorker.RegistrationID,
      versionId: '101',
      scriptURL: 'https://example.com/sw1.js',
      status: Protocol.ServiceWorker.ServiceWorkerVersionStatus.Activated,
      runningStatus: Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Running,
    });
    serviceWorkersManager.dispatchEventToListeners(SDK.ServiceWorkerManager.Events.REGISTRATION_UPDATED, registration1);
    await view.updateComplete;

    // Dispatch registration 2
    const registration2 = new SDK.ServiceWorkerManager.ServiceWorkerRegistration({
      registrationId: 'sw-2' as Protocol.ServiceWorker.RegistrationID,
      scopeURL: SCOPE_2,
      isDeleted: false,
    });
    registration2.updateVersion({
      registrationId: 'sw-2' as Protocol.ServiceWorker.RegistrationID,
      versionId: '201',
      scriptURL: 'https://example.com/sw2.js',
      status: Protocol.ServiceWorker.ServiceWorkerVersionStatus.Activated,
      runningStatus: Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Running,
    });
    serviceWorkersManager.dispatchEventToListeners(SDK.ServiceWorkerManager.Events.REGISTRATION_UPDATED, registration2);
    await view.updateComplete;
    let content = view.contentElement.textContent;
    assert.include(content, SCOPE_1);
    assert.include(content, '#101 activated');
    assert.include(content, SCOPE_2);
    assert.include(content, '#201 activated');

    // Make registration 1 redundant and deleted
    registration1.update({
      registrationId: 'sw-1' as Protocol.ServiceWorker.RegistrationID,
      scopeURL: SCOPE_1,
      isDeleted: true,
    });
    registration1.updateVersion({
      registrationId: 'sw-1' as Protocol.ServiceWorker.RegistrationID,
      versionId: '101',
      scriptURL: 'https://example.com/sw1.js',
      status: Protocol.ServiceWorker.ServiceWorkerVersionStatus.Redundant,
      runningStatus: Protocol.ServiceWorker.ServiceWorkerVersionRunningStatus.Stopped,
    });
    serviceWorkersManager.dispatchEventToListeners(SDK.ServiceWorkerManager.Events.REGISTRATION_UPDATED, registration1);
    await view.updateComplete;

    content = view.contentElement.textContent;
    assert.include(content, `${SCOPE_1} - deleted`);
    assert.include(content, '#101 is redundant');
    assert.include(content, SCOPE_2);
    assert.include(content, '#201 activated');

    // Delete registration 1
    serviceWorkersManager.dispatchEventToListeners(SDK.ServiceWorkerManager.Events.REGISTRATION_DELETED, registration1);
    await view.updateComplete;
    content = view.contentElement.textContent;
    assert.notInclude(content, SCOPE_1);
    assert.include(content, SCOPE_2);
  });
});
