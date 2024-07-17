// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as CrUXManager from './crux-manager.js';

function mockResponse(): CrUXManager.CrUXResponse {
  return {
    record: {
      key: {},
      metrics: {
        'largest_contentful_paint': {
          histogram: [
            {start: 0, end: 2500, density: 0.5},
            {start: 2500, end: 4000, density: 0.3},
            {start: 4000, density: 0.2},
          ],
          percentiles: {p75: 1000},
        },
        'cumulative_layout_shift': {
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
    const tabTarget = createTarget({type: SDK.Target.Type.Tab});
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
    cruxManager.getConfigSetting().set({enabled: false, override: ''});
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
          ],
          origin: 'https://example.com',
        },
        {
          metrics: [
            'largest_contentful_paint',
            'cumulative_layout_shift',
            'interaction_to_next_paint',
            'round_trip_time',
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
          ],
          url: 'https://example.com/',
        },
        {
          metrics: [
            'largest_contentful_paint',
            'cumulative_layout_shift',
            'interaction_to_next_paint',
            'round_trip_time',
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
      cruxManager.getConfigSetting().set({enabled: false, override: 'https://example.com/override'});

      await cruxManager.getFieldDataForCurrentPage();

      assert.strictEqual(getFieldDataMock.callCount, 1);
      assert.strictEqual(getFieldDataMock.firstCall.args[0], 'https://example.com/override');
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
      cruxManager.addEventListener(CrUXManager.Events.FieldDataChanged, event => {
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

      setting.set({enabled: true, override: ''});
      await triggerMicroTaskQueue();

      assert.strictEqual(getFieldDataMock.callCount, 1);
      assert.lengthOf(eventBodies, 2);
      assert.isUndefined(eventBodies[0]);
      assert.isObject(eventBodies[1]);

      setting.set({enabled: false, override: ''});
      await triggerMicroTaskQueue();

      assert.strictEqual(getFieldDataMock.callCount, 1);
      assert.lengthOf(eventBodies, 3);
      assert.isUndefined(eventBodies[0]);
      assert.isObject(eventBodies[1]);
      assert.isUndefined(eventBodies[2]);
    });

    it('should trigger on frame navigation if enabled', async () => {
      const setting = cruxManager.getConfigSetting();
      setting.set({enabled: true, override: ''});

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
      setting.set({enabled: true, override: ''});

      await triggerMicroTaskQueue();

      setting.set({enabled: true, override: 'https://example.com/override'});

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
      setting.set({enabled: false, override: ''});

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
