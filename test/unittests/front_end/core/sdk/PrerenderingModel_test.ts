// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  dispatchEvent,
} from '../../helpers/MockConnection.js';

const {assert} = chai;

type PrerenderingAttemptId = SDK.PrerenderingModel.PrerenderingAttemptId;
type PrerenderingAttempt = SDK.PrerenderingModel.PrerenderingAttempt;
type PrerenderingAttemptEventAdd = SDK.PrerenderingModel.PrerenderingAttemptEventAdd;
type PrerenderingAttemptEventUpdate = SDK.PrerenderingModel.PrerenderingAttemptEventUpdate;

describe('PrerenderingRegistry', () => {
  function makePrerenderingAttemptEventAddSpecRules(
      prerenderingAttemptId: PrerenderingAttemptId, url: Platform.DevToolsPath.UrlString,
      startedAt: number): PrerenderingAttemptEventAdd {
    return {
      kind: 'PrerenderingAttemptEventAdd',
      attempt: {
        prerenderingAttemptId: prerenderingAttemptId,
        startedAt: startedAt,
        trigger: {
          kind: 'PrerenderingTriggerSpecRules',
          rule: {
            'prerender': [{'source': 'list', 'urls': [url]}],
          },
        },
        url,
        status: SDK.PrerenderingModel.PrerenderingStatus.Prerendering,
      },
    };
  }

  it('add and update works', () => {
    const registry = new SDK.PrerenderingModel.PrerenderingRegistry();

    assert.deepEqual(registry.getAll(), []);

    const startedAt = Date.now();

    registry.processEvent(makePrerenderingAttemptEventAddSpecRules(
        '0' as PrerenderingAttemptId, 'https://example.com/0' as Platform.DevToolsPath.UrlString, startedAt));

    assert.deepEqual(registry.getAll(), [
      {
        id: 'PrerenderingAttempt:0',
        attempt: {
          prerenderingAttemptId: '0',
          startedAt,
          trigger: {
            kind: 'PrerenderingTriggerSpecRules',
            rule: {
              'prerender': [{'source': 'list', 'urls': ['https://example.com/0']}],
            },
          },
          url: 'https://example.com/0' as Platform.DevToolsPath.UrlString,
          status: SDK.PrerenderingModel.PrerenderingStatus.Prerendering,
        },
      },
    ]);

    registry.processEvent(makePrerenderingAttemptEventAddSpecRules(
        '1' as PrerenderingAttemptId, 'https://example.com/1' as Platform.DevToolsPath.UrlString, startedAt));

    assert.deepEqual(
        registry.getAll(),
        [
          {
            id: 'PrerenderingAttempt:0',
            attempt: {
              prerenderingAttemptId: '0',
              startedAt,
              trigger: {
                kind: 'PrerenderingTriggerSpecRules',
                rule: {
                  'prerender': [{'source': 'list', 'urls': ['https://example.com/0']}],
                },
              },
              url: 'https://example.com/0' as Platform.DevToolsPath.UrlString,
              status: SDK.PrerenderingModel.PrerenderingStatus.Prerendering,
            },
          },
          {
            id: 'PrerenderingAttempt:1',
            attempt: {
              prerenderingAttemptId: '1',
              startedAt,
              trigger: {
                kind: 'PrerenderingTriggerSpecRules',
                rule: {
                  'prerender': [{'source': 'list', 'urls': ['https://example.com/1']}],
                },
              },
              url: 'https://example.com/1' as Platform.DevToolsPath.UrlString,
              status: SDK.PrerenderingModel.PrerenderingStatus.Prerendering,
            },
          },
        ],
    );

    const originalAttempt = registry.getById('PrerenderingAttempt:0');
    assertNotNullOrUndefined(originalAttempt);
    const attempt: PrerenderingAttempt = {
      ...originalAttempt,
      status: SDK.PrerenderingModel.PrerenderingStatus.Activated,
    };
    const event: PrerenderingAttemptEventUpdate = {
      kind: 'PrerenderingAttemptEventUpdate',
      update: attempt,
    };
    registry.processEvent(event);

    assert.deepEqual(registry.getAll(), [
      {
        id: 'PrerenderingAttempt:0',
        attempt: {
          prerenderingAttemptId: '0',
          startedAt,
          trigger: {
            kind: 'PrerenderingTriggerSpecRules',
            rule: {
              'prerender': [{'source': 'list', 'urls': ['https://example.com/0']}],
            },
          },
          url: 'https://example.com/0' as Platform.DevToolsPath.UrlString,
          status: SDK.PrerenderingModel.PrerenderingStatus.Activated,
        },
      },
      {
        id: 'PrerenderingAttempt:1',
        attempt: {
          prerenderingAttemptId: '1',
          startedAt,
          trigger: {
            kind: 'PrerenderingTriggerSpecRules',
            rule: {
              'prerender': [{'source': 'list', 'urls': ['https://example.com/1']}],
            },
          },
          url: 'https://example.com/1' as Platform.DevToolsPath.UrlString,
          status: SDK.PrerenderingModel.PrerenderingStatus.Prerendering,
        },
      },
    ]);
  });

  it('clearNotOngoing works', () => {
    const registry = new SDK.PrerenderingModel.PrerenderingRegistry();

    assert.deepEqual(registry.getAll(), []);

    const startedAt = Date.now();

    registry.processEvent(makePrerenderingAttemptEventAddSpecRules(
        '0' as PrerenderingAttemptId, 'https://example.com/0' as Platform.DevToolsPath.UrlString, startedAt));
    registry.processEvent(makePrerenderingAttemptEventAddSpecRules(
        '1' as PrerenderingAttemptId, 'https://example.com/1' as Platform.DevToolsPath.UrlString, startedAt));

    const originalAttempt = registry.getById('PrerenderingAttempt:0');
    assertNotNullOrUndefined(originalAttempt);
    const attempt: PrerenderingAttempt = {
      ...originalAttempt,
      status: SDK.PrerenderingModel.PrerenderingStatus.Activated,
    };
    const event: PrerenderingAttemptEventUpdate = {
      kind: 'PrerenderingAttemptEventUpdate',
      update: attempt,
    };
    registry.processEvent(event);

    registry.clearNotOngoing();

    assert.deepEqual(registry.getAll(), [
      {
        id: 'PrerenderingAttempt:1',
        attempt: {
          prerenderingAttemptId: '1',
          startedAt,
          trigger: {
            kind: 'PrerenderingTriggerSpecRules',
            rule: {
              'prerender': [{'source': 'list', 'urls': ['https://example.com/1']}],
            },
          },
          url: 'https://example.com/1' as Platform.DevToolsPath.UrlString,
          status: SDK.PrerenderingModel.PrerenderingStatus.Prerendering,
        },
      },
    ]);
  });
});

