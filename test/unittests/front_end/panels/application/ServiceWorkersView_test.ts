// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Application from '../../../../../front_end/panels/application/application.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

const {assert} = chai;

describeWithMockConnection('ServiceWorkersView', () => {
  const tests = (targetFactory: () => SDK.Target.Target) => {
    let target: SDK.Target.Target;
    let view: Application.ServiceWorkersView.ServiceWorkersView;

    beforeEach(() => {
      target = targetFactory();
    });

    afterEach(() => {
      view.detach();
    });

    it('shows service worker registrations', async () => {
      view = new Application.ServiceWorkersView.ServiceWorkersView();
      view.markAsRoot();
      view.show(document.body);
      const serviceWorkersManager = target.model(SDK.ServiceWorkerManager.ServiceWorkerManager);
      assertNotNullOrUndefined(serviceWorkersManager);
      const securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager);
      assertNotNullOrUndefined(securityOriginManager);
      const ORIGIN = 'example.com';
      sinon.stub(securityOriginManager, 'securityOrigins').returns([ORIGIN]);
      const SCOPE_URL = 'SCOPE_URL';
      serviceWorkersManager.dispatchEventToListeners(SDK.ServiceWorkerManager.Events.RegistrationUpdated, {
        scopeURL: SCOPE_URL,
        securityOrigin: ORIGIN,
        versionsByMode: () => new Map(),
        fingerprint: () => {},
      } as SDK.ServiceWorkerManager.ServiceWorkerRegistration);

      const sectionTitle = view.currentWorkersView.contentElement.querySelector('.report-section-title');
      assertNotNullOrUndefined(sectionTitle);
      assert.strictEqual(sectionTitle.textContent, SCOPE_URL);
    });
  };

  describe('without tab target', () => tests(createTarget));
  describe('with tab target', () => tests(() => {
                                const tabTarget = createTarget({type: SDK.Target.Type.Tab});
                                createTarget({parentTarget: tabTarget, subtype: 'prerender'});
                                return createTarget({parentTarget: tabTarget});
                              }));
});
