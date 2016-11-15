/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
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

/**
 * @unrestricted
 */
SDK.RuntimeModel = class extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super(SDK.RuntimeModel, target);

    this._agent = target.runtimeAgent();
    this.target().registerRuntimeDispatcher(new SDK.RuntimeDispatcher(this));
    if (target.hasJSCapability())
      this._agent.enable();
    /** @type {!Map<number, !SDK.ExecutionContext>} */
    this._executionContextById = new Map();
    this._executionContextComparator = SDK.ExecutionContext.comparator;

    if (Common.moduleSetting('customFormatters').get())
      this._agent.setCustomObjectFormatterEnabled(true);

    Common.moduleSetting('customFormatters').addChangeListener(this._customFormattersStateChanged.bind(this));
  }

  /**
   * @return {!Array.<!SDK.ExecutionContext>}
   */
  executionContexts() {
    return this._executionContextById.valuesArray().sort(this.executionContextComparator());
  }

  /**
   * @param {function(!SDK.ExecutionContext,!SDK.ExecutionContext)} comparator
   */
  setExecutionContextComparator(comparator) {
    this._executionContextComparator = comparator;
  }

  /**
   * @return {function(!SDK.ExecutionContext,!SDK.ExecutionContext)} comparator
   */
  executionContextComparator() {
    return this._executionContextComparator;
  }

  /**
   * @return {?SDK.ExecutionContext}
   */
  defaultExecutionContext() {
    for (var context of this._executionContextById.values()) {
      if (context.isDefault)
        return context;
    }
    return null;
  }

  /**
   * @param {!Protocol.Runtime.ExecutionContextId} id
   * @return {?SDK.ExecutionContext}
   */
  executionContext(id) {
    return this._executionContextById.get(id) || null;
  }

  /**
   * @param {!Protocol.Runtime.ExecutionContextDescription} context
   */
  _executionContextCreated(context) {
    // The private script context should be hidden behind an experiment.
    if (context.name === SDK.RuntimeModel._privateScript && !context.origin &&
        !Runtime.experiments.isEnabled('privateScriptInspection'))
      return;

    var data = context.auxData || {isDefault: true};
    var executionContext = new SDK.ExecutionContext(
        this.target(), context.id, context.name, context.origin, data['isDefault'], data['frameId']);
    this._executionContextById.set(executionContext.id, executionContext);
    this.dispatchEventToListeners(SDK.RuntimeModel.Events.ExecutionContextCreated, executionContext);
  }

  /**
   * @param {number} executionContextId
   */
  _executionContextDestroyed(executionContextId) {
    var executionContext = this._executionContextById.get(executionContextId);
    if (!executionContext)
      return;
    this._executionContextById.delete(executionContextId);
    this.dispatchEventToListeners(SDK.RuntimeModel.Events.ExecutionContextDestroyed, executionContext);
  }

  fireExecutionContextOrderChanged() {
    this.dispatchEventToListeners(SDK.RuntimeModel.Events.ExecutionContextOrderChanged, this);
  }

  _executionContextsCleared() {
    var debuggerModel = SDK.DebuggerModel.fromTarget(this.target());
    if (debuggerModel)
      debuggerModel.globalObjectCleared();
    var contexts = this.executionContexts();
    this._executionContextById.clear();
    for (var i = 0; i < contexts.length; ++i)
      this.dispatchEventToListeners(SDK.RuntimeModel.Events.ExecutionContextDestroyed, contexts[i]);
  }

  /**
   * @param {!Protocol.Runtime.RemoteObject} payload
   * @return {!SDK.RemoteObject}
   */
  createRemoteObject(payload) {
    console.assert(typeof payload === 'object', 'Remote object payload should only be an object');
    return new SDK.RemoteObjectImpl(
        this.target(), payload.objectId, payload.type, payload.subtype, payload.value, payload.unserializableValue,
        payload.description, payload.preview, payload.customPreview);
  }

  /**
   * @param {!Protocol.Runtime.RemoteObject} payload
   * @param {!SDK.ScopeRef} scopeRef
   * @return {!SDK.RemoteObject}
   */
  createScopeRemoteObject(payload, scopeRef) {
    return new SDK.ScopeRemoteObject(
        this.target(), payload.objectId, scopeRef, payload.type, payload.subtype, payload.value,
        payload.unserializableValue, payload.description, payload.preview);
  }

  /**
   * @param {number|string|boolean|undefined} value
   * @return {!SDK.RemoteObject}
   */
  createRemoteObjectFromPrimitiveValue(value) {
    var type = typeof value;
    var unserializableValue = undefined;
    if (typeof value === 'number') {
      var description = String(value);
      if (value === 0 && 1 / value < 0)
        unserializableValue = Protocol.Runtime.UnserializableValue.Negative0;
      if (description === 'NaN')
        unserializableValue = Protocol.Runtime.UnserializableValue.NaN;
      if (description === 'Infinity')
        unserializableValue = Protocol.Runtime.UnserializableValue.Infinity;
      if (description === '-Infinity')
        unserializableValue = Protocol.Runtime.UnserializableValue.NegativeInfinity;
      if (typeof unserializableValue !== 'undefined')
        value = undefined;
    }
    return new SDK.RemoteObjectImpl(this.target(), undefined, type, undefined, value, unserializableValue);
  }

  /**
   * @param {string} name
   * @param {number|string|boolean} value
   * @return {!SDK.RemoteObjectProperty}
   */
  createRemotePropertyFromPrimitiveValue(name, value) {
    return new SDK.RemoteObjectProperty(name, this.createRemoteObjectFromPrimitiveValue(value));
  }

  discardConsoleEntries() {
    this._agent.discardConsoleEntries();
  }

  /**
   * @param {!Common.Event} event
   */
  _customFormattersStateChanged(event) {
    var enabled = /** @type {boolean} */ (event.data);
    this._agent.setCustomObjectFormatterEnabled(enabled);
  }

  /**
   * @param {string} expression
   * @param {string} sourceURL
   * @param {boolean} persistScript
   * @param {number} executionContextId
   * @param {function(!Protocol.Runtime.ScriptId=, ?Protocol.Runtime.ExceptionDetails=)=} callback
   */
  compileScript(expression, sourceURL, persistScript, executionContextId, callback) {
    this._agent.compileScript(expression, sourceURL, persistScript, executionContextId, innerCallback);

    /**
     * @param {?Protocol.Error} error
     * @param {!Protocol.Runtime.ScriptId=} scriptId
     * @param {?Protocol.Runtime.ExceptionDetails=} exceptionDetails
     */
    function innerCallback(error, scriptId, exceptionDetails) {
      if (error) {
        console.error(error);
        return;
      }
      if (callback)
        callback(scriptId, exceptionDetails);
    }
  }

  /**
   * @param {!Protocol.Runtime.ScriptId} scriptId
   * @param {number} executionContextId
   * @param {string=} objectGroup
   * @param {boolean=} silent
   * @param {boolean=} includeCommandLineAPI
   * @param {boolean=} returnByValue
   * @param {boolean=} generatePreview
   * @param {boolean=} awaitPromise
   * @param {function(?Protocol.Runtime.RemoteObject, ?Protocol.Runtime.ExceptionDetails=)=} callback
   */
  runScript(
      scriptId,
      executionContextId,
      objectGroup,
      silent,
      includeCommandLineAPI,
      returnByValue,
      generatePreview,
      awaitPromise,
      callback) {
    this._agent.runScript(
        scriptId, executionContextId, objectGroup, silent, includeCommandLineAPI, returnByValue, generatePreview,
        awaitPromise, innerCallback);

    /**
     * @param {?Protocol.Error} error
     * @param {!Protocol.Runtime.RemoteObject} result
     * @param {!Protocol.Runtime.ExceptionDetails=} exceptionDetails
     */
    function innerCallback(error, result, exceptionDetails) {
      if (error) {
        console.error(error);
        return;
      }
      if (callback)
        callback(result, exceptionDetails);
    }
  }

  /**
   * @param {!Protocol.Runtime.RemoteObject} payload
   * @param {!Object=} hints
   */
  _inspectRequested(payload, hints) {
    var object = this.createRemoteObject(payload);

    if (hints.copyToClipboard) {
      this._copyRequested(object);
      return;
    }

    if (object.isNode()) {
      Common.Revealer.revealPromise(object).then(object.release.bind(object));
      return;
    }

    if (object.type === 'function') {
      SDK.RemoteFunction.objectAsFunction(object).targetFunctionDetails().then(didGetDetails);
      return;
    }

    /**
     * @param {?SDK.DebuggerModel.FunctionDetails} response
     */
    function didGetDetails(response) {
      object.release();
      if (!response || !response.location)
        return;
      Common.Revealer.reveal(response.location);
    }
    object.release();
  }

  /**
   * @param {!SDK.RemoteObject} object
   */
  _copyRequested(object) {
    if (!object.objectId) {
      InspectorFrontendHost.copyText(object.value);
      return;
    }
    object.callFunctionJSON(
        toStringForClipboard, [{value: object.subtype}], InspectorFrontendHost.copyText.bind(InspectorFrontendHost));

    /**
     * @param {string} subtype
     * @this {Object}
     * @suppressReceiverCheck
     */
    function toStringForClipboard(subtype) {
      if (subtype === 'node')
        return this.outerHTML;
      if (subtype && typeof this === 'undefined')
        return subtype + '';
      try {
        return JSON.stringify(this, null, '  ');
      } catch (e) {
        return '' + this;
      }
    }
  }
};

