// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Lighthouse from '../../../../../front_end/panels/lighthouse/lighthouse.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import {createTarget, stubNoopSettings} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

describeWithMockConnection('LighthouseController', () => {
  const tests = (targetFactory: () => SDK.Target.Target) => {
    let LighthouseModule: typeof Lighthouse;
    let target: SDK.Target.Target;

    beforeEach(async () => {
      stubNoopSettings();
      LighthouseModule = await import('../../../../../front_end/panels/lighthouse/lighthouse.js');
      target = targetFactory();
    });

    it('updates page auditability on service worker registraion', async () => {
      const controller = new LighthouseModule.LighthouseController.LighthouseController(
          sinon.createStubInstance(LighthouseModule.LighthouseProtocolService.ProtocolService));
      const serviceWorkerManager = target.model(SDK.ServiceWorkerManager.ServiceWorkerManager);
      assertNotNullOrUndefined(serviceWorkerManager);
      const pageAuditabilityChange =
          controller.once(LighthouseModule.LighthouseController.Events.PageAuditabilityChanged);
      serviceWorkerManager.dispatchEventToListeners(
          SDK.ServiceWorkerManager.Events.RegistrationUpdated,
          {} as SDK.ServiceWorkerManager.ServiceWorkerRegistration);
      await pageAuditabilityChange;
    });
  };

  describe('without tab target', () => tests(createTarget));
  describe('with tab target', () => tests(() => {
                                const tabTarget = createTarget({type: SDK.Target.Type.Tab});
                                createTarget({parentTarget: tabTarget, subtype: 'prerender'});
                                return createTarget({parentTarget: tabTarget});
                              }));
});
