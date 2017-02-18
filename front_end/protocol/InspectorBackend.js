/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/** @typedef {string} */
Protocol.Error;

/**
 * @unrestricted
 */
Protocol.InspectorBackend = class {
  constructor() {
    this._agentPrototypes = {};
    this._dispatcherPrototypes = {};
    this._initialized = false;
  }

  /**
   * @param {string} error
   * @param {!Object} messageObject
   */
  static reportProtocolError(error, messageObject) {
    console.error(error + ': ' + JSON.stringify(messageObject));
  }

  /**
   * @return {boolean}
   */
  isInitialized() {
    return this._initialized;
  }

  /**
   * @param {string} domain
   */
  _addAgentGetterMethodToProtocolTargetPrototype(domain) {
    var upperCaseLength = 0;
    while (upperCaseLength < domain.length && domain[upperCaseLength].toLowerCase() !== domain[upperCaseLength])
      ++upperCaseLength;

    var methodName = domain.substr(0, upperCaseLength).toLowerCase() + domain.slice(upperCaseLength) + 'Agent';

    /**
     * @this {Protocol.TargetBase}
     */
    function agentGetter() {
      return this._agents[domain];
    }

    Protocol.TargetBase.prototype[methodName] = agentGetter;

    /**
     * @this {Protocol.TargetBase}
     */
    function registerDispatcher(dispatcher) {
      this.registerDispatcher(domain, dispatcher);
    }

    Protocol.TargetBase.prototype['register' + domain + 'Dispatcher'] = registerDispatcher;
  }

  /**
   * @param {string} domain
   * @return {!Protocol.InspectorBackend._AgentPrototype}
   */
  _agentPrototype(domain) {
    if (!this._agentPrototypes[domain]) {
      this._agentPrototypes[domain] = new Protocol.InspectorBackend._AgentPrototype(domain);
      this._addAgentGetterMethodToProtocolTargetPrototype(domain);
    }

    return this._agentPrototypes[domain];
  }

  /**
   * @param {string} domain
   * @return {!Protocol.InspectorBackend._DispatcherPrototype}
   */
  _dispatcherPrototype(domain) {
    if (!this._dispatcherPrototypes[domain])
      this._dispatcherPrototypes[domain] = new Protocol.InspectorBackend._DispatcherPrototype();
    return this._dispatcherPrototypes[domain];
  }

  /**
   * @param {string} method
   * @param {!Array.<!Object>} signature
   * @param {!Array.<string>} replyArgs
   * @param {boolean} hasErrorData
   */
  registerCommand(method, signature, replyArgs, hasErrorData) {
    var domainAndMethod = method.split('.');
    this._agentPrototype(domainAndMethod[0]).registerCommand(domainAndMethod[1], signature, replyArgs, hasErrorData);
    this._initialized = true;
  }

  /**
   * @param {string} type
   * @param {!Object} values
   */
  registerEnum(type, values) {
    var domainAndName = type.split('.');
    var domain = domainAndName[0];
    if (!Protocol[domain])
      Protocol[domain] = {};

    Protocol[domain][domainAndName[1]] = values;
    this._initialized = true;
  }

  /**
   * @param {string} eventName
   * @param {!Object} params
   */
  registerEvent(eventName, params) {
    var domain = eventName.split('.')[0];
    this._dispatcherPrototype(domain).registerEvent(eventName, params);
    this._initialized = true;
  }

  /**
   * @param {function(T)} clientCallback
   * @param {string} errorPrefix
   * @param {function(new:T,S)=} constructor
   * @param {T=} defaultValue
   * @return {function(?string, S)}
   * @template T,S
   */
  wrapClientCallback(clientCallback, errorPrefix, constructor, defaultValue) {
    /**
     * @param {?string} error
     * @param {S} value
     * @template S
     */
    function callbackWrapper(error, value) {
      if (error) {
        console.error(errorPrefix + error);
        clientCallback(defaultValue);
        return;
      }
      if (constructor)
        clientCallback(new constructor(value));
      else
        clientCallback(value);
    }
    return callbackWrapper;
  }
};

Protocol.InspectorBackend._ConnectionClosedErrorCode = -32000;
Protocol.InspectorBackend.DevToolsStubErrorCode = -32015;


Protocol.inspectorBackend = new Protocol.InspectorBackend();

/**
 * @interface
 */
Protocol.InspectorBackend.Connection = function() {};

Protocol.InspectorBackend.Connection.prototype = {
  /**
   * @param {string} message
   */
  sendMessage(message) {},

  /**
   * @return {!Promise}
   */
  disconnect() {},
};

/**
 * @typedef {!{
 *   onMessage: function((!Object|string)),
 *   onDisconnect: function(string)
 * }}
 */
Protocol.InspectorBackend.Connection.Params;

/**
 * @typedef {function(!Protocol.InspectorBackend.Connection.Params):!Protocol.InspectorBackend.Connection}
 */
Protocol.InspectorBackend.Connection.Factory;

/**
 * @unrestricted
 */
Protocol.TargetBase = class {
  /**
   *  @param {!Protocol.InspectorBackend.Connection.Factory} connectionFactory
   */
  constructor(connectionFactory) {
    this._connection =
        connectionFactory({onMessage: this._onMessage.bind(this), onDisconnect: this._onDisconnect.bind(this)});
    this._lastMessageId = 1;
    this._pendingResponsesCount = 0;
    this._agents = {};
    this._dispatchers = {};
    this._callbacks = {};
    this._initialize(Protocol.inspectorBackend._agentPrototypes, Protocol.inspectorBackend._dispatcherPrototypes);
    if (!Protocol.InspectorBackend.deprecatedRunAfterPendingDispatches) {
      Protocol.InspectorBackend.deprecatedRunAfterPendingDispatches =
          this._deprecatedRunAfterPendingDispatches.bind(this);
    }
    if (!Protocol.InspectorBackend.sendRawMessageForTesting)
      Protocol.InspectorBackend.sendRawMessageForTesting = this._sendRawMessageForTesting.bind(this);
  }

  /**
   * @param {!Object.<string, !Protocol.InspectorBackend._AgentPrototype>} agentPrototypes
   * @param {!Object.<string, !Protocol.InspectorBackend._DispatcherPrototype>} dispatcherPrototypes
   */
  _initialize(agentPrototypes, dispatcherPrototypes) {
    for (var domain in agentPrototypes) {
      this._agents[domain] = Object.create(agentPrototypes[domain]);
      this._agents[domain].setTarget(this);
    }

    for (var domain in dispatcherPrototypes) {
      this._dispatchers[domain] = Object.create(dispatcherPrototypes[domain]);
      this._dispatchers[domain].initialize();
    }
  }

  /**
   * @return {number}
   */
  _nextMessageId() {
    return this._lastMessageId++;
  }

  /**
   * @param {string} domain
   * @return {!Protocol.InspectorBackend._AgentPrototype}
   */
  _agent(domain) {
    return this._agents[domain];
  }

  /**
   * @param {string} domain
   * @param {string} method
   * @param {?Object} params
   * @param {?function(*)} callback
   */
  _wrapCallbackAndSendMessageObject(domain, method, params, callback) {
    if (!this._connection) {
      if (callback)
        this._dispatchConnectionErrorResponse(domain, method, callback);
      return;
    }

    var messageObject = {};
    var messageId = this._nextMessageId();
    messageObject.id = messageId;
    messageObject.method = method;
    if (params)
      messageObject.params = params;

    var wrappedCallback = this._wrap(callback, domain, method);
    var message = JSON.stringify(messageObject);

    if (Protocol.InspectorBackend.Options.dumpInspectorProtocolMessages)
      this._dumpProtocolMessage('frontend: ' + message);

    this._connection.sendMessage(message);
    ++this._pendingResponsesCount;
    this._callbacks[messageId] = wrappedCallback;
  }

  /**
   * @param {?function(*)} callback
   * @param {string} method
   * @param {string} domain
   * @return {function(*)}
   */
  _wrap(callback, domain, method) {
    if (!callback)
      callback = function() {};

    callback.methodName = method;
    callback.domain = domain;
    if (Protocol.InspectorBackend.Options.dumpInspectorTimeStats)
      callback.sendRequestTime = Date.now();

    return callback;
  }

  /**
   * @param {string} method
   * @param {?Object} params
   * @param {?function(...*)} callback
   */
  _sendRawMessageForTesting(method, params, callback) {
    var domain = method.split('.')[0];
    this._wrapCallbackAndSendMessageObject(domain, method, params, callback);
  }

  /**
   * @param {!Object|string} message
   */
  _onMessage(message) {
    if (Protocol.InspectorBackend.Options.dumpInspectorProtocolMessages)
      this._dumpProtocolMessage('backend: ' + ((typeof message === 'string') ? message : JSON.stringify(message)));

    var messageObject = /** @type {!Object} */ ((typeof message === 'string') ? JSON.parse(message) : message);

    if ('id' in messageObject) {  // just a response for some request
      var callback = this._callbacks[messageObject.id];
      if (!callback) {
        Protocol.InspectorBackend.reportProtocolError('Protocol Error: the message with wrong id', messageObject);
        return;
      }

      var timingLabel = 'time-stats: ' + callback.methodName;
      if (Protocol.InspectorBackend.Options.dumpInspectorTimeStats)
        console.time(timingLabel);

      this._agent(callback.domain).dispatchResponse(messageObject, callback.methodName, callback);
      --this._pendingResponsesCount;
      delete this._callbacks[messageObject.id];

      if (Protocol.InspectorBackend.Options.dumpInspectorTimeStats)
        console.timeEnd(timingLabel);

      if (this._scripts && !this._pendingResponsesCount)
        this._deprecatedRunAfterPendingDispatches();
    } else {
      if (!('method' in messageObject)) {
        Protocol.InspectorBackend.reportProtocolError('Protocol Error: the message without method', messageObject);
        return;
      }

      var method = messageObject.method.split('.');
      var domainName = method[0];
      if (!(domainName in this._dispatchers)) {
        Protocol.InspectorBackend.reportProtocolError(
            'Protocol Error: the message ' + messageObject.method + ' is for non-existing domain \'' + domainName +
                '\'',
            messageObject);
        return;
      }

      this._dispatchers[domainName].dispatch(method[1], messageObject);
    }
  }

  /**
   * @param {string} domain
   * @param {!Object} dispatcher
   */
  registerDispatcher(domain, dispatcher) {
    if (!this._dispatchers[domain])
      return;

    this._dispatchers[domain].addDomainDispatcher(dispatcher);
  }

  /**
   * @param {function()=} script
   */
  _deprecatedRunAfterPendingDispatches(script) {
    if (!this._scripts)
      this._scripts = [];

    if (script)
      this._scripts.push(script);

    // Execute all promises.
    setTimeout(function() {
      if (!this._pendingResponsesCount)
        this._executeAfterPendingDispatches();
      else
        this._deprecatedRunAfterPendingDispatches();
    }.bind(this), 0);
  }

  _executeAfterPendingDispatches() {
    if (!this._pendingResponsesCount) {
      var scripts = this._scripts;
      this._scripts = [];
      for (var id = 0; id < scripts.length; ++id)
        scripts[id].call(this);
    }
  }

  /**
   * @param {string} message
   */
  _dumpProtocolMessage(message) {
    console.log(message);  // eslint-disable-line no-console
  }

  /**
   * @param {string} reason
   */
  _onDisconnect(reason) {
    this._connection = null;
    this._runPendingCallbacks();
    this.dispose();
  }

  /**
   * @protected
   */
  dispose() {
  }

  /**
   * @return {boolean}
   */
  isDisposed() {
    return !this._connection;
  }

  _runPendingCallbacks() {
    var keys = Object.keys(this._callbacks).map(function(num) {
      return parseInt(num, 10);
    });
    for (var i = 0; i < keys.length; ++i) {
      var callback = this._callbacks[keys[i]];
      this._dispatchConnectionErrorResponse(callback.domain, callback.methodName, callback);
    }
    this._callbacks = {};
  }

  /**
   * @param {string} domain
   * @param {string} methodName
   * @param {function(*)} callback
   */
  _dispatchConnectionErrorResponse(domain, methodName, callback) {
    var error = {
      message: 'Connection is closed, can\'t dispatch pending ' + methodName,
      code: Protocol.InspectorBackend._ConnectionClosedErrorCode,
      data: null
    };
    var messageObject = {error: error};
    setTimeout(
        Protocol.InspectorBackend._AgentPrototype.prototype.dispatchResponse.bind(
            this._agent(domain), messageObject, methodName, callback),
        0);
  }
};

