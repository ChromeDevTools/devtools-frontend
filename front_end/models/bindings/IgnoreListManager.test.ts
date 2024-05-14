// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {createResource, getMainFrame} from '../../testing/ResourceTreeHelpers.js';
import {createContentProviderUISourceCode} from '../../testing/UISourceCodeHelpers.js';
import * as Workspace from '../workspace/workspace.js';

import * as Bindings from './bindings.js';

// Same as in IgnoreListManager.ts.
const UIStrings = {
  removeFromIgnoreList: 'Remove from ignore list',
  addScriptToIgnoreList: 'Add script to ignore list',
  addDirectoryToIgnoreList: 'Add directory to ignore list',
  addAllContentScriptsToIgnoreList: 'Add all extension scripts to ignore list',
  addAllThirdPartyScriptsToIgnoreList: 'Add all third-party scripts to ignore list',
};

const sourceMapThirdPartyFolderUrl = 'http://a.b.c/lib' as Platform.DevToolsPath.UrlString;
const sourceMapThirdPartyUrl = 'http://a.b.c/lib/source1.ts' as Platform.DevToolsPath.UrlString;
const sourceMapNodeModulesUrl = 'http://a.b.c/node_modules/library/source3.ts' as Platform.DevToolsPath.UrlString;
const sourceMapFolderUrl = 'http://a.b.c/myapp' as Platform.DevToolsPath.UrlString;
const sourceMapFile1Url = 'http://a.b.c/myapp/file1.ts' as Platform.DevToolsPath.UrlString;
const sourceMapFile2Url = 'http://a.b.c/myapp/file2.ts' as Platform.DevToolsPath.UrlString;

const sourceMap = {
  version: 3,
  file: './foo.js',
  mappings: '',
  sources: [sourceMapThirdPartyUrl, sourceMapFile1Url, sourceMapFile2Url, sourceMapNodeModulesUrl],
  sourcesContent: ['// File 1\n'],
  names: [],
  sourceRoot: '',
  x_google_ignoreList: [0],
};

function notNull<T>(val: T|null|undefined): T {
  assert.exists(val);
  return val;
}

