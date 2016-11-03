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
WebInspector.RuntimeModel = class extends WebInspector.SDKModel {
  /**
   * @param {!WebInspector.Target} target
   */
  constructor(target) {
    super(WebInspector.RuntimeModel, target);

    this._agent = target.runtimeAgent();
    this.target().registerRuntimeDispatcher(new WebInspector.RuntimeDispatcher(this));
    if (target.hasJSCapability())
      this._agent.enable();
    /** @type {!Map<number, !WebInspector.ExecutionContext>} */
    this._executionContextById = new Map();
    this._executionContextComparator = WebInspector.ExecutionContext.comparator;

    if (WebInspector.moduleSetting('customFormatters').get())
      this._agent.setCustomObjectFormatterEnabled(true);

    WebInspector.moduleSetting('customFormatters').addChangeListener(this._customFormattersStateChanged.bind(this));
  }

  /**
   * @return {!Array.<!WebInspector.ExecutionContext>}
   */
  executionContexts() {
    return this._executionContextById.valuesArray().sort(this.executionContextComparator());
  }

  /**
   * @param {function(!WebInspector.ExecutionContext,!WebInspector.ExecutionContext)} comparator
   */
  setExecutionContextComparator(comparator) {
    this._executionContextComparator = comparator;
  }

  /**
   * @return {function(!WebInspector.ExecutionContext,!WebInspector.ExecutionContext)} comparator
   */
  executionContextComparator() {
    return this._executionContextComparator;
  }

  /**
   * @return {?WebInspector.ExecutionContext}
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
   * @return {?WebInspector.ExecutionContext}
   */
  executionContext(id) {
    return this._executionContextById.get(id) || null;
  }

  /**
   * @param {!Protocol.Runtime.ExecutionContextDescription} context
   */
  _executionContextCreated(context) {
    // The private script context should be hidden behind an experiment.
    if (context.name === WebInspector.RuntimeModel._privateScript && !context.origin &&
        !Runtime.experiments.isEnabled('privateScriptInspection')) {
      return;
    }
    var data = context.auxData || {isDefault: true};
    var executionContext = new WebInspector.ExecutionContext(
        this.target(), context.id, context.name, context.origin, data['isDefault'], data['frameId']);
    this._executionContextById.set(executionContext.id, executionContext);
    this.dispatchEventToListeners(WebInspector.RuntimeModel.Events.ExecutionContextCreated, executionContext);
  }

  /**
   * @param {number} executionContextId
   */
  _executionContextDestroyed(executionContextId) {
    var executionContext = this._executionContextById.get(executionContextId);
    if (!executionContext)
      return;
    this._executionContextById.delete(executionContextId);
    this.dispatchEventToListeners(WebInspector.RuntimeModel.Events.ExecutionContextDestroyed, executionContext);
  }

  fireExecutionContextOrderChanged() {
    this.dispatchEventToListeners(WebInspector.RuntimeModel.Events.ExecutionContextOrderChanged, this);
  }

  _executionContextsCleared() {
    var debuggerModel = WebInspector.DebuggerModel.fromTarget(this.target());
    if (debuggerModel)
      debuggerModel.globalObjectCleared();
    var contexts = this.executionContexts();
    this._executionContextById.clear();
    for (var i = 0; i < contexts.length; ++i)
      this.dispatchEventToListeners(WebInspector.RuntimeModel.Events.ExecutionContextDestroyed, contexts[i]);
  }

  /**
   * @param {!Protocol.Runtime.RemoteObject} payload
   * @return {!WebInspector.RemoteObject}
   */
  createRemoteObject(payload) {
    console.assert(typeof payload === 'object', 'Remote object payload should only be an object');
    return new WebInspector.RemoteObjectImpl(
        this.target(), payload.objectId, payload.type, payload.subtype, payload.value, payload.unserializableValue,
        payload.description, payload.preview, payload.customPreview);
  }

  /**
   * @param {!Protocol.Runtime.RemoteObject} payload
   * @param {!WebInspector.ScopeRef} scopeRef
   * @return {!WebInspector.RemoteObject}
   */
  createScopeRemoteObject(payload, scopeRef) {
    return new WebInspector.ScopeRemoteObject(
        this.target(), payload.objectId, scopeRef, payload.type, payload.subtype, payload.value,
        payload.unserializableValue, payload.description, payload.preview);
  }

  /**
   * @param {number|string|boolean|undefined} value
   * @return {!WebInspector.RemoteObject}
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
    return new WebInspector.RemoteObjectImpl(this.target(), undefined, type, undefined, value, unserializableValue);
  }

  /**
   * @param {string} name
   * @param {number|string|boolean} value
   * @return {!WebInspector.RemoteObjectProperty}
   */
  createRemotePropertyFromPrimitiveValue(name, value) {
    return new WebInspector.RemoteObjectProperty(name, this.createRemoteObjectFromPrimitiveValue(value));
  }

  discardConsoleEntries() {
    this._agent.discardConsoleEntries();
  }

  /**
   * @param {!WebInspector.Event} event
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
      WebInspector.Revealer.revealPromise(object).then(object.release.bind(object));
      return;
    }

    if (object.type === 'function') {
      WebInspector.RemoteFunction.objectAsFunction(object).targetFunctionDetails().then(didGetDetails);
      return;
    }

    /**
     * @param {?WebInspector.DebuggerModel.FunctionDetails} response
     */
    function didGetDetails(response) {
      object.release();
      if (!response || !response.location)
        return;
      WebInspector.Revealer.reveal(response.location);
    }
    object.release();
  }

  /**
   * @param {!WebInspector.RemoteObject} object
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
WebInspector.RuntimeModel.Events = {
  ExecutionContextCreated: Symbol('ExecutionContextCreated'),
  ExecutionContextDestroyed: Symbol('ExecutionContextDestroyed'),
  ExecutionContextChanged: Symbol('ExecutionContextChanged'),
  ExecutionContextOrderChanged: Symbol('ExecutionContextOrderChanged')
};

WebInspector.RuntimeModel._privateScript = 'private script';

/**
 * @implements {Protocol.RuntimeDispatcher}
 * @unrestricted
 */
