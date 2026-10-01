// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import type * as LighthouseModule from './lighthouse.js';

describeWithEnvironment('LighthouseController', () => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  let Lighthouse: typeof LighthouseModule;
  let target: SDK.Target.Target;

  beforeEach(async function() {
    if (this.timeout() > 0) {
      this.timeout(45_000);
    }
    Lighthouse = await import('./lighthouse.js');
    Lighthouse.LighthouseController.clearSettingsCacheForTest();
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    target = createTarget({parentTarget: tabTarget});
  });

  it('updates page auditability on service worker registraion', async () => {
    const controller = new Lighthouse.LighthouseController.LighthouseController(
        sinon.createStubInstance(Lighthouse.LighthouseProtocolService.ProtocolService));
    const serviceWorkerManager = target.model(SDK.ServiceWorkerManager.ServiceWorkerManager);
    assert.exists(serviceWorkerManager);
    const pageAuditabilityChange = controller.once(Lighthouse.LighthouseController.Events.PageAuditabilityChanged);
    serviceWorkerManager.dispatchEventToListeners(SDK.ServiceWorkerManager.Events.REGISTRATION_UPDATED,
                                                  {} as SDK.ServiceWorkerManager.ServiceWorkerRegistration);
    await pageAuditabilityChange;
  });

  it('uses mode override', async () => {
    const protocolService = sinon.createStubInstance(Lighthouse.LighthouseProtocolService.ProtocolService);
    const controller = new Lighthouse.LighthouseController.LighthouseController(protocolService);

    await controller.startLighthouse({mode: 'snapshot'});

    const flags = controller.getCurrentRun()?.flags;
    assert.strictEqual(flags?.mode, 'snapshot');
  });

  describe('getCategoryIDs', () => {
    it('returns categories matching user settings when isAIControlled is not set', () => {
      const protocolService = sinon.createStubInstance(Lighthouse.LighthouseProtocolService.ProtocolService);
      const controller = new Lighthouse.LighthouseController.LighthouseController(protocolService);

      Common.Settings.Settings.instance().moduleSetting('lighthouse.cat-seo').set(false);
      Common.Settings.Settings.instance().moduleSetting('lighthouse.cat-perf').set(true);

      const categories = controller.getCategoryIDs();
      assert.isFalse(categories.includes('seo'));
      assert.isTrue(categories.includes('performance'));
    });

    it('returns all supported categories for navigation mode when isAIControlled is true regardless of settings',
       () => {
         const protocolService = sinon.createStubInstance(Lighthouse.LighthouseProtocolService.ProtocolService);
         const controller = new Lighthouse.LighthouseController.LighthouseController(protocolService);

         Common.Settings.Settings.instance().moduleSetting('lighthouse.cat-seo').set(false);
         Common.Settings.Settings.instance().moduleSetting('lighthouse.cat-perf').set(false);

         const categoriesNoAI = controller.getCategoryIDs({isAIControlled: false, mode: 'navigation'});
         assert.deepEqual(categoriesNoAI, ['accessibility', 'best-practices']);

         // AI-controlled runs intentionally exclude the experimental 'agentic-browsing' category.
         const categoriesWithAi = controller.getCategoryIDs({isAIControlled: true, mode: 'navigation'});
         assert.deepEqual(categoriesWithAi, ['performance', 'accessibility', 'best-practices', 'seo']);
       });

    it('returns all supported categories for snapshot mode when isAIControlled is true', () => {
      const protocolService = sinon.createStubInstance(Lighthouse.LighthouseProtocolService.ProtocolService);
      const controller = new Lighthouse.LighthouseController.LighthouseController(protocolService);

      const categories = controller.getCategoryIDs({isAIControlled: true, mode: 'snapshot'});
      assert.deepEqual(categories, ['performance', 'accessibility', 'best-practices', 'seo']);
    });

    it('returns only timespan-supported categories for timespan mode when isAIControlled is true', () => {
      const protocolService = sinon.createStubInstance(Lighthouse.LighthouseProtocolService.ProtocolService);
      const controller = new Lighthouse.LighthouseController.LighthouseController(protocolService);

      const categories = controller.getCategoryIDs({isAIControlled: true, mode: 'timespan'});
      assert.deepEqual(categories, ['performance', 'best-practices']);
    });
  });

  describe('startLighthouse with overrides', () => {
    it('resolves mode-supported categories when isAIControlled is true in timespan mode', async () => {
      const protocolService = sinon.createStubInstance(Lighthouse.LighthouseProtocolService.ProtocolService);
      const controller = new Lighthouse.LighthouseController.LighthouseController(protocolService);

      await controller.startLighthouse({isAIControlled: true, mode: 'timespan'});
      assert.deepEqual(controller.getCurrentRun()?.categoryIDs, ['performance', 'best-practices']);
    });

    it('resolves mode-supported categories when isAIControlled is true in snapshot mode', async () => {
      const protocolService = sinon.createStubInstance(Lighthouse.LighthouseProtocolService.ProtocolService);
      const controller = new Lighthouse.LighthouseController.LighthouseController(protocolService);

      await controller.startLighthouse({isAIControlled: true, mode: 'snapshot'});
      assert.deepEqual(
          controller.getCurrentRun()?.categoryIDs,
          ['performance', 'accessibility', 'best-practices', 'seo'],
      );
    });

    it('uses explicit categoryIds override when provided even in AI mode', async () => {
      const protocolService = sinon.createStubInstance(Lighthouse.LighthouseProtocolService.ProtocolService);
      const controller = new Lighthouse.LighthouseController.LighthouseController(protocolService);

      await controller.startLighthouse({isAIControlled: true, categoryIds: ['accessibility']});
      assert.deepEqual(controller.getCurrentRun()?.categoryIDs, ['accessibility']);
    });
  });
});
