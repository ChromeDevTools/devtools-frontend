ApplicationTestRunner.createAndNavigateIFrame=function(url,callback){TestRunner.addSniffer(SDK.ResourceTreeModel.prototype,'_frameNavigated',frameNavigated);TestRunner.evaluateInPageAnonymously('createAndNavigateIFrame(unescape(\''+escape(url)+'\'))');function frameNavigated(frame){callback(frame.id);}};ApplicationTestRunner.navigateIFrame=function(frameId,url,callback){const frame=TestRunner.resourceTreeModel.frameForId(frameId);TestRunner.evaluateInPageAnonymously('navigateIFrame(unescape(\''+escape(frame.name)+'\'), unescape(\''+escape(url)+'\'))');TestRunner.addSniffer(SDK.ResourceTreeModel.prototype,'_frameNavigated',frameNavigated);function frameNavigated(frame){callback(frame.id);}};ApplicationTestRunner.removeIFrame=function(frameId,callback){const frame=TestRunner.resourceTreeModel.frameForId(frameId);TestRunner.evaluateInPageAnonymously('removeIFrame(unescape(\''+escape(frame.name)+'\'))');TestRunner.addSniffer(SDK.ResourceTreeModel.prototype,'_frameDetached',frameDetached);function frameDetached(frame){callback(frame.id);}};ApplicationTestRunner.swapFrameCache=function(frameId){const frame=TestRunner.resourceTreeModel.frameForId(frameId);TestRunner.evaluateInPageAnonymously('swapFrameCache(unescape(\''+escape(frame.name)+'\'))');};ApplicationTestRunner.dumpApplicationCache=function(){ApplicationTestRunner.dumpApplicationCacheTree();ApplicationTestRunner.dumpApplicationCacheModel();TestRunner.addResult('');};ApplicationTestRunner.dumpApplicationCacheTree=function(){TestRunner.addResult('Dumping application cache tree:');const applicationCacheTreeElement=UI.panels.resources._sidebar.applicationCacheListTreeElement;if(!applicationCacheTreeElement.childCount()){TestRunner.addResult('    (empty)');return;}
for(let i=0;i<applicationCacheTreeElement.childCount();++i){const manifestTreeElement=applicationCacheTreeElement.childAt(i);TestRunner.addResult('    Manifest URL: '+manifestTreeElement.manifestURL);if(!manifestTreeElement.childCount()){TestRunner.addResult('    (no frames)');continue;}
for(let j=0;j<manifestTreeElement.childCount();++j){const frameTreeElement=manifestTreeElement.childAt(j);TestRunner.addResult('        Frame: '+frameTreeElement.title);}}};ApplicationTestRunner.frameIdToString=function(frameId){if(!ApplicationTestRunner.framesByFrameId){ApplicationTestRunner.framesByFrameId={};}
let frame=TestRunner.resourceTreeModel.frameForId(frameId);if(!frame){frame=ApplicationTestRunner.framesByFrameId[frameId];}
ApplicationTestRunner.framesByFrameId[frameId]=frame;return frame.name;};ApplicationTestRunner.applicationCacheStatusToString=function(status){const statusInformation={};statusInformation[applicationCache.UNCACHED]='UNCACHED';statusInformation[applicationCache.IDLE]='IDLE';statusInformation[applicationCache.CHECKING]='CHECKING';statusInformation[applicationCache.DOWNLOADING]='DOWNLOADING';statusInformation[applicationCache.UPDATEREADY]='UPDATEREADY';statusInformation[applicationCache.OBSOLETE]='OBSOLETE';return statusInformation[status]||statusInformation[applicationCache.UNCACHED];};ApplicationTestRunner.dumpApplicationCacheModel=function(){TestRunner.addResult('Dumping application cache model:');const model=UI.panels.resources._sidebar._applicationCacheModel;const frameIds=[];for(const frameId in model._manifestURLsByFrame){frameIds.push(frameId);}
function compareFunc(a,b){return ApplicationTestRunner.frameIdToString(a).localeCompare(ApplicationTestRunner.frameIdToString(b));}
frameIds.sort(compareFunc);if(!frameIds.length){TestRunner.addResult('    (empty)');return;}
for(let i=0;i<frameIds.length;++i){const frameId=frameIds[i];const manifestURL=model.frameManifestURL(frameId);const status=model.frameManifestStatus(frameId);TestRunner.addResult('    Frame: '+ApplicationTestRunner.frameIdToString(frameId));TestRunner.addResult('        manifest url: '+manifestURL);TestRunner.addResult('        status:       '+ApplicationTestRunner.applicationCacheStatusToString(status));}};ApplicationTestRunner.waitForFrameManifestURLAndStatus=function(frameId,manifestURL,status,callback){const frameManifestStatus=UI.panels.resources._sidebar._applicationCacheModel.frameManifestStatus(frameId);const frameManifestURL=UI.panels.resources._sidebar._applicationCacheModel.frameManifestURL(frameId);if(frameManifestStatus===status&&frameManifestURL.indexOf(manifestURL)!==-1){callback();return;}
const handler=ApplicationTestRunner.waitForFrameManifestURLAndStatus.bind(this,frameId,manifestURL,status,callback);TestRunner.addSniffer(Resources.ApplicationCacheModel.prototype,'_frameManifestUpdated',handler);};ApplicationTestRunner.startApplicationCacheStatusesRecording=function(){if(ApplicationTestRunner.applicationCacheStatusesRecords){ApplicationTestRunner.applicationCacheStatusesRecords={};return;}
ApplicationTestRunner.applicationCacheStatusesRecords={};function addRecord(frameId,manifestURL,status){const record={};record.manifestURL=manifestURL;record.status=status;if(!ApplicationTestRunner.applicationCacheStatusesRecords[frameId]){ApplicationTestRunner.applicationCacheStatusesRecords[frameId]=[];}
ApplicationTestRunner.applicationCacheStatusesRecords[frameId].push(record);if(ApplicationTestRunner.awaitedFrameStatusEventsCount&&ApplicationTestRunner.awaitedFrameStatusEventsCount[frameId]){ApplicationTestRunner.awaitedFrameStatusEventsCount[frameId].count--;if(!ApplicationTestRunner.awaitedFrameStatusEventsCount[frameId].count){ApplicationTestRunner.awaitedFrameStatusEventsCount[frameId].callback();}}}
TestRunner.addSniffer(Resources.ApplicationCacheModel.prototype,'_frameManifestUpdated',addRecord,true);};ApplicationTestRunner.ensureFrameStatusEventsReceived=function(frameId,count,callback){const records=ApplicationTestRunner.applicationCacheStatusesRecords[frameId]||[];const eventsLeft=count-records.length;if(!eventsLeft){callback();return;}
if(!ApplicationTestRunner.awaitedFrameStatusEventsCount){ApplicationTestRunner.awaitedFrameStatusEventsCount={};}
ApplicationTestRunner.awaitedFrameStatusEventsCount[frameId]={count:eventsLeft,callback:callback};};TestRunner.deprecatedInitAsync(`
  let framesCount = 0;

  function createAndNavigateIFrame(url) {
    let iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.name = 'frame' + ++framesCount;
    iframe.id = iframe.name;
    document.body.appendChild(iframe);
  }

  function removeIFrame(name) {
    let iframe = document.querySelector('#' + name);
    iframe.parentElement.removeChild(iframe);
  }

  function navigateIFrame(name, url) {
    let iframe = document.querySelector('#' + name);
    iframe.src = url;
  }

  function swapFrameCache(name) {
    let iframe = document.querySelector('#' + name);
    iframe.contentWindow.applicationCache.swapCache();
  }
`);;ApplicationTestRunner.dumpCacheTree=async function(pathFilter){UI.panels.resources._sidebar.cacheStorageListTreeElement.expand();const promise=TestRunner.addSnifferPromise(SDK.ServiceWorkerCacheModel.prototype,'_updateCacheNames');UI.panels.resources._sidebar.cacheStorageListTreeElement._refreshCaches();await promise;await ApplicationTestRunner.dumpCacheTreeNoRefresh(pathFilter);};ApplicationTestRunner.dumpCacheTreeNoRefresh=async function(pathFilter){function _dumpDataGrid(dataGrid){for(const node of dataGrid.rootNode().children){const children=Array.from(node.element().children).filter(function(element){return!element.classList.contains('responseTime-column');});const entries=Array.from(children,td=>td.textContent).filter(text=>text);TestRunner.addResult(' '.repeat(8)+entries.join(', '));}}
UI.panels.resources._sidebar.cacheStorageListTreeElement.expand();if(!pathFilter){TestRunner.addResult('Dumping CacheStorage tree:');}else{TestRunner.addResult('Dumping CacheStorage tree with URL path filter string "'+pathFilter+'"');}
const cachesTreeElement=UI.panels.resources._sidebar.cacheStorageListTreeElement;if(!cachesTreeElement.childCount()){TestRunner.addResult('    (empty)');return;}
for(let i=0;i<cachesTreeElement.childCount();++i){const cacheTreeElement=cachesTreeElement.childAt(i);TestRunner.addResult('    cache: '+cacheTreeElement.title);let view=cacheTreeElement._view;if(!view){cacheTreeElement.onselect(false);}
view=cacheTreeElement._view;await view._updateData(true);if(cacheTreeElement._view._entriesForTest.length===0){TestRunner.addResult('        (cache empty)');continue;}
if(!pathFilter){_dumpDataGrid(view._dataGrid);TestRunner.addResult('        totalCount: '+String(view._returnCount));continue;}
cacheTreeElement._view._entryPathFilter=pathFilter;await view._updateData(true);if(cacheTreeElement._view._entriesForTest.length===0){TestRunner.addResult('        (no matching entries)');continue;}
_dumpDataGrid(cacheTreeElement._view._dataGrid);TestRunner.addResult('        totalCount: '+String(view._returnCount));}};ApplicationTestRunner.dumpCachedEntryContent=async function(cacheName,requestUrl,withHeader){UI.panels.resources._sidebar.cacheStorageListTreeElement.expand();const promise=TestRunner.addSnifferPromise(SDK.ServiceWorkerCacheModel.prototype,'_updateCacheNames');UI.panels.resources._sidebar.cacheStorageListTreeElement._refreshCaches();await promise;await ApplicationTestRunner.dumpCachedEntryContentNoRefresh(cacheName,requestUrl,withHeader);};ApplicationTestRunner.dumpCachedEntryContentNoRefresh=async function(cacheName,requestUrl,withHeader){UI.panels.resources._sidebar.cacheStorageListTreeElement.expand();TestRunner.addResult('Dumping '+cacheName+'\'s entry with request URL: '+requestUrl);const cachesTreeElement=UI.panels.resources._sidebar.cacheStorageListTreeElement;for(let i=0;i<cachesTreeElement.childCount();++i){const cacheTreeElement=cachesTreeElement.childAt(i);if(cacheTreeElement.title.split(' ')[0]!==cacheName){continue;}
let view=cacheTreeElement._view;if(!view){cacheTreeElement.onselect(false);}
view=cacheTreeElement._view;await view._updateData(true);const promiseDumpContent=new Promise(resolve=>{view._model.loadCacheData(view._cache,0,50,'',async function(entries,totalCount){for(const entry of entries){if(entry.requestURL!==requestUrl){continue;}
const request=view._createRequest(entry);if(request.requestHeaders().length){TestRunner.addResult('    the original request has headers; query with headers? '+withHeader);if(!withHeader){request.setRequestHeaders([]);}}
const contentObject=await view._requestContent(request);const content=contentObject.content;TestRunner.addResult(' '.repeat(8)+(content?content:'(nothing to preview)'));}
resolve();});});await promiseDumpContent;}};ApplicationTestRunner.deleteCacheFromInspector=async function(cacheName,optionalEntry){UI.panels.resources._sidebar.cacheStorageListTreeElement.expand();if(optionalEntry){TestRunner.addResult('Deleting CacheStorage entry '+optionalEntry+' in cache '+cacheName);}else{TestRunner.addResult('Deleting CacheStorage cache '+cacheName);}
const cachesTreeElement=UI.panels.resources._sidebar.cacheStorageListTreeElement;let promise=TestRunner.addSnifferPromise(SDK.ServiceWorkerCacheModel.prototype,'_updateCacheNames');UI.panels.resources._sidebar.cacheStorageListTreeElement._refreshCaches();await promise;if(!cachesTreeElement.childCount()){throw'Error: Could not find CacheStorage cache '+cacheName;}
for(let i=0;i<cachesTreeElement.childCount();i++){const cacheTreeElement=cachesTreeElement.childAt(i);const title=cacheTreeElement.title;const elementCacheName=title.substring(0,title.lastIndexOf(' - '));if(elementCacheName!==cacheName){continue;}
if(!optionalEntry){promise=TestRunner.addSnifferPromise(SDK.ServiceWorkerCacheModel.prototype,'_cacheRemoved');cacheTreeElement._clearCache();await promise;return;}
promise=TestRunner.addSnifferPromise(Resources.ServiceWorkerCacheView.prototype,'_updateDataCallback');let view=cacheTreeElement._view;if(!view){cacheTreeElement.onselect(false);}else{view._updateData(true);}
view=cacheTreeElement._view;await promise;const entry=view._entriesForTest.find(entry=>entry.requestURL===optionalEntry);if(!entry){throw'Error: Could not find cache entry to delete: '+optionalEntry;}
await view._model.deleteCacheEntry(view._cache,entry.requestURL);return;}
throw'Error: Could not find CacheStorage cache '+cacheName;};ApplicationTestRunner.waitForCacheRefresh=function(callback){TestRunner.addSniffer(SDK.ServiceWorkerCacheModel.prototype,'_updateCacheNames',callback,false);};ApplicationTestRunner.createCache=function(cacheName){return TestRunner.callFunctionInPageAsync('createCache',[cacheName]);};ApplicationTestRunner.addCacheEntry=function(cacheName,requestUrl,responseText){return TestRunner.callFunctionInPageAsync('addCacheEntryImpl',[cacheName,requestUrl,responseText,'text/plain']);};ApplicationTestRunner.addCacheEntryWithBlobType=function(cacheName,requestUrl,blobType){return TestRunner.callFunctionInPageAsync('addCacheEntryImpl',[cacheName,requestUrl,'OK',blobType]);};ApplicationTestRunner.addCacheEntryWithVarsResponse=function(cacheName,requestUrl){return TestRunner.callFunctionInPageAsync('addCacheEntryWithVarsResponse',[cacheName,requestUrl]);};ApplicationTestRunner.addCacheEntryWithNoCorsRequest=function(cacheName,requestUrl){return TestRunner.callFunctionInPageAsync('addCacheEntryWithNoCorsRequest',[cacheName,requestUrl]);};ApplicationTestRunner.deleteCache=function(cacheName){return TestRunner.callFunctionInPageAsync('deleteCache',[cacheName]);};ApplicationTestRunner.deleteCacheEntry=function(cacheName,requestUrl){return TestRunner.callFunctionInPageAsync('deleteCacheEntry',[cacheName,requestUrl]);};ApplicationTestRunner.clearAllCaches=function(){return TestRunner.callFunctionInPageAsync('clearAllCaches');};TestRunner.deprecatedInitAsync(`
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
`);;ApplicationTestRunner.dumpIndexedDBTree=function(){TestRunner.addResult('Dumping IndexedDB tree:');const indexedDBTreeElement=UI.panels.resources._sidebar.indexedDBListTreeElement;if(!indexedDBTreeElement.childCount()){TestRunner.addResult('    (empty)');return;}
for(let i=0;i<indexedDBTreeElement.childCount();++i){const databaseTreeElement=indexedDBTreeElement.childAt(i);TestRunner.addResult('    database: '+databaseTreeElement.title);if(!databaseTreeElement.childCount()){TestRunner.addResult('        (no object stores)');continue;}
for(let j=0;j<databaseTreeElement.childCount();++j){const objectStoreTreeElement=databaseTreeElement.childAt(j);TestRunner.addResult('        Object store: '+objectStoreTreeElement.title);if(!objectStoreTreeElement.childCount()){TestRunner.addResult('            (no indexes)');continue;}
for(let k=0;k<objectStoreTreeElement.childCount();++k){const indexTreeElement=objectStoreTreeElement.childAt(k);TestRunner.addResult('            Index: '+indexTreeElement.title);}}}};ApplicationTestRunner.dumpObjectStores=function(){TestRunner.addResult('Dumping ObjectStore data:');const idbDatabaseTreeElement=UI.panels.resources._sidebar.indexedDBListTreeElement._idbDatabaseTreeElements[0];for(let i=0;i<idbDatabaseTreeElement.childCount();++i){const objectStoreTreeElement=idbDatabaseTreeElement.childAt(i);objectStoreTreeElement.onselect(false);TestRunner.addResult('    Object store: '+objectStoreTreeElement.title);const entries=objectStoreTreeElement._view._entries;TestRunner.addResult('            Number of entries: '+entries.length);for(let j=0;j<entries.length;++j){TestRunner.addResult('            Key = '+entries[j].key._value+', value = '+entries[j].value);}
for(let k=0;k<objectStoreTreeElement.childCount();++k){const indexTreeElement=objectStoreTreeElement.childAt(k);TestRunner.addResult('            Index: '+indexTreeElement.title);indexTreeElement.onselect(false);const entries=indexTreeElement._view._entries;TestRunner.addResult('                Number of entries: '+entries.length);for(let j=0;j<entries.length;++j){TestRunner.addResult('                Key = '+entries[j].primaryKey._value+', value = '+entries[j].value);}}}};let lastCallbackId=0;const callbacks={};const callbackIdPrefix='InspectorTest.IndexedDB_callback';ApplicationTestRunner.evaluateWithCallback=function(frameId,methodName,parameters,callback){ApplicationTestRunner._installIndexedDBSniffer();const callbackId=++lastCallbackId;callbacks[callbackId]=callback;let parametersString='dispatchCallback.bind(this, "'+callbackIdPrefix+callbackId+'")';for(let i=0;i<parameters.length;++i){parametersString+=', '+JSON.stringify(parameters[i]);}
const requestString=methodName+'('+parametersString+')';TestRunner.evaluateInPageAnonymously(requestString);};ApplicationTestRunner._installIndexedDBSniffer=function(){ConsoleTestRunner.addConsoleSniffer(consoleMessageOverride,false);function consoleMessageOverride(msg){const text=msg.messageText;if(!text.startsWith(callbackIdPrefix)){ConsoleTestRunner.addConsoleSniffer(consoleMessageOverride,false);return;}
const callbackId=text.substring(callbackIdPrefix.length);callbacks[callbackId].call();delete callbacks[callbackId];}};ApplicationTestRunner.createDatabase=function(frameId,databaseName,callback){ApplicationTestRunner.evaluateWithCallback(frameId,'createDatabase',[databaseName],callback);};ApplicationTestRunner.createDatabaseWithVersion=function(frameId,databaseName,version,callback){ApplicationTestRunner.evaluateWithCallback(frameId,'createDatabaseWithVersion',[databaseName,version],callback);};ApplicationTestRunner.deleteDatabase=function(frameId,databaseName,callback){ApplicationTestRunner.evaluateWithCallback(frameId,'deleteDatabase',[databaseName],callback);};ApplicationTestRunner.createObjectStore=function(frameId,databaseName,objectStoreName,keyPath,autoIncrement,callback){ApplicationTestRunner.evaluateWithCallback(frameId,'createObjectStore',[databaseName,objectStoreName,keyPath,autoIncrement],callback);};ApplicationTestRunner.deleteObjectStore=function(frameId,databaseName,objectStoreName,callback){ApplicationTestRunner.evaluateWithCallback(frameId,'deleteObjectStore',[databaseName,objectStoreName],callback);};ApplicationTestRunner.createObjectStoreIndex=function(frameId,databaseName,objectStoreName,objectStoreIndexName,keyPath,unique,multiEntry,callback){ApplicationTestRunner.evaluateWithCallback(frameId,'createObjectStoreIndex',[databaseName,objectStoreName,objectStoreIndexName,keyPath,unique,multiEntry],callback);};ApplicationTestRunner.deleteObjectStoreIndex=function(frameId,databaseName,objectStoreName,objectStoreIndexName,callback){ApplicationTestRunner.evaluateWithCallback(frameId,'deleteObjectStoreIndex',[databaseName,objectStoreName,objectStoreIndexName],callback);};ApplicationTestRunner.addIDBValue=function(frameId,databaseName,objectStoreName,value,key,callback){ApplicationTestRunner.evaluateWithCallback(frameId,'addIDBValue',[databaseName,objectStoreName,value,key],callback);};ApplicationTestRunner.createIndexedDBModel=function(){const indexedDBModel=new Resources.IndexedDBModel(SDK.targetManager.mainTarget(),TestRunner.securityOriginManager);indexedDBModel.enable();return indexedDBModel;};ApplicationTestRunner.createDatabaseAsync=function(databaseName){return TestRunner.evaluateInPageAsync('createDatabaseAsync(\''+databaseName+'\')');};ApplicationTestRunner.deleteDatabaseAsync=function(databaseName){return TestRunner.evaluateInPageAsync('deleteDatabaseAsync(\''+databaseName+'\')');};ApplicationTestRunner.createObjectStoreAsync=function(databaseName,objectStoreName,indexName){return TestRunner.evaluateInPageAsync('createObjectStoreAsync(\''+databaseName+'\', \''+objectStoreName+'\', \''+indexName+'\')');};ApplicationTestRunner.deleteObjectStoreAsync=function(databaseName,objectStoreName){return TestRunner.evaluateInPageAsync('deleteObjectStoreAsync(\''+databaseName+'\', \''+objectStoreName+'\')');};ApplicationTestRunner.createObjectStoreIndexAsync=function(databaseName,objectStoreName,indexName){return TestRunner.evaluateInPageAsync('createObjectStoreIndexAsync(\''+databaseName+'\', \''+objectStoreName+'\', \''+indexName+'\')');};ApplicationTestRunner.deleteObjectStoreIndexAsync=function(databaseName,objectStoreName,indexName){return TestRunner.evaluateInPageAsync('deleteObjectStoreIndexAsync(\''+databaseName+'\', \''+objectStoreName+'\', \''+indexName+'\')');};ApplicationTestRunner.addIDBValueAsync=function(databaseName,objectStoreName,key,value){return TestRunner.evaluateInPageAsync('addIDBValueAsync(\''+databaseName+'\', \''+objectStoreName+'\', \''+key+'\', \''+value+'\')');};ApplicationTestRunner.deleteIDBValueAsync=function(databaseName,objectStoreName,key){return TestRunner.evaluateInPageAsync('deleteIDBValueAsync(\''+databaseName+'\', \''+objectStoreName+'\', \''+key+'\')');};const __indexedDBHelpers=`
  function dispatchCallback(callbackId) {
    console.log(callbackId);
  }

  function onIndexedDBError(e) {
    console.error('IndexedDB error: ' + e);
  }

  function onIndexedDBBlocked(e) {
    console.error('IndexedDB blocked: ' + e);
  }

  function doWithDatabase(databaseName, callback) {
    function innerCallback() {
      let db = request.result;
      callback(db);
    }

    let request = indexedDB.open(databaseName);
    request.onblocked = onIndexedDBBlocked;
    request.onerror = onIndexedDBError;
    request.onsuccess = innerCallback;
  }

  function doWithVersionTransaction(databaseName, callback, commitCallback) {
    doWithDatabase(databaseName, step2);

    function step2(db) {
      let version = db.version;
      db.close();
      request = indexedDB.open(databaseName, version + 1);
      request.onerror = onIndexedDBError;
      request.onupgradeneeded = onUpgradeNeeded;
      request.onsuccess = onOpened;

      function onUpgradeNeeded(e) {
        let db = e.target.result;
        let trans = e.target.transaction;
        callback(db, trans);
      }

      function onOpened(e) {
        let db = e.target.result;
        db.close();
        commitCallback();
      }
    }
  }

  function doWithReadWriteTransaction(databaseName, objectStoreName, callback, commitCallback) {
    doWithDatabase(databaseName, step2);

    function step2(db) {
      let transaction = db.transaction([objectStoreName], 'readwrite');
      let objectStore = transaction.objectStore(objectStoreName);
      callback(objectStore, innerCommitCallback);

      function innerCommitCallback() {
        db.close();
        commitCallback();
      }
    }
  }

  function createDatabase(callback, databaseName) {
    let request = indexedDB.open(databaseName);
    request.onerror = onIndexedDBError;
    request.onsuccess = closeDatabase;

    function closeDatabase() {
      request.result.close();
      callback();
    }
  }

  function createDatabaseWithVersion(callback, databaseName, version) {
    let request = indexedDB.open(databaseName, version);
    request.onerror = onIndexedDBError;
    request.onsuccess = closeDatabase;

    function closeDatabase() {
      request.result.close();
      callback();
    }
  }

  function deleteDatabase(callback, databaseName) {
    let request = indexedDB.deleteDatabase(databaseName);
    request.onerror = onIndexedDBError;
    request.onsuccess = callback;
  }

  function createObjectStore(callback, databaseName, objectStoreName, keyPath, autoIncrement) {
    doWithVersionTransaction(databaseName, withTransactionCallback, callback);

    function withTransactionCallback(db, transaction) {
      let store = db.createObjectStore(objectStoreName, {
        keyPath: keyPath,
        autoIncrement: autoIncrement
      });
    }
  }

  function deleteObjectStore(callback, databaseName, objectStoreName) {
    doWithVersionTransaction(databaseName, withTransactionCallback, callback);

    function withTransactionCallback(db, transaction) {
      let store = db.deleteObjectStore(objectStoreName);
    }
  }

  function createObjectStoreIndex(callback, databaseName, objectStoreName, objectStoreIndexName, keyPath, unique, multiEntry) {
    doWithVersionTransaction(databaseName, withTransactionCallback, callback);

    function withTransactionCallback(db, transaction) {
      let objectStore = transaction.objectStore(objectStoreName);

      objectStore.createIndex(objectStoreIndexName, keyPath, {
        unique: unique,
        multiEntry: multiEntry
      });
    }
  }

  function deleteObjectStoreIndex(callback, databaseName, objectStoreName, objectStoreIndexName) {
    doWithVersionTransaction(databaseName, withTransactionCallback, callback);

    function withTransactionCallback(db, transaction) {
      let objectStore = transaction.objectStore(objectStoreName);
      objectStore.deleteIndex(objectStoreIndexName);
    }
  }

  function addIDBValue(callback, databaseName, objectStoreName, value, key) {
    doWithReadWriteTransaction(databaseName, objectStoreName, withTransactionCallback, callback);

    function withTransactionCallback(objectStore, commitCallback) {
      let request;

      if (key)
        request = objectStore.add(value, key);
      else
        request = objectStore.add(value);

      request.onerror = onIndexedDBError;
      request.onsuccess = commitCallback;
    }
  }

  function createDatabaseAsync(databaseName) {
    return new Promise((resolve) => {
      createDatabase(resolve, databaseName);
    });
  }

  function upgradeRequestAsync(databaseName, onUpgradeNeeded, callback) {
    let request = indexedDB.open(databaseName);
    request.onerror = onIndexedDBError;
    request.onsuccess = function(event) {
      let db = request.result;
      let version = db.version;
      db.close();

      let upgradeRequest = indexedDB.open(databaseName, version + 1);
      upgradeRequest.onerror = onIndexedDBError;
      upgradeRequest.onupgradeneeded = function(e) {
        onUpgradeNeeded(e.target.result, e.target.transaction, callback);
      }
      upgradeRequest.onsuccess = function(e) {
        let upgradeDb = e.target.result;
        upgradeDb.close();
        callback();
      }
    }
  }

  function deleteDatabaseAsync(databaseName) {
    let callback;
    let promise = new Promise((fulfill) => callback = fulfill);
    let request = indexedDB.deleteDatabase(databaseName);
    request.onerror = onIndexedDBError;
    request.onsuccess = callback;
    return promise;
  }

  function createObjectStoreAsync(databaseName, objectStoreName, indexName) {
    let callback;
    let promise = new Promise((fulfill) => callback = fulfill);
    let onUpgradeNeeded = function(upgradeDb, transaction, callback) {
      let store = upgradeDb.createObjectStore(objectStoreName, { keyPath: "test", autoIncrement: false });
      store.createIndex(indexName, "test", { unique: false, multiEntry: false });
      callback();
    }
    upgradeRequestAsync(databaseName, onUpgradeNeeded, callback)
    return promise;
  }

  function deleteObjectStoreAsync(databaseName, objectStoreName) {
    let callback;
    let promise = new Promise((fulfill) => callback = fulfill);
    let onUpgradeNeeded = function(upgradeDb, transaction, callback) {
      upgradeDb.deleteObjectStore(objectStoreName);
      callback();
    }
    upgradeRequestAsync(databaseName, onUpgradeNeeded, callback)
    return promise;
  }

  function createObjectStoreIndexAsync(databaseName, objectStoreName, indexName) {
    let callback;
    let promise = new Promise((fulfill) => callback = fulfill);
    let onUpgradeNeeded = function(upgradeDb, transaction, callback) {
      let store = transaction.objectStore(objectStoreName);
      store.createIndex(indexName, "test", { unique: false, multiEntry: false });
      callback();
    }
    upgradeRequestAsync(databaseName, onUpgradeNeeded, callback)
    return promise;
  }

  function deleteObjectStoreIndexAsync(databaseName, objectStoreName, indexName) {
    let callback;
    let promise = new Promise((fulfill) => callback = fulfill);
    let onUpgradeNeeded = function(upgradeDb, transaction, callback) {
      let store = transaction.objectStore(objectStoreName);
      store.deleteIndex(indexName);
      callback();
    }
    upgradeRequestAsync(databaseName, onUpgradeNeeded, callback)
    return promise;
  }

  function addIDBValueAsync(databaseName, objectStoreName, key, value) {
    let callback;
    let promise = new Promise(fulfill => callback = fulfill);
    let request = indexedDB.open(databaseName);
    request.onerror = onIndexedDBError;

    request.onsuccess = function(event) {
      let db = request.result;
      let transaction = db.transaction(objectStoreName, 'readwrite');
      let store = transaction.objectStore(objectStoreName);

      store.put({
        test: key,
        testValue: value
      });

      transaction.onerror = onIndexedDBError;

      transaction.oncomplete = function() {
        db.close();
        callback();
      };
    };

    return promise;
  }

  function deleteIDBValueAsync(databaseName, objectStoreName, key) {
    let callback;
    let promise = new Promise((fulfill) => callback = fulfill);
    let request = indexedDB.open(databaseName);
    request.onerror = onIndexedDBError;
    request.onsuccess = function(event) {
      let db = request.result;
      let transaction = db.transaction(objectStoreName, "readwrite");
      let store = transaction.objectStore(objectStoreName);
      store.delete(key);

      transaction.onerror = onIndexedDBError;
      transaction.oncomplete = function() {
        db.close();
        callback();
      };
    }
    return promise;
  }
`;ApplicationTestRunner.setupIndexedDBHelpers=function(){return TestRunner.evaluateInPagePromise(__indexedDBHelpers);};TestRunner.deprecatedInitAsync(__indexedDBHelpers);;ApplicationTestRunner.dumpResources=function(formatter){const results=[];function formatterWrapper(resource){if(formatter){results.push({resource:resource,text:formatter(resource)});}else{results.push({resource:resource,text:resource.url});}}
TestRunner.resourceTreeModel.forAllResources(formatterWrapper);function comparator(result1,result2){return result1.resource.url.localeCompare(result2.resource.url);}
results.sort(comparator);for(let i=0;i<results.length;++i){TestRunner.addResult(results[i].text);}};ApplicationTestRunner.dumpResourcesURLMap=function(){const results=[];TestRunner.resourceTreeModel.forAllResources(collect);function collect(resource){results.push({url:resource.url,resource:TestRunner.resourceTreeModel.resourceForURL(resource.url)});}
function comparator(result1,result2){if(result1.url>result2.url){return 1;}
if(result2.url>result1.url){return-1;}
return 0;}
results.sort(comparator);for(let i=0;i<results.length;++i){TestRunner.addResult(results[i].url+' == '+results[i].resource.url);}};ApplicationTestRunner.dumpResourcesTree=function(){function dump(treeItem,prefix){if(typeof treeItem._resetBubble==='function'){treeItem._resetBubble();}
TestRunner.addResult(prefix+treeItem.listItemElement.textContent);treeItem.expand();const children=treeItem.children();for(let i=0;children&&i<children.length;++i){dump(children[i],prefix+'    ');}}
dump(UI.panels.resources._sidebar._resourcesSection._treeElement,'');if(!ApplicationTestRunner._testSourceNavigator){ApplicationTestRunner._testSourceNavigator=new Sources.NetworkNavigatorView();ApplicationTestRunner._testSourceNavigator.show(UI.inspectorView.element);}
SourcesTestRunner.dumpNavigatorViewInAllModes(ApplicationTestRunner._testSourceNavigator);};ApplicationTestRunner.dumpResourceTreeEverything=function(){function format(resource){return resource.resourceType().name()+' '+resource.url;}
TestRunner.addResult('Resources:');ApplicationTestRunner.dumpResources(format);TestRunner.addResult('');TestRunner.addResult('Resources URL Map:');ApplicationTestRunner.dumpResourcesURLMap();TestRunner.addResult('');TestRunner.addResult('Resources Tree:');ApplicationTestRunner.dumpResourcesTree();};;ApplicationTestRunner.resetState=async function(){const targets=SDK.targetManager.targets();for(const target of targets){const securityOrigin=new Common.ParsedURL(target.inspectedURL()).securityOrigin();await target.storageAgent().clearDataForOrigin(securityOrigin,Resources.ClearStorageView.AllStorageTypes.join(','));}};ApplicationTestRunner.createWebSQLDatabase=function(name){return TestRunner.evaluateInPageAsync(`_openWebSQLDatabase("${name}")`);};ApplicationTestRunner.requestURLComparer=function(r1,r2){return r1.request.url.localeCompare(r2.request.url);};ApplicationTestRunner.runAfterCachedResourcesProcessed=function(callback){if(!TestRunner.resourceTreeModel._cachedResourcesProcessed){TestRunner.resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.CachedResourcesLoaded,callback);}else{callback();}};ApplicationTestRunner.runAfterResourcesAreFinished=function(resourceURLs,callback){const resourceURLsMap=new Set(resourceURLs);function checkResources(){for(const url of resourceURLsMap){const resource=ApplicationTestRunner.resourceMatchingURL(url);if(resource){resourceURLsMap.delete(url);}}
if(!resourceURLsMap.size){TestRunner.resourceTreeModel.removeEventListener(SDK.ResourceTreeModel.Events.ResourceAdded,checkResources);callback();}}
checkResources();if(resourceURLsMap.size){TestRunner.resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.ResourceAdded,checkResources);}};ApplicationTestRunner.showResource=function(resourceURL,callback){let reported=false;function callbackWrapper(sourceFrame){if(reported){return;}
callback(sourceFrame);reported=true;}
function showResourceCallback(){const resource=ApplicationTestRunner.resourceMatchingURL(resourceURL);if(!resource){return;}
UI.panels.resources.showResource(resource,1);const sourceFrame=UI.panels.resources._resourceViewForResource(resource);if(sourceFrame.loaded){callbackWrapper(sourceFrame);}else{TestRunner.addSniffer(sourceFrame,'setContent',callbackWrapper.bind(null,sourceFrame));}}
ApplicationTestRunner.runAfterResourcesAreFinished([resourceURL],showResourceCallback);};ApplicationTestRunner.resourceMatchingURL=function(resourceURL){let result=null;TestRunner.resourceTreeModel.forAllResources(visit);function visit(resource){if(resource.url.indexOf(resourceURL)!==-1){result=resource;return true;}}
return result;};ApplicationTestRunner.waitForCookies=function(){return new Promise(resolve=>{TestRunner.addSniffer(CookieTable.CookiesTable.prototype,'_rebuildTable',resolve);});};ApplicationTestRunner.dumpCookieDomains=function(){const cookieListChildren=UI.panels.resources._sidebar.cookieListTreeElement.children();TestRunner.addResult('Available cookie domains:');for(const child of cookieListChildren){TestRunner.addResult(child._cookieDomain);}};ApplicationTestRunner.dumpCookies=function(){if(!UI.panels.resources._cookieView||!UI.panels.resources._cookieView.isShowing()){TestRunner.addResult('No cookies visible');return;}
TestRunner.addResult('Visible cookies');for(const item of UI.panels.resources._cookieView._cookiesTable._data){const cookies=item.cookies||[];for(const cookie of cookies){TestRunner.addResult(`${cookie.name()}=${cookie.value()}`);}}};ApplicationTestRunner.databaseModel=function(){return TestRunner.mainTarget.model(Resources.DatabaseModel);};ApplicationTestRunner.domStorageModel=function(){return TestRunner.mainTarget.model(Resources.DOMStorageModel);};ApplicationTestRunner.indexedDBModel=function(){return TestRunner.mainTarget.model(Resources.IndexedDBModel);};TestRunner.deprecatedInitAsync(`
  function _openWebSQLDatabase(name) {
    return new Promise(resolve => openDatabase(name, '1.0', '', 1024 * 1024, resolve));
  }
`);;ApplicationTestRunner.registerServiceWorker=function(script,scope){return TestRunner.callFunctionInPageAsync('registerServiceWorker',[script,scope]);};ApplicationTestRunner.waitForActivated=function(scope){return TestRunner.callFunctionInPageAsync('waitForActivated',[scope]);};ApplicationTestRunner.unregisterServiceWorker=function(scope){return TestRunner.callFunctionInPageAsync('unregisterServiceWorker',[scope]);};ApplicationTestRunner.postToServiceWorker=function(scope,message){return TestRunner.evaluateInPageAnonymously('postToServiceWorker("'+scope+'","'+message+'")');};ApplicationTestRunner.waitForServiceWorker=function(callback){SDK.targetManager.observeTargets({targetAdded:function(target){if(target.type()===SDK.Target.Type.ServiceWorker&&callback){setTimeout(callback.bind(null,target),0);callback=null;}},targetRemoved:function(target){}});};ApplicationTestRunner.dumpServiceWorkersView=function(){const swView=UI.panels.resources.visibleView;return swView._currentWorkersView._sectionList.childTextNodes().concat(swView._otherWorkersView._sectionList.childTextNodes()).map(function(node){if(node.textContent==='Received '+(new Date(0)).toLocaleString()){return'Invalid scriptResponseTime (unix epoch)';}
return node.textContent.replace(/Received.*/,'Received').replace(/#\d+/,'#N');}).join('\n');};ApplicationTestRunner.deleteServiceWorkerRegistration=function(scope){TestRunner.serviceWorkerManager.registrations().valuesArray().map(function(registration){if(registration.scopeURL===scope){TestRunner.serviceWorkerManager.deleteRegistration(registration.id);}});};ApplicationTestRunner.makeFetchInServiceWorker=function(scope,url,requestInitializer,callback){TestRunner.callFunctionInPageAsync('makeFetchInServiceWorker',[scope,url,requestInitializer]).then(callback);};TestRunner.deprecatedInitAsync(`
  let registrations = {};

  function registerServiceWorker(script, scope) {
    return navigator.serviceWorker.register(script, {
      scope: scope
    })
    .then(reg => registrations[scope] = reg)
    .catch(err => {
      return Promise.reject(new Error('Service Worker registration error: ' +
                                      err.toString()));
    });
  }

  function waitForActivated(scope) {
    let reg = registrations[scope];
    if (!reg)
      return Promise.reject(new Error('The registration'));
    let worker = reg.installing || reg.waiting || reg.active;
    if (worker.state === 'activated')
      return Promise.resolve();
    if (worker.state === 'redundant')
      return Promise.reject(new Error('The worker is redundant'));
    return new Promise(resolve => {
        worker.addEventListener('statechange', () => {
            if (worker.state === 'activated')
              resolve();
          });
      });
  }

  function postToServiceWorker(scope, message) {
    registrations[scope].active.postMessage(message);
  }

  function unregisterServiceWorker(scope) {
    let registration = registrations[scope];

    if (!registration)
      return Promise.reject('ServiceWorker for ' + scope + ' is not registered');

    return registration.unregister().then(() => delete registrations[scope]);
  }

  function makeFetchInServiceWorker(scope, url, requestInitializer) {
    let script = 'resources/network-fetch-worker.js';

    return navigator.serviceWorker.register(script, {
      scope: scope
    }).then(registration => {
      let worker = registration.installing;

      return new Promise(resolve => {
        navigator.serviceWorker.onmessage = e => {
          resolve(e.data);
        };

        worker.postMessage({
          url: url,
          init: requestInitializer
        });
      });
    });
  }
`);;