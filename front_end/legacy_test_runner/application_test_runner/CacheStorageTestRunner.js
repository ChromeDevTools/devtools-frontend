// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Application from '../../panels/application/application.js';

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 */

export const dumpCacheTree = async function(pathFilter) {
  Application.ResourcesPanel.ResourcesPanel.instance().sidebar.cacheStorageListTreeElement.expand();
  const promise =
      TestRunner.addSnifferPromise(SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel.prototype, 'updateCacheNames');
  Application.ResourcesPanel.ResourcesPanel.instance().sidebar.cacheStorageListTreeElement.refreshCaches();
  await promise;
  await dumpCacheTreeNoRefresh(pathFilter);
};

export const dumpCacheTreeNoRefresh = async function(pathFilter) {
  function _dumpDataGrid(dataGrid) {
    for (const node of dataGrid.rootNode().children) {
      const children = Array.from(node.element().children).filter(function(element) {
        return !element.classList.contains('response-time-column');
      });

      const entries = Array.from(children, td => td.textContent).filter(text => text);
      TestRunner.addResult(' '.repeat(8) + entries.join(', '));
    }
  }
  Application.ResourcesPanel.ResourcesPanel.instance().sidebar.cacheStorageListTreeElement.expand();

  if (!pathFilter) {
    TestRunner.addResult('Dumping CacheStorage tree:');
  } else {
    TestRunner.addResult('Dumping CacheStorage tree with URL path filter string "' + pathFilter + '"');
  }

  const cachesTreeElement = Application.ResourcesPanel.ResourcesPanel.instance().sidebar.cacheStorageListTreeElement;

  if (!cachesTreeElement.childCount()) {
    TestRunner.addResult('    (empty)');
    return;
  }

  for (let i = 0; i < cachesTreeElement.childCount(); ++i) {
    const cacheTreeElement = cachesTreeElement.childAt(i);
    TestRunner.addResult('    cache: ' + cacheTreeElement.title);
    let view = cacheTreeElement.view;

    if (!view) {
      cacheTreeElement.onselect(false);
    }
    view = cacheTreeElement.view;
    await view.updateData(true);
    if (cacheTreeElement.view.entriesForTest.length === 0) {
      TestRunner.addResult('        (cache empty)');
      continue;
    }

    if (!pathFilter) {
      _dumpDataGrid(view.dataGrid);
      TestRunner.addResult('        totalCount: ' + String(view.returnCount));
      continue;
    }

    cacheTreeElement.view.entryPathFilter = pathFilter;
    await view.updateData(true);
    if (cacheTreeElement.view.entriesForTest.length === 0) {
      TestRunner.addResult('        (no matching entries)');
      continue;
    }

    _dumpDataGrid(cacheTreeElement.view.dataGrid);
    TestRunner.addResult('        totalCount: ' + String(view.returnCount));
  }
};

export const dumpCachedEntryContent = async function(cacheName, requestUrl, withHeader) {
  Application.ResourcesPanel.ResourcesPanel.instance().sidebar.cacheStorageListTreeElement.expand();
  const promise =
      TestRunner.addSnifferPromise(SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel.prototype, 'updateCacheNames');
  Application.ResourcesPanel.ResourcesPanel.instance().sidebar.cacheStorageListTreeElement.refreshCaches();
  await promise;
  await dumpCachedEntryContentNoRefresh(cacheName, requestUrl, withHeader);
};

export const dumpCachedEntryContentNoRefresh = async function(cacheName, requestUrl, withHeader) {
  Application.ResourcesPanel.ResourcesPanel.instance().sidebar.cacheStorageListTreeElement.expand();

  TestRunner.addResult('Dumping ' + cacheName + '\'s entry with request URL: ' + requestUrl);

  const cachesTreeElement = Application.ResourcesPanel.ResourcesPanel.instance().sidebar.cacheStorageListTreeElement;

  for (let i = 0; i < cachesTreeElement.childCount(); ++i) {
    const cacheTreeElement = cachesTreeElement.childAt(i);
    if (cacheTreeElement.title.split(' ')[0] !== cacheName) {
      continue;
    }

    let view = cacheTreeElement.view;
    if (!view) {
      cacheTreeElement.onselect(false);
    }
    view = cacheTreeElement.view;
    await view.updateData(true);

    const promiseDumpContent = new Promise(resolve => {
      view.model.loadCacheData(view.cache, 0, 50, '', async function(entries, totalCount) {
        for (const entry of entries) {
          if (entry.requestURL !== requestUrl) {
            continue;
          }

          const request = view.createRequest(entry);
          if (request.requestHeaders().length) {
            TestRunner.addResult('    the original request has headers; query with headers? ' + withHeader);
            if (!withHeader) {
              request.setRequestHeaders([]);
            }
          }
          const contentObject = await view.requestContent(request);
          let content = null;
          if (!TextUtils.ContentData.ContentData.isError(contentObject)) {
            content = contentObject.isTextContent ? contentObject.text : contentObject.base64;
          }
          TestRunner.addResult(' '.repeat(8) + (content ? content : '(nothing to preview)'));
        }
        resolve();
      });
    });
    await promiseDumpContent;
  }
};

