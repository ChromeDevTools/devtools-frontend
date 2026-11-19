// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as LighthouseModel from '../../models/lighthouse/lighthouse.js';
import {createTarget, describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import * as SettingsUI from '../../ui/settings/settings.js';

import type * as LighthouseModule from './lighthouse.js';

function createCategory(id: string): LighthouseModel.ReporterTypes.CategoryJSON {
  return {
    title: '',
    id,
    score: null,
    manualDescription: '',
    auditRefs: [],
  };
}

function createRunnerResult(): LighthouseModel.ReporterTypes.RunnerResult {
  return {
    lhr: {
      lighthouseVersion: '',
      userAgent: '',
      fetchTime: '',
      timing: {total: 0},
      finalDisplayedUrl: '',
      artifacts: {Trace: {traceEvents: []}},
      audits: {},
      categories: {
        performance: createCategory('performance'),
        accessibility: createCategory('accessibility'),
        'best-practices': createCategory('best-practices'),
        seo: createCategory('seo'),
        'agentic-browsing': createCategory('agentic-browsing'),
      },
      categoryGroups: {},
    },
    artifacts: {
      Trace: {traceEvents: []},
      settings: {throttlingMethod: 'simulate'},
    },
    report: '',
    stack: '',
    fatal: false,
  };
}

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

      Common.Settings.Settings.instance().resolve(SettingsUI.LighthouseSettings.catSeoSettingDescriptor).set(false);
      Common.Settings.Settings.instance().resolve(SettingsUI.LighthouseSettings.catPerfSettingDescriptor).set(true);

      const categories = controller.getCategoryIDs();
      assert.isFalse(categories.includes('seo'));
      assert.isTrue(categories.includes('performance'));
    });

    it('returns all supported categories for navigation mode when isAIControlled is true regardless of settings',
       () => {
         const protocolService = sinon.createStubInstance(Lighthouse.LighthouseProtocolService.ProtocolService);
         const controller = new Lighthouse.LighthouseController.LighthouseController(protocolService);

         Common.Settings.Settings.instance().resolve(SettingsUI.LighthouseSettings.catSeoSettingDescriptor).set(false);
         Common.Settings.Settings.instance().resolve(SettingsUI.LighthouseSettings.catPerfSettingDescriptor).set(false);

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

  describe('error recovery', () => {
    it('rejects startLighthouse when the run fails to start, and starts the next run', async () => {
      const protocolService = sinon.createStubInstance(Lighthouse.LighthouseProtocolService.ProtocolService);
      protocolService.attach.onFirstCall().rejects(new Error('attach failed'));
      const controller = new Lighthouse.LighthouseController.LighthouseController(protocolService);

      const startError = await controller.startLighthouse({mode: 'snapshot'}).then(() => null, (err: unknown) => err);
      assert.instanceOf(startError, Error);
      assert.strictEqual(startError.message, 'attach failed');

      await controller.startLighthouse({mode: 'snapshot'});
      assert.exists(controller.getCurrentRun());
    });

    it('resolves cancelLighthouse after a run failed to start', async () => {
      const protocolService = sinon.createStubInstance(Lighthouse.LighthouseProtocolService.ProtocolService);
      protocolService.attach.rejects(new Error('attach failed'));
      const controller = new Lighthouse.LighthouseController.LighthouseController(protocolService);

      const startError = await controller.startLighthouse({mode: 'snapshot'}).then(() => null, (err: unknown) => err);
      assert.instanceOf(startError, Error);

      const cancelOutcome = await Promise.race([
        controller.cancelLighthouse().then(() => 'resolved'),
        new Promise(resolve => setTimeout(() => resolve('pending'), 0)),
      ]);
      assert.strictEqual(cancelOutcome, 'resolved');
    });
  });

  describe('CPU throttling isolation', () => {
    it('resets CPU throttling during a run and restores it on completion', async () => {
      const cpuThrottlingManager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance();
      cpuThrottlingManager.setCPUThrottlingRate(4);

      let rateDuringAttach: number|undefined;
      let rateDuringDetach: number|undefined;
      const protocolService = sinon.createStubInstance(Lighthouse.LighthouseProtocolService.ProtocolService);
      protocolService.attach.callsFake(async () => {
        rateDuringAttach = cpuThrottlingManager.cpuThrottlingRate();
      });
      protocolService.detach.callsFake(async () => {
        rateDuringDetach = cpuThrottlingManager.cpuThrottlingRate();
      });
      protocolService.collectLighthouseResults.resolves(createRunnerResult());
      const controller = new Lighthouse.LighthouseController.LighthouseController(protocolService);

      await controller.startLighthouse({mode: 'snapshot'});
      assert.strictEqual(rateDuringAttach, 1);
      assert.strictEqual(cpuThrottlingManager.cpuThrottlingRate(), 1);

      await controller.collectLighthouseResults();
      assert.strictEqual(rateDuringDetach, 1);
      assert.strictEqual(cpuThrottlingManager.cpuThrottlingRate(), 4);
    });

    it('restores CPU throttling when a run is cancelled', async () => {
      const cpuThrottlingManager = SDK.CPUThrottlingManager.CPUThrottlingManager.instance();
      cpuThrottlingManager.setCPUThrottlingRate(4);

      const protocolService = sinon.createStubInstance(Lighthouse.LighthouseProtocolService.ProtocolService);
      const controller = new Lighthouse.LighthouseController.LighthouseController(protocolService);

      await controller.startLighthouse({mode: 'snapshot'});
      assert.strictEqual(cpuThrottlingManager.cpuThrottlingRate(), 1);

      await controller.cancelLighthouse();
      assert.strictEqual(cpuThrottlingManager.cpuThrottlingRate(), 4);
    });
  });
});
