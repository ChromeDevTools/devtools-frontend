// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Common from '../../../../../front_end/core/common/common.js';
import * as Host from '../../../../../front_end/core/host/host.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as Root from '../../../../../front_end/core/root/root.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Persistence from '../../../../../front_end/models/persistence/persistence.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import {createTarget, deinitializeGlobalVars, initializeGlobalVars} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';
import {createWorkspaceProject, setUpEnvironment} from '../../helpers/OverridesHelpers.js';
import {createFileSystemUISourceCode} from '../../helpers/UISourceCodeHelpers.js';

const setUpEnvironmentWithUISourceCode =
    (url: string, resourceType: Common.ResourceType.ResourceType, project?: Workspace.Workspace.Project) => {
      const {workspace, networkPersistenceManager} = setUpEnvironment();

      if (!project) {
        project = {id: () => url, type: () => Workspace.Workspace.projectTypes.Network} as Workspace.Workspace.Project;
      }

      const uiSourceCode =
          new Workspace.UISourceCode.UISourceCode(project, url as Platform.DevToolsPath.UrlString, resourceType);

      project.uiSourceCodes = () => [uiSourceCode];

      workspace.addProject(project);

      return {workspace, project: project, uiSourceCode, networkPersistenceManager};
    };

describeWithMockConnection('NetworkPersistenceManager', () => {
  beforeEach(async () => {
    SDK.NetworkManager.MultitargetNetworkManager.dispose();
    const target = createTarget();
    sinon.stub(target.fetchAgent(), 'invoke_enable');
  });

  it('can create an overridden file with Local Overrides enabled', async () => {
    const url = 'http://www.example.com/list-fetch.json';
    const resourceType = Common.ResourceType.resourceTypes.Document;

    const {uiSourceCode} = setUpEnvironmentWithUISourceCode(url, resourceType);
    const networkPersistenceManager =
        await createWorkspaceProject('file:///path/to/overrides' as Platform.DevToolsPath.UrlString, []);

    const saveSpy = sinon.spy(networkPersistenceManager, 'saveUISourceCodeForOverrides');
    const actual = await networkPersistenceManager.setupAndStartLocalOverrides(uiSourceCode);

    saveSpy.restore();

    assert.isTrue(saveSpy.calledOnce, 'should override content once');
    assert.isTrue(actual, 'should complete override successfully');
  });

  it('can create an overridden file with Local Overrides folder set up but disabled', async () => {
    Common.Settings.Settings.instance().moduleSetting('persistenceNetworkOverridesEnabled').set(false);

    const url = 'http://www.example.com/list-xhr.json';
    const resourceType = Common.ResourceType.resourceTypes.Document;

    const {uiSourceCode} = setUpEnvironmentWithUISourceCode(url, resourceType);
    const networkPersistenceManager =
        await createWorkspaceProject('file:///path/to/overrides' as Platform.DevToolsPath.UrlString, []);

    const saveSpy = sinon.spy(networkPersistenceManager, 'saveUISourceCodeForOverrides');
    const actual = await networkPersistenceManager.setupAndStartLocalOverrides(uiSourceCode);

    saveSpy.restore();

    assert.isTrue(saveSpy.calledOnce, 'should override content once');
    assert.isTrue(actual, 'should complete override successfully');
  });
});

describeWithMockConnection('NetworkPersistenceManager', () => {
  it('does not create interception patterns for forbidden URLs', async () => {
    SDK.NetworkManager.MultitargetNetworkManager.dispose();
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.HEADER_OVERRIDES);
    const target = createTarget();

    const networkPersistenceManager =
        await createWorkspaceProject('file:///path/to/overrides' as Platform.DevToolsPath.UrlString, [
          {name: 'helloWorld.html', path: 'www.example.com/', content: 'Hello World!'},
          {name: 'forbidden.html', path: 'chromewebstore.google.com/', content: 'Chrome Web Store'},
          {name: 'flags', path: 'chrome:/', content: 'Chrome Flags'},
          {name: 'index.html', path: 'chrome.google.com/', content: 'Chrome'},
          {name: 'allowed.html', path: 'www.google.com/', content: 'Google Search'},
        ]);

    const stub = sinon.stub(target.fetchAgent(), 'invoke_enable');
    await networkPersistenceManager.updateInterceptionPatternsForTests();

    const patterns = stub.lastCall.args[0].patterns;
    const expected = [
      {
        urlPattern: 'http?://www.example.com/helloWorld.html',
        requestStage: Protocol.Fetch.RequestStage.Response,
      },
      {
        urlPattern: 'http?://www.google.com/allowed.html',
        requestStage: Protocol.Fetch.RequestStage.Response,
      },
    ];
    assert.deepStrictEqual(patterns, expected);
  });
});

