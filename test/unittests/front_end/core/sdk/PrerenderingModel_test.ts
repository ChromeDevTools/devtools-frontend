// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';

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
          startedAt: startedAt,
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
              startedAt: startedAt,
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
              startedAt: startedAt,
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
          startedAt: startedAt,
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
          startedAt: startedAt,
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
          startedAt: startedAt,
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