/** @enum {symbol} */
SDK.RuntimeModel.Events = {
  ExecutionContextCreated: Symbol('ExecutionContextCreated'),
  ExecutionContextDestroyed: Symbol('ExecutionContextDestroyed'),
  ExecutionContextChanged: Symbol('ExecutionContextChanged'),
  ExecutionContextOrderChanged: Symbol('ExecutionContextOrderChanged')
};

SDK.RuntimeModel._privateScript = 'private script';

/**
 * @implements {Protocol.RuntimeDispatcher}
 * @unrestricted
 */
SDK.RuntimeDispatcher = class {
  /**
   * @param {!SDK.RuntimeModel} runtimeModel
   */
  constructor(runtimeModel) {
    this._runtimeModel = runtimeModel;
  }

  /**
   * @override
   * @param {!Protocol.Runtime.ExecutionContextDescription} context
   */
  executionContextCreated(context) {
    this._runtimeModel._executionContextCreated(context);
  }

  /**
   * @override
   * @param {!Protocol.Runtime.ExecutionContextId} executionContextId
   */
  executionContextDestroyed(executionContextId) {
    this._runtimeModel._executionContextDestroyed(executionContextId);
  }

  /**
   * @override
   */
  executionContextsCleared() {
    this._runtimeModel._executionContextsCleared();
  }

  /**
   * @override
   * @param {number} timestamp
   * @param {!Protocol.Runtime.ExceptionDetails} exceptionDetails
   */
  exceptionThrown(timestamp, exceptionDetails) {
    var consoleMessage = SDK.ConsoleMessage.fromException(
        this._runtimeModel.target(), exceptionDetails, undefined, timestamp, undefined);
    consoleMessage.setExceptionId(exceptionDetails.exceptionId);
    this._runtimeModel.target().consoleModel.addMessage(consoleMessage);
  }

  /**
   * @override
   * @param {string} reason
   * @param {number} exceptionId
   */
  exceptionRevoked(reason, exceptionId) {
    var consoleMessage = new SDK.ConsoleMessage(
        this._runtimeModel.target(), SDK.ConsoleMessage.MessageSource.JS, SDK.ConsoleMessage.MessageLevel.RevokedError,
        reason, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
        undefined);
    consoleMessage.setRevokedExceptionId(exceptionId);
    this._runtimeModel.target().consoleModel.addMessage(consoleMessage);
  }

  /**
   * @override
   * @param {string} type
   * @param {!Array.<!Protocol.Runtime.RemoteObject>} args
   * @param {number} executionContextId
   * @param {number} timestamp
   * @param {!Protocol.Runtime.StackTrace=} stackTrace
   */
  consoleAPICalled(type, args, executionContextId, timestamp, stackTrace) {
    var level = SDK.ConsoleMessage.MessageLevel.Log;
    if (type === SDK.ConsoleMessage.MessageType.Debug)
      level = SDK.ConsoleMessage.MessageLevel.Debug;
    if (type === SDK.ConsoleMessage.MessageType.Error || type === SDK.ConsoleMessage.MessageType.Assert)
      level = SDK.ConsoleMessage.MessageLevel.Error;
    if (type === SDK.ConsoleMessage.MessageType.Warning)
      level = SDK.ConsoleMessage.MessageLevel.Warning;
    if (type === SDK.ConsoleMessage.MessageType.Info)
      level = SDK.ConsoleMessage.MessageLevel.Info;
    var message = '';
    if (args.length && typeof args[0].value === 'string')
      message = args[0].value;
    else if (args.length && args[0].description)
      message = args[0].description;
    var callFrame = stackTrace && stackTrace.callFrames.length ? stackTrace.callFrames[0] : null;
    var consoleMessage = new SDK.ConsoleMessage(
        this._runtimeModel.target(), SDK.ConsoleMessage.MessageSource.ConsoleAPI, level,
        /** @type {string} */ (message), type, callFrame ? callFrame.url : undefined,
        callFrame ? callFrame.lineNumber : undefined, callFrame ? callFrame.columnNumber : undefined, undefined, args,
        stackTrace, timestamp, executionContextId, undefined);
    this._runtimeModel.target().consoleModel.addMessage(consoleMessage);
  }

  /**
   * @override
   * @param {!Protocol.Runtime.RemoteObject} payload
   * @param {!Object=} hints
   */
  inspectRequested(payload, hints) {
    this._runtimeModel._inspectRequested(payload, hints);
  }
};