describeWithMockConnection('IgnoreListManager', () => {
  let debuggerModel: SDK.DebuggerModel.DebuggerModel;
  let ignoreListManager: Bindings.IgnoreListManager.IgnoreListManager;

  let uiSourceCode: Workspace.UISourceCode.UISourceCode;
  let webpackUiSourceCode: Workspace.UISourceCode.UISourceCode;
  let thirdPartyUiSourceCode: Workspace.UISourceCode.UISourceCode;
  let nodeModulesUiSourceCode: Workspace.UISourceCode.UISourceCode;
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
  const webpackUrl = 'webpack:///src/subfolder/foo.js' as Platform.DevToolsPath.UrlString;
  const webpackFolderUrl = 'webpack:///src' as Platform.DevToolsPath.UrlString;
  const webpackSubfolderUrl = 'webpack:///src/subfolder' as Platform.DevToolsPath.UrlString;
  const contentScriptFolderUrl = 'chrome-extension://abc' as Platform.DevToolsPath.UrlString;
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
  const ALL_URLS = [...sourceMap.sources, ...SCRIPTS.map(({sourceURL}) => sourceURL)];

  beforeEach(async () => {
    const forceNew = true;
    const target = createTarget();
    const targetManager = target.targetManager();
    SDK.PageResourceLoader.PageResourceLoader.instance({forceNew, maxConcurrentLoads: 1, loadOverride: null});
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const debuggerWorkspaceBinding =
        Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({forceNew, resourceMapping, targetManager});
    ignoreListManager = Bindings.IgnoreListManager.IgnoreListManager.instance({forceNew, debuggerWorkspaceBinding});

    // Inject the HTML document resource.
    createResource(getMainFrame(target), url, 'text/html', '');
    uiSourceCode = notNull(workspace.uiSourceCodeForURL(url));

    // Register the inline <script>s.
    const hash = '';
    const length = 0;
    const embedderName = url;
    const executionContextId = 1;
    debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel) as SDK.DebuggerModel.DebuggerModel;
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
    nodeModulesUiSourceCode = notNull(workspace.uiSourceCodeForURL(sourceMapNodeModulesUrl));
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
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const options: Bindings.IgnoreListManager.IgnoreListGeneralRules = {
      isContentScript: url === contentScriptFolderUrl,
      isKnownThirdParty: url === sourceMapThirdPartyFolderUrl,
      isCurrentlyIgnoreListed: ALL_URLS.every(
          scriptUrl => !scriptUrl.startsWith(url) ||
              ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(
                  notNull(workspace.uiSourceCodeForURL(scriptUrl)))),
    };

    for (const {text, callback} of ignoreListManager.getIgnoreListFolderContextMenuItems(url, options)) {
      items.push(text);
      callbacks.set(text, callback);
    }
    return {items, callbacks};
  }

  it('default is do not ignore', () => {
    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode));
    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(webpackUiSourceCode));
  });

  it('default is ignore third party', () => {
    assert.isTrue(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(thirdPartyUiSourceCode));
  });

  it('default is ignore content scripts from extensions', () => {
    assert.isTrue(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(contentScriptUiSourceCode));
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
    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode));
    assert.isTrue(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(contentScriptUiSourceCode));

    let {items, callbacks} = getContextMenu(contentScriptUiSourceCode);

    assert.sameMembers(items, [UIStrings.removeFromIgnoreList]);

    notNull(callbacks.get(UIStrings.removeFromIgnoreList))();

    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode));
    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(contentScriptUiSourceCode));

    ({items, callbacks} = getContextMenu(contentScriptUiSourceCode));
    assert.sameMembers(items, [UIStrings.addScriptToIgnoreList, UIStrings.addAllContentScriptsToIgnoreList]);

    notNull(callbacks.get(UIStrings.addAllContentScriptsToIgnoreList))();

    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode));
    assert.isTrue(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(contentScriptUiSourceCode));
  });

  it('folder context menu enables and disables ignore listing for content scripts', () => {
    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode));
    assert.isTrue(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(contentScriptUiSourceCode));

    let {items, callbacks} = getFolderContextMenu(contentScriptFolderUrl);

    assert.sameMembers(items, [UIStrings.removeFromIgnoreList]);

    notNull(callbacks.get(UIStrings.removeFromIgnoreList))();

    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode));
    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(contentScriptUiSourceCode));

    ({items, callbacks} = getFolderContextMenu(contentScriptFolderUrl));
    assert.sameMembers(items, [UIStrings.addDirectoryToIgnoreList, UIStrings.addAllContentScriptsToIgnoreList]);

    notNull(callbacks.get(UIStrings.addAllContentScriptsToIgnoreList))();

    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode));
    assert.isTrue(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(contentScriptUiSourceCode));
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

  it('folder context menu enables and disables ignore listing for third party scripts', () => {
    let {items, callbacks} = getFolderContextMenu(sourceMapThirdPartyFolderUrl);

    assert.sameMembers(items, [UIStrings.removeFromIgnoreList]);

    notNull(callbacks.get(UIStrings.removeFromIgnoreList))();

    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode));
    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(thirdPartyUiSourceCode));

    ({items, callbacks} = getFolderContextMenu(sourceMapThirdPartyFolderUrl));

    assert.sameMembers(items, [UIStrings.addDirectoryToIgnoreList, UIStrings.addAllThirdPartyScriptsToIgnoreList]);

    notNull(callbacks.get(UIStrings.addAllThirdPartyScriptsToIgnoreList))();

    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode));
    assert.isTrue(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(thirdPartyUiSourceCode));
  });

  it('folder context menu disables default node_modules ignore listing rule', () => {
    assert.isTrue(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(nodeModulesUiSourceCode));

    const {items, callbacks} = getFolderContextMenu(sourceMapNodeModulesUrl);

    assert.sameMembers(items, [UIStrings.removeFromIgnoreList]);

    notNull(callbacks.get(UIStrings.removeFromIgnoreList))();

    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(nodeModulesUiSourceCode));
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

  it('ignore listed folder can be reenabled by subfolder context menu', () => {
    let {items, callbacks} = getFolderContextMenu(webpackFolderUrl);

    assert.sameMembers(items, [UIStrings.addDirectoryToIgnoreList]);

    notNull(callbacks.get(UIStrings.addDirectoryToIgnoreList))();

    assert.isFalse(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode));
    assert.isTrue(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(webpackUiSourceCode));

    ({items, callbacks} = getFolderContextMenu(webpackSubfolderUrl));

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

  it('provides no context menu items when all contents in folder are individually ignored', () => {
    let {items, callbacks} = getContextMenu(webpackUiSourceCode);

    assert.sameMembers(items, [UIStrings.addScriptToIgnoreList]);

    // Disable webpack script
    notNull(callbacks.get(UIStrings.addScriptToIgnoreList))();

    assert.isTrue(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(webpackUiSourceCode));

    // Get context menu for folder only containing the script we disabled
    ({items, callbacks} = getFolderContextMenu(webpackFolderUrl));

    // Verify that no context menu items are provided
    assert.sameMembers(items, []);
  });

  describe('isUserOrSourceMapIgnoreListedUISourceCode', () => {
    it('ignores UISourceCodes that are marked', () => {
      const {uiSourceCode} = createContentProviderUISourceCode({
        url: 'debugger://foo' as Platform.DevToolsPath.UrlString,
        projectType: Workspace.Workspace.projectTypes.Debugger,
        mimeType: 'text/javascript',
      });
      uiSourceCode.markAsUnconditionallyIgnoreListed();

      assert.isTrue(ignoreListManager.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode));
    });
  });
});