export const deleteCacheFromInspector = async function(cacheName, optionalEntry) {
  Application.ResourcesPanel.ResourcesPanel.instance().sidebar.cacheStorageListTreeElement.expand();

  if (optionalEntry) {
    TestRunner.addResult('Deleting CacheStorage entry ' + optionalEntry + ' in cache ' + cacheName);
  } else {
    TestRunner.addResult('Deleting CacheStorage cache ' + cacheName);
  }

  const cachesTreeElement = Application.ResourcesPanel.ResourcesPanel.instance().sidebar.cacheStorageListTreeElement;
  let promise =
      TestRunner.addSnifferPromise(SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel.prototype, 'updateCacheNames');
  Application.ResourcesPanel.ResourcesPanel.instance().sidebar.cacheStorageListTreeElement.refreshCaches();
  await promise;

  if (!cachesTreeElement.childCount()) {
    throw 'Error: Could not find CacheStorage cache ' + cacheName;
  }

  for (let i = 0; i < cachesTreeElement.childCount(); i++) {
    const cacheTreeElement = cachesTreeElement.childAt(i);
    const title = cacheTreeElement.title;
    const elementCacheName = title.substring(0, title.lastIndexOf(' - '));

    if (elementCacheName !== cacheName) {
      continue;
    }

    if (!optionalEntry) {
      promise =
          TestRunner.addSnifferPromise(SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel.prototype, 'cacheRemoved');
      cacheTreeElement.clearCache();
      await promise;
      return;
    }

    promise = TestRunner.addSnifferPromise(
        Application.ServiceWorkerCacheViews.ServiceWorkerCacheView.prototype, 'updateDataCallback');
    let view = cacheTreeElement.view;

    if (!view) {
      cacheTreeElement.onselect(false);
    } else {
      view.updateData(true);
    }

    view = cacheTreeElement.view;
    await promise;
    const entry = view.entriesForTest.find(entry => entry.requestURL === optionalEntry);

    if (!entry) {
      throw 'Error: Could not find cache entry to delete: ' + optionalEntry;
    }

    await view.model.deleteCacheEntry(view.cache, entry.requestURL);
    return;
  }

  throw 'Error: Could not find CacheStorage cache ' + cacheName;
};

export const waitForCacheRefresh = function(callback) {
  TestRunner.addSniffer(
      SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel.prototype, 'updateCacheNames', callback, false);
};

export const createCache = function(cacheName) {
  return TestRunner.callFunctionInPageAsync('createCache', [cacheName]);
};

export const addCacheEntry = function(cacheName, requestUrl, responseText) {
  return TestRunner.callFunctionInPageAsync('addCacheEntryImpl', [cacheName, requestUrl, responseText, 'text/plain']);
};

export const addCacheEntryWithBlobType = function(cacheName, requestUrl, blobType) {
  return TestRunner.callFunctionInPageAsync('addCacheEntryImpl', [cacheName, requestUrl, 'OK', blobType]);
};

export const addCacheEntryWithVarsResponse = function(cacheName, requestUrl) {
  return TestRunner.callFunctionInPageAsync('addCacheEntryWithVarsResponse', [cacheName, requestUrl]);
};

export const addCacheEntryWithNoCorsRequest = function(cacheName, requestUrl) {
  return TestRunner.callFunctionInPageAsync('addCacheEntryWithNoCorsRequest', [cacheName, requestUrl]);
};

export const deleteCache = function(cacheName) {
  return TestRunner.callFunctionInPageAsync('deleteCache', [cacheName]);
};

export const deleteCacheEntry = function(cacheName, requestUrl) {
  return TestRunner.callFunctionInPageAsync('deleteCacheEntry', [cacheName, requestUrl]);
};

export const clearAllCaches = function() {
  return TestRunner.callFunctionInPageAsync('clearAllCaches');
};

TestRunner.deprecatedInitAsync(`
  function onCacheStorageError(e) {
    console.error('CacheStorage error: ' + e);
  }

  function createCache(cacheName) {
    return caches.open(cacheName).catch(onCacheStorageError);
  }

  function addCacheEntryImpl(cacheName, requestUrl, responseText, blobType) {
    return caches.open(cacheName).then(function(cache) {
      let request = new Request(requestUrl);
      let myBlob = new Blob(['Y'], { 'type': blobType });

      let init = {
        'status': 200,
        'statusText': responseText
      };

      let response = new Response(myBlob, init);
      return cache.put(request, response);
    }).catch(onCacheStorageError);
  }

  function addCacheEntryWithVarsResponse(cacheName, requestUrl) {
    return caches.open(cacheName).then(function(cache) {
      let request = new Request(requestUrl, {
        headers: { 'Accept': '*/*' }
      });
      let myBlob = new Blob(['Z'], { "type": 'text/plain' });

      let init = {
        'headers': { 'Vary': 'Accept' },
      };

      let response = new Response(myBlob, init);
      return cache.put(request, response);
    }).catch(onCacheStorageError);
  }

  function addCacheEntryWithNoCorsRequest(cacheName, requestUrl) {
    return caches.open(cacheName).then(async function(cache) {
      let request = new Request(requestUrl, {mode: 'no-cors'});
      return cache.put(request, await fetch(request));
    }).catch(onCacheStorageError);
  }

  function deleteCache(cacheName) {
    return caches.delete(cacheName).then(function(success) {
      if (!success)
        onCacheStorageError('Could not find cache ' + cacheName);
    }).catch(onCacheStorageError);
  }

  function deleteCacheEntry(cacheName, requestUrl) {
    return caches.open(cacheName).then(cache => cache.delete(new Request(requestUrl))).catch(onCacheStorageError);
  }

  function clearAllCaches() {
    return caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key)))).catch(onCacheStorageError.bind(this, undefined));
  }
`);
