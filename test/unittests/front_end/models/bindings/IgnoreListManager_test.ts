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
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

const {assert} = chai;

// Same as in IgnoreListManager.ts.
const UIStrings = {
  removeFromIgnoreList: 'Remove from ignore list',
  addScriptToIgnoreList: 'Add script to ignore list',
  addDirectoryToIgnoreList: 'Add directory to ignore list',
  addAllContentScriptsToIgnoreList: 'Add all content scripts to ignore list',
  addAllThirdPartyScriptsToIgnoreList: 'Add all third-party scripts to ignore list',
};

const sourceMapThirdPartyUrl = 'http://a.b.c/lib/source1.ts' as Platform.DevToolsPath.UrlString;
const sourceMapFolderUrl = 'http://a.b.c/myapp' as Platform.DevToolsPath.UrlString;
const sourceMapFile1Url = 'http://a.b.c/myapp/file1.ts' as Platform.DevToolsPath.UrlString;
const sourceMapFile2Url = 'http://a.b.c/myapp/file2.ts' as Platform.DevToolsPath.UrlString;

const sourceMap = {
  version: 3,
  file: './foo.js',
  mappings: '',
  sources: [sourceMapThirdPartyUrl, sourceMapFile1Url, sourceMapFile2Url],
  sourcesContent: ['// File 1\n'],
  names: [],
  sourceRoot: '',
  x_google_ignoreList: [0],
};

function notNull<T>(val: T|null|undefined): T {
  assertNotNullOrUndefined(val);
  return val;
}