WebInspector.RuntimeDispatcher = class {
  /**
   * @param {!WebInspector.RuntimeModel} runtimeModel
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
    var consoleMessage = WebInspector.ConsoleMessage.fromException(
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
    var consoleMessage = new WebInspector.ConsoleMessage(
        this._runtimeModel.target(), WebInspector.ConsoleMessage.MessageSource.JS,
        WebInspector.ConsoleMessage.MessageLevel.RevokedError, reason, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined, undefined);
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
    var level = WebInspector.ConsoleMessage.MessageLevel.Log;
    if (type === WebInspector.ConsoleMessage.MessageType.Debug)
      level = WebInspector.ConsoleMessage.MessageLevel.Debug;
    if (type === WebInspector.ConsoleMessage.MessageType.Error ||
        type === WebInspector.ConsoleMessage.MessageType.Assert)
      level = WebInspector.ConsoleMessage.MessageLevel.Error;
    if (type === WebInspector.ConsoleMessage.MessageType.Warning)
      level = WebInspector.ConsoleMessage.MessageLevel.Warning;
    if (type === WebInspector.ConsoleMessage.MessageType.Info)
      level = WebInspector.ConsoleMessage.MessageLevel.Info;
    var message = '';
    if (args.length && typeof args[0].value === 'string')
      message = args[0].value;
    else if (args.length && args[0].description)
      message = args[0].description;
    var callFrame = stackTrace && stackTrace.callFrames.length ? stackTrace.callFrames[0] : null;
    var consoleMessage = new WebInspector.ConsoleMessage(
        this._runtimeModel.target(), WebInspector.ConsoleMessage.MessageSource.ConsoleAPI, level,
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
WebInspector.ExecutionContext = class extends WebInspector.SDKObject {
  /**
   * @param {!WebInspector.Target} target
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
    this.debuggerModel = WebInspector.DebuggerModel.fromTarget(target);
    this.frameId = frameId;

    this._label = name;
    var parsedUrl = origin.asParsedURL();
    if (!this._label && parsedUrl)
      this._label = parsedUrl.lastPathComponentWithFragment();
  }

  /**
   * @param {!WebInspector.ExecutionContext} a
   * @param {!WebInspector.ExecutionContext} b
   * @return {number}
   */
  static comparator(a, b) {
    /**
     * @param {!WebInspector.Target} target
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
   * @param {function(?WebInspector.RemoteObject, !Protocol.Runtime.ExceptionDetails=)} callback
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
   * @param {function(?WebInspector.RemoteObject, !Protocol.Runtime.ExceptionDetails=)} callback
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
   * @param {function(?WebInspector.RemoteObject, !Protocol.Runtime.ExceptionDetails=)} callback
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
     * @this {WebInspector.ExecutionContext}
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
    this.runtimeModel.dispatchEventToListeners(WebInspector.RuntimeModel.Events.ExecutionContextChanged, this);
  }
};


/**
 * @unrestricted
 */
WebInspector.EventListener = class extends WebInspector.SDKObject {
  /**
   * @param {!WebInspector.Target} target
   * @param {!WebInspector.RemoteObject} eventTarget
   * @param {string} type
   * @param {boolean} useCapture
   * @param {boolean} passive
   * @param {?WebInspector.RemoteObject} handler
   * @param {?WebInspector.RemoteObject} originalHandler
   * @param {!WebInspector.DebuggerModel.Location} location
   * @param {?WebInspector.RemoteObject} removeFunction
   * @param {string=} listenerType
   */
  constructor(
      target,
      eventTarget,
      type,
      useCapture,
      passive,
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
   * @return {?WebInspector.RemoteObject}
   */
  handler() {
    return this._handler;
  }

  /**
   * @return {!WebInspector.DebuggerModel.Location}
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
   * @return {?WebInspector.RemoteObject}
   */
  originalHandler() {
    return this._originalHandler;
  }

  /**
   * @return {?WebInspector.RemoteObject}
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
              WebInspector.RemoteObject.toCallArgument(this._type),
              WebInspector.RemoteObject.toCallArgument(this._originalHandler),
              WebInspector.RemoteObject.toCallArgument(this._useCapture),
              WebInspector.RemoteObject.toCallArgument(this._passive),
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
     * @this {WebInspector.EventListener}
     */
    function promiseConstructor(success) {
      this._eventTarget
          .callFunctionPromise(
              callTogglePassive,
              [
                WebInspector.RemoteObject.toCallArgument(this._type),
                WebInspector.RemoteObject.toCallArgument(this._originalHandler),
                WebInspector.RemoteObject.toCallArgument(this._useCapture),
                WebInspector.RemoteObject.toCallArgument(this._passive),
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
