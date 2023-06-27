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
  it('adds and deletes rule sets and preloeading attempts', async () => {
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
    dispatchEvent(target, 'Preload.preloadingAttemptSourcesUpdated', {
      loaderId: 'loaderId:1',
      preloadingAttemptSources: [
        {
          key: {
            loaderId: 'loaderId:1',
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/subresource.js',
          },
          ruleSetIds: ['ruleSetId:1'],
          nodeIds: [1],
        },
      ],
    });
    dispatchEvent(target, 'Preload.prefetchStatusUpdated', {
      key: {
        loaderId: 'loaderId:1',
        action: Protocol.Preload.SpeculationAction.Prefetch,
        url: 'https://example.com/subresource.js',
      },
      status: SDK.PreloadingModel.PreloadingStatus.Running,
      requestId: 'requestId:1',
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
    assert.deepEqual(model.getPreloadingAttempts(null), [
      {
        id: 'loaderId:1:Prefetch:https://example.com/subresource.js:undefined',
        value: {
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/subresource.js' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.Running,
          prefetchStatus: null,
          requestId: 'requestId:1' as Protocol.Network.RequestId,
          ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
          nodeIds: [1] as Protocol.DOM.BackendNodeId[],
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
    dispatchEvent(target, 'Preload.preloadingAttemptSourcesUpdated', {
      loaderId: 'loaderId:1',
      preloadingAttemptSources: [
        {
          key: {
            loaderId: 'loaderId:1',
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/subresource.js',
          },
          ruleSetIds: ['ruleSetId:1'],
          nodeIds: [1],
        },
        {
          key: {
            loaderId: 'loaderId:1',
            action: Protocol.Preload.SpeculationAction.Prerender,
            url: 'https://example.com/page.html',
          },
          ruleSetIds: ['ruleSetId:2'],
          nodeIds: [2],
        },
      ],
    });
    dispatchEvent(target, 'Preload.prerenderStatusUpdated', {
      key: {
        loaderId: 'loaderId:1',
        action: Protocol.Preload.SpeculationAction.Prerender,
        url: 'https://example.com/page.html',
      },
      status: SDK.PreloadingModel.PreloadingStatus.Running,
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
    assert.deepEqual(model.getPreloadingAttempts(null), [
      {
        id: 'loaderId:1:Prefetch:https://example.com/subresource.js:undefined',
        value: {
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/subresource.js' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.Running,
          prefetchStatus: null,
          requestId: 'requestId:1' as Protocol.Network.RequestId,
          ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
          nodeIds: [1] as Protocol.DOM.BackendNodeId[],
        },
      },
      {
        id: 'loaderId:1:Prerender:https://example.com/page.html:undefined',
        value: {
          action: Protocol.Preload.SpeculationAction.Prerender,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prerender,
            url: 'https://example.com/page.html' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.Running,
          prerenderStatus: null,
          disallowedMojoInterface: null,
          ruleSetIds: ['ruleSetId:2'] as Protocol.Preload.RuleSetId[],
          nodeIds: [2] as Protocol.DOM.BackendNodeId[],
        },
      },
    ]);

    dispatchEvent(target, 'Preload.ruleSetRemoved', {
      id: 'ruleSetId:1',
    });
    dispatchEvent(target, 'Preload.preloadingAttemptSourcesUpdated', {
      loaderId: 'loaderId:1',
      preloadingAttemptSources: [
        {
          key: {
            loaderId: 'loaderId:1',
            action: Protocol.Preload.SpeculationAction.Prerender,
            url: 'https://example.com/page.html',
          },
          ruleSetIds: ['ruleSetId:2'],
          nodeIds: [2],
        },
      ],
    });
    dispatchEvent(target, 'Preload.prefetchStatusUpdated', {
      key: {
        loaderId: 'loaderId:1',
        action: Protocol.Preload.SpeculationAction.Prefetch,
        url: 'https://example.com/subresource.js',
      },
      status: SDK.PreloadingModel.PreloadingStatus.Failure,
      requestId: 'requestId:1',
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
    assert.deepEqual(model.getPreloadingAttempts(null), [
      {
        id: 'loaderId:1:Prefetch:https://example.com/subresource.js:undefined',
        value: {
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/subresource.js' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.Failure,
          prefetchStatus: null,
          requestId: 'requestId:1' as Protocol.Network.RequestId,
          // Note that current implementation doesn't show associated
          // rule sets when preloading is cancelled by rule sets
          // deletion. One can treat this case special, i.e. associated
          // rule sets decreasing one to zero, and show the last rule
          // set.
          //
          // TODO(https://crbug.com/1410709): Consider the above case.
          ruleSetIds: [] as Protocol.Preload.RuleSetId[],
          nodeIds: [] as Protocol.DOM.BackendNodeId[],
        },
      },
      {
        id: 'loaderId:1:Prerender:https://example.com/page.html:undefined',
        value: {
          action: Protocol.Preload.SpeculationAction.Prerender,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prerender,
            url: 'https://example.com/page.html' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.Running,
          prerenderStatus: null,
          disallowedMojoInterface: null,
          ruleSetIds: ['ruleSetId:2'] as Protocol.Preload.RuleSetId[],
          nodeIds: [2] as Protocol.DOM.BackendNodeId[],
        },
      },
    ]);
  });

  it('registers preloeading attempt with status NotTriggered', async () => {
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
    dispatchEvent(target, 'Preload.preloadingAttemptSourcesUpdated', {
      loaderId: 'loaderId:1',
      preloadingAttemptSources: [
        {
          key: {
            loaderId: 'loaderId:1',
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/subresource.js',
          },
          ruleSetIds: ['ruleSetId:1'],
          nodeIds: [1],
        },
      ],
    });

    assert.deepEqual(model.getPreloadingAttempts(null), [
      {
        id: 'loaderId:1:Prefetch:https://example.com/subresource.js:undefined',
        value: {
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/subresource.js' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.NotTriggered,
          prefetchStatus: null,
          // Invalid request id
          requestId: '' as Protocol.Network.RequestId,
          ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
          nodeIds: [1] as Protocol.DOM.BackendNodeId[],
        },
      },
    ]);
  });

  it('clears rule sets and preloading attempts for previous pages', async () => {
    const target = createTarget();
    const model = target.model(SDK.PreloadingModel.PreloadingModel);
    assertNotNullOrUndefined(model);

    assert.deepEqual(model.getAllRuleSets(), []);
    assert.deepEqual(model.getPreloadingAttempts(null), []);

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
  "prefetch": [
    {
      "source": "list",
      "urls": ["/subresource1.js"]
    }
  ]
}
`,
      },
    });
    dispatchEvent(target, 'Preload.preloadingAttemptSourcesUpdated', {
      loaderId: 'loaderId:1',
      preloadingAttemptSources: [
        {
          key: {
            loaderId: 'loaderId:1',
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/subresource1.js',
          },
          ruleSetIds: ['ruleSetId:1'],
          nodeIds: [1],
        },
      ],
    });
    dispatchEvent(target, 'Preload.prefetchStatusUpdated', {
      key: {
        loaderId: 'loaderId:1',
        action: Protocol.Preload.SpeculationAction.Prefetch,
        url: 'https://example.com/subresource1.js',
      },
      status: SDK.PreloadingModel.PreloadingStatus.Running,
    });

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

    dispatchEvent(target, 'Preload.ruleSetUpdated', {
      ruleSet: {
        id: 'ruleSetId:2',
        loaderId: 'loaderId:2' as Protocol.Network.LoaderId,
        sourceText: `
{
  "prefetch": [
    {
      "source": "list",
      "urls": ["/subresource2.js"]
    }
  ]
}
`,
      },
    });
    dispatchEvent(target, 'Preload.preloadingAttemptSourcesUpdated', {
      loaderId: 'loaderId:2',
      preloadingAttemptSources: [
        {
          key: {
            loaderId: 'loaderId:2',
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/subresource2.js',
          },
          ruleSetIds: ['ruleSetId:2'],
          nodeIds: [2],
        },
      ],
    });
    dispatchEvent(target, 'Preload.prefetchStatusUpdated', {
      key: {
        loaderId: 'loaderId:2',
        action: Protocol.Preload.SpeculationAction.Prefetch,
        url: 'https://example.com/subresource2.js',
      },
      status: SDK.PreloadingModel.PreloadingStatus.Running,
      requestId: 'requestId:1',
    });

    assert.deepEqual(model.getAllRuleSets(), [
      {
        id: 'ruleSetId:2' as Protocol.Preload.RuleSetId,
        value: {
          id: 'ruleSetId:2' as Protocol.Preload.RuleSetId,
          loaderId: 'loaderId:2' as Protocol.Network.LoaderId,
          sourceText: `
{
  "prefetch": [
    {
      "source": "list",
      "urls": ["/subresource2.js"]
    }
  ]
}
`,
        },
      },
    ]);
    assert.deepEqual(model.getPreloadingAttempts(null), [
      {
        id: 'loaderId:2:Prefetch:https://example.com/subresource2.js:undefined',
        value: {
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:2' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/subresource2.js' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.Running,
          prefetchStatus: null,
          requestId: 'requestId:1' as Protocol.Network.RequestId,
          ruleSetIds: ['ruleSetId:2'] as Protocol.Preload.RuleSetId[],
          nodeIds: [2] as Protocol.DOM.BackendNodeId[],
        },
      },
    ]);
  });

  it('filters preloading attempts by rule set id', async () => {
    const target = createTarget();
    const model = target.model(SDK.PreloadingModel.PreloadingModel);
    assertNotNullOrUndefined(model);

    assert.deepEqual(model.getAllRuleSets(), []);
    assert.deepEqual(model.getPreloadingAttempts(null), []);

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
  "prefetch": [
    {
      "source": "list",
      "urls": ["/subresource12.js"]
    }
  ]
}
`,
      },
    });
    dispatchEvent(target, 'Preload.ruleSetUpdated', {
      ruleSet: {
        id: 'ruleSetId:2',
        loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
        sourceText: `
{
  "prefetch": [
    {
      "source": "list",
      "urls": ["/subresource12.js", "/subresource2.js"]
    }
  ]
}
`,
      },
    });
    dispatchEvent(target, 'Preload.preloadingAttemptSourcesUpdated', {
      loaderId: 'loaderId:1',
      preloadingAttemptSources: [
        {
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1',
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/subresource12.js',
          },
          ruleSetIds: ['ruleSetId:1', 'ruleSetId:2'],
          nodeIds: [1, 2],
        },
        {
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1',
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/subresource2.js',
          },
          ruleSetIds: ['ruleSetId:2'],
          nodeIds: [2],
        },
      ],
    });
    dispatchEvent(target, 'Preload.prefetchStatusUpdated', {
      key: {
        loaderId: 'loaderId:1',
        action: Protocol.Preload.SpeculationAction.Prefetch,
        url: 'https://example.com/subresource12.js',
      },
      status: SDK.PreloadingModel.PreloadingStatus.Running,
      requestId: 'requestId:1',
    });
    dispatchEvent(target, 'Preload.prefetchStatusUpdated', {
      key: {
        loaderId: 'loaderId:1',
        action: Protocol.Preload.SpeculationAction.Prefetch,
        url: 'https://example.com/subresource2.js',
      },
      status: SDK.PreloadingModel.PreloadingStatus.Running,
      requestId: 'requestId:2',
    });

    assert.deepEqual(model.getPreloadingAttempts(null), [
      {
        id: 'loaderId:1:Prefetch:https://example.com/subresource12.js:undefined',
        value: {
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/subresource12.js' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.Running,
          prefetchStatus: null,
          requestId: 'requestId:1' as Protocol.Network.RequestId,
          ruleSetIds: ['ruleSetId:1', 'ruleSetId:2'] as Protocol.Preload.RuleSetId[],
          nodeIds: [1, 2] as Protocol.DOM.BackendNodeId[],
        },
      },
      {
        id: 'loaderId:1:Prefetch:https://example.com/subresource2.js:undefined',
        value: {
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/subresource2.js' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.Running,
          prefetchStatus: null,
          requestId: 'requestId:2' as Protocol.Network.RequestId,
          ruleSetIds: ['ruleSetId:2'] as Protocol.Preload.RuleSetId[],
          nodeIds: [2] as Protocol.DOM.BackendNodeId[],
        },
      },
    ]);

    assert.deepEqual(model.getPreloadingAttempts('ruleSetId:1' as Protocol.Preload.RuleSetId), [
      {
        id: 'loaderId:1:Prefetch:https://example.com/subresource12.js:undefined',
        value: {
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/subresource12.js' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.Running,
          prefetchStatus: null,
          requestId: 'requestId:1' as Protocol.Network.RequestId,
          ruleSetIds: ['ruleSetId:1', 'ruleSetId:2'] as Protocol.Preload.RuleSetId[],
          nodeIds: [1, 2] as Protocol.DOM.BackendNodeId[],
        },
      },
    ]);

    assert.deepEqual(model.getPreloadingAttempts('ruleSetId:2' as Protocol.Preload.RuleSetId), [
      {
        id: 'loaderId:1:Prefetch:https://example.com/subresource12.js:undefined',
        value: {
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/subresource12.js' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.Running,
          prefetchStatus: null,
          requestId: 'requestId:1' as Protocol.Network.RequestId,
          ruleSetIds: ['ruleSetId:1', 'ruleSetId:2'] as Protocol.Preload.RuleSetId[],
          nodeIds: [1, 2] as Protocol.DOM.BackendNodeId[],
        },
      },
      {
        id: 'loaderId:1:Prefetch:https://example.com/subresource2.js:undefined',
        value: {
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/subresource2.js' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.Running,
          prefetchStatus: null,
          requestId: 'requestId:2' as Protocol.Network.RequestId,
          ruleSetIds: ['ruleSetId:2'] as Protocol.Preload.RuleSetId[],
          nodeIds: [2] as Protocol.DOM.BackendNodeId[],
        },
      },
    ]);
  });
});