describeWithMockConnection('NetworkPersistenceManager', () => {
  let networkPersistenceManager: Persistence.NetworkPersistenceManager.NetworkPersistenceManager;

  beforeEach(async () => {
    SDK.NetworkManager.MultitargetNetworkManager.dispose();
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.HEADER_OVERRIDES);
    const target = createTarget();
    networkPersistenceManager =
        await createWorkspaceProject('file:///path/to/overrides' as Platform.DevToolsPath.UrlString, [
          {
            name: '.headers',
            path: 'www.example.com/',
            content: `[
            {
              "applyTo": "index.html",
              "headers": [{
                "name": "index-only",
                "value": "only added to index.html"
              }]
            },
            {
              "applyTo": "*.css",
              "headers": [{
                "name": "css-only",
                "value": "only added to css files"
              }]
            },
            {
              "applyTo": "path/to/*.js",
              "headers": [{
                "name": "another-header",
                "value": "only added to specific path"
              }]
            },
            {
              "applyTo": "repeated.html",
              "headers": [
                {
                  "name": "repeated",
                  "value": "first override"
                },
                {
                  "name": "repeated",
                  "value": "second override"
                }
              ]
            }
          ]`,
          },
          {
            name: '.headers',
            path: '',
            content: `[
            {
              "applyTo": "*",
              "headers": [{
                "name": "age",
                "value": "overridden"
              }]
            }
          ]`,
          },
          {name: 'helloWorld.html', path: 'www.example.com/', content: 'Hello World!'},
        ]);
    sinon.stub(target.fetchAgent(), 'invoke_enable');
    await networkPersistenceManager.updateInterceptionPatternsForTests();
  });

  it('merges request headers with override without overlap', async () => {
    const interceptedRequest = {
      request: {
        url: 'https://www.example.com/',
      },
      responseHeaders: [
        {name: 'server', value: 'DevTools mock server'},
      ],
    } as SDK.NetworkManager.InterceptedRequest;

    const expected = [
      {name: 'age', value: 'overridden'},
      {name: 'index-only', value: 'only added to index.html'},
      {name: 'server', value: 'DevTools mock server'},
    ];
    const actual = await networkPersistenceManager.handleHeaderInterception(interceptedRequest);
    assert.deepEqual(actual.sort((a, b) => (a.name.localeCompare(b.name))), expected);
  });

  it('merges request headers with override with overlap', async () => {
    const interceptedRequest = {
      request: {
        url: 'https://www.example.com/index.html',
      },
      responseHeaders: [
        {name: 'server', value: 'DevTools mock server'},
        {name: 'age', value: '1'},
      ],
    } as SDK.NetworkManager.InterceptedRequest;

    const expected = [
      {name: 'age', value: 'overridden'},
      {name: 'index-only', value: 'only added to index.html'},
      {name: 'server', value: 'DevTools mock server'},
    ];
    const actual = await networkPersistenceManager.handleHeaderInterception(interceptedRequest);
    assert.deepEqual(actual.sort((a, b) => (a.name.localeCompare(b.name))), expected);
  });

  it('merges request headers with override with file type wildcard', async () => {
    const interceptedRequest = {
      request: {
        url: 'https://www.example.com/styles.css',
      },
      responseHeaders: [
        {name: 'server', value: 'DevTools mock server'},
        {name: 'age', value: '1'},
      ],
    } as SDK.NetworkManager.InterceptedRequest;

    const expected = [
      {name: 'age', value: 'overridden'},
      {name: 'css-only', value: 'only added to css files'},
      {name: 'server', value: 'DevTools mock server'},
    ];
    const actual = await networkPersistenceManager.handleHeaderInterception(interceptedRequest);
    assert.deepEqual(actual.sort((a, b) => (a.name.localeCompare(b.name))), expected);
  });

  it('merges request headers with override with specific path', async () => {
    const interceptedRequest = {
      request: {
        url: 'https://www.example.com/path/to/script.js',
      },
      responseHeaders: [
        {name: 'server', value: 'DevTools mock server'},
        {name: 'age', value: '1'},
      ],
    } as SDK.NetworkManager.InterceptedRequest;

    const expected = [
      {name: 'age', value: 'overridden'},
      {name: 'another-header', value: 'only added to specific path'},
      {name: 'server', value: 'DevTools mock server'},
    ];
    const actual = await networkPersistenceManager.handleHeaderInterception(interceptedRequest);
    assert.deepEqual(actual.sort((a, b) => (a.name.localeCompare(b.name))), expected);
  });

  it('merges request headers only when domain matches', async () => {
    const interceptedRequest = {
      request: {
        url: 'https://www.web.dev/index.html',
      },
      responseHeaders: [
        {name: 'server', value: 'DevTools mock server'},
      ],
    } as SDK.NetworkManager.InterceptedRequest;

    const expected = [
      {name: 'age', value: 'overridden'},
      {name: 'server', value: 'DevTools mock server'},
    ];
    const actual = await networkPersistenceManager.handleHeaderInterception(interceptedRequest);
    assert.deepEqual(actual.sort((a, b) => (a.name.localeCompare(b.name))), expected);
  });

  it('merges headers while leaving muliple headers with the same name unchanged', async () => {
    const interceptedRequest = {
      request: {
        url: 'https://www.example.com/index.html',
      },
      responseHeaders: [
        {name: 'repeated', value: 'first'},
        {name: 'repeated', value: 'second'},
        {name: 'repeated', value: 'third'},
      ],
    } as SDK.NetworkManager.InterceptedRequest;

    const expected = [
      {name: 'age', value: 'overridden'},
      {name: 'index-only', value: 'only added to index.html'},
      {name: 'repeated', value: 'first'},
      {name: 'repeated', value: 'second'},
      {name: 'repeated', value: 'third'},
    ];
    const actual = await networkPersistenceManager.handleHeaderInterception(interceptedRequest);
    assert.deepEqual(actual.sort((a, b) => (a.name.localeCompare(b.name))), expected);
  });

  it('merges headers and can override muliple headers with the same name', async () => {
    const interceptedRequest = {
      request: {
        url: 'https://www.example.com/repeated.html',
      },
      responseHeaders: [
        {name: 'repeated', value: 'first'},
        {name: 'repeated', value: 'second'},
        {name: 'repeated', value: 'third'},
      ],
    } as SDK.NetworkManager.InterceptedRequest;

    const expected = [
      {name: 'age', value: 'overridden'},
      {name: 'repeated', value: 'first override'},
      {name: 'repeated', value: 'second override'},
    ];
    const actual = await networkPersistenceManager.handleHeaderInterception(interceptedRequest);
    assert.deepEqual(actual.sort((a, b) => (a.name.localeCompare(b.name))), expected);
  });

  it('translates URLs into raw and encoded paths', async () => {
    let toTest = [
      // Simple tests.
      {
        url: 'www.example.com/',
        raw: 'www.example.com/index.html',
        encoded: 'www.example.com/index.html',
      },
      {
        url: 'www.example.com/simple',
        raw: 'www.example.com/simple',
        encoded: 'www.example.com/simple',
      },
      {
        url: 'www.example.com/hello/foo/bar',
        raw: 'www.example.com/hello/foo/bar',
        encoded: 'www.example.com/hello/foo/bar',
      },
      {
        url: 'www.example.com/.',
        raw: 'www.example.com/.',
        encoded: 'www.example.com/',
      },
      {
        url: 'localhost:8090/endswith.',
        raw: 'localhost:8090/endswith.',
        encoded: 'localhost:8090/endswith.',
      },
      // Query parameters.
      {
        url: 'example.com/fo?o/bar',
        raw: 'example.com/fo?o%2Fbar',
        encoded: 'example.com/fo%3Fo%252Fbar',
      },
      {
        url: 'example.com/foo?/bar',
        raw: 'example.com/foo?%2Fbar',
        encoded: 'example.com/foo%3F%252Fbar',
      },
      {
        url: 'example.com/foo/?bar',
        raw: 'example.com/foo/?bar',
        encoded: 'example.com/foo/%3Fbar',
      },
      {
        url: 'example.com/?foo/bar/3',
        raw: 'example.com/?foo%2Fbar%2F3',
        encoded: 'example.com/%3Ffoo%252Fbar%252F3',
      },
      {
        url: 'example.com/foo/bar/?3hello/bar',
        raw: 'example.com/foo/bar/?3hello%2Fbar',
        encoded: 'example.com/foo/bar/%3F3hello%252Fbar',
      },
      {url: 'https://www.example.com/?foo=bar', raw: 'www.example.com/?foo=bar', encoded: 'www.example.com/%3Ffoo=bar'},
      {
        url: 'http://www.example.com/?foo=bar/',
        raw: 'www.example.com/?foo=bar%2F',
        encoded: 'www.example.com/%3Ffoo=bar%252F',
      },
      {
        url: 'http://www.example.com/?foo=bar?',
        raw: 'www.example.com/?foo=bar?',
        encoded: 'www.example.com/%3Ffoo=bar%3F',
      },
      // Hash parameters.
      {
        url: 'example.com/?foo/bar/3#hello/bar',
        raw: 'example.com/?foo%2Fbar%2F3',
        encoded: 'example.com/%3Ffoo%252Fbar%252F3',
      },
      {
        url: 'example.com/#foo/bar/3hello/bar',
        raw: 'example.com/index.html',
        encoded: 'example.com/index.html',
      },
      {
        url: 'example.com/foo/bar/#?3hello/bar',
        raw: 'example.com/foo/bar/index.html',
        encoded: 'example.com/foo/bar/index.html',
      },
      {
        url: 'example.com/foo.js#',
        raw: 'example.com/foo.js',
        encoded: 'example.com/foo.js',
      },
      {
        url: 'http://www.web.dev/path/page.html#anchor',
        raw: 'www.web.dev/path/page.html',
        encoded: 'www.web.dev/path/page.html',
      },
      {
        url: 'http://www.example.com/file&$*?.html',
        raw: 'www.example.com/file&$%2A?.html',
        encoded: 'www.example.com/file&$%252A%3F.html',
      },
      {
        url: 'localhost:8090/',
        raw: 'localhost:8090/index.html',
        encoded: 'localhost:8090/index.html',
      },
      {url: 'localhost:8090/lpt1', raw: 'localhost:8090/lpt1', encoded: 'localhost:8090/lpt1'},
      {
        url: 'example.com/foo .js',
        raw: 'example.com/foo%20.js',
        encoded: 'example.com/foo%2520.js',
      },
      {
        url: 'example.com///foo.js',
        raw: 'example.com/foo.js',
        encoded: 'example.com/foo.js',
      },
      {
        url: 'example.com///',
        raw: 'example.com/index.html',
        encoded: 'example.com/index.html',
      },
      // Very long file names.
      {
        url: 'example.com' +
            '/THIS/PATH/IS_MORE_THAN/200/Chars'.repeat(8),
        raw: 'example.com/longurls/Chars-141a715a',
        encoded: 'example.com/longurls/Chars-141a715a',
      },
      {
        url: ('example.com' +
              '/THIS/PATH/IS_LESS_THAN/200/Chars'.repeat(5))
                 .slice(0, -1),
        raw:
            'example.com/THIS/PATH/IS_LESS_THAN/200/Chars/THIS/PATH/IS_LESS_THAN/200/Chars/THIS/PATH/IS_LESS_THAN/200/Chars/THIS/PATH/IS_LESS_THAN/200/Chars/THIS/PATH/IS_LESS_THAN/200/Char',
        encoded:
            'example.com/THIS/PATH/IS_LESS_THAN/200/Chars/THIS/PATH/IS_LESS_THAN/200/Chars/THIS/PATH/IS_LESS_THAN/200/Chars/THIS/PATH/IS_LESS_THAN/200/Chars/THIS/PATH/IS_LESS_THAN/200/Char',
      },
    ];
    if (Host.Platform.isWin()) {
      toTest = [
        {
          url: 'https://www.example.com/?foo=bar',
          raw: 'www.example.com/%3Ffoo=bar',
          encoded: 'www.example.com/%253Ffoo=bar',
        },
        {
          url: 'http://www.web.dev/path/page.html#anchor',
          raw: 'www.web.dev/path/page.html',
          encoded: 'www.web.dev/path/page.html',
        },
        {
          url: 'http://www.example.com/?foo=bar/',
          raw: 'www.example.com/%3Ffoo=bar%2F',
          encoded: 'www.example.com/%253Ffoo=bar%252F',
        },
        {
          url: 'http://www.example.com/?foo=bar?',
          raw: 'www.example.com/%3Ffoo=bar%3F',
          encoded: 'www.example.com/%253Ffoo=bar%253F',
        },
        {
          url: 'http://www.example.com/file&$*?.html',
          raw: 'www.example.com/file&$%2A%3F.html',
          encoded: 'www.example.com/file&$%252A%253F.html',
        },
        {
          url: 'localhost:8090/',
          raw: 'localhost%3A8090/index.html',
          encoded: 'localhost%253A8090/index.html',
        },
        // Windows cannot end with . (period) and space.
        {
          url: 'example.com/foo.js.',
          raw: 'example.com/foo.js%2E',
          encoded: 'example.com/foo.js%252E',
        },
        {
          url: 'localhost:8090/endswith.',
          raw: 'localhost%3A8090/endswith%2E',
          encoded: 'localhost%253A8090/endswith%252E',
        },
        {
          url: 'example.com/foo.js ',
          raw: 'example.com/foo.js%20',
          encoded: 'example.com/foo.js%2520',
        },
        // Reserved filenames on Windows.
        {
          url: 'example.com/CON',
          raw: 'example.com/%43%4F%4E',
          encoded: 'example.com/%2543%254F%254E',
        },
        {
          url: 'example.com/cOn',
          raw: 'example.com/%63%4F%6E',
          encoded: 'example.com/%2563%254F%256E',
        },
        {
          url: 'example.com/cOn/hello',
          raw: 'example.com/%63%4F%6E/hello',
          encoded: 'example.com/%2563%254F%256E/hello',
        },
        {
          url: 'example.com/PRN',
          raw: 'example.com/%50%52%4E',
          encoded: 'example.com/%2550%2552%254E',
        },
        {
          url: 'example.com/AUX',
          raw: 'example.com/%41%55%58',
          encoded: 'example.com/%2541%2555%2558',
        },
        {
          url: 'example.com/NUL',
          raw: 'example.com/%4E%55%4C',
          encoded: 'example.com/%254E%2555%254C',
        },
        {
          url: 'example.com/COM1',
          raw: 'example.com/%43%4F%4D%31',
          encoded: 'example.com/%2543%254F%254D%2531',
        },
        {
          url: 'example.com/COM2',
          raw: 'example.com/%43%4F%4D%32',
          encoded: 'example.com/%2543%254F%254D%2532',
        },
        {
          url: 'example.com/COM3',
          raw: 'example.com/%43%4F%4D%33',
          encoded: 'example.com/%2543%254F%254D%2533',
        },
        {
          url: 'example.com/COM4',
          raw: 'example.com/%43%4F%4D%34',
          encoded: 'example.com/%2543%254F%254D%2534',
        },
        {
          url: 'example.com/COM5',
          raw: 'example.com/%43%4F%4D%35',
          encoded: 'example.com/%2543%254F%254D%2535',
        },
        {
          url: 'example.com/COM6',
          raw: 'example.com/%43%4F%4D%36',
          encoded: 'example.com/%2543%254F%254D%2536',
        },
        {
          url: 'example.com/COM7',
          raw: 'example.com/%43%4F%4D%37',
          encoded: 'example.com/%2543%254F%254D%2537',
        },
        {
          url: 'example.com/COM8',
          raw: 'example.com/%43%4F%4D%38',
          encoded: 'example.com/%2543%254F%254D%2538',
        },
        {
          url: 'example.com/COM9',
          raw: 'example.com/%43%4F%4D%39',
          encoded: 'example.com/%2543%254F%254D%2539',
        },
        {
          url: 'localhost:8090/lpt1',
          raw: 'localhost%3A8090/%6C%70%74%31',
          encoded: 'localhost%253A8090/%256C%2570%2574%2531',
        },
        {
          url: 'example.com/LPT1',
          raw: 'example.com/%4C%50%54%31',
          encoded: 'example.com/%254C%2550%2554%2531',
        },
        {
          url: 'example.com/LPT2',
          raw: 'example.com/%4C%50%54%32',
          encoded: 'example.com/%254C%2550%2554%2532',
        },
        {
          url: 'example.com/LPT3',
          raw: 'example.com/%4C%50%54%33',
          encoded: 'example.com/%254C%2550%2554%2533',
        },
        {
          url: 'example.com/LPT4',
          raw: 'example.com/%4C%50%54%34',
          encoded: 'example.com/%254C%2550%2554%2534',
        },
        {
          url: 'example.com/LPT5',
          raw: 'example.com/%4C%50%54%35',
          encoded: 'example.com/%254C%2550%2554%2535',
        },
        {
          url: 'example.com/LPT6',
          raw: 'example.com/%4C%50%54%36',
          encoded: 'example.com/%254C%2550%2554%2536',
        },
        {
          url: 'example.com/LPT7',
          raw: 'example.com/%4C%50%54%37',
          encoded: 'example.com/%254C%2550%2554%2537',
        },
        {
          url: 'example.com/LPT8',
          raw: 'example.com/%4C%50%54%38',
          encoded: 'example.com/%254C%2550%2554%2538',
        },
        {
          url: 'example.com/LPT9',
          raw: 'example.com/%4C%50%54%39',
          encoded: 'example.com/%254C%2550%2554%2539',
        },

      ];
    }
    toTest.forEach(testStrings => {
      assert.deepEqual(
          networkPersistenceManager.rawPathFromUrl(testStrings.url as Platform.DevToolsPath.UrlString),
          testStrings.raw);
      assert.deepEqual(
          networkPersistenceManager.encodedPathFromUrl(testStrings.url as Platform.DevToolsPath.UrlString),
          testStrings.encoded);
    });
  });

  it('is aware of which \'.headers\' files are currently active', done => {
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const project = {
      type: () => Workspace.Workspace.projectTypes.Network,
    } as Workspace.Workspace.Project;
    const networkUISourceCode = {
      url: () => 'https://www.example.com/hello/world/index.html',
      project: () => project,
      contentType: () => Common.ResourceType.resourceTypes.Document,
    } as Workspace.UISourceCode.UISourceCode;
    project.uiSourceCodes = () => [networkUISourceCode];

    const eventURLs: string[] = [];
    networkPersistenceManager.addEventListener(
        Persistence.NetworkPersistenceManager.Events.RequestsForHeaderOverridesFileChanged, event => {
          eventURLs.push(event.data.url());
        });

    workspace.dispatchEventToListeners(Workspace.Workspace.Events.UISourceCodeAdded, networkUISourceCode);

    assert.isTrue(networkPersistenceManager.hasMatchingNetworkUISourceCodeForHeaderOverridesFile({
      url: () => 'file:///path/to/overrides/www.example.com/.headers',
      project: () => networkPersistenceManager.project(),
    } as Workspace.UISourceCode.UISourceCode));
    assert.isTrue(networkPersistenceManager.hasMatchingNetworkUISourceCodeForHeaderOverridesFile({
      url: () => 'file:///path/to/overrides/.headers',
      project: () => networkPersistenceManager.project(),
    } as Workspace.UISourceCode.UISourceCode));
    assert.isFalse(networkPersistenceManager.hasMatchingNetworkUISourceCodeForHeaderOverridesFile({
      url: () => 'file:///path/to/overrides/www.foo.com/.headers',
      project: () => networkPersistenceManager.project(),
    } as Workspace.UISourceCode.UISourceCode));

    workspace.dispatchEventToListeners(Workspace.Workspace.Events.ProjectRemoved, project);

    setTimeout(() => {
      assert.deepStrictEqual(
          eventURLs, ['file:///path/to/overrides/.headers', 'file:///path/to/overrides/www.example.com/.headers']);
      assert.isFalse(networkPersistenceManager.hasMatchingNetworkUISourceCodeForHeaderOverridesFile({
        url: () => 'file:///path/to/overrides/www.example.com/.headers',
        project: () => networkPersistenceManager.project(),
      } as Workspace.UISourceCode.UISourceCode));
      assert.isFalse(networkPersistenceManager.hasMatchingNetworkUISourceCodeForHeaderOverridesFile({
        url: () => 'file:///path/to/overrides/.headers',
        project: () => networkPersistenceManager.project(),
      } as Workspace.UISourceCode.UISourceCode));
      assert.isFalse(networkPersistenceManager.hasMatchingNetworkUISourceCodeForHeaderOverridesFile({
        url: () => 'file:///path/to/overrides/www.foo.com/.headers',
        project: () => networkPersistenceManager.project(),
      } as Workspace.UISourceCode.UISourceCode));
      done();
    }, 0);
  });
});

