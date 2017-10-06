// Copyright 2017 The Chromium Authors. All
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 * @suppress {accessControls}
 */

var id = 0;

function nextId(prefix) {
  return (prefix || '') + ++id;
}

SDKTestRunner.connectToPage = function(targetName, pageMock, makeMainTarget) {
  var mockTarget = SDK.targetManager.createTarget(
      nextId('mock-target-'), targetName, pageMock.capabilities(), params => pageMock.createConnection(params));

  if (makeMainTarget) {
    SDK.targetManager._targets = SDK.targetManager._targets.filter(target => target !== mockTarget);
    SDK.targetManager._targets.unshift(mockTarget);
  }

  return mockTarget;
};

SDKTestRunner.PageMock = class {
  constructor(url) {
    this._url = url;
    this._capabilities = SDK.Target.Capability.DOM | SDK.Target.Capability.JS | SDK.Target.Capability.Browser;
    this._enabledDomains = new Set();

    this._mainFrame =
        {id: nextId(), loaderId: nextId(), mimeType: 'text/html', securityOrigin: this._url, url: this._url};

    this._executionContexts = [];
    this._executionContexts.push(this._createExecutionContext(this._mainFrame, false));
    this._scripts = [];
    this._scriptContents = new Map();

    this._dispatchMap = {
      'Debugger.enable': this._debuggerEnable,
      'Debugger.getScriptSource': this._debuggerGetScriptSource,
      'Debugger.setBlackboxPatterns': (id, params) => this._sendResponse(id, {}),
      'Runtime.enable': this._runtimeEnable,
      'Page.enable': this._pageEnable,
      'Page.getResourceTree': this._pageGetResourceTree
    };
  }

  capabilities() {
    return this._capabilities;
  }

  disableDOMCapability() {
    this._capabilities = this._capabilities & ~SDK.Target.Capability.DOM;
  }

  createConnection(params) {
    this._enabledDomains.clear();
    this._connection = new MockPageConnection(this, params);
    return this._connection;
  }

  evalScript(url, content, isContentScript) {
    var id = nextId();
    content += '\n//# sourceURL=' + url;
    this._scriptContents.set(id, content);
    var context = this._executionContexts.find(context => context.auxData.isDefault !== isContentScript);

    if (!context) {
      context = this._createExecutionContext(this._mainFrame, isContentScript);

      this._fireEvent('Runtime.executionContextCreated', {context: context});
    }

    var text = new TextUtils.Text(content);

    var script = {
      scriptId: id,
      url: url,
      startLine: 0,
      startColumn: 0,
      endLine: text.lineCount(),
      endColumn: text.lineAt(text.lineCount()).length - 1,
      executionContextId: context.id,
      hash: String.hashCode(content),
      executionContextAuxData: context.auxData,
      sourceMapURL: '',
      hasSourceURL: true,
      isLiveEdit: false,
      isModule: false,
      length: content.length
    };

    this._scripts.push(script);
    this._fireEvent('Debugger.scriptParsed', script);
  }

  reload() {
    this._fireEvent('Page.frameStartedLoading', {frameId: this._mainFrame.id});

    for (var context of this._executionContexts)
      this._fireEvent('Runtime.executionContextDestroyed', {executionContextId: context.id});


    this._scripts = [];
    this._scriptContents.clear();
    this._executionContexts = [];
    this._fireEvent('Runtime.executionContextsCleared', {});
    this._executionContexts.push(this._createExecutionContext(this._mainFrame, false));

    for (var context of this._executionContexts)
      this._fireEvent('Runtime.executionContextCreated', {context: context});


    this._fireEvent('Page.frameNavigated', {frame: this._mainFrame});

    this._fireEvent('Page.loadEventFired', {timestamp: Date.now() / 1000});

    this._fireEvent('Page.frameStoppedLoading', {frameId: this._mainFrame.id});

    this._fireEvent('Page.domContentEventFired', {timestamp: Date.now() / 1000});
  }

  close() {
    if (this._connection) {
      this._connection.disconnect();
      this._connection = null;
    }
  }

  _createExecutionContext(frame, isContentScript) {
    return {
      id: nextId(),

      auxData: {isDefault: !isContentScript, frameId: frame.id},

      origin: frame.securityOrigin,
      name: ''
    };
  }

  _debuggerEnable(id, params) {
    this._enabledDomains.add('Debugger');
    this._sendResponse(id, {});

    for (var script of this._scripts)
      this._fireEvent('Debugger.scriptParsed', script);
  }

  _debuggerGetScriptSource(id, params) {
    if (!this._scriptContents.has(params.scriptId)) {
      this._sendResponse(id, undefined, {message: 'Can\'t get script content for id ' + params.scriptId, code: 1});

      return;
    }

    var result = {scriptSource: this._scriptContents.get(params.scriptId)};

    this._sendResponse(id, result);
  }

  _runtimeEnable(id, params) {
    this._enabledDomains.add('Runtime');
    this._sendResponse(id, {});

    for (var context of this._executionContexts)
      this._fireEvent('Runtime.executionContextCreated', {context: context});
  }

  _pageEnable(id, params) {
    this._enabledDomains.add('Page');
    this._sendResponse(id, {});
  }

  _pageGetResourceTree(id, params) {
    var result = {frameTree: {frame: this._mainFrame, resources: []}};

    this._sendResponse(id, result);
  }

  _isSupportedDomain(methodName) {
    var domain = methodName.split('.')[0];

    if (domain === 'Page')
      return !!(this._capabilities & SDK.Target.Capability.DOM);

    return true;
  }

  _dispatch(id, methodName, params, message) {
    var handler = (this._isSupportedDomain(methodName) ? this._dispatchMap[methodName] : null);

    if (handler)
      return handler.call(this, id, params);

    this._sendResponse(
        id, undefined,
        {message: 'Can\'t handle command ' + methodName, code: Protocol.InspectorBackend.DevToolsStubErrorCode});
  }

  _sendResponse(id, result, error) {
    var message = {id: id, result: result, error: error};

    this._connection.sendMessageToDevTools(message);
  }

  _fireEvent(methodName, params) {
    var domain = methodName.split('.')[0];

    if (!this._enabledDomains.has(domain))
      return;

    var message = {method: methodName, params: params};

    this._connection.sendMessageToDevTools(message);
  }
};

var MockPageConnection = class {
  constructor(page, params) {
    this._page = page;
    this._onMessage = params.onMessage;
    this._onDisconnect = params.onDisconnect;
  }

  sendMessageToDevTools(message) {
    setTimeout(() => this._onMessage.call(null, JSON.stringify(message)), 0);
  }

  sendMessage(message) {
    var json = JSON.parse(message);
    this._page._dispatch(json.id, json.method, json.params, message);
  }

  disconnect() {
    this._onDisconnect.call(null, 'force disconnect');
    this._onDisconnect = null;
    this._onMessage = null;
    return Promise.resolve();
  }
};