/**
 * @unrestricted
 */
SDK.ExecutionContext = class extends SDK.SDKObject {
  /**
   * @param {!SDK.Target} target
   * @param {number} id
   * @param {string} name
   * @param {string} origin
   * @param {boolean} isDefault
   * @param {string=} frameId
   */
  constructor(target, id, name, origin, isDefault, frameId) {
    super(target);
    this.id = id;
    this.name = name;
    this.origin = origin;
    this.isDefault = isDefault;
    this.runtimeModel = target.runtimeModel;
    this.debuggerModel = SDK.DebuggerModel.fromTarget(target);
    this.frameId = frameId;

    this._label = name;
    var parsedUrl = origin.asParsedURL();
    if (!this._label && parsedUrl)
      this._label = parsedUrl.lastPathComponentWithFragment();
  }

  /**
   * @param {!SDK.ExecutionContext} a
   * @param {!SDK.ExecutionContext} b
   * @return {number}
   */
  static comparator(a, b) {
    /**
     * @param {!SDK.Target} target
     * @return {number}
     */
    function targetWeight(target) {
      if (target.hasBrowserCapability())
        return 3;
      if (target.hasJSCapability())
        return 2;
      return 1;
    }

    var weightDiff = targetWeight(a.target()) - targetWeight(b.target());
    if (weightDiff)
      return -weightDiff;

    // Main world context should always go first.
    if (a.isDefault)
      return -1;
    if (b.isDefault)
      return +1;
    return a.name.localeCompare(b.name);
  }

  /**
   * @param {string} expression
   * @param {string} objectGroup
   * @param {boolean} includeCommandLineAPI
   * @param {boolean} silent
   * @param {boolean} returnByValue
   * @param {boolean} generatePreview
   * @param {boolean} userGesture
   * @param {function(?SDK.RemoteObject, !Protocol.Runtime.ExceptionDetails=)} callback
   */
  evaluate(
      expression,
      objectGroup,
      includeCommandLineAPI,
      silent,
      returnByValue,
      generatePreview,
      userGesture,
      callback) {
    // FIXME: It will be moved to separate ExecutionContext.
    if (this.debuggerModel.selectedCallFrame()) {
      this.debuggerModel.evaluateOnSelectedCallFrame(
          expression, objectGroup, includeCommandLineAPI, silent, returnByValue, generatePreview, callback);
      return;
    }
    this._evaluateGlobal.apply(this, arguments);
  }

  /**
   * @param {string} objectGroup
   * @param {boolean} generatePreview
   * @param {function(?SDK.RemoteObject, !Protocol.Runtime.ExceptionDetails=)} callback
   */
  globalObject(objectGroup, generatePreview, callback) {
    this._evaluateGlobal('this', objectGroup, false, true, false, generatePreview, false, callback);
  }

  /**
   * @param {string} expression
   * @param {string} objectGroup
   * @param {boolean} includeCommandLineAPI
   * @param {boolean} silent
   * @param {boolean} returnByValue
   * @param {boolean} generatePreview
   * @param {boolean} userGesture
   * @param {function(?SDK.RemoteObject, !Protocol.Runtime.ExceptionDetails=)} callback
   */
  _evaluateGlobal(
      expression,
      objectGroup,
      includeCommandLineAPI,
      silent,
      returnByValue,
      generatePreview,
      userGesture,
      callback) {
    if (!expression) {
      // There is no expression, so the completion should happen against global properties.
      expression = 'this';
    }

    /**
     * @this {SDK.ExecutionContext}
     * @param {?Protocol.Error} error
     * @param {!Protocol.Runtime.RemoteObject} result
     * @param {!Protocol.Runtime.ExceptionDetails=} exceptionDetails
     */
    function evalCallback(error, result, exceptionDetails) {
      if (error) {
        console.error(error);
        callback(null);
        return;
      }
      callback(this.runtimeModel.createRemoteObject(result), exceptionDetails);
    }
    this.target().runtimeAgent().evaluate(
        expression, objectGroup, includeCommandLineAPI, silent, this.id, returnByValue, generatePreview, userGesture,
        false, evalCallback.bind(this));
  }

  /**
   * @return {string}
   */
  label() {
    return this._label;
  }

  /**
   * @param {string} label
   */
  setLabel(label) {
    this._label = label;
    this.runtimeModel.dispatchEventToListeners(SDK.RuntimeModel.Events.ExecutionContextChanged, this);
  }
};