describeWithMockConnection('PrerenderingModel', () => {
  beforeEach(async () => {
    SDK.ChildTargetManager.ChildTargetManager.install();
  });

  it('records activated prerendering', () => {
    const target = createTarget({id: 'targetId' as Protocol.Target.TargetID});
    const model = target.model(SDK.PrerenderingModel.PrerenderingModel);
    assertNotNullOrUndefined(model);

    const prerenderedFrameId = '1';
    const preloadingId = 'PrerenderingAttempt-opaque:1';

    dispatchEvent(target, 'Page.frameNavigated', {
      frame: {
        id: 'main',
        loaderId: 'foo',
        url: 'https://example.com/',
        domainAndRegistry: 'example.com',
        securityOrigin: 'https://example.com/',
        mimeType: 'text/html',
        secureContextType: Protocol.Page.SecureContextType.Secure,
        crossOriginIsolatedContextType: Protocol.Page.CrossOriginIsolatedContextType.Isolated,
        gatedAPIFeatures: [],
      },
    });
    dispatchEvent(target, 'Target.targetInfoChanged', {
      targetInfo: {
        targetId: prerenderedFrameId,
        type: 'frame',
        subtype: 'prerender',
        url: 'https://example.com/prerendered.html',
        title: '',
        attached: true,
        canAccessOpener: true,
      },
    });
    const startedAt = model.getById(preloadingId)?.startedAt;
    assertNotNullOrUndefined(startedAt);
    assert.deepEqual(model.getAll(), [
      {
        id: preloadingId,
        attempt: {
          prerenderingAttemptId: prerenderedFrameId,
          startedAt,
          trigger: {
            kind: 'PrerenderingTriggerOpaque',
          },
          url: 'https://example.com/prerendered.html' as Platform.DevToolsPath.UrlString,
          status: SDK.PrerenderingModel.PrerenderingStatus.Prerendering,
        },
      },
    ]);
    dispatchEvent(
        target,
        'Page.prerenderAttemptCompleted',
        {
          'initiatingFrameId': prerenderedFrameId,
          'prerenderingUrl': 'https://example.com/prerendered.html',
          'finalStatus': Protocol.Page.PrerenderFinalStatus.Activated,
        },
    );
    assert.deepEqual(model.getAll(), [
      {
        id: preloadingId,
        attempt: {
          prerenderingAttemptId: prerenderedFrameId,
          startedAt,
          trigger: {
            kind: 'PrerenderingTriggerOpaque',
          },
          url: 'https://example.com/prerendered.html' as Platform.DevToolsPath.UrlString,
          status: SDK.PrerenderingModel.PrerenderingStatus.Activated,
          discardedReason: null,
        },
      },
    ]);
  });

  it('records cancelled prerendering', () => {
    const target = createTarget({id: 'targetId' as Protocol.Target.TargetID});
    const model = target.model(SDK.PrerenderingModel.PrerenderingModel);
    assertNotNullOrUndefined(model);

    const prerenderedFrameId = '1';
    const preloadingId = 'PrerenderingAttempt-opaque:1';

    dispatchEvent(target, 'Page.frameNavigated', {
      frame: {
        id: 'main',
        loaderId: 'foo',
        url: 'https://example.com/',
        domainAndRegistry: 'example.com',
        securityOrigin: 'https://example.com/',
        mimeType: 'text/html',
        secureContextType: Protocol.Page.SecureContextType.Secure,
        crossOriginIsolatedContextType: Protocol.Page.CrossOriginIsolatedContextType.Isolated,
        gatedAPIFeatures: [],
      },
    });
    dispatchEvent(target, 'Target.targetInfoChanged', {
      targetInfo: {
        targetId: prerenderedFrameId,
        type: 'frame',
        subtype: 'prerender',
        url: 'https://example.com/prerendered.html',
        title: '',
        attached: true,
        canAccessOpener: true,
      },
    });
    const startedAt = model.getById(preloadingId)?.startedAt;
    assertNotNullOrUndefined(startedAt);
    assert.deepEqual(model.getAll(), [
      {
        id: preloadingId,
        attempt: {
          prerenderingAttemptId: prerenderedFrameId,
          startedAt,
          trigger: {
            kind: 'PrerenderingTriggerOpaque',
          },
          url: 'https://example.com/prerendered.html' as Platform.DevToolsPath.UrlString,
          status: SDK.PrerenderingModel.PrerenderingStatus.Prerendering,
        },
      },
    ]);
    dispatchEvent(
        target,
        'Page.prerenderAttemptCompleted',
        {
          'initiatingFrameId': prerenderedFrameId,
          'prerenderingUrl': 'https://example.com/prerendered.html',
          'finalStatus': Protocol.Page.PrerenderFinalStatus.MojoBinderPolicy,
          'disallowedApiMethod': 'device.mojom.GamepadMonitor',
        },
    );
    assert.deepEqual(model.getAll(), [
      {
        id: preloadingId,
        attempt: {
          prerenderingAttemptId: prerenderedFrameId,
          startedAt,
          trigger: {
            kind: 'PrerenderingTriggerOpaque',
          },
          url: 'https://example.com/prerendered.html' as Platform.DevToolsPath.UrlString,
          status: SDK.PrerenderingModel.PrerenderingStatus.Discarded,
          discardedReason: Protocol.Page.PrerenderFinalStatus.MojoBinderPolicy,
        },
      },
    ]);
  });

  it('clears not ongoing attempts', () => {
    const target = createTarget({id: 'targetId' as Protocol.Target.TargetID});
    const model = target.model(SDK.PrerenderingModel.PrerenderingModel);
    assertNotNullOrUndefined(model);

    const prerenderedFrameId = '1';

    dispatchEvent(target, 'Page.frameNavigated', {
      frame: {
        id: 'main',
        loaderId: 'foo',
        url: 'https://example.com/',
        domainAndRegistry: 'example.com',
        securityOrigin: 'https://example.com/',
        mimeType: 'text/html',
        secureContextType: Protocol.Page.SecureContextType.Secure,
        crossOriginIsolatedContextType: Protocol.Page.CrossOriginIsolatedContextType.Isolated,
        gatedAPIFeatures: [],
      },
    });
    dispatchEvent(target, 'Target.targetInfoChanged', {
      targetInfo: {
        targetId: prerenderedFrameId,
        type: 'frame',
        subtype: 'prerender',
        url: 'https://example.com/prerendered.html',
        title: '',
        attached: true,
        canAccessOpener: true,
      },
    });

    // Ongoing attempt is not cleared.
    assert.strictEqual(model.getAll().length, 1);
    assert.strictEqual(model.getAll()[0].attempt.status, SDK.PrerenderingModel.PrerenderingStatus.Prerendering);
    model.clearNotOngoing();
    assert.strictEqual(model.getAll().length, 1);

    dispatchEvent(
        target,
        'Page.prerenderAttemptCompleted',
        {
          'initiatingFrameId': prerenderedFrameId,
          'prerenderingUrl': 'https://example.com/prerendered.html',
          'finalStatus': Protocol.Page.PrerenderFinalStatus.Activated,
        },
    );

    // Activated attempt is cleared.
    assert.strictEqual(model.getAll().length, 1);
    assert.strictEqual(model.getAll()[0].attempt.status, SDK.PrerenderingModel.PrerenderingStatus.Activated);
    model.clearNotOngoing();
    assert.strictEqual(model.getAll().length, 0);
  });
});
