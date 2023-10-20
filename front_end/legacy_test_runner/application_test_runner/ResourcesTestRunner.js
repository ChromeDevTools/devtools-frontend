// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Application from '../../panels/application/application.js';

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 */

/**
 * Many application panel tests are flaky because storage state (e.g. IndexedDB)
 * doesn't get reset between tests.
 */
export const resetState = async function() {
  const targets = SDK.TargetManager.TargetManager.instance().targets();
  for (const target of targets) {
    if (target.type() === 'tab') {
      continue;
    }
    const securityOrigin = new Common.ParsedURL.ParsedURL(target.inspectedURL()).securityOrigin();
    await target.storageAgent().clearDataForOrigin(securityOrigin, Application.StorageView.AllStorageTypes.join(','));
  }
};

export const createWebSQLDatabase = function(name) {
  return TestRunner.evaluateInPageAsync(`_openWebSQLDatabase("${name}")`);
};

export const requestURLComparer = function(r1, r2) {
  return r1.request.url.localeCompare(r2.request.url);
};

export const runAfterCachedResourcesProcessed = function(callback) {
  if (!TestRunner.resourceTreeModel.cachedResourcesProcessed) {
    TestRunner.resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.CachedResourcesLoaded, callback);
  } else {
    callback();
  }
};

export const runAfterResourcesAreFinished = function(resourceURLs, callback) {
  const resourceURLsMap = new Set(resourceURLs);

  function checkResources() {
    for (const url of resourceURLsMap) {
      const resource = resourceMatchingURL(url);

      if (resource) {
        resourceURLsMap.delete(url);
      }
    }

    if (!resourceURLsMap.size) {
      TestRunner.resourceTreeModel.removeEventListener(SDK.ResourceTreeModel.Events.ResourceAdded, checkResources);
      callback();
    }
  }

  checkResources();

  if (resourceURLsMap.size) {
    TestRunner.resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.ResourceAdded, checkResources);
  }
};

export const showResource = function(resourceURL, callback) {
  let reported = false;

  function callbackWrapper(sourceFrame) {
    if (reported) {
      return;
    }

    callback(sourceFrame);
    reported = true;
  }

  function showResourceCallback() {
    const resource = resourceMatchingURL(resourceURL);

    if (!resource) {
      return;
    }

    Application.ResourcesPanel.ResourcesPanel.instance().showResource(resource, 1);
    const sourceFrame = Application.ResourcesPanel.ResourcesPanel.instance().resourceViewForResource(resource);

    if (sourceFrame.loaded) {
      callbackWrapper(sourceFrame);
    } else {
      TestRunner.addSniffer(sourceFrame, 'setContent', callbackWrapper.bind(null, sourceFrame));
    }
  }

  runAfterResourcesAreFinished([resourceURL], showResourceCallback);
};

export const resourceMatchingURL = function(resourceURL) {
  let result = null;
  TestRunner.resourceTreeModel.forAllResources(visit);

  function visit(resource) {
    if (resource.url.indexOf(resourceURL) !== -1) {
      result = resource;
      return true;
    }
  }

  return result;
};

export const findTreeElement = function(parent, path) {
  if (path.length === 0) {
    return parent;
  }
  const child = parent.children().find(child => child.title === path[0]);
  if (!child) {
    return null;
  }
  child.expand();
  return findTreeElement(child, path.slice(1));
};

export const waitForCookies = function() {
  return new Promise(resolve => {
    TestRunner.addSniffer(CookieTable.CookiesTable.prototype, 'rebuildTable', resolve);
  });
};

export const dumpCookieDomains = function() {
  const cookieListChildren =
      Application.ResourcesPanel.ResourcesPanel.instance().sidebar.cookieListTreeElement.children();
  TestRunner.addResult('Available cookie domains:');
  for (const child of cookieListChildren) {
    TestRunner.addResult(child.cookieDomain);
  }
};

export const dumpCookies = function() {
  if (!Application.ResourcesPanel.ResourcesPanel.instance().cookieView || !UI.panels.resources.cookieView.isShowing()) {
    TestRunner.addResult('No cookies visible');
    return;
  }

  TestRunner.addResult('Visible cookies');
  for (const item of Application.ResourcesPanel.ResourcesPanel.instance().cookieView.cookiesTable.data) {
    const cookies = item.cookies || [];
    for (const cookie of cookies) {
      TestRunner.addResult(`${cookie.name()}=${cookie.value()}`);
    }
  }
};

export const databaseModel = function() {
  return TestRunner.mainTarget.model(Application.DatabaseModel.DatabaseModel);
};

export const domStorageModel = function() {
  return TestRunner.mainTarget.model(Application.DOMStorageModel.DOMStorageModel);
};

export const indexedDBModel = function() {
  return TestRunner.mainTarget.model(Application.IndexedDBModel.IndexedDBModel);
};

TestRunner.deprecatedInitAsync(`
  function _openWebSQLDatabase(name) {
    return new Promise(resolve => openDatabase(name, '1.0', '', 1024 * 1024, resolve));
  }
`);
