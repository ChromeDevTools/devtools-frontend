// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 */

import * as Sources from '../../panels/sources/sources.js';
import {TestRunner} from '../test_runner/test_runner.js';

/**
 * @param {!Sources.NavigatorView.NavigatorView} navigatorView
 * @param {boolean=} dumpIcons
 */
export const dumpNavigatorView = function(navigatorView, dumpIcons) {
  dumpNavigatorTreeOutline(navigatorView.scriptsTree);

  /**
   * @param {string} prefix
   * @param {!UI.TreeElement} treeElement
   */
  function dumpNavigatorTreeElement(prefix, treeElement) {
    let titleText = '';
    if (treeElement.leadingIconsElement && dumpIcons) {
      let icons = treeElement.leadingIconsElement.querySelectorAll('[is=ui-icon]');
      icons = Array.prototype.slice.call(icons);
      const iconTypes = icons.map(icon => icon.iconType);
      if (iconTypes.length) {
        titleText = titleText + '[' + iconTypes.join(', ') + '] ';
      }
    }
    titleText += treeElement.title;
    if (treeElement.nodeType === Sources.NavigatorView.Types.FileSystem ||
        treeElement.nodeType === Sources.NavigatorView.Types.FileSystemFolder) {
      const hasMappedFiles = treeElement.listItemElement.classList.contains('has-mapped-files');
      if (!hasMappedFiles) {
        titleText += ' [dimmed]';
      }
    }
    TestRunner.addResult(prefix + titleText);
    treeElement.expand();
    const children = treeElement.children();
    for (let i = 0; i < children.length; ++i) {
      dumpNavigatorTreeElement(prefix + '  ', children[i]);
    }
  }

  /**
   * @param {!UI.TreeOutline} treeOutline
   */
  function dumpNavigatorTreeOutline(treeOutline) {
    const children = treeOutline.rootElement().children();
    for (let i = 0; i < children.length; ++i) {
      dumpNavigatorTreeElement('', children[i]);
    }
  }
};

/**
 * @param {!Sources.NavigatorView.NavigatorView} view
 */
export const dumpNavigatorViewInAllModes = function(view) {
  ['frame', 'frame/domain', 'frame/domain/folder', 'domain', 'domain/folder'].forEach(
      dumpNavigatorViewInMode.bind(TestRunner, view));
};

/**
 * @param {!Sources.NavigatorView.NavigatorView} view
 * @param {string} mode
 */
export const dumpNavigatorViewInMode = function(view, mode) {
  TestRunner.addResult(view instanceof Sources.SourcesNavigator.NetworkNavigatorView ? 'Sources:' : 'Content Scripts:');
  view.groupByFrame = mode.includes('frame');
  view.groupByDomain = mode.includes('domain');
  view.groupByFolder = mode.includes('folder');
  view.resetForTest();
  TestRunner.addResult('-------- Setting mode: [' + mode + ']');
  dumpNavigatorView(view);
};

/**
 * @param {string} url
 * @param {string} content
 * @param {boolean=} isContentScript
 * @param {number=} worldId
 * @return {!Promise}
 */
export const addScriptUISourceCode = function(url, content, isContentScript, worldId) {
  content += '\n//# sourceURL=' + url;
  if (isContentScript) {
    content = `testRunner.evaluateScriptInIsolatedWorld(${worldId}, \`${content}\`)`;
  }
  TestRunner.evaluateInPageAnonymously(content);
  return TestRunner.waitForUISourceCode(url);
};

export const dumpSwatchPositions = function(sourceFrame, bookmarkType) {
  const textEditor = sourceFrame.textEditor;
  const markers = textEditor.bookmarks(textEditor.fullRange(), bookmarkType);

  for (let i = 0; i < markers.length; i++) {
    const position = markers[i].position();
    const swatch = markers[i].marker.widgetNode.firstChild;
    let text = swatch.textContent;
    if (swatch.localName === 'devtools-color-swatch') {
      text = swatch.color.asString(swatch.format);
    }
    TestRunner.addResult('Line ' + position.startLine + ', Column ' + position.startColumn + ': ' + text);
  }
};