/**
 * @unrestricted
 */
Protocol.InspectorBackend._AgentPrototype = class {
  /**
   * @param {string} domain
   */
  constructor(domain) {
    this._replyArgs = {};
    this._hasErrorData = {};
    this._domain = domain;
  }

  /**
   * @param {!Protocol.TargetBase} target
   */
  setTarget(target) {
    this._target = target;
  }

  /**
   * @param {string} methodName
   * @param {!Array.<!Object>} signature
   * @param {!Array.<string>} replyArgs
   * @param {boolean} hasErrorData
   */
  registerCommand(methodName, signature, replyArgs, hasErrorData) {
    var domainAndMethod = this._domain + '.' + methodName;

    /**
     * @param {...*} vararg
     * @this {Protocol.InspectorBackend._AgentPrototype}
     * @return {!Promise.<*>}
     */
    function sendMessagePromise(vararg) {
      var params = Array.prototype.slice.call(arguments);
      return Protocol.InspectorBackend._AgentPrototype.prototype._sendMessageToBackendPromise.call(
          this, domainAndMethod, signature, params);
    }

    this[methodName] = sendMessagePromise;

    /**
     * @param {...*} vararg
     * @this {Protocol.InspectorBackend._AgentPrototype}
     */
    function invoke(vararg) {
      var params = [domainAndMethod].concat(Array.prototype.slice.call(arguments));
      Protocol.InspectorBackend._AgentPrototype.prototype._invoke.apply(this, params);
    }

    this['invoke_' + methodName] = invoke;

    this._replyArgs[domainAndMethod] = replyArgs;
    if (hasErrorData)
      this._hasErrorData[domainAndMethod] = true;
  }

  /**
   * @param {string} method
   * @param {!Array.<!Object>} signature
   * @param {!Array.<*>} args
   * @param {boolean} allowExtraUndefinedArg
   * @param {function(string)} errorCallback
   * @return {?Object}
   */
  _prepareParameters(method, signature, args, allowExtraUndefinedArg, errorCallback) {
    var params = {};
    var hasParams = false;
    for (var i = 0; i < signature.length; ++i) {
      var param = signature[i];
      var paramName = param['name'];
      var typeName = param['type'];
      var optionalFlag = param['optional'];

      if (!args.length && !optionalFlag) {
        errorCallback(
            'Protocol Error: Invalid number of arguments for method \'' + method +
            '\' call. It must have the following arguments \'' + JSON.stringify(signature) + '\'.');
        return null;
      }

      var value = args.shift();
      if (optionalFlag && typeof value === 'undefined')
        continue;

      if (typeof value !== typeName) {
        errorCallback(
            'Protocol Error: Invalid type of argument \'' + paramName + '\' for method \'' + method +
            '\' call. It must be \'' + typeName + '\' but it is \'' + typeof value + '\'.');
        return null;
      }

      params[paramName] = value;
      hasParams = true;
    }

    if (args.length === 1 && (!allowExtraUndefinedArg || (typeof args[0] !== 'undefined'))) {
      errorCallback(
          'Protocol Error: Optional callback argument for method \'' + method +
          '\' call must be a function but its type is \'' + typeof args[0] + '\'.');
      return null;
    }

    if (args.length > 1) {
      errorCallback('Protocol Error: Extra ' + args.length + ' arguments in a call to method \'' + method + '\'.');
      return null;
    }

    return hasParams ? params : null;
  }

  /**
   * @param {string} method
   * @param {!Array.<!Object>} signature
   * @param {!Array.<*>} args
   * @return {!Promise.<*>}
   */
  _sendMessageToBackendPromise(method, signature, args) {
    var errorMessage;
    /**
     * @param {string} message
     */
    function onError(message) {
      console.error(message);
      errorMessage = message;
    }
    var userCallback = (args.length && typeof args.peekLast() === 'function') ? args.pop() : null;
    var params = this._prepareParameters(method, signature, args, !userCallback, onError);
    var responseArguments;
    if (errorMessage) {
      responseArguments = [errorMessage];
      return Promise.resolve().then(runUserCallback);
    }
    return new Promise(promiseAction.bind(this)).then(runUserCallback);

    /**
     * @param {function()} resolve
     * @param {function(!Error)} reject
     * @this {Protocol.InspectorBackend._AgentPrototype}
     */
    function promiseAction(resolve, reject) {
      /**
       * @param {...*} vararg
       */
      function callback(vararg) {
        responseArguments = arguments;
        resolve();
      }
      this._target._wrapCallbackAndSendMessageObject(this._domain, method, params, callback);
    }

    function runUserCallback() {
      return userCallback ? userCallback.apply(null, responseArguments) : undefined;
    }
  }

  /**
   * @param {string} method
   * @param {?Object} args
   * @param {?function(*)} callback
   */
  _invoke(method, args, callback) {
    this._target._wrapCallbackAndSendMessageObject(this._domain, method, args, callback);
  }

  /**
   * @param {!Object} messageObject
   * @param {string} methodName
   * @param {function(*)|function(?Protocol.Error, ?Object)} callback
   */
  dispatchResponse(messageObject, methodName, callback) {
    if (messageObject.error && messageObject.error.code !== Protocol.InspectorBackend._ConnectionClosedErrorCode &&
        messageObject.error.code !== Protocol.InspectorBackend.DevToolsStubErrorCode &&
        !Protocol.InspectorBackend.Options.suppressRequestErrors) {
      var id = Protocol.InspectorBackend.Options.dumpInspectorProtocolMessages ? ' with id = ' + messageObject.id : '';
      console.error('Request ' + methodName + id + ' failed. ' + JSON.stringify(messageObject.error));
    }

    var argumentsArray = [];
    argumentsArray[0] = messageObject.error ? messageObject.error.message : null;

    if (this._hasErrorData[methodName])
      argumentsArray[1] = messageObject.error ? messageObject.error.data : null;

    if (messageObject.result) {
      var paramNames = this._replyArgs[methodName] || [];
      for (var i = 0; i < paramNames.length; ++i)
        argumentsArray.push(messageObject.result[paramNames[i]]);
    }

    callback.apply(null, argumentsArray);
  }
};

