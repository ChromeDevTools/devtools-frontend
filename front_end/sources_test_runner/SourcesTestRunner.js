// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 * @suppress {accessControls}
 */

/**
 * @param {!Sources.NavigatorView} navigatorView
 * @param {boolean=} dumpIcons
 */
SourcesTestRunner.dumpNavigatorView = function(navigatorView, dumpIcons) {
  dumpNavigatorTreeOutline(navigatorView._scriptsTree);

  /**
   * @param {string} prefix
   * @param {!UI.TreeElement} treeElement
   */
  function dumpNavigatorTreeElement(prefix, treeElement) {
    var titleText = '';
    if (treeElement._leadingIconsElement && dumpIcons) {
      var icons = treeElement._leadingIconsElement.querySelectorAll('[is=ui-icon]');
      icons = Array.prototype.slice.call(icons);
      var iconTypes = icons.map(icon => icon._iconType);
      if (iconTypes.length)
        titleText = titleText + '[' + iconTypes.join(', ') + '] ';
    }
    titleText += treeElement.title;
    if (treeElement._nodeType === Sources.NavigatorView.Types.FileSystem ||
        treeElement._nodeType === Sources.NavigatorView.Types.FileSystemFolder) {
      var hasMappedFiles = treeElement.listItemElement.classList.contains('has-mapped-files');
      if (!hasMappedFiles)
        titleText += ' [dimmed]';
    }
    TestRunner.addResult(prefix + titleText);
    treeElement.expand();
    var children = treeElement.children();
    for (var i = 0; i < children.length; ++i)
      dumpNavigatorTreeElement(prefix + '  ', children[i]);
  }

  /**
   * @param {!UI.TreeOutline} treeOutline
   */
  function dumpNavigatorTreeOutline(treeOutline) {
    var children = treeOutline.rootElement().children();
    for (var i = 0; i < children.length; ++i)
      dumpNavigatorTreeElement('', children[i]);
  }
};

/**
 * @param {!Sources.NavigatorView} view
 */
SourcesTestRunner.dumpNavigatorViewInAllModes = function(view) {
  ['frame', 'frame/domain', 'frame/domain/folder', 'domain', 'domain/folder'].forEach(
      SourcesTestRunner.dumpNavigatorViewInMode.bind(TestRunner, view));
};

/**
 * @param {!Sources.NavigatorView} view
 * @param {string} mode
 */
SourcesTestRunner.dumpNavigatorViewInMode = function(view, mode) {
  TestRunner.addResult(view instanceof Sources.SourcesNavigatorView ? 'Sources:' : 'Content Scripts:');
  view._groupByFrame = mode.includes('frame');
  view._groupByDomain = mode.includes('domain');
  view._groupByFolder = mode.includes('folder');
  view._resetForTest();
  TestRunner.addResult('-------- Setting mode: [' + mode + ']');
  SourcesTestRunner.dumpNavigatorView(view);
};

/**
 * @param {string} urlSuffix
 * @param {!Workspace.projectTypes=} projectType
 * @return {!Promise}
 */
SourcesTestRunner.waitForUISourceCode = function(urlSuffix, projectType) {
  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {boolean}
   */
  function matches(uiSourceCode) {
    if (projectType && uiSourceCode.project().type() !== projectType)
      return false;
    if (!projectType && uiSourceCode.project().type() === Workspace.projectTypes.Service)
      return false;
    if (urlSuffix && !uiSourceCode.url().endsWith(urlSuffix))
      return false;
    return true;
  }

  for (var uiSourceCode of Workspace.workspace.uiSourceCodes()) {
    if (urlSuffix && matches(uiSourceCode))
      return Promise.resolve(uiSourceCode);
  }

  return TestRunner.waitForEvent(Workspace.Workspace.Events.UISourceCodeAdded, Workspace.workspace, matches);
};

/**
 * @param {!Function} callback
 */
SourcesTestRunner.waitForUISourceCodeRemoved = function(callback) {
  Workspace.workspace.once(Workspace.Workspace.Events.UISourceCodeRemoved).then(callback);
};

/**
 * @param {string} url
 * @param {string} content
 * @param {boolean=} isContentScript
 * @param {number=} worldId
 * @return {!Promise}
 */
SourcesTestRunner.addScriptUISourceCode = function(url, content, isContentScript, worldId) {
  content += '\n//# sourceURL=' + url;
  if (isContentScript)
    content = `testRunner.evaluateScriptInIsolatedWorld(${worldId}, \`${content}\`)`;
  TestRunner.evaluateInPagePromise(content);
  return SourcesTestRunner.waitForUISourceCode(url);
};
