// Copyright 2017 The Chromium Authors. All
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 * @suppress {accessControls}
 */

NetworkTestRunner.waitForRequestResponse = function(request) {
  if (request.responseReceivedTime !== -1)
    return Promise.resolve(request);

  return TestRunner.waitForEvent(
      SDK.NetworkManager.Events.RequestUpdated, TestRunner.networkManager,
      updateRequest => updateRequest === request && request.responseReceivedTime !== -1);
};

NetworkTestRunner.waitForNetworkLogViewNodeForRequest = function(request) {
  var networkLogView = UI.panels.network._networkLogView;
  var node = networkLogView.nodeForRequest(request);

  if (node)
    return Promise.resolve(node);

  console.assert(networkLogView._staleRequests.has(request));

  return TestRunner.addSnifferPromise(networkLogView, '_didRefreshForTest').then(() => {
    var node = networkLogView.nodeForRequest(request);
    console.assert(node);
    return node;
  });
};

NetworkTestRunner.waitForWebsocketFrameReceived = function(wsRequest, message) {
  for (var frame of wsRequest.frames()) {
    if (checkFrame(frame))
      return Promise.resolve(frame);
  }

  return TestRunner.waitForEvent(SDK.NetworkRequest.Events.WebsocketFrameAdded, wsRequest, checkFrame);

  function checkFrame(frame) {
    return frame.type === SDK.NetworkRequest.WebSocketFrameType.Receive && frame.text === message;
  }
};

NetworkTestRunner.recordNetwork = function() {
  UI.panels.network._networkLogView.setRecording(true);
};

NetworkTestRunner.networkRequests = function() {
  return Array.from(NetworkLog.networkLog.requests());
};

NetworkTestRunner.dumpNetworkRequests = function() {
  var requests = NetworkTestRunner.networkRequests();

  requests.sort(function(a, b) {
    return a.url().localeCompare(b.url());
  });

  TestRunner.addResult('resources count = ' + requests.length);

  for (i = 0; i < requests.length; i++)
    TestRunner.addResult(requests[i].url());
};

NetworkTestRunner.findRequestsByURLPattern = function(urlPattern) {
  return NetworkTestRunner.networkRequests().filter(function(value) {
    return urlPattern.test(value.url());
  });
};

NetworkTestRunner.makeSimpleXHR = function(method, url, async, callback) {
  NetworkTestRunner.makeXHR(method, url, async, undefined, undefined, [], false, undefined, undefined, callback);
};

NetworkTestRunner.makeSimpleXHRWithPayload = function(method, url, async, payload, callback) {
  NetworkTestRunner.makeXHR(method, url, async, undefined, undefined, [], false, payload, undefined, callback);
};

NetworkTestRunner.makeXHR = function(
    method, url, async, user, password, headers, withCredentials, payload, type, callback) {
  var testScriptURL = /** @type {string} */ (Runtime.queryParam('test'));
  var resolvedPath = testScriptURL + '/../' + url;

  var args = {};
  args.method = method;
  args.url = resolvedPath;
  args.async = async;
  args.user = user;
  args.password = password;
  args.headers = headers;
  args.withCredentials = withCredentials;
  args.payload = payload;
  args.type = type;
  var jsonArgs = JSON.stringify(args).replace(/\"/g, '\\"');

  function innerCallback(msg) {
    if (msg.messageText.indexOf('XHR loaded') !== -1) {
      if (callback)
        callback();
    } else {
      ConsoleTestRunner.addConsoleSniffer(innerCallback);
    }
  }

  ConsoleTestRunner.addConsoleSniffer(innerCallback);
  TestRunner.evaluateInPage('makeXHRForJSONArguments("' + jsonArgs + '")');
};

NetworkTestRunner.makeFetch = function(url, requestInitializer, callback) {
  TestRunner.callFunctionInPageAsync('makeFetch', [url, requestInitializer]).then(callback);
};

NetworkTestRunner.makeFetchInWorker = function(url, requestInitializer, callback) {
  TestRunner.callFunctionInPageAsync('makeFetchInWorker', [url, requestInitializer]).then(callback);
};

NetworkTestRunner.clearNetworkCache = function() {
  var networkAgent = TestRunner.NetworkAgent;
  var promise = networkAgent.setCacheDisabled(true);
  return promise.then(() => networkAgent.setCacheDisabled(false));
};

NetworkTestRunner.HARPropertyFormatters = {
  bodySize: 'formatAsTypeName',
  compression: 'formatAsTypeName',
  connection: 'formatAsTypeName',
  headers: 'formatAsTypeName',
  headersSize: 'formatAsTypeName',
  id: 'formatAsTypeName',
  onContentLoad: 'formatAsTypeName',
  onLoad: 'formatAsTypeName',
  receive: 'formatAsTypeName',
  startedDateTime: 'formatAsRecentTime',
  time: 'formatAsTypeName',
  timings: 'formatAsTypeName',
  version: 'formatAsTypeName',
  wait: 'formatAsTypeName',
  _transferSize: 'formatAsTypeName',
  _error: 'skip'
};

NetworkTestRunner.HARPropertyFormattersWithSize = JSON.parse(JSON.stringify(NetworkTestRunner.HARPropertyFormatters));
NetworkTestRunner.HARPropertyFormattersWithSize.size = 'formatAsTypeName';

(async function() {
  await TestRunner.evaluateInPagePromise(`
    var lastXHRIndex = 0;

    function xhrLoadedCallback() {
      console.log('XHR loaded: ' + ++lastXHRIndex);
    }

    function makeSimpleXHR(method, url, async, callback) {
      makeSimpleXHRWithPayload(method, url, async, null, callback);
    }

    function makeSimpleXHRWithPayload(method, url, async, payload, callback) {
      makeXHR(method, url, async, undefined, undefined, [], false, payload, callback);
    }

    function makeXHR(method, url, async, user, password, headers, withCredentials, payload, type, callback) {
      var xhr = new XMLHttpRequest();

      if (type == undefined)
        xhr.responseType = '';
      else
        xhr.responseType = type;

      xhr.onreadystatechange = function() {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          if (typeof callback === 'function')
            callback();
        }
      };

      xhr.open(method, url, async, user, password);
      xhr.withCredentials = withCredentials;

      for (var i = 0; i < headers.length; ++i)
        xhr.setRequestHeader(headers[i][0], headers[i][1]);

      xhr.send(payload);
    }

    function makeXHRForJSONArguments(jsonArgs) {
      var args = JSON.parse(jsonArgs);

      makeXHR(
        args.method,
        args.url,
        args.async,
        args.user,
        args.password,
        args.headers || [],
        args.withCredentials,
        args.payload,
        args.type,
        xhrLoadedCallback
      );
    }

    function makeFetch(url, requestInitializer) {
      return fetch(url, requestInitializer).then(res => {
        res.text();
        return res;
      }).catch(e => e);
    }

    function makeFetchInWorker(url, requestInitializer) {
      return new Promise(resolve => {
        var worker = new Worker('/inspector/network/resources/fetch-worker.js');

        worker.onmessage = event => {
          resolve(event.data);
        };

        worker.postMessage({
          url: url,
          init: requestInitializer
        });
      });
    }
  `);
})();
