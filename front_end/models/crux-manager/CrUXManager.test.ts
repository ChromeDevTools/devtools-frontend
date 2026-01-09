// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as EmulationModel from '../../models/emulation/emulation.js';
import {createTarget, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';

import * as CrUXManager from './crux-manager.js';

const {urlString} = Platform.DevToolsPath;

export function mockResponse(
    scopes: {pageScope: CrUXManager.PageScope, deviceScope: CrUXManager.DeviceScope}|null =
        null): CrUXManager.CrUXResponse {
  return {
    record: {
      key: {},
      metrics: {
        largest_contentful_paint: {
          histogram: [
            {start: 0, end: 2500, density: 0.5},
            {start: 2500, end: 4000, density: 0.3},
            {start: 4000, density: 0.2},
          ],
          percentiles: {p75: 1000},
          // @ts-expect-error
          testScopes: scopes,
        },
        cumulative_layout_shift: {
          histogram: [
            {start: 0, end: 0.1, density: 0.1},
            {start: 0.1, end: 0.25, density: 0.1},
            {start: 0.25, density: 0.8},
          ],
          percentiles: {p75: 0.25},
          // @ts-expect-error
          testScopes: scopes,
        },
      },
      collectionPeriod: {
        firstDate: {year: 2024, month: 1, day: 1},
        lastDate: {year: 2024, month: 1, day: 29},
      },
    },
  };
}

async function triggerMicroTaskQueue(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
}

describe('CrUXManager', () => {
  let cruxManager: CrUXManager.CrUXManager;
  let target: SDK.Target.Target;
  let resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel;
  let mockFetch: sinon.SinonStub;
  let mockConsoleError: sinon.SinonStub;

  setupRuntimeHooks();
  setupSettingsHooks();
  setupLocaleHooks();

  beforeEach(async () => {
    SDK.TargetManager.TargetManager.instance({forceNew: true});
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    target = createTarget({parentTarget: tabTarget});
    target.setInspectedURL(urlString`https://example.com/inspected`);
    resourceTreeModel =
        target.model(SDK.ResourceTreeModel.ResourceTreeModel) as SDK.ResourceTreeModel.ResourceTreeModel;
    cruxManager = CrUXManager.CrUXManager.instance({forceNew: true});
    mockFetch = sinon.stub(globalThis, 'fetch');
    mockConsoleError = sinon.stub(console, 'error');
    EmulationModel.DeviceModeModel.DeviceModeModel.instance({forceNew: true});
  });

  afterEach(() => {
    mockFetch?.restore();
    mockConsoleError?.restore();
    cruxManager?.getConfigSetting().set({enabled: false});
  });

  describe('storing the user consent', () => {
    it('uses global storage if the user is not in an OffTheRecord profile', async () => {
      updateHostConfig({isOffTheRecord: false});
      const dummyStorage = new Common.Settings.SettingsStorage({});
      const globalStorage = new Common.Settings.SettingsStorage({});

      Common.Settings.Settings.instance({
        forceNew: true,
        syncedStorage: dummyStorage,
        globalStorage,
        localStorage: dummyStorage,
        settingRegistrations: Common.SettingRegistration.getRegisteredSettings(),
      });
      const manager = CrUXManager.CrUXManager.instance({forceNew: true});
      manager.getConfigSetting().set({enabled: true});
      assert.isTrue(globalStorage.has(manager.getConfigSetting().name));
    });

    it('uses session storage if the user is in an OffTheRecord profile', async () => {
      updateHostConfig({isOffTheRecord: true});
      const dummyStorage = new Common.Settings.SettingsStorage({});

      Common.Settings.Settings.instance({
        forceNew: true,
        syncedStorage: dummyStorage,
        globalStorage: dummyStorage,
        localStorage: dummyStorage,
        settingRegistrations: Common.SettingRegistration.getRegisteredSettings(),
      });
      const manager = CrUXManager.CrUXManager.instance({forceNew: true});
      manager.getConfigSetting().set({enabled: true});
      // SessionStorage is created and managed internally to the Settings
      // class, and is a private instance variable, so we cannot actually
      // assert that it contains the value. Best we can do here is to assert
      // that it did not use the dummy storage, which means that it must have
      // used session storage as those are the 4 available storage types.
      assert.isFalse(dummyStorage.has(manager.getConfigSetting().name));
    });
  });

  it('isEnabled() returns if the user has consented)', async () => {
    const manager = CrUXManager.CrUXManager.instance({forceNew: true});
    manager.getConfigSetting().set({enabled: true});
    assert.isTrue(manager.isEnabled());
    manager.getConfigSetting().set({enabled: false});
    assert.isFalse(manager.isEnabled());
  });

  describe('getFieldDataForPage', () => {
    it('should request data for all scopes', async () => {
      mockFetch.callsFake(async () => new Response(JSON.stringify(mockResponse()), {
                            status: 200,
                          }));
      const pageResult = await cruxManager.getFieldDataForPage('https://example.com');

      const fetchBodies = mockFetch.getCalls()
                              .map(call => call.args[1].body)
                              .sort()
                              .map(body => JSON.parse(body) as CrUXManager.CrUXRequest);

      assert.deepEqual(pageResult, {
        'origin-ALL': mockResponse(),
        'origin-DESKTOP': mockResponse(),
        'origin-PHONE': mockResponse(),
        'origin-TABLET': null,
        'url-ALL': mockResponse(),
        'url-DESKTOP': mockResponse(),
        'url-PHONE': mockResponse(),
        'url-TABLET': null,
        warnings: [],
        normalizedUrl: 'https://example.com/',
      });

      assert.deepEqual(fetchBodies, [
        {
          formFactor: 'DESKTOP',
          metrics: [
            'first_contentful_paint',
            'largest_contentful_paint',
            'cumulative_layout_shift',
            'interaction_to_next_paint',
            'round_trip_time',
            'form_factors',
            'largest_contentful_paint_image_time_to_first_byte',
            'largest_contentful_paint_image_resource_load_delay',
            'largest_contentful_paint_image_resource_load_duration',
            'largest_contentful_paint_image_element_render_delay',
          ],
          origin: 'https://example.com',
        },
        {
          formFactor: 'PHONE',
          metrics: [
            'first_contentful_paint',
            'largest_contentful_paint',
            'cumulative_layout_shift',
            'interaction_to_next_paint',
            'round_trip_time',
            'form_factors',
            'largest_contentful_paint_image_time_to_first_byte',
            'largest_contentful_paint_image_resource_load_delay',
            'largest_contentful_paint_image_resource_load_duration',
            'largest_contentful_paint_image_element_render_delay',
          ],
          origin: 'https://example.com',
        },
        {
          metrics: [
            'first_contentful_paint',
            'largest_contentful_paint',
            'cumulative_layout_shift',
            'interaction_to_next_paint',
            'round_trip_time',
            'form_factors',
            'largest_contentful_paint_image_time_to_first_byte',
            'largest_contentful_paint_image_resource_load_delay',
            'largest_contentful_paint_image_resource_load_duration',
            'largest_contentful_paint_image_element_render_delay',
          ],
          origin: 'https://example.com',
        },
        {
          formFactor: 'DESKTOP',
          metrics: [
            'first_contentful_paint',
            'largest_contentful_paint',
            'cumulative_layout_shift',
            'interaction_to_next_paint',
            'round_trip_time',
            'form_factors',
            'largest_contentful_paint_image_time_to_first_byte',
            'largest_contentful_paint_image_resource_load_delay',
            'largest_contentful_paint_image_resource_load_duration',
            'largest_contentful_paint_image_element_render_delay',
          ],
          url: 'https://example.com/',
        },
        {
          formFactor: 'PHONE',
          metrics: [
            'first_contentful_paint',
            'largest_contentful_paint',
            'cumulative_layout_shift',
            'interaction_to_next_paint',
            'round_trip_time',
            'form_factors',
            'largest_contentful_paint_image_time_to_first_byte',
            'largest_contentful_paint_image_resource_load_delay',
            'largest_contentful_paint_image_resource_load_duration',
            'largest_contentful_paint_image_element_render_delay',
          ],
          url: 'https://example.com/',
        },
        {
          metrics: [
            'first_contentful_paint',
            'largest_contentful_paint',
            'cumulative_layout_shift',
            'interaction_to_next_paint',
            'round_trip_time',
            'form_factors',
            'largest_contentful_paint_image_time_to_first_byte',
            'largest_contentful_paint_image_resource_load_delay',
            'largest_contentful_paint_image_resource_load_duration',
            'largest_contentful_paint_image_element_render_delay',
          ],
          url: 'https://example.com/',
        },
      ]);
    });

    it('should return null for all scopes if no data is found', async () => {
      mockFetch.callsFake(async () => new Response('{"error": {"status": "NOT_FOUND"}}', {
                            status: 404,
                          }));
      const pageResult = await cruxManager.getFieldDataForPage('https://example.com');
      assert.deepEqual(pageResult, {
        'origin-ALL': null,
        'origin-DESKTOP': null,
        'origin-PHONE': null,
        'origin-TABLET': null,
        'url-ALL': null,
        'url-DESKTOP': null,
        'url-PHONE': null,
        'url-TABLET': null,
        warnings: [],
        normalizedUrl: 'https://example.com/',
      });
    });

    it('should cache responses', async () => {
      mockFetch.callsFake(async () => new Response(JSON.stringify(mockResponse()), {
                            status: 200,
                          }));

      await cruxManager.getFieldDataForPage('https://example.com');

      sinon.assert.callCount(mockFetch, 6);

      await cruxManager.getFieldDataForPage('https://example.com');

      sinon.assert.callCount(mockFetch, 6);
    });

    it('should cache "NOT_FOUND" responses', async () => {
      mockFetch.callsFake(async () => new Response('{"error": {"status": "NOT_FOUND"}}', {
                            status: 404,
                          }));

      await cruxManager.getFieldDataForPage('https://example.com');

      sinon.assert.callCount(mockFetch, 6);

      await cruxManager.getFieldDataForPage('https://example.com');

      sinon.assert.callCount(mockFetch, 6);
    });

    it('should not cache error responses', async () => {
      mockFetch.callsFake(async () => new Response('', {
                            status: 500,
                          }));

      await cruxManager.getFieldDataForPage('https://example.com');

      sinon.assert.callCount(mockFetch, 6);
      sinon.assert.callCount(mockConsoleError, 6);

      await cruxManager.getFieldDataForPage('https://example.com');

      sinon.assert.callCount(mockFetch, 12);
      sinon.assert.callCount(mockConsoleError, 12);
    });

    it('should ignore hash and search params for caching', async () => {
      mockFetch.callsFake(async () => new Response(JSON.stringify(mockResponse()), {
                            status: 200,
                          }));

      await cruxManager.getFieldDataForPage('https://example.com#hash');

      sinon.assert.callCount(mockFetch, 6);

      await cruxManager.getFieldDataForPage('https://example.com?search');

      sinon.assert.callCount(mockFetch, 6);
    });

    it('should exit early for localhost and non-public URLs', async () => {
      mockFetch.callsFake(async () => new Response(JSON.stringify(mockResponse()), {
                            status: 200,
                          }));

      await cruxManager.getFieldDataForPage('https://localhost:8080/');
      await cruxManager.getFieldDataForPage('https://127.0.0.1:8000/');
      await cruxManager.getFieldDataForPage('about:blank');
      await cruxManager.getFieldDataForPage('chrome://tracing');
      await cruxManager.getFieldDataForPage('chrome-extension://sdkfsddsdsisdof/dashboard.html');

      sinon.assert.callCount(mockFetch, 0);
    });
  });

  describe('getFieldDataForCurrentPage', () => {
    let getFieldDataMock: sinon.SinonStub;

    beforeEach(() => {
      getFieldDataMock = sinon.stub(cruxManager, 'getFieldDataForPage');
      getFieldDataMock.resolves({
        'origin-ALL': mockResponse({pageScope: 'origin', deviceScope: 'ALL'}),
        'origin-DESKTOP': mockResponse({pageScope: 'origin', deviceScope: 'DESKTOP'}),
        'origin-PHONE': mockResponse({pageScope: 'origin', deviceScope: 'PHONE'}),
        'origin-TABLET': null,
        'url-ALL': mockResponse({pageScope: 'url', deviceScope: 'ALL'}),
        'url-DESKTOP': mockResponse({pageScope: 'url', deviceScope: 'DESKTOP'}),
        'url-PHONE': mockResponse({pageScope: 'url', deviceScope: 'PHONE'}),
        'url-TABLET': null,
        warnings: [],
        normalizedUrl: '',
      });
    });

    afterEach(() => {
      getFieldDataMock.restore();
    });

    it('should use main document URL if available', async () => {
      resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameNavigated, {
        url: 'https://example.com/main/',
        isPrimaryFrame: () => true,
      } as SDK.ResourceTreeModel.ResourceTreeFrame);
      resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameNavigated, {
        url: 'https://example.com/frame/',
        isPrimaryFrame: () => false,
      } as SDK.ResourceTreeModel.ResourceTreeFrame);

      const result = await cruxManager.getFieldDataForCurrentPageForTesting();

      assert.deepEqual(result.warnings, []);
      sinon.assert.callCount(getFieldDataMock, 1);
      assert.strictEqual(getFieldDataMock.firstCall.args[0], 'https://example.com/main/');
    });

    it('should use URL override if set', async () => {
      target.setInspectedURL(urlString`https://example.com/inspected`);
      cruxManager.getConfigSetting().set(
          {enabled: false, override: 'https://example.com/override', overrideEnabled: true});

      const result = await cruxManager.getFieldDataForCurrentPageForTesting();

      assert.deepEqual(result.warnings, ['Field metrics are configured for a different URL than the current page.']);
      sinon.assert.callCount(getFieldDataMock, 1);
      assert.strictEqual(getFieldDataMock.firstCall.args[0], 'https://example.com/override');
    });

    it('should use origin map if set', async () => {
      target.setInspectedURL(urlString`http://localhost:8080/inspected?param`);
      cruxManager.getConfigSetting().set({
        enabled: false,
        originMappings: [{
          developmentOrigin: 'http://localhost:8080',
          productionOrigin: 'https://example.com',
        }],
      });

      const result = await cruxManager.getFieldDataForCurrentPageForTesting();

      assert.deepEqual(result.warnings, ['Field metrics are configured for a different URL than the current page.']);
      sinon.assert.callCount(getFieldDataMock, 1);
      assert.strictEqual(getFieldDataMock.firstCall.args[0], 'https://example.com/inspected');
    });

    it('should not use origin map if URL override is set', async () => {
      target.setInspectedURL(urlString`http://localhost:8080/inspected?param`);
      cruxManager.getConfigSetting().set({
        enabled: false,
        override: 'https://google.com',
        overrideEnabled: true,
        originMappings: [{
          developmentOrigin: 'http://localhost:8080',
          productionOrigin: 'https://example.com',
        }],
      });

      const result = await cruxManager.getFieldDataForCurrentPageForTesting();

      assert.deepEqual(result.warnings, ['Field metrics are configured for a different URL than the current page.']);
      sinon.assert.callCount(getFieldDataMock, 1);
      assert.strictEqual(getFieldDataMock.firstCall.args[0], 'https://google.com');
    });

    it('should use inspected URL if main document is unavailable', async () => {
      target.setInspectedURL(urlString`https://example.com/inspected`);

      const result = await cruxManager.getFieldDataForCurrentPageForTesting();

      assert.deepEqual(result.warnings, []);
      sinon.assert.callCount(getFieldDataMock, 1);
      assert.strictEqual(getFieldDataMock.firstCall.args[0], 'https://example.com/inspected');
    });

    it('should wait for inspected URL if main document and inspected URL are unavailable', async () => {
      target.setInspectedURL(Platform.DevToolsPath.EmptyUrlString);

      const finishPromise = cruxManager.getFieldDataForCurrentPageForTesting();

      await triggerMicroTaskQueue();

      target.setInspectedURL(urlString`https://example.com/awaitInspected`);

      const result = await finishPromise;

      assert.deepEqual(result.warnings, []);
      sinon.assert.callCount(getFieldDataMock, 1);
      assert.strictEqual(getFieldDataMock.firstCall.args[0], 'https://example.com/awaitInspected');
    });

    it('getSelectedFieldMetricData - should take from selected page scope', async () => {
      cruxManager.getConfigSetting().set({enabled: true});
      await cruxManager.refresh();

      let data: CrUXManager.MetricResponse|undefined;

      cruxManager.fieldPageScope = 'origin';
      data = cruxManager.getSelectedFieldMetricData('largest_contentful_paint');
      assert.strictEqual(data?.percentiles?.p75, 1000);
      // @ts-expect-error
      assert.strictEqual(data?.testScopes.pageScope, 'origin');

      cruxManager.fieldPageScope = 'url';
      data = cruxManager.getSelectedFieldMetricData('largest_contentful_paint');
      assert.strictEqual(data?.percentiles?.p75, 1000);
      // @ts-expect-error
      assert.strictEqual(data?.testScopes.pageScope, 'url');
    });

    it('should take from selected device scope', async () => {
      cruxManager.getConfigSetting().set({enabled: true});
      await cruxManager.refresh();
      cruxManager.fieldPageScope = 'url';

      let data: CrUXManager.MetricResponse|undefined;

      cruxManager.fieldDeviceOption = 'ALL';
      data = cruxManager.getSelectedFieldMetricData('largest_contentful_paint');
      assert.strictEqual(data?.percentiles?.p75, 1000);
      // @ts-expect-error
      assert.strictEqual(data?.testScopes?.deviceScope, 'ALL');

      cruxManager.fieldDeviceOption = 'PHONE';
      data = cruxManager.getSelectedFieldMetricData('largest_contentful_paint');
      assert.strictEqual(data?.percentiles?.p75, 1000);
      // @ts-expect-error
      assert.strictEqual(data?.testScopes?.deviceScope, 'PHONE');
    });

    it('auto device option should chose based on emulation', async () => {
      cruxManager.fieldDeviceOption = 'AUTO';
      assert.strictEqual(cruxManager.getSelectedDeviceScope(), 'ALL');

      cruxManager.getConfigSetting().set({enabled: true});
      await cruxManager.refresh();
      assert.strictEqual(cruxManager.getSelectedDeviceScope(), 'DESKTOP');

      for (const device of EmulationModel.EmulatedDevices.EmulatedDevicesList.instance().standard()) {
        if (device.title === 'Moto G Power') {
          EmulationModel.DeviceModeModel.DeviceModeModel.instance().emulate(
              EmulationModel.DeviceModeModel.Type.Device, device, device.modes[0], 1);
        }
      }

      assert.strictEqual(cruxManager.getSelectedDeviceScope(), 'PHONE');
    });
  });

  describe('automatic refresh', () => {
    let getFieldDataMock: sinon.SinonStub;
    let eventBodies: Array<CrUXManager.PageResult|undefined> = [];

    beforeEach(() => {
      eventBodies = [];
      cruxManager.addEventListener(CrUXManager.Events.FIELD_DATA_CHANGED, event => {
        eventBodies.push(event.data);
      });
      getFieldDataMock = sinon.stub(cruxManager, 'getFieldDataForPage');
      getFieldDataMock.resolves({
        'origin-ALL': null,
        'origin-DESKTOP': null,
        'origin-PHONE': null,
        'origin-TABLET': null,
        'url-ALL': null,
        'url-DESKTOP': null,
        'url-PHONE': null,
        'url-TABLET': null,
        warnings: [],
        normalizedUrl: '',
      });
    });

    afterEach(() => {
      getFieldDataMock.restore();
    });

    it('should update when enabled setting changes', async () => {
      const setting = cruxManager.getConfigSetting();

      setting.set({enabled: true});
      await triggerMicroTaskQueue();

      sinon.assert.callCount(getFieldDataMock, 1);
      assert.lengthOf(eventBodies, 2);
      assert.isUndefined(eventBodies[0]);
      assert.isObject(eventBodies[1]);

      setting.set({enabled: false});
      await triggerMicroTaskQueue();

      sinon.assert.callCount(getFieldDataMock, 1);
      assert.lengthOf(eventBodies, 3);
      assert.isUndefined(eventBodies[0]);
      assert.isObject(eventBodies[1]);
      assert.isUndefined(eventBodies[2]);
    });

    it('should trigger on frame navigation if enabled', async () => {
      const setting = cruxManager.getConfigSetting();
      setting.set({enabled: true});

      await triggerMicroTaskQueue();

      resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameNavigated, {
        url: 'https://example.com/main/',
        isPrimaryFrame: () => true,
      } as SDK.ResourceTreeModel.ResourceTreeFrame);

      await triggerMicroTaskQueue();

      sinon.assert.callCount(getFieldDataMock, 2);
      assert.lengthOf(eventBodies, 4);
      assert.isUndefined(eventBodies[0]);
      assert.isObject(eventBodies[1]);
      assert.isUndefined(eventBodies[2]);
      assert.isObject(eventBodies[3]);
    });

    it('should trigger when URL override set', async () => {
      const setting = cruxManager.getConfigSetting();
      setting.set({enabled: true});

      await triggerMicroTaskQueue();

      setting.set({enabled: true, override: 'https://example.com/override', overrideEnabled: true});

      await triggerMicroTaskQueue();

      sinon.assert.callCount(getFieldDataMock, 2);
      assert.lengthOf(eventBodies, 4);
      assert.isUndefined(eventBodies[0]);
      assert.isObject(eventBodies[1]);
      assert.isUndefined(eventBodies[2]);
      assert.isObject(eventBodies[3]);
    });

    it('should not trigger on frame navigation if disabled', async () => {
      const setting = cruxManager.getConfigSetting();
      setting.set({enabled: false});

      resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameNavigated, {
        url: 'https://example.com/main/',
        isPrimaryFrame: () => true,
      } as SDK.ResourceTreeModel.ResourceTreeFrame);

      await triggerMicroTaskQueue();

      sinon.assert.callCount(getFieldDataMock, 0);
      assert.lengthOf(eventBodies, 2);
      assert.isUndefined(eventBodies[0]);
      assert.isUndefined(eventBodies[1]);
    });
  });
});
