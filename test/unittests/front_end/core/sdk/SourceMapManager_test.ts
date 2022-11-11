// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Host from '../../../../../front_end/core/host/host.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

const {assert} = chai;

interface LoadResult {
  success: boolean;
  content: string;
  errorDescription: Host.ResourceLoader.LoadErrorDescription;
}

describeWithMockConnection('SourceMapManager', () => {
  const sourceMapContent = JSON.stringify({
    'version': 3,
    'file': '/script.js',
    'mappings': '',
    'sources': [
      '/original-script.js',
    ],
  });

  const loadSourceMap = async(_url: string): Promise<LoadResult> => {
    return {
      success: true,
      content: sourceMapContent,
      errorDescription: {message: '', statusCode: 0, netError: 0, netErrorName: '', urlValid: true},
    };
  };

  it('uses url for a worker\'s source maps from frame', async () => {
    SDK.PageResourceLoader.PageResourceLoader.instance(
        {forceNew: true, loadOverride: loadSourceMap, maxConcurrentLoads: 1, loadTimeout: 2000});

    const frameUrl = 'https://frame-host/index.html' as Platform.DevToolsPath.UrlString;
    const scriptUrl = 'https://script-host/script.js' as Platform.DevToolsPath.UrlString;
    const sourceUrl = 'script.js' as Platform.DevToolsPath.UrlString;
    const sourceMapUrl = 'script.js.map' as Platform.DevToolsPath.UrlString;

    const mainTarget =
        createTarget({id: 'main' as Protocol.Target.TargetID, name: 'main', type: SDK.Target.Type.Frame});
    mainTarget.setInspectedURL(frameUrl);

    const workerTarget = createTarget({
      id: 'worker' as Protocol.Target.TargetID,
      name: 'worker',
      type: SDK.Target.Type.Worker,
      parentTarget: mainTarget,
    });

    const debuggerModel = workerTarget.model(SDK.DebuggerModel.DebuggerModel);
    assert.isNotNull(debuggerModel);
    if (debuggerModel === null) {
      return;
    }

    const sourceMapManager = debuggerModel.sourceMapManager();

    const script = new SDK.Script.Script(
        debuggerModel, '1' as Protocol.Runtime.ScriptId, scriptUrl, 0, 0, 0, 0, 0, '', false, false, sourceMapUrl,
        false, 0, null, null, null, null, null, null);

    sourceMapManager.attachSourceMap(script, sourceUrl, sourceMapUrl);

    const sourceMap = await sourceMapManager.sourceMapForClientPromise(script);
    // Check that the URLs are resolved relative to the frame.
    assert.strictEqual(sourceMap?.url(), 'https://frame-host/script.js.map' as Platform.DevToolsPath.UrlString);
    assert.deepEqual(
        sourceMap?.sourceURLs(), ['https://frame-host/original-script.js' as Platform.DevToolsPath.UrlString]);
  });

  it('can handle source maps in a data URL frame', async () => {
    SDK.PageResourceLoader.PageResourceLoader.instance(
        {forceNew: true, loadOverride: loadSourceMap, maxConcurrentLoads: 1, loadTimeout: 2000});

    const sourceMapContent = JSON.stringify({
      'version': 3,
      'file': '/script.js',
      'mappings': '',
      'sources': [
        '/original-script.js',
      ],
    });
    const sourceUrl = 'script.js' as Platform.DevToolsPath.UrlString;
    const sourceMapUrl = `data:test/html;base64,${btoa(sourceMapContent)}` as Platform.DevToolsPath.UrlString;
    const frameSource =
        '<script>0\n//# sourceURL=' + sourceUrl + '\n//# sourceMappingURL=' + sourceMapUrl + '</script>';
    const frameUrl = `data:test/html;base64,${btoa(frameSource)}` as Platform.DevToolsPath.UrlString;
    const scriptUrl = 'https://script-host/script.js' as Platform.DevToolsPath.UrlString;

    const mainTarget =
        createTarget({id: 'main' as Protocol.Target.TargetID, name: 'main', type: SDK.Target.Type.Frame});
    mainTarget.setInspectedURL(frameUrl);

    const debuggerModel = mainTarget.model(SDK.DebuggerModel.DebuggerModel);
    assert.isNotNull(debuggerModel);
    if (debuggerModel === null) {
      return;
    }

    const sourceMapManager = debuggerModel.sourceMapManager();

    const script = new SDK.Script.Script(
        debuggerModel, '1' as Protocol.Runtime.ScriptId, scriptUrl, 0, 0, 0, 0, 0, '', false, false, sourceMapUrl,
        false, 0, null, null, null, null, null, null);

    sourceMapManager.attachSourceMap(script, sourceUrl, sourceMapUrl);

    const sourceMap = await sourceMapManager.sourceMapForClientPromise(script);
    assert.deepEqual(sourceMap?.sourceURLs(), ['/original-script.js' as Platform.DevToolsPath.UrlString]);
  });
});
