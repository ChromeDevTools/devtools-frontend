// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import type * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as CrUXManager from './crux-manager.js';

function mockResponse(): CrUXManager.CrUXResponse {
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
        },
        cumulative_layout_shift: {
          histogram: [
            {start: 0, end: 0.1, density: 0.1},
            {start: 0.1, end: 0.25, density: 0.1},
            {start: 0.25, density: 0.8},
          ],
          percentiles: {p75: 0.25},
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

describeWithMockConnection('CrUXManager', () => {
  let cruxManager: CrUXManager.CrUXManager;
  let target: SDK.Target.Target;
  let resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel;
  let mockFetch: sinon.SinonStub;
  let mockConsoleError: sinon.SinonStub;

  beforeEach(async () => {
    const tabTarget = createTarget({type: SDK.Target.Type.TAB});
    target = createTarget({parentTarget: tabTarget});
    resourceTreeModel =
        target.model(SDK.ResourceTreeModel.ResourceTreeModel) as SDK.ResourceTreeModel.ResourceTreeModel;
    cruxManager = CrUXManager.CrUXManager.instance({forceNew: true});
    mockFetch = sinon.stub(window, 'fetch');
    mockConsoleError = sinon.stub(console, 'error');
  });

  afterEach(() => {
    mockFetch.restore();
    mockConsoleError.restore();
    cruxManager.getConfigSetting().set({enabled: false});
  });

  describe('storing the user consent', () => {
    it('uses global storage if the user is not in an OffTheRecord profile', async () => {
      const dummyStorage = new Common.Settings.SettingsStorage({});
      const globalStorage = new Common.Settings.SettingsStorage({});

      Common.Settings.Settings.instance({
        forceNew: true,
        syncedStorage: dummyStorage,
        globalStorage,
        localStorage: dummyStorage,
        config: {
          isOffTheRecord: false,
        } as Root.Runtime.HostConfig,
      });
      const manager = CrUXManager.CrUXManager.instance({forceNew: true});
      manager.getConfigSetting().set({enabled: true});
      assert.isTrue(globalStorage.has(manager.getConfigSetting().name));
    });

    it('uses session storage if the user is in an OffTheRecord profile', async () => {
      const dummyStorage = new Common.Settings.SettingsStorage({});

      Common.Settings.Settings.instance({
        forceNew: true,
        syncedStorage: dummyStorage,
        globalStorage: dummyStorage,
        localStorage: dummyStorage,
        config: {
          isOffTheRecord: true,
        } as Root.Runtime.HostConfig,
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

      assert.deepStrictEqual(pageResult, {
        'origin-ALL': mockResponse(),
        'origin-DESKTOP': mockResponse(),
        'origin-PHONE': mockResponse(),
        'origin-TABLET': null,
        'url-ALL': mockResponse(),
        'url-DESKTOP': mockResponse(),
        'url-PHONE': mockResponse(),
        'url-TABLET': null,
      });

      assert.deepStrictEqual(fetchBodies, [
        {
          formFactor: 'DESKTOP',
          metrics: [
            'largest_contentful_paint',
            'cumulative_layout_shift',
            'interaction_to_next_paint',
            'round_trip_time',
            'form_factors',
          ],
          origin: 'https://example.com',
        },
        {
          formFactor: 'PHONE',
          metrics: [
            'largest_contentful_paint',
            'cumulative_layout_shift',
            'interaction_to_next_paint',
            'round_trip_time',
            'form_factors',
          ],
          origin: 'https://example.com',
        },
        {
          metrics: [
            'largest_contentful_paint',
            'cumulative_layout_shift',
            'interaction_to_next_paint',
            'round_trip_time',
            'form_factors',
          ],
          origin: 'https://example.com',
        },
        {
          formFactor: 'DESKTOP',
          metrics: [
            'largest_contentful_paint',
            'cumulative_layout_shift',
            'interaction_to_next_paint',
            'round_trip_time',
            'form_factors',
          ],
          url: 'https://example.com/',
        },
        {
          formFactor: 'PHONE',
          metrics: [
            'largest_contentful_paint',
            'cumulative_layout_shift',
            'interaction_to_next_paint',
            'round_trip_time',
            'form_factors',
          ],
          url: 'https://example.com/',
        },
        {
          metrics: [
            'largest_contentful_paint',
            'cumulative_layout_shift',
            'interaction_to_next_paint',
            'round_trip_time',
            'form_factors',
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
      assert.deepStrictEqual(pageResult, {
        'origin-ALL': null,
        'origin-DESKTOP': null,
        'origin-PHONE': null,
        'origin-TABLET': null,
        'url-ALL': null,
        'url-DESKTOP': null,
        'url-PHONE': null,
        'url-TABLET': null,
      });
    });

    it('should cache responses', async () => {
      mockFetch.callsFake(async () => new Response(JSON.stringify(mockResponse()), {
                            status: 200,
                          }));

      await cruxManager.getFieldDataForPage('https://example.com');

      assert.strictEqual(mockFetch.callCount, 6);

      await cruxManager.getFieldDataForPage('https://example.com');

      assert.strictEqual(mockFetch.callCount, 6);
    });

    it('should cache "NOT_FOUND" responses', async () => {
      mockFetch.callsFake(async () => new Response('{"error": {"status": "NOT_FOUND"}}', {
                            status: 404,
                          }));

      await cruxManager.getFieldDataForPage('https://example.com');

      assert.strictEqual(mockFetch.callCount, 6);

      await cruxManager.getFieldDataForPage('https://example.com');

      assert.strictEqual(mockFetch.callCount, 6);
    });

    it('should not cache error responses', async () => {
      mockFetch.callsFake(async () => new Response('', {
                            status: 500,
                          }));

      await cruxManager.getFieldDataForPage('https://example.com');

      assert.strictEqual(mockFetch.callCount, 6);
      assert.strictEqual(mockConsoleError.callCount, 6);

      await cruxManager.getFieldDataForPage('https://example.com');

      assert.strictEqual(mockFetch.callCount, 12);
      assert.strictEqual(mockConsoleError.callCount, 12);
    });

    it('should ignore hash and search params for caching', async () => {
      mockFetch.callsFake(async () => new Response(JSON.stringify(mockResponse()), {
                            status: 200,
                          }));

      await cruxManager.getFieldDataForPage('https://example.com#hash');

      assert.strictEqual(mockFetch.callCount, 6);

      await cruxManager.getFieldDataForPage('https://example.com?search');

      assert.strictEqual(mockFetch.callCount, 6);
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

      assert.strictEqual(mockFetch.callCount, 0);
    });
  });

  describe('getFieldDataForCurrentPage', () => {
    let getFieldDataMock: sinon.SinonStub;

    beforeEach(() => {
      getFieldDataMock = sinon.stub(cruxManager, 'getFieldDataForPage');
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

      await cruxManager.getFieldDataForCurrentPage();

      assert.strictEqual(getFieldDataMock.callCount, 1);
      assert.strictEqual(getFieldDataMock.firstCall.args[0], 'https://example.com/main/');
    });

    it('should use URL override if set', async () => {
      target.setInspectedURL('https://example.com/inspected' as Platform.DevToolsPath.UrlString);
      cruxManager.getConfigSetting().set(
          {enabled: false, override: 'https://example.com/override', overrideEnabled: true});

      await cruxManager.getFieldDataForCurrentPage();

      assert.strictEqual(getFieldDataMock.callCount, 1);
      assert.strictEqual(getFieldDataMock.firstCall.args[0], 'https://example.com/override');
    });

    it('should use origin map if set', async () => {
      target.setInspectedURL('http://localhost:8080/inspected?param' as Platform.DevToolsPath.UrlString);
      cruxManager.getConfigSetting().set({
        enabled: false,
        originMappings: [{
          developmentOrigin: 'http://localhost:8080',
          productionOrigin: 'https://example.com',
        }],
      });

      await cruxManager.getFieldDataForCurrentPage();

      assert.strictEqual(getFieldDataMock.callCount, 1);
      assert.strictEqual(getFieldDataMock.firstCall.args[0], 'https://example.com/inspected');
    });

    it('should not use origin map if URL override is set', async () => {
      target.setInspectedURL('http://localhost:8080/inspected?param' as Platform.DevToolsPath.UrlString);
      cruxManager.getConfigSetting().set({
        enabled: false,
        override: 'https://google.com',
        overrideEnabled: true,
        originMappings: [{
          developmentOrigin: 'http://localhost:8080',
          productionOrigin: 'https://example.com',
        }],
      });

      await cruxManager.getFieldDataForCurrentPage();

      assert.strictEqual(getFieldDataMock.callCount, 1);
      assert.strictEqual(getFieldDataMock.firstCall.args[0], 'https://google.com');
    });

    it('should use inspected URL if main document is unavailable', async () => {
      target.setInspectedURL('https://example.com/inspected' as Platform.DevToolsPath.UrlString);

      await cruxManager.getFieldDataForCurrentPage();

      assert.strictEqual(getFieldDataMock.callCount, 1);
      assert.strictEqual(getFieldDataMock.firstCall.args[0], 'https://example.com/inspected');
    });

    it('should wait for inspected URL if main document and inspected URL are unavailable', async () => {
      target.setInspectedURL(Platform.DevToolsPath.EmptyUrlString);

      const finishPromise = cruxManager.getFieldDataForCurrentPage();

      await triggerMicroTaskQueue();

      target.setInspectedURL('https://example.com/awaitInspected' as Platform.DevToolsPath.UrlString);

      await finishPromise;

      assert.strictEqual(getFieldDataMock.callCount, 1);
      assert.strictEqual(getFieldDataMock.firstCall.args[0], 'https://example.com/awaitInspected');
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
      getFieldDataMock = sinon.stub(cruxManager, 'getFieldDataForCurrentPage');
      getFieldDataMock.resolves({
        'origin-ALL': null,
        'origin-DESKTOP': null,
        'origin-PHONE': null,
        'origin-TABLET': null,
        'url-ALL': null,
        'url-DESKTOP': null,
        'url-PHONE': null,
        'url-TABLET': null,
      });
    });

    afterEach(() => {
      getFieldDataMock.restore();
    });

    it('should update when enabled setting changes', async () => {
      const setting = cruxManager.getConfigSetting();

      setting.set({enabled: true});
      await triggerMicroTaskQueue();

      assert.strictEqual(getFieldDataMock.callCount, 1);
      assert.lengthOf(eventBodies, 2);
      assert.isUndefined(eventBodies[0]);
      assert.isObject(eventBodies[1]);

      setting.set({enabled: false});
      await triggerMicroTaskQueue();

      assert.strictEqual(getFieldDataMock.callCount, 1);
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

      assert.strictEqual(getFieldDataMock.callCount, 2);
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

      assert.strictEqual(getFieldDataMock.callCount, 2);
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

      assert.strictEqual(getFieldDataMock.callCount, 0);
      assert.lengthOf(eventBodies, 2);
      assert.isUndefined(eventBodies[0]);
      assert.isUndefined(eventBodies[1]);
    });
  });
});