/**
 * @unrestricted
 */
SDK.EventListener = class extends SDK.SDKObject {
  /**
   * @param {!SDK.Target} target
   * @param {!SDK.RemoteObject} eventTarget
   * @param {string} type
   * @param {boolean} useCapture
   * @param {boolean} passive
   * @param {boolean} once
   * @param {?SDK.RemoteObject} handler
   * @param {?SDK.RemoteObject} originalHandler
   * @param {!SDK.DebuggerModel.Location} location
   * @param {?SDK.RemoteObject} removeFunction
   * @param {string=} listenerType
   */
  constructor(
      target,
      eventTarget,
      type,
      useCapture,
      passive,
      once,
      handler,
      originalHandler,
      location,
      removeFunction,
      listenerType) {
    super(target);
    this._eventTarget = eventTarget;
    this._type = type;
    this._useCapture = useCapture;
    this._passive = passive;
    this._once = once;
    this._handler = handler;
    this._originalHandler = originalHandler || handler;
    this._location = location;
    var script = location.script();
    this._sourceURL = script ? script.contentURL() : '';
    this._removeFunction = removeFunction;
    this._listenerType = listenerType || 'normal';
  }

  /**
   * @return {string}
   */
  type() {
    return this._type;
  }

  /**
   * @return {boolean}
   */
  useCapture() {
    return this._useCapture;
  }

  /**
   * @return {boolean}
   */
  passive() {
    return this._passive;
  }

  /**
   * @return {boolean}
   */
  once() {
    return this._once;
  }

  /**
   * @return {?SDK.RemoteObject}
   */
  handler() {
    return this._handler;
  }

  /**
   * @return {!SDK.DebuggerModel.Location}
   */
  location() {
    return this._location;
  }

  /**
   * @return {string}
   */
  sourceURL() {
    return this._sourceURL;
  }

  /**
   * @return {?SDK.RemoteObject}
   */
  originalHandler() {
    return this._originalHandler;
  }

  /**
   * @return {?SDK.RemoteObject}
   */
  removeFunction() {
    return this._removeFunction;
  }

  /**
   * @return {!Promise<undefined>}
   */
  remove() {
    if (!this._removeFunction)
      return Promise.resolve();
    return this._removeFunction
        .callFunctionPromise(
            callCustomRemove,
            [
              SDK.RemoteObject.toCallArgument(this._type),
              SDK.RemoteObject.toCallArgument(this._originalHandler),
              SDK.RemoteObject.toCallArgument(this._useCapture),
              SDK.RemoteObject.toCallArgument(this._passive),
            ])
        .then(() => undefined);

    /**
     * @param {string} type
     * @param {function()} listener
     * @param {boolean} useCapture
     * @param {boolean} passive
     * @this {Function}
     * @suppressReceiverCheck
     */
    function callCustomRemove(type, listener, useCapture, passive) {
      this.call(null, type, listener, useCapture, passive);
    }
  }

  /**
   * @return {!Promise<undefined>}
   */
  togglePassive() {
    return new Promise(promiseConstructor.bind(this));

    /**
     * @param {function()} success
     * @this {SDK.EventListener}
     */
    function promiseConstructor(success) {
      this._eventTarget
          .callFunctionPromise(
              callTogglePassive,
              [
                SDK.RemoteObject.toCallArgument(this._type),
                SDK.RemoteObject.toCallArgument(this._originalHandler),
                SDK.RemoteObject.toCallArgument(this._useCapture),
                SDK.RemoteObject.toCallArgument(this._passive),
              ])
          .then(success);

      /**
       * @param {string} type
       * @param {function()} listener
       * @param {boolean} useCapture
       * @param {boolean} passive
       * @this {Object}
       * @suppressReceiverCheck
       */
      function callTogglePassive(type, listener, useCapture, passive) {
        this.removeEventListener(type, listener, {capture: useCapture});
        this.addEventListener(type, listener, {capture: useCapture, passive: !passive});
      }
    }
  }

  /**
   * @return {string}
   */
  listenerType() {
    return this._listenerType;
  }

  /**
   * @param {string} listenerType
   */
  setListenerType(listenerType) {
    this._listenerType = listenerType;
  }

  /**
   * @return {boolean}
   */
  isScrollBlockingType() {
    return this._type === 'touchstart' || this._type === 'touchmove' || this._type === 'mousewheel' ||
        this._type === 'wheel';
  }

  /**
   * @return {boolean}
   */
  isNormalListenerType() {
    return this._listenerType === 'normal';
  }
};
