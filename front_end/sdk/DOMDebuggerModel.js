// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

SDK.DOMDebuggerModel = class extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super(target);
    this._agent = target.domdebuggerAgent();
    this._runtimeModel = /** @type {!SDK.RuntimeModel} */ (target.model(SDK.RuntimeModel));
    this._domModel = /** @type {!SDK.DOMModel} */ (target.model(SDK.DOMModel));
  }

  /**
   * @return {!SDK.RuntimeModel}
   */
  runtimeModel() {
    return this._runtimeModel;
  }

  /**
   * @param {!SDK.RemoteObject} remoteObject
   * @return {!Promise<!Array<!SDK.EventListener>>}
   */
  async eventListeners(remoteObject) {
    console.assert(remoteObject.runtimeModel() === this._runtimeModel);
    if (!remoteObject.objectId)
      return [];

    var payloads = await this._agent.getEventListeners(
        /** @type {string} */ (remoteObject.objectId), undefined, undefined,
        (error, payloads) => error ? [] : payloads);
    var eventListeners = [];
    for (var payload of payloads) {
      var location = this._runtimeModel.debuggerModel().createRawLocationByScriptId(
          payload.scriptId, payload.lineNumber, payload.columnNumber);
      eventListeners.push(new SDK.EventListener(
          this, remoteObject, payload.type, payload.useCapture, payload.passive, payload.once,
          payload.handler ? this._runtimeModel.createRemoteObject(payload.handler) : null,
          payload.originalHandler ? this._runtimeModel.createRemoteObject(payload.originalHandler) : null,
          /** @type {!SDK.DebuggerModel.Location} */ (location), null));
    }
    return eventListeners;
  }
};

SDK.SDKModel.register(SDK.DOMDebuggerModel, SDK.Target.Capability.DOM, false);

