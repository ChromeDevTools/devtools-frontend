// Copyright 2017 The Chromium Authors. All
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 * @suppress {accessControls}
 */

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
  var resourceURLsMap = new Set(resourceURLs);

  function checkResources() {
    for (var url of resourceURLsMap) {
      var resource = ApplicationTestRunner.resourceMatchingURL(url);

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
  var reported = false;

  function callbackWrapper(sourceFrame) {
    if (reported)
      return;

    callback(sourceFrame);
    reported = true;
  }

  function showResourceCallback() {
    var resource = ApplicationTestRunner.resourceMatchingURL(resourceURL);

    if (!resource)
      return;

    UI.panels.resources.showResource(resource, 1);
    var sourceFrame = UI.panels.resources._resourceViewForResource(resource);

    if (sourceFrame.loaded)
      callbackWrapper(sourceFrame);
    else
      TestRunner.addSniffer(sourceFrame, 'onTextEditorContentSet', callbackWrapper.bind(null, sourceFrame));
  }

  ApplicationTestRunner.runAfterResourcesAreFinished([resourceURL], showResourceCallback);
};

ApplicationTestRunner.resourceMatchingURL = function(resourceURL) {
  var result = null;
  TestRunner.resourceTreeModel.forAllResources(visit);

  function visit(resource) {
    if (resource.url.indexOf(resourceURL) !== -1) {
      result = resource;
      return true;
    }
  }

  return result;
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

(async function() {
  await TestRunner.evaluateInPagePromise(`
    function _openWebSQLDatabase(name) {
      return new Promise(resolve => openDatabase(name, '1.0', '', 1024 * 1024, resolve));
    }
  `);
})();
