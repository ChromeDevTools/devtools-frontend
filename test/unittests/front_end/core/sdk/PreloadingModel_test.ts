// Copyright 2023 The Chromium Authors. All rights reserved.
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

describeWithMockConnection('PreloadingModel', async () => {
  it('adds and deletes rule sets', async () => {
    const target = createTarget();
    const model = target.model(SDK.PreloadingModel.PreloadingModel);
    assertNotNullOrUndefined(model);

    assert.deepEqual(model.getAllRuleSets(), []);

    dispatchEvent(target, 'Page.frameNavigated', {
      frame: {
        id: 'frameId:1',
        loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
        url: 'https://example.com/',
        domainAndRegistry: 'example.com',
        securityOrigin: 'https://example.com/',
        mimeType: 'text/html',
        secureContextType: Protocol.Page.SecureContextType.Secure,
        crossOriginIsolatedContextType: Protocol.Page.CrossOriginIsolatedContextType.Isolated,
        gatedAPIFeatures: [],
      },
    });

    dispatchEvent(target, 'Preload.ruleSetUpdated', {
      ruleSet: {
        id: 'ruleSetId:1',
        loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
        sourceText: `
{
  "prefetch":[
    {
      "source": "list",
      "urls": ["/subresource.js"]
    }
  ]
}
`,
      },
    });
    dispatchEvent(target, 'Preload.prefetchStatusUpdated', {
      key: {
        loaderId: 'loaderId:1',
        action: Protocol.Preload.SpeculationAction.Prefetch,
        url: 'https://example.com/subresource.js',
      },
      status: Protocol.Preload.PreloadingStatus.Running,
    });

    assert.deepEqual(model.getAllRuleSets(), [
      {
        id: 'ruleSetId:1' as Protocol.Preload.RuleSetId,
        value: {
          id: 'ruleSetId:1' as Protocol.Preload.RuleSetId,
          loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
          sourceText: `
{
  "prefetch":[
    {
      "source": "list",
      "urls": ["/subresource.js"]
    }
  ]
}
`,
        },
      },
    ]);
    assert.deepEqual(model.getAllPreloadingAttempts(), [
      {
        id: 'loaderId:1:Prefetch:https://example.com/subresource.js:undefined',
        value: {
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/subresource.js' as Platform.DevToolsPath.UrlString,
          },
          status: Protocol.Preload.PreloadingStatus.Running,
        },
      },
    ]);

    dispatchEvent(target, 'Preload.ruleSetUpdated', {
      ruleSet: {
        id: 'ruleSetId:2',
        loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
        sourceText: `
{
  "prerender":[
    {
      "source": "list",
      "urls": ["/page.html"]
    }
  ]
}
`,
      },
    });
    dispatchEvent(target, 'Preload.prerenderStatusUpdated', {
      key: {
        loaderId: 'loaderId:1',
        action: Protocol.Preload.SpeculationAction.Prerender,
        url: 'https://example.com/page.html',
      },
      status: Protocol.Preload.PreloadingStatus.Running,
    });

    assert.deepEqual(model.getAllRuleSets(), [
      {
        id: 'ruleSetId:1' as Protocol.Preload.RuleSetId,
        value: {
          id: 'ruleSetId:1' as Protocol.Preload.RuleSetId,
          loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
          sourceText: `
{
  "prefetch":[
    {
      "source": "list",
      "urls": ["/subresource.js"]
    }
  ]
}
`,
        },
      },
      {
        id: 'ruleSetId:2' as Protocol.Preload.RuleSetId,
        value: {

          id: 'ruleSetId:2' as Protocol.Preload.RuleSetId,
          loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
          sourceText: `
{
  "prerender":[
    {
      "source": "list",
      "urls": ["/page.html"]
    }
  ]
}
`,
        },
      },
    ]);
    assert.deepEqual(model.getAllPreloadingAttempts(), [
      {
        id: 'loaderId:1:Prefetch:https://example.com/subresource.js:undefined',
        value: {
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/subresource.js' as Platform.DevToolsPath.UrlString,
          },
          status: Protocol.Preload.PreloadingStatus.Running,
        },
      },
      {
        id: 'loaderId:1:Prerender:https://example.com/page.html:undefined',
        value: {
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prerender,
            url: 'https://example.com/page.html' as Platform.DevToolsPath.UrlString,
          },
          status: Protocol.Preload.PreloadingStatus.Running,
        },
      },
    ]);

    dispatchEvent(target, 'Preload.ruleSetRemoved', {
      id: 'ruleSetId:1',
    });
    dispatchEvent(target, 'Preload.prefetchStatusUpdated', {
      key: {
        loaderId: 'loaderId:1',
        action: Protocol.Preload.SpeculationAction.Prefetch,
        url: 'https://example.com/subresource.js',
      },
      status: Protocol.Preload.PreloadingStatus.Failure,
    });

    assert.deepEqual(model.getAllRuleSets(), [
      {
        id: 'ruleSetId:2' as Protocol.Preload.RuleSetId,
        value: {
          id: 'ruleSetId:2' as Protocol.Preload.RuleSetId,
          loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
          sourceText: `
{
  "prerender":[
    {
      "source": "list",
      "urls": ["/page.html"]
    }
  ]
}
`,
        },
      },
    ]);
    assert.deepEqual(model.getAllPreloadingAttempts(), [
      {
        id: 'loaderId:1:Prefetch:https://example.com/subresource.js:undefined',
        value: {
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/subresource.js' as Platform.DevToolsPath.UrlString,
          },
          status: Protocol.Preload.PreloadingStatus.Failure,
        },
      },
      {
        id: 'loaderId:1:Prerender:https://example.com/page.html:undefined',
        value: {
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prerender,
            url: 'https://example.com/page.html' as Platform.DevToolsPath.UrlString,
          },
          status: Protocol.Preload.PreloadingStatus.Running,
        },
      },
    ]);
  });

  // In this test, we only check rule sets and don't emit
  // prefetch/prerenderStatusUpdated.
  //
  // TODO(https://crbug.com/1384419): Check it once loaderId is added to
  // these event.
  it('clears SpeculationRules for previous pages', async () => {
    const target = createTarget();
    const model = target.model(SDK.PreloadingModel.PreloadingModel);
    assertNotNullOrUndefined(model);

    assert.deepEqual(model.getAllRuleSets(), []);

    dispatchEvent(target, 'Page.frameNavigated', {
      frame: {
        id: 'frameId:1',
        loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
        url: 'https://example.com/',
        domainAndRegistry: 'example.com',
        securityOrigin: 'https://example.com/',
        mimeType: 'text/html',
        secureContextType: Protocol.Page.SecureContextType.Secure,
        crossOriginIsolatedContextType: Protocol.Page.CrossOriginIsolatedContextType.Isolated,
        gatedAPIFeatures: [],
      },
    });

    dispatchEvent(target, 'Preload.ruleSetUpdated', {
      ruleSet: {
        id: 'ruleSetId:1',
        loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
        sourceText: `
{
  "prefetch":[
    {
      "source": "list",
      "urls": ["/subresource.js"]
    }
  ]
}
`,
      },
    });
    dispatchEvent(target, 'Preload.ruleSetUpdated', {
      ruleSet: {
        id: 'ruleSetId:2',
        loaderId: 'loaderId:2' as Protocol.Network.LoaderId,
        sourceText: `
{
  "prerender":[
    {
      "source": "list",
      "urls": ["/page.html"]
    }
  ]
}
`,
      },
    });

    assert.strictEqual(model.getAllRuleSets().length, 2);

    dispatchEvent(target, 'Page.frameNavigated', {
      frame: {
        id: 'frameId:2',
        loaderId: 'loaderId:2' as Protocol.Network.LoaderId,
        url: 'https://example.com/index2.html',
        domainAndRegistry: 'example.com',
        securityOrigin: 'https://example.com/',
        mimeType: 'text/html',
        secureContextType: Protocol.Page.SecureContextType.Secure,
        crossOriginIsolatedContextType: Protocol.Page.CrossOriginIsolatedContextType.Isolated,
        gatedAPIFeatures: [],
      },
    });

    assert.deepEqual(model.getAllRuleSets(), [
      {
        id: 'ruleSetId:2' as Protocol.Preload.RuleSetId,
        value: {
          id: 'ruleSetId:2' as Protocol.Preload.RuleSetId,
          loaderId: 'loaderId:2' as Protocol.Network.LoaderId,
          sourceText: `
{
  "prerender":[
    {
      "source": "list",
      "urls": ["/page.html"]
    }
  ]
}
`,
        },
      },
    ]);
  });
});
