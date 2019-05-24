// Copyright 2017 The Chromium Authors. All
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 * @suppress {accessControls}
 */

/**
 * Many application panel tests are flaky because storage state (e.g. IndexedDB)
 * doesn't get reset between tests.
 */
ApplicationTestRunner.resetState = async function() {
  const targets = SDK.targetManager.targets();
  for (const target of targets) {
    const securityOrigin = new Common.ParsedURL(target.inspectedURL()).securityOrigin();
    await target.storageAgent().clearDataForOrigin(
        securityOrigin, Resources.ClearStorageView.AllStorageTypes.join(','));
  }
};

ApplicationTestRunner.createWebSQLDatabase = function(name) {
  return TestRunner.evaluateInPageAsync(`_openWebSQLDatabase("${name}")`);
};

ApplicationTestRunner.requestURLComparer = function(r1, r2) {
  return r1.request.url.localeCompare(r2.request.url);
};

ApplicationTestRunner.runAfterCachedResourcesProcessed = function(callback) {
  if (!TestRunner.resourceTreeModel._cachedResourcesProcessed)
    TestRunner.resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.CachedResourcesLoaded, callback);
  else
    callback();
};

ApplicationTestRunner.runAfterResourcesAreFinished = function(resourceURLs, callback) {
  const resourceURLsMap = new Set(resourceURLs);

  function checkResources() {
    for (const url of resourceURLsMap) {
      const resource = ApplicationTestRunner.resourceMatchingURL(url);

      if (resource)
        resourceURLsMap.delete(url);
    }

    if (!resourceURLsMap.size) {
      TestRunner.resourceTreeModel.removeEventListener(SDK.ResourceTreeModel.Events.ResourceAdded, checkResources);
      callback();
    }
  }

  checkResources();

  if (resourceURLsMap.size)
    TestRunner.resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.ResourceAdded, checkResources);
};

ApplicationTestRunner.showResource = function(resourceURL, callback) {
  let reported = false;

  function callbackWrapper(sourceFrame) {
    if (reported)
      return;

    callback(sourceFrame);
    reported = true;
  }

  function showResourceCallback() {
    const resource = ApplicationTestRunner.resourceMatchingURL(resourceURL);

    if (!resource)
      return;

    UI.panels.resources.showResource(resource, 1);
    const sourceFrame = UI.panels.resources._resourceViewForResource(resource);

    if (sourceFrame.loaded)
      callbackWrapper(sourceFrame);
    else
      TestRunner.addSniffer(sourceFrame, 'setContent', callbackWrapper.bind(null, sourceFrame));
  }

  ApplicationTestRunner.runAfterResourcesAreFinished([resourceURL], showResourceCallback);
};

ApplicationTestRunner.resourceMatchingURL = function(resourceURL) {
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

ApplicationTestRunner.waitForCookies = function() {
  return new Promise(resolve => {
    TestRunner.addSniffer(CookieTable.CookiesTable.prototype, '_rebuildTable', resolve);
  });
};

ApplicationTestRunner.dumpCookieDomains = function() {
  const cookieListChildren = UI.panels.resources._sidebar.cookieListTreeElement.children();
  TestRunner.addResult('Available cookie domains:');
  for (const child of cookieListChildren)
    TestRunner.addResult(child._cookieDomain);
};

ApplicationTestRunner.dumpCookies = function() {
  if (!UI.panels.resources._cookieView || !UI.panels.resources._cookieView.isShowing()) {
    TestRunner.addResult('No cookies visible');
    return;
  }

  TestRunner.addResult('Visible cookies');
  for (const item of UI.panels.resources._cookieView._cookiesTable._data) {
    const cookies = item.cookies || [];
    for (const cookie of cookies)
      TestRunner.addResult(`${cookie.name()}=${cookie.value()}`);
  }
};

/**
 * @param {string} label
 */
ApplicationTestRunner.dumpCurrentState = function(label) {
  TestRunner.addResult(label);

  const types = new Map([
    [SourceFrame.ImageView, 'image'], [SourceFrame.JSONView, 'json'],
    [SourceFrame.ResourceSourceFrame.SearchableContainer, 'source'], [SourceFrame.XMLView, 'xml']
  ]);

  const view = UI.panels.resources;
  dump(view._sidebar._sidebarTree.rootElement(), '');

  const visibleView = view.visibleView instanceof UI.SearchableView ? view.visibleView.children()[0] : view.visibleView;
  let typeLabel = 'unknown';
  for (const [typeObject, typeString] of types) {
    if (visibleView instanceof typeObject) {
      typeLabel = typeString;
      break;
    }
  }

  TestRunner.addResult(`visible view: ${typeLabel}`);

  function dump(node, prefix) {
    for (const child of node.children()) {
      TestRunner.addResult(`${prefix}${child.listItemElement.textContent}${child.selected ? ' (selected)' : ''}`);
      dump(child, `${prefix}  `);
    }
  }
};

/**
 * @param {string} name
 * @returns {!Promise<void>}
 */
ApplicationTestRunner.revealResourceWithDisplayName = async function(name) {
  const target = SDK.targetManager.mainTarget();
  const model = target.model(SDK.ResourceTreeModel);
  const resource = model.mainFrame.resources().find(r => r.displayName === name);

  if (!resource) {
    await waitForResource(name);
    return ApplicationTestRunner.revealResourceWithDisplayName(name);
  }

  await Common.Revealer.reveal(resource);
  ApplicationTestRunner.dumpCurrentState(`Revealed ${name}:`);

  async function waitForResource(n) {
    return new Promise(resolve => {
      TestRunner.addSniffer(Resources.FrameTreeElement.prototype, 'appendResource', resolve);
    });
  }
};

ApplicationTestRunner.databaseModel = function() {
  return TestRunner.mainTarget.model(Resources.DatabaseModel);
};

ApplicationTestRunner.domStorageModel = function() {
  return TestRunner.mainTarget.model(Resources.DOMStorageModel);
};

ApplicationTestRunner.indexedDBModel = function() {
  return TestRunner.mainTarget.model(Resources.IndexedDBModel);
};

TestRunner.deprecatedInitAsync(`
  function _openWebSQLDatabase(name) {
    return new Promise(resolve => openDatabase(name, '1.0', '', 1024 * 1024, resolve));
  }
`);