/**
 * @unrestricted
 */
Protocol.InspectorBackend._DispatcherPrototype = class {
  constructor() {
    this._eventArgs = {};
  }

  /**
   * @param {string} eventName
   * @param {!Object} params
   */
  registerEvent(eventName, params) {
    this._eventArgs[eventName] = params;
  }

  initialize() {
    this._dispatchers = [];
  }

  /**
   * @param {!Object} dispatcher
   */
  addDomainDispatcher(dispatcher) {
    this._dispatchers.push(dispatcher);
  }

  /**
   * @param {string} functionName
   * @param {!Object} messageObject
   */
  dispatch(functionName, messageObject) {
    if (!this._dispatchers.length)
      return;

    if (!this._eventArgs[messageObject.method]) {
      Protocol.InspectorBackend.reportProtocolError(
          'Protocol Error: Attempted to dispatch an unspecified method \'' + messageObject.method + '\'',
          messageObject);
      return;
    }

    var params = [];
    if (messageObject.params) {
      var paramNames = this._eventArgs[messageObject.method];
      for (var i = 0; i < paramNames.length; ++i)
        params.push(messageObject.params[paramNames[i]]);
    }

    var timingLabel = 'time-stats: ' + messageObject.method;
    if (Protocol.InspectorBackend.Options.dumpInspectorTimeStats)
      console.time(timingLabel);

    for (var index = 0; index < this._dispatchers.length; ++index) {
      var dispatcher = this._dispatchers[index];
      if (functionName in dispatcher)
        dispatcher[functionName].apply(dispatcher, params);
    }

    if (Protocol.InspectorBackend.Options.dumpInspectorTimeStats)
      console.timeEnd(timingLabel);
  }
};

Protocol.InspectorBackend.Options = {
  dumpInspectorTimeStats: false,
  dumpInspectorProtocolMessages: false,
  suppressRequestErrors: false
};