describeWithMockConnection('IgnoreListManager', () => {
  let SDK: typeof SDKModule;
  before(async () => {
    SDK = await import('../../../../../front_end/core/sdk/sdk.js');
  });

  let debuggerModel: SDKModule.DebuggerModel.DebuggerModel;
  let ignoreListManager: Bindings.IgnoreListManager.IgnoreListManager;

  let uiSourceCode: Workspace.UISourceCode.UISourceCode;
  let webpackUiSourceCode: Workspace.UISourceCode.UISourceCode;
  let thirdPartyUiSourceCode: Workspace.UISourceCode.UISourceCode;
  let sourceMapFile1UiSourceCode: Workspace.UISourceCode.UISourceCode;
  let sourceMapFile2UiSourceCode: Workspace.UISourceCode.UISourceCode;
  let contentScriptUiSourceCode: Workspace.UISourceCode.UISourceCode;

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
  const webpackFolderUrl = 'webpack:///src' as Platform.DevToolsPath.UrlString;
  const contentScriptUrl = 'chrome-extension://abc/content.js' as Platform.DevToolsPath.UrlString;
  const SCRIPTS = [
    {
      scriptId: '1' as Protocol.Runtime.ScriptId,
      startLine: 4,
      startColumn: 8,
      endLine: 8,
      endColumn: 0,
      sourceURL: webpackUrl,
      hasSourceURLComment: true,
      executionContextAuxData: undefined,
    },
    {
      scriptId: '2' as Protocol.Runtime.ScriptId,
      startLine: 11,
      startColumn: 8,
      endLine: 11,
      endColumn: 27,
      sourceURL: url,
      sourceMapURL: 'data:,' + encodeURIComponent(JSON.stringify(sourceMap)),
      hasSourceURLComment: false,
    },
    {
      scriptId: '3' as Protocol.Runtime.ScriptId,
      startLine: 4,
      startColumn: 8,
      endLine: 8,
      endColumn: 0,
      sourceURL: contentScriptUrl,
      executionContextAuxData: {isDefault: false},
      hasSourceURLComment: true,
    },
  ];

  beforeEach(async () => {
    const forceNew = true;
    const target = createTarget();
    const targetManager = target.targetManager();
    SDK.PageResourceLoader.PageResourceLoader.instance(
        {forceNew, maxConcurrentLoads: 1, loadOverride: null, loadTimeout: 2000});
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
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
    SCRIPTS.forEach(({
                      scriptId,
                      startLine,
                      startColumn,
                      endLine,
                      endColumn,
                      executionContextAuxData,
                      sourceURL,
                      hasSourceURLComment,
                      sourceMapURL,
                    }) => {
      debuggerModel.parsedScriptSource(
          scriptId, sourceURL, startLine, startColumn, endLine, endColumn, executionContextId, hash,
          executionContextAuxData, false, sourceMapURL, hasSourceURLComment, false, length, false, null, null, null,
          null, embedderName);
    });
    assert.lengthOf(debuggerModel.scripts(), SCRIPTS.length);
    webpackUiSourceCode = notNull(workspace.uiSourceCodeForURL(webpackUrl));
    contentScriptUiSourceCode = notNull(workspace.uiSourceCodeForURL(contentScriptUrl));
    thirdPartyUiSourceCode = await debuggerWorkspaceBinding.waitForUISourceCodeAdded(sourceMapThirdPartyUrl, target);
    sourceMapFile1UiSourceCode = notNull(workspace.uiSourceCodeForURL(sourceMapFile1Url));
    sourceMapFile2UiSourceCode = notNull(workspace.uiSourceCodeForURL(sourceMapFile2Url));
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

  // Wrapper around getIgnoreListFolderContextMenuItems to make its result more convenient for testing
  function getFolderContextMenu(url: Platform.DevToolsPath.UrlString):
      {items: Array<string>, callbacks: Map<string, () => void>} {
    const items: Array<string> = [];
    const callbacks: Map<string, () => void> = new Map();

    for (const {text, callback} of ignoreListManager.getIgnoreListFolderContextMenuItems(url)) {
      items.push(text);
      callbacks.set(text, callback);
    }
    return {items, callbacks};
  }

  it('default is do not ignore', () => {
    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode));
    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(webpackUiSourceCode));
    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(contentScriptUiSourceCode));
  });

  it('default is ignore third party', () => {
    assert.isTrue(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(thirdPartyUiSourceCode));
  });

  it('script context menu enables and disables ignore listing', () => {
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

  it('script context menu enables and disables ignore listing for content scripts', () => {
    let {items, callbacks} = getContextMenu(contentScriptUiSourceCode);

    assert.sameMembers(items, [UIStrings.addScriptToIgnoreList, UIStrings.addAllContentScriptsToIgnoreList]);

    notNull(callbacks.get(UIStrings.addAllContentScriptsToIgnoreList))();

    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode));
    assert.isTrue(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(contentScriptUiSourceCode));

    ({items, callbacks} = getContextMenu(contentScriptUiSourceCode));

    assert.sameMembers(items, [UIStrings.removeFromIgnoreList]);

    notNull(callbacks.get(UIStrings.removeFromIgnoreList))();

    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode));
    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(contentScriptUiSourceCode));
  });

  it('script context menu enables and disables ignore listing for third party scripts', () => {
    let {items, callbacks} = getContextMenu(thirdPartyUiSourceCode);

    assert.sameMembers(items, [UIStrings.removeFromIgnoreList]);

    notNull(callbacks.get(UIStrings.removeFromIgnoreList))();

    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode));
    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(thirdPartyUiSourceCode));

    ({items, callbacks} = getContextMenu(thirdPartyUiSourceCode));

    assert.sameMembers(items, [UIStrings.addScriptToIgnoreList, UIStrings.addAllThirdPartyScriptsToIgnoreList]);

    notNull(callbacks.get(UIStrings.addAllThirdPartyScriptsToIgnoreList))();

    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode));
    assert.isTrue(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(thirdPartyUiSourceCode));
  });

  it('folder context menu enables and disables ignore listing', () => {
    let {items, callbacks} = getFolderContextMenu(webpackFolderUrl);

    assert.sameMembers(items, [UIStrings.addDirectoryToIgnoreList]);

    notNull(callbacks.get(UIStrings.addDirectoryToIgnoreList))();

    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode));
    assert.isTrue(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(webpackUiSourceCode));

    ({items, callbacks} = getFolderContextMenu(webpackFolderUrl));

    assert.sameMembers(items, [UIStrings.removeFromIgnoreList]);

    notNull(callbacks.get(UIStrings.removeFromIgnoreList))();

    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode));
    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(webpackUiSourceCode));
  });

  it('ignore listed folder can be reenabled by script context menu', () => {
    let {items, callbacks} = getFolderContextMenu(webpackFolderUrl);

    assert.sameMembers(items, [UIStrings.addDirectoryToIgnoreList]);

    notNull(callbacks.get(UIStrings.addDirectoryToIgnoreList))();

    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode));
    assert.isTrue(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(webpackUiSourceCode));

    ({items, callbacks} = getContextMenu(webpackUiSourceCode));

    assert.sameMembers(items, [UIStrings.removeFromIgnoreList]);

    notNull(callbacks.get(UIStrings.removeFromIgnoreList))();

    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode));
    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(webpackUiSourceCode));

    ({items, callbacks} = getFolderContextMenu(webpackFolderUrl));

    assert.sameMembers(items, [UIStrings.addDirectoryToIgnoreList]);

    notNull(callbacks.get(UIStrings.addDirectoryToIgnoreList))();

    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode));
    assert.isTrue(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(webpackUiSourceCode));
  });

  it('enable ignore listing undoes disable', () => {
    // Ignore the folder
    let {items, callbacks} = getFolderContextMenu(sourceMapFolderUrl);

    assert.sameMembers(items, [UIStrings.addDirectoryToIgnoreList]);

    notNull(callbacks.get(UIStrings.addDirectoryToIgnoreList))();

    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode));
    assert.isTrue(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(sourceMapFile1UiSourceCode));
    assert.isTrue(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(sourceMapFile2UiSourceCode));

    // Disable the folder ignore list rule by way of the script context menu
    ({items, callbacks} = getContextMenu(sourceMapFile1UiSourceCode));

    assert.sameMembers(items, [UIStrings.removeFromIgnoreList]);

    notNull(callbacks.get(UIStrings.removeFromIgnoreList))();

    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(sourceMapFile1UiSourceCode));
    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(sourceMapFile2UiSourceCode));

    // Verify that we have option to add folder to ignore list (but we won't use it)
    ({items, callbacks} = getFolderContextMenu(sourceMapFolderUrl));

    assert.sameMembers(items, [UIStrings.addDirectoryToIgnoreList]);

    // Reenable from same context menu on same file
    ({items, callbacks} = getContextMenu(sourceMapFile1UiSourceCode));

    assert.sameMembers(items, [UIStrings.addScriptToIgnoreList]);

    notNull(callbacks.get(UIStrings.addScriptToIgnoreList))();

    // This undoes the disable -- reenabling the directory rule
    assert.isTrue(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(sourceMapFile1UiSourceCode));
    assert.isTrue(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(sourceMapFile2UiSourceCode));

    // Verify that we have option to remove folder from ignore list
    ({items, callbacks} = getFolderContextMenu(sourceMapFolderUrl));

    assert.sameMembers(items, [UIStrings.removeFromIgnoreList]);
    // Remove folder from ignore list to verify there are no other ignore listing rules
    notNull(callbacks.get(UIStrings.removeFromIgnoreList))();

    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(sourceMapFile1UiSourceCode));
    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(sourceMapFile2UiSourceCode));
  });

  it('enable ignore listing does not undo disable if done from a different file', () => {
    // Ignore the folder
    let {items, callbacks} = getFolderContextMenu(sourceMapFolderUrl);

    assert.sameMembers(items, [UIStrings.addDirectoryToIgnoreList]);

    notNull(callbacks.get(UIStrings.addDirectoryToIgnoreList))();

    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode));
    assert.isTrue(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(sourceMapFile1UiSourceCode));
    assert.isTrue(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(sourceMapFile2UiSourceCode));

    // Disable the folder ignore list rule by way of the script context menu
    ({items, callbacks} = getContextMenu(sourceMapFile1UiSourceCode));

    assert.sameMembers(items, [UIStrings.removeFromIgnoreList]);

    notNull(callbacks.get(UIStrings.removeFromIgnoreList))();

    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(sourceMapFile1UiSourceCode));
    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(sourceMapFile2UiSourceCode));

    // Enable ignore listing on a different file in same folder
    ({items, callbacks} = getContextMenu(sourceMapFile2UiSourceCode));

    assert.sameMembers(items, [UIStrings.addScriptToIgnoreList]);

    notNull(callbacks.get(UIStrings.addScriptToIgnoreList))();

    // This creates a rule for just that file
    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(sourceMapFile1UiSourceCode));
    assert.isTrue(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(sourceMapFile2UiSourceCode));
  });

  it('script context menu enables global ignore listing toggle', () => {
    let {items, callbacks} = getContextMenu(webpackUiSourceCode);

    assert.sameMembers(items, [UIStrings.addScriptToIgnoreList]);

    notNull(callbacks.get(UIStrings.addScriptToIgnoreList))();

    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode));
    assert.isTrue(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(webpackUiSourceCode));

    ignoreListManager.enableIgnoreListing = false;

    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode));
    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(webpackUiSourceCode));

    ({items, callbacks} = getContextMenu(webpackUiSourceCode));

    assert.sameMembers(items, [UIStrings.addScriptToIgnoreList]);

    notNull(callbacks.get(UIStrings.addScriptToIgnoreList))();
    assert.isTrue(ignoreListManager.enableIgnoreListing);

    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode));
    assert.isTrue(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(webpackUiSourceCode));
  });

  it('content script context menu enables global ignore listing toggle', () => {
    ignoreListManager.enableIgnoreListing = false;

    const {items, callbacks} = getContextMenu(contentScriptUiSourceCode);

    assert.sameMembers(items, [UIStrings.addScriptToIgnoreList, UIStrings.addAllContentScriptsToIgnoreList]);

    notNull(callbacks.get(UIStrings.addAllContentScriptsToIgnoreList))();

    assert.isTrue(ignoreListManager.enableIgnoreListing);
    assert.isTrue(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(contentScriptUiSourceCode));
  });

  it('third party script context menu enables global ignore listing toggle', () => {
    ignoreListManager.enableIgnoreListing = false;

    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(thirdPartyUiSourceCode));

    const {items, callbacks} = getContextMenu(thirdPartyUiSourceCode);

    assert.sameMembers(items, [UIStrings.addScriptToIgnoreList, UIStrings.addAllThirdPartyScriptsToIgnoreList]);

    notNull(callbacks.get(UIStrings.addAllThirdPartyScriptsToIgnoreList))();

    assert.isTrue(ignoreListManager.enableIgnoreListing);
    assert.isTrue(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(thirdPartyUiSourceCode));
  });
});
