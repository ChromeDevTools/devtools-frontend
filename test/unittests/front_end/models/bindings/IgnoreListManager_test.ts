// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../front_end/core/common/common.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import type * as SDKModule from '../../../../../front_end/core/sdk/sdk.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as Bindings from '../../../../../front_end/models/bindings/bindings.js';
import * as Workspace from '../../../../../front_end/models/workspace/workspace.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

const {assert} = chai;

// Same as in IgnoreListManager.ts.
const UIStrings = {
  removeFromIgnoreList: 'Remove from ignore list',
  addScriptToIgnoreList: 'Add script to ignore list',
  removeAllContentScriptsFrom: 'Remove all content scripts from ignore list',
  addAllContentScriptsToIgnoreList: 'Add all content scripts to ignore list',
};

function notNull<T>(val: T|null|undefined): T {
  assert.isNotNull(val);
  return val as T;
}

describeWithMockConnection('IgnoreListManager', () => {
  let SDK: typeof SDKModule;
  before(async () => {
    SDK = await import('../../../../../front_end/core/sdk/sdk.js');
  });

  let debuggerModel: SDKModule.DebuggerModel.DebuggerModel;
  // let resourceMapping: Bindings.ResourceMapping.ResourceMapping;
  let uiSourceCode: Workspace.UISourceCode.UISourceCode;
  let webpackUiSourceCode: Workspace.UISourceCode.UISourceCode;
  let ignoreListManager: Bindings.IgnoreListManager.IgnoreListManager;

  // This test simulates the behavior of the IgnoreListManager with the
  // following document, which contains two inline <script>s, one with
  // a `//# sourceURL` annotation and one without.
  //
  //  <!DOCTYPE html>
  //  <html>
  //  <head>
  //  <meta charset=utf-8>
  //  <script>
  //  function foo() { console.log("foo"); }
  //  foo();
  //  //# sourceURL=webpack:///src/foo.js
  //  </script>
  //  </head>
  //  <body>
  //  <script>console.log("bar");</script>
  //  </body>
  //  </html>
  //
  const url = 'http://example.com/index.html' as Platform.DevToolsPath.UrlString;
  const webpackUrl = 'webpack:///src/foo.js' as Platform.DevToolsPath.UrlString;
  const SCRIPTS = [
    {
      scriptId: '1' as Protocol.Runtime.ScriptId,
      startLine: 4,
      startColumn: 8,
      endLine: 8,
      endColumn: 0,
      sourceURL: webpackUrl,
      hasSourceURLComment: true,
    },
    {
      scriptId: '2' as Protocol.Runtime.ScriptId,
      startLine: 11,
      startColumn: 8,
      endLine: 11,
      endColumn: 27,
      sourceURL: url,
      hasSourceURLComment: false,
    },
  ];

  beforeEach(async () => {
    const target = createTarget();
    const targetManager = target.targetManager();
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const forceNew = true;
    const debuggerWorkspaceBinding =
        Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({forceNew, resourceMapping, targetManager});
    ignoreListManager = Bindings.IgnoreListManager.IgnoreListManager.instance({forceNew, debuggerWorkspaceBinding});

    // Inject the HTML document resource.
    const frameId = 'main' as Protocol.Page.FrameId;
    const mimeType = 'text/html';
    const resourceTreeModel = notNull(target.model(SDK.ResourceTreeModel.ResourceTreeModel));
    const frame = resourceTreeModel.frameAttached(frameId, null);
    frame?.addResource(new SDK.Resource.Resource(
        resourceTreeModel, null, url, url, frameId, null, Common.ResourceType.ResourceType.fromMimeType(mimeType),
        mimeType, null, null));
    uiSourceCode = notNull(workspace.uiSourceCodeForURL(url));

    // Register the inline <script>s.
    const hash = '';
    const length = 0;
    const embedderName = url;
    const executionContextId = 1;
    debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel) as SDKModule.DebuggerModel.DebuggerModel;
    SCRIPTS.forEach(({scriptId, startLine, startColumn, endLine, endColumn, sourceURL, hasSourceURLComment}) => {
      debuggerModel.parsedScriptSource(
          scriptId, sourceURL, startLine, startColumn, endLine, endColumn, executionContextId, hash, undefined, false,
          undefined, hasSourceURLComment, false, length, false, null, null, null, null, embedderName);
    });
    assert.lengthOf(debuggerModel.scripts(), SCRIPTS.length);
    webpackUiSourceCode = notNull(workspace.uiSourceCodeForURL(webpackUrl));
  });

  // Wrapper around getIgnoreListURLContextMenuItems to make its result more convenient for testing
  function getContextMenu(uiSourceCode: Workspace.UISourceCode.UISourceCode):
      {items: Array<string>, callbacks: Map<string, () => void>} {
    const items: Array<string> = [];
    const callbacks: Map<string, () => void> = new Map();

    for (const {text, callback} of ignoreListManager.getIgnoreListURLContextMenuItems(uiSourceCode)) {
      items.push(text);
      callbacks.set(text, callback);
    }
    return {items, callbacks};
  }

  it('default is do not ignore', () => {
    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode));
    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(webpackUiSourceCode));
  });

  it('context menu enables and disables ignore listing', () => {
    let {items, callbacks} = getContextMenu(webpackUiSourceCode);

    assert.sameMembers(items, [UIStrings.addScriptToIgnoreList]);

    notNull(callbacks.get(UIStrings.addScriptToIgnoreList))();

    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode));
    assert.isTrue(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(webpackUiSourceCode));

    ({items, callbacks} = getContextMenu(webpackUiSourceCode));

    assert.sameMembers(items, [UIStrings.removeFromIgnoreList]);

    notNull(callbacks.get(UIStrings.removeFromIgnoreList))();

    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode));
    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(webpackUiSourceCode));
  });
});