SDK.EventListener = class {
  /**
   * @param {!SDK.DOMDebuggerModel} domDebuggerModel
   * @param {!SDK.RemoteObject} eventTarget
   * @param {string} type
   * @param {boolean} useCapture
   * @param {boolean} passive
   * @param {boolean} once
   * @param {?SDK.RemoteObject} handler
   * @param {?SDK.RemoteObject} originalHandler
   * @param {!SDK.DebuggerModel.Location} location
   * @param {?SDK.RemoteObject} customRemoveFunction
   * @param {!SDK.EventListener.Origin=} origin
   */
  constructor(
      domDebuggerModel, eventTarget, type, useCapture, passive, once, handler, originalHandler, location,
      customRemoveFunction, origin) {
    this._domDebuggerModel = domDebuggerModel;
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
    this._customRemoveFunction = customRemoveFunction;
    this._origin = origin || SDK.EventListener.Origin.Raw;
  }

  /**
   * @return {!SDK.DOMDebuggerModel}
   */
  domDebuggerModel() {
    return this._domDebuggerModel;
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
   * @return {boolean}
   */
  canRemove() {
    return !!this._customRemoveFunction || this._origin !== SDK.EventListener.Origin.FrameworkUser;
  }

  /**
   * @return {!Promise<undefined>}
   */
  remove() {
    if (!this.canRemove())
      return Promise.resolve();

    if (this._origin !== SDK.EventListener.Origin.FrameworkUser) {
      /**
       * @param {string} type
       * @param {function()} listener
       * @param {boolean} useCapture
       * @this {Object}
       * @suppressReceiverCheck
       */
      function removeListener(type, listener, useCapture) {
        this.removeEventListener(type, listener, useCapture);
        if (this['on' + type])
          this['on' + type] = undefined;
      }

      return /** @type {!Promise<undefined>} */ (this._eventTarget.callFunctionPromise(removeListener, [
        SDK.RemoteObject.toCallArgument(this._type), SDK.RemoteObject.toCallArgument(this._originalHandler),
        SDK.RemoteObject.toCallArgument(this._useCapture)
      ]));
    }

    return this._customRemoveFunction
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
   * @return {boolean}
   */
  canTogglePassive() {
    return this._origin !== SDK.EventListener.Origin.FrameworkUser;
  }

  /**
   * @return {!Promise<undefined>}
   */
  togglePassive() {
    return /** @type {!Promise<undefined>} */ (this._eventTarget.callFunctionPromise(callTogglePassive, [
      SDK.RemoteObject.toCallArgument(this._type),
      SDK.RemoteObject.toCallArgument(this._originalHandler),
      SDK.RemoteObject.toCallArgument(this._useCapture),
      SDK.RemoteObject.toCallArgument(this._passive),
    ]));

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

  /**
   * @return {!SDK.EventListener.Origin}
   */
  origin() {
    return this._origin;
  }

  markAsFramework() {
    this._origin = SDK.EventListener.Origin.Framework;
  }

  /**
   * @return {boolean}
   */
  isScrollBlockingType() {
    return this._type === 'touchstart' || this._type === 'touchmove' || this._type === 'mousewheel' ||
        this._type === 'wheel';
  }
};

/** @enum {string} */
SDK.EventListener.Origin = {
  Raw: 'Raw',
  Framework: 'Framework',
  FrameworkUser: 'FrameworkUser'
};

/**
 * @implements {SDK.SDKModelObserver<!SDK.DOMDebuggerModel>}
 */
SDK.XHRBreakpointManager = class {
  constructor() {
    this._setting = Common.settings.createLocalSetting('xhrBreakpoints', []);
    /** @type {!Map<string, boolean>} */
    this._breakpoints = new Map();
    for (var breakpoint of this._setting.get())
      this._breakpoints.set(breakpoint.url, breakpoint.enabled);
    SDK.targetManager.observeModels(SDK.DOMDebuggerModel, this);
  }

  /**
   * @return {!Map<string, boolean>}
   */
  breakpoints() {
    return this._breakpoints;
  }

  _saveBreakpoints() {
    var breakpoints = [];
    for (var url of this._breakpoints.keys())
      breakpoints.push({url: url, enabled: this._breakpoints.get(url)});
    this._setting.set(breakpoints);
  }

  /**
   * @param {string} url
   * @param {boolean} enabled
   */
  addBreakpoint(url, enabled) {
    this._breakpoints.set(url, enabled);
    if (enabled) {
      for (var model of SDK.targetManager.models(SDK.DOMDebuggerModel))
        model._agent.setXHRBreakpoint(url);
    }
    this._saveBreakpoints();
  }

  /**
   * @param {string} url
   */
  removeBreakpoint(url) {
    var enabled = this._breakpoints.get(url);
    this._breakpoints.delete(url);
    if (enabled) {
      for (var model of SDK.targetManager.models(SDK.DOMDebuggerModel))
        model._agent.removeXHRBreakpoint(url);
    }
    this._saveBreakpoints();
  }

  /**
   * @param {string} url
   * @param {boolean} enabled
   */
  toggleBreakpoint(url, enabled) {
    this._breakpoints.set(url, enabled);
    for (var model of SDK.targetManager.models(SDK.DOMDebuggerModel)) {
      if (enabled)
        model._agent.setXHRBreakpoint(url);
      else
        model._agent.removeXHRBreakpoint(url);
    }
    this._saveBreakpoints();
  }

  /**
   * @override
   * @param {!SDK.DOMDebuggerModel} domDebuggerModel
   */
  modelAdded(domDebuggerModel) {
    for (var url of this._breakpoints.keys()) {
      if (this._breakpoints.get(url))
        domDebuggerModel._agent.setXHRBreakpoint(url);
    }
  }

  /**
   * @override
   * @param {!SDK.DOMDebuggerModel} domDebuggerModel
   */
  modelRemoved(domDebuggerModel) {
  }
};

/** @type {!SDK.XHRBreakpointManager} */
SDK.xhrBreakpointManager;