describeWithMockConnection('NetworkPersistenceManager', () => {
  beforeEach(() => {
    SDK.NetworkManager.MultitargetNetworkManager.dispose();
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.HEADER_OVERRIDES);
  });

  it('updates active state when target detach and attach', async () => {
    const {networkPersistenceManager} = setUpEnvironment();
    const {project} =
        createFileSystemUISourceCode({url: 'file:///tmp' as Platform.DevToolsPath.UrlString, mimeType: 'text/plain'});
    await networkPersistenceManager.setProject(project);
    const targetManager = SDK.TargetManager.TargetManager.instance();
    assert.isNull(targetManager.rootTarget());
    assert.isFalse(networkPersistenceManager.active());

    const target = await createTarget();
    assert.isTrue(networkPersistenceManager.active());

    targetManager.removeTarget(target);
    target.dispose('test');

    assert.isFalse(networkPersistenceManager.active());
  });
});

describe('NetworkPersistenceManager', () => {
  before(async () => {
    await initializeGlobalVars();
  });
  after(async () => {
    await deinitializeGlobalVars();
  });

  it('escapes patterns to be used in RegExes', () => {
    assert.strictEqual(Persistence.NetworkPersistenceManager.escapeRegex('www.example.com/'), 'www\\.example\\.com/');
    assert.strictEqual(
        Persistence.NetworkPersistenceManager.escapeRegex('www.example.com/index.html'),
        'www\\.example\\.com/index\\.html');
    assert.strictEqual(
        Persistence.NetworkPersistenceManager.escapeRegex('www.example.com/*'), 'www\\.example\\.com/.*');
    assert.strictEqual(
        Persistence.NetworkPersistenceManager.escapeRegex('www.example.com/*.js'), 'www\\.example\\.com/.*\\.js');
    assert.strictEqual(
        Persistence.NetworkPersistenceManager.escapeRegex('www.example.com/file([{with-special$_^chars}])'),
        'www\\.example\\.com/file\\(\\[\\{with\\-special\\$_\\^chars\\}\\]\\)');
    assert.strictEqual(
        Persistence.NetworkPersistenceManager.escapeRegex('www.example.com/page.html?foo=bar'),
        'www\\.example\\.com/page\\.html\\?foo=bar');
    assert.strictEqual(
        Persistence.NetworkPersistenceManager.escapeRegex('www.example.com/*?foo=bar'),
        'www\\.example\\.com/.*\\?foo=bar');
  });

  it('detects when the tail of a path matches with a default index file', () => {
    assert.deepEqual(
        Persistence.NetworkPersistenceManager.extractDirectoryIndex('index.html'), {head: '', tail: 'index.html'});
    assert.deepEqual(
        Persistence.NetworkPersistenceManager.extractDirectoryIndex('index.htm'), {head: '', tail: 'index.htm'});
    assert.deepEqual(
        Persistence.NetworkPersistenceManager.extractDirectoryIndex('index.php'), {head: '', tail: 'index.php'});
    assert.deepEqual(Persistence.NetworkPersistenceManager.extractDirectoryIndex('index.ht'), {head: 'index.ht'});
    assert.deepEqual(Persistence.NetworkPersistenceManager.extractDirectoryIndex('*.html'), {head: '', tail: '*.html'});
    assert.deepEqual(Persistence.NetworkPersistenceManager.extractDirectoryIndex('*.htm'), {head: '', tail: '*.htm'});
    assert.deepEqual(
        Persistence.NetworkPersistenceManager.extractDirectoryIndex('path/*.html'), {head: 'path/', tail: '*.html'});
    assert.deepEqual(Persistence.NetworkPersistenceManager.extractDirectoryIndex('foo*.html'), {head: 'foo*.html'});
    assert.deepEqual(Persistence.NetworkPersistenceManager.extractDirectoryIndex('a*'), {head: 'a*'});
    assert.deepEqual(Persistence.NetworkPersistenceManager.extractDirectoryIndex('a/*'), {head: 'a/*'});
  });

  it('merges headers which do not overlap', () => {
    const {networkPersistenceManager} = setUpEnvironment();
    const baseHeaders = [{
      name: 'age',
      value: '0',
    }];
    const overrideHeaders = [{
      'name': 'accept-ranges',
      'value': 'bytes',
    }];
    const merged = [
      {name: 'accept-ranges', value: 'bytes'},
      {name: 'age', value: '0'},
    ];
    assert.deepEqual(networkPersistenceManager.mergeHeaders(baseHeaders, overrideHeaders), merged);
  });

  it('merges headers which overlap', () => {
    const {networkPersistenceManager} = setUpEnvironment();
    const baseHeaders = [{
      name: 'age',
      value: '0',
    }];
    const overrideHeaders = [
      {name: 'accept-ranges', value: 'bytes'},
      {name: 'age', value: '1'},
    ];
    const merged = [
      {name: 'accept-ranges', value: 'bytes'},
      {name: 'age', value: '1'},
    ];
    assert.deepEqual(networkPersistenceManager.mergeHeaders(baseHeaders, overrideHeaders), merged);
  });

  it('generates header patterns', async () => {
    const {networkPersistenceManager} = setUpEnvironment();
    const headers = `[
      {
        "applyTo": "*",
        "headers": [{
          "name": "age",
          "value": "0"
        }]
      },
      {
        "applyTo": "page.html",
        "headers": [{
          "name": "age",
          "value": "1"
        }]
      },
      {
        "applyTo": "index.html",
        "headers": [{
          "name": "age",
          "value": "2"
        }]
      },
      {
        "applyTo": "nested/path/*.js",
        "headers": [{
          "name": "age",
          "value": "3"
        }]
      },
      {
        "applyTo": "*/path/*.js",
        "headers": [{
          "name": "age",
          "value": "4"
        }]
      }
    ]`;

    const {uiSourceCode} = createFileSystemUISourceCode({
      url: 'file:///path/to/overrides/www.example.com/.headers' as Platform.DevToolsPath.UrlString,
      content: headers,
      mimeType: 'text/plain',
      fileSystemPath: 'file:///path/to/overrides',
    });

    const expectedPatterns = [
      'http?://www.example.com/*',
      'http?://www.example.com/page.html',
      'http?://www.example.com/index.html',
      'http?://www.example.com/',
      'http?://www.example.com/nested/path/*.js',
      'http?://www.example.com/*/path/*.js',
    ];

    const {headerPatterns, path, overridesWithRegex} =
        await networkPersistenceManager.generateHeaderPatterns(uiSourceCode);
    assert.deepEqual(Array.from(headerPatterns).sort(), expectedPatterns.sort());

    const expectedMapping = [
      {
        applyTo: /^www\.example\.com\/.*$/.toString(),
        headers: [{name: 'age', value: '0'}],
      },
      {
        applyTo: /^www\.example\.com\/page\.html$/.toString(),
        headers: [{name: 'age', value: '1'}],
      },
      {
        applyTo: /^www\.example\.com\/(index\.html)?$/.toString(),
        headers: [{name: 'age', value: '2'}],
      },
      {
        applyTo: /^www\.example\.com\/nested\/path\/.*\.js$/.toString(),
        headers: [{name: 'age', value: '3'}],
      },
      {
        applyTo: /^www\.example\.com\/.*\/path\/.*\.js$/.toString(),
        headers: [{name: 'age', value: '4'}],
      },
    ];

    assert.strictEqual(path, 'www.example.com/');
    const actualMapping = overridesWithRegex.map(
        override => ({applyTo: override.applyToRegex.toString(), headers: override.headers}),
    );
    assert.deepEqual(actualMapping, expectedMapping);
  });

  it('generates header patterns for global header overrides', async () => {
    const {networkPersistenceManager} = setUpEnvironment();
    const headers = `[
      {
        "applyTo": "*",
        "headers": [{
          "name": "age",
          "value": "0"
        }]
      }
    ]`;

    const {uiSourceCode} = createFileSystemUISourceCode({
      url: 'file:///path/to/overrides/.headers' as Platform.DevToolsPath.UrlString,
      content: headers,
      mimeType: 'text/plain',
      fileSystemPath: 'file:///path/to/overrides',
    });

    const {headerPatterns} = await networkPersistenceManager.generateHeaderPatterns(uiSourceCode);
    assert.deepEqual(Array.from(headerPatterns), ['http?://*', 'file:///*']);
  });

  it('generates header patterns for long URLs', async () => {
    const {networkPersistenceManager} = setUpEnvironment();
    const headers = `[
      {
        "applyTo": "index.html-5b9f4873.html",
        "headers": [{
          "name": "foo",
          "value": "bar"
        }]
      }
    ]`;

    const {uiSourceCode} = createFileSystemUISourceCode({
      url: 'file:///path/to/overrides/www.longurls.com/longurls/.headers' as Platform.DevToolsPath.UrlString,
      content: headers,
      mimeType: 'text/plain',
      fileSystemPath: 'file:///path/to/overrides',
    });

    const {headerPatterns, path, overridesWithRegex} =
        await networkPersistenceManager.generateHeaderPatterns(uiSourceCode);
    assert.deepEqual(Array.from(headerPatterns), ['http?://www.longurls.com/*']);
    assert.strictEqual(path, 'www.longurls.com/longurls/');

    const expectedMapping = [
      {
        applyTo: /^www\.longurls\.com\/longurls\/index\.html\-5b9f4873\.html$/.toString(),
        headers: [{name: 'foo', value: 'bar'}],
      },
    ];
    const actualMapping = overridesWithRegex.map(
        override => ({applyTo: override.applyToRegex.toString(), headers: override.headers}),
    );
    assert.deepEqual(actualMapping, expectedMapping);
  });

  it('updates interception patterns upon edit of .headers file', async () => {
    const {networkPersistenceManager} = setUpEnvironment();
    const headers = `[
      {
        "applyTo": "index.html",
        "headers": [{
          "name": "foo",
          "value": "bar"
        }]
      }
    ]`;

    const {uiSourceCode} = createFileSystemUISourceCode({
      url: 'file:///path/to/overrides/www.example.com/.headers' as Platform.DevToolsPath.UrlString,
      content: headers,
      mimeType: 'text/plain',
      fileSystemPath: 'file:///path/to/overrides',
    });
    const spy = sinon.spy(networkPersistenceManager, 'updateInterceptionPatterns');
    assert.isTrue(spy.notCalled);

    uiSourceCode.setWorkingCopy(`[
      {
        "applyTo": "index.html",
        "headers": [{
          "name": "foo2",
          "value": "bar2"
        }]
      }
    ]`);
    uiSourceCode.commitWorkingCopy();
    assert.isTrue(spy.calledOnce);
  });
});
