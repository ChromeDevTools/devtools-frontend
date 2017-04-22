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

SDK.DOMDebuggerModel.EventListenerBreakpoint = class {
  /**
   * @param {string} instrumentationName
   * @param {string} eventName
   * @param {!Array<string>} eventTargetNames
   * @param {string} category
   * @param {string} title
   */
  constructor(instrumentationName, eventName, eventTargetNames, category, title) {
    this._instrumentationName = instrumentationName;
    this._eventName = eventName;
    this._eventTargetNames = eventTargetNames;
    this._category = category;
    this._title = title;
    this._enabled = false;
  }

  /**
   * @return {string}
   */
  category() {
    return this._category;
  }

  /**
   * @return {boolean}
   */
  enabled() {
    return this._enabled;
  }

  /**
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    if (this._enabled === enabled)
      return;
    this._enabled = enabled;
    for (var model of SDK.targetManager.models(SDK.DOMDebuggerModel))
      this._updateOnModel(model);
  }

  /**
   * @param {!SDK.DOMDebuggerModel} model
   */
  _updateOnModel(model) {
    if (this._instrumentationName) {
      if (this._enabled)
        model._agent.setInstrumentationBreakpoint(this._instrumentationName);
      else
        model._agent.removeInstrumentationBreakpoint(this._instrumentationName);
    } else {
      for (var eventTargetName of this._eventTargetNames) {
        if (this._enabled)
          model._agent.setEventListenerBreakpoint(this._eventName, eventTargetName);
        else
          model._agent.removeEventListenerBreakpoint(this._eventName, eventTargetName);
      }
    }
  }

  /**
   * @return {string}
   */
  title() {
    return this._title;
  }
};

SDK.DOMDebuggerModel.EventListenerBreakpoint._listener = 'listener:';
SDK.DOMDebuggerModel.EventListenerBreakpoint._instrumentation = 'instrumentation:';

/**
 * @implements {SDK.SDKModelObserver<!SDK.DOMDebuggerModel>}
 */
SDK.DOMDebuggerManager = class {
  constructor() {
    this._xhrBreakpointsSetting = Common.settings.createLocalSetting('xhrBreakpoints', []);
    /** @type {!Map<string, boolean>} */
    this._xhrBreakpoints = new Map();
    for (var breakpoint of this._xhrBreakpointsSetting.get())
      this._xhrBreakpoints.set(breakpoint.url, breakpoint.enabled);

    /** @type {!Array<!SDK.DOMDebuggerModel.EventListenerBreakpoint>} */
    this._eventListenerBreakpoints = [];
    this._createInstrumentationBreakpoints(
        Common.UIString('Animation'),
        ['requestAnimationFrame', 'cancelAnimationFrame', 'requestAnimationFrame.callback']);
    this._createInstrumentationBreakpoints(
        Common.UIString('Canvas'), ['canvasContextCreated', 'webglErrorFired', 'webglWarningFired']);
    this._createInstrumentationBreakpoints(
        Common.UIString('Geolocation'), ['Geolocation.getCurrentPosition', 'Geolocation.watchPosition']);
    this._createInstrumentationBreakpoints(Common.UIString('Notification'), ['Notification.requestPermission']);
    this._createInstrumentationBreakpoints(Common.UIString('Parse'), ['Element.setInnerHTML', 'Document.write']);
    this._createInstrumentationBreakpoints(Common.UIString('Script'), ['scriptFirstStatement', 'scriptBlockedByCSP']);
    this._createInstrumentationBreakpoints(
        Common.UIString('Timer'),
        ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setTimeout.callback', 'setInterval.callback']);
    this._createInstrumentationBreakpoints(Common.UIString('Window'), ['DOMWindow.close']);

    this._createEventListenerBreakpoints(
        Common.UIString('Media'),
        [
          'play',      'pause',          'playing',    'canplay',    'canplaythrough', 'seeking',
          'seeked',    'timeupdate',     'ended',      'ratechange', 'durationchange', 'volumechange',
          'loadstart', 'progress',       'suspend',    'abort',      'error',          'emptied',
          'stalled',   'loadedmetadata', 'loadeddata', 'waiting'
        ],
        ['audio', 'video']);
    this._createEventListenerBreakpoints(
        Common.UIString('Clipboard'), ['copy', 'cut', 'paste', 'beforecopy', 'beforecut', 'beforepaste'], ['*']);
    this._createEventListenerBreakpoints(
        Common.UIString('Control'),
        ['resize', 'scroll', 'zoom', 'focus', 'blur', 'select', 'change', 'submit', 'reset'], ['*']);
    this._createEventListenerBreakpoints(Common.UIString('Device'), ['deviceorientation', 'devicemotion'], ['*']);
    this._createEventListenerBreakpoints(
        Common.UIString('DOM Mutation'),
        [
          'DOMActivate', 'DOMFocusIn', 'DOMFocusOut', 'DOMAttrModified', 'DOMCharacterDataModified', 'DOMNodeInserted',
          'DOMNodeInsertedIntoDocument', 'DOMNodeRemoved', 'DOMNodeRemovedFromDocument', 'DOMSubtreeModified',
          'DOMContentLoaded'
        ],
        ['*']);
    this._createEventListenerBreakpoints(
        Common.UIString('Drag / drop'), ['dragenter', 'dragover', 'dragleave', 'drop'], ['*']);
    this._createEventListenerBreakpoints(Common.UIString('Keyboard'), ['keydown', 'keyup', 'keypress', 'input'], ['*']);
    this._createEventListenerBreakpoints(
        Common.UIString('Load'), ['load', 'beforeunload', 'unload', 'abort', 'error', 'hashchange', 'popstate'], ['*']);
    this._createEventListenerBreakpoints(
        Common.UIString('Mouse'),
        [
          'auxclick', 'click', 'dblclick', 'mousedown', 'mouseup', 'mouseover', 'mousemove', 'mouseout', 'mouseenter',
          'mouseleave', 'mousewheel', 'wheel', 'contextmenu'
        ],
        ['*']);
    this._createEventListenerBreakpoints(
        Common.UIString('Pointer'),
        [
          'pointerover', 'pointerout', 'pointerenter', 'pointerleave', 'pointerdown', 'pointerup', 'pointermove',
          'pointercancel', 'gotpointercapture', 'lostpointercapture'
        ],
        ['*']);
    this._createEventListenerBreakpoints(
        Common.UIString('Touch'), ['touchstart', 'touchmove', 'touchend', 'touchcancel'], ['*']);
    this._createEventListenerBreakpoints(
        Common.UIString('XHR'),
        ['readystatechange', 'load', 'loadstart', 'loadend', 'abort', 'error', 'progress', 'timeout'],
        ['xmlhttprequest', 'xmlhttprequestupload']);

    this._resolveEventListenerBreakpoint('instrumentation:setTimeout.callback')._title =
        Common.UIString('setTimeout fired');
    this._resolveEventListenerBreakpoint('instrumentation:setInterval.callback')._title =
        Common.UIString('setInterval fired');
    this._resolveEventListenerBreakpoint('instrumentation:scriptFirstStatement')._title =
        Common.UIString('Script First Statement');
    this._resolveEventListenerBreakpoint('instrumentation:scriptBlockedByCSP')._title =
        Common.UIString('Script Blocked by Content Security Policy');
    this._resolveEventListenerBreakpoint('instrumentation:requestAnimationFrame')._title =
        Common.UIString('Request Animation Frame');
    this._resolveEventListenerBreakpoint('instrumentation:cancelAnimationFrame')._title =
        Common.UIString('Cancel Animation Frame');
    this._resolveEventListenerBreakpoint('instrumentation:requestAnimationFrame.callback')._title =
        Common.UIString('Animation Frame Fired');
    this._resolveEventListenerBreakpoint('instrumentation:webglErrorFired')._title =
        Common.UIString('WebGL Error Fired');
    this._resolveEventListenerBreakpoint('instrumentation:webglWarningFired')._title =
        Common.UIString('WebGL Warning Fired');
    this._resolveEventListenerBreakpoint('instrumentation:Element.setInnerHTML')._title =
        Common.UIString('Set innerHTML');
    this._resolveEventListenerBreakpoint('instrumentation:canvasContextCreated')._title =
        Common.UIString('Create canvas context');
    this._resolveEventListenerBreakpoint('instrumentation:Geolocation.getCurrentPosition')._title =
        'getCurrentPosition';
    this._resolveEventListenerBreakpoint('instrumentation:Geolocation.watchPosition')._title = 'watchPosition';
    this._resolveEventListenerBreakpoint('instrumentation:Notification.requestPermission')._title = 'requestPermission';
    this._resolveEventListenerBreakpoint('instrumentation:DOMWindow.close')._title = 'window.close';
    this._resolveEventListenerBreakpoint('instrumentation:Document.write')._title = 'document.write';

    SDK.targetManager.observeModels(SDK.DOMDebuggerModel, this);
  }

  /**
   * @param {string} category
   * @param {!Array<string>} instrumentationNames
   */
  _createInstrumentationBreakpoints(category, instrumentationNames) {
    for (var instrumentationName of instrumentationNames) {
      this._eventListenerBreakpoints.push(
          new SDK.DOMDebuggerModel.EventListenerBreakpoint(instrumentationName, '', [], category, instrumentationName));
    }
  }

  /**
   * @param {string} category
   * @param {!Array<string>} eventNames
   * @param {!Array<string>} eventTargetNames
   */
  _createEventListenerBreakpoints(category, eventNames, eventTargetNames) {
    for (var eventName of eventNames) {
      this._eventListenerBreakpoints.push(
          new SDK.DOMDebuggerModel.EventListenerBreakpoint('', eventName, eventTargetNames, category, eventName));
    }
  }

  /**
   * @param {string} eventName
   * @param {string=} eventTargetName
   * @return {?SDK.DOMDebuggerModel.EventListenerBreakpoint}
   */
  _resolveEventListenerBreakpoint(eventName, eventTargetName) {
    var instrumentationPrefix = 'instrumentation:';
    var listenerPrefix = 'listener:';
    var instrumentationName = '';
    if (eventName.startsWith(instrumentationPrefix)) {
      instrumentationName = eventName.substring(instrumentationPrefix.length);
      eventName = '';
    } else if (eventName.startsWith(listenerPrefix)) {
      eventName = eventName.substring(listenerPrefix.length);
    } else {
      return null;
    }
    eventTargetName = (eventTargetName || '*').toLowerCase();
    var result = null;
    for (var breakpoint of this._eventListenerBreakpoints) {
      if (instrumentationName && breakpoint._instrumentationName === instrumentationName)
        result = breakpoint;
      if (eventName && breakpoint._eventName === eventName &&
          breakpoint._eventTargetNames.indexOf(eventTargetName) !== -1)
        result = breakpoint;
      if (!result && eventName && breakpoint._eventName === eventName &&
          breakpoint._eventTargetNames.indexOf('*') !== -1)
        result = breakpoint;
    }
    return result;
  }

  /**
   * @return {!Array<!SDK.DOMDebuggerModel.EventListenerBreakpoint>}
   */
  eventListenerBreakpoints() {
    return this._eventListenerBreakpoints.slice();
  }

  /**
   * @param {!Object} auxData
   * @return {string}
   */
  resolveEventListenerBreakpointTitle(auxData) {
    var id = auxData['eventName'];
    if (id === 'instrumentation:webglErrorFired' && auxData['webglErrorName']) {
      var errorName = auxData['webglErrorName'];
      // If there is a hex code of the error, display only this.
      errorName = errorName.replace(/^.*(0x[0-9a-f]+).*$/i, '$1');
      return Common.UIString('WebGL Error Fired (%s)', errorName);
    }
    if (id === 'instrumentation:scriptBlockedByCSP' && auxData['directiveText'])
      return Common.UIString('Script blocked due to Content Security Policy directive: %s', auxData['directiveText']);
    var breakpoint = this._resolveEventListenerBreakpoint(id, auxData['targetName']);
    if (!breakpoint)
      return '';
    if (auxData['targetName'])
      return auxData['targetName'] + '.' + breakpoint._title;
    return breakpoint._title;
  }

  /**
   * @param {!Object} auxData
   * @return {?SDK.DOMDebuggerModel.EventListenerBreakpoint}
   */
  resolveEventListenerBreakpoint(auxData) {
    return this._resolveEventListenerBreakpoint(auxData['eventName'], auxData['targetName']);
  }

  /**
   * @return {!Map<string, boolean>}
   */
  xhrBreakpoints() {
    return this._xhrBreakpoints;
  }

  _saveXHRBreakpoints() {
    var breakpoints = [];
    for (var url of this._xhrBreakpoints.keys())
      breakpoints.push({url: url, enabled: this._xhrBreakpoints.get(url)});
    this._xhrBreakpointsSetting.set(breakpoints);
  }

  /**
   * @param {string} url
   * @param {boolean} enabled
   */
  addXHRBreakpoint(url, enabled) {
    this._xhrBreakpoints.set(url, enabled);
    if (enabled) {
      for (var model of SDK.targetManager.models(SDK.DOMDebuggerModel))
        model._agent.setXHRBreakpoint(url);
    }
    this._saveXHRBreakpoints();
  }

  /**
   * @param {string} url
   */
  removeXHRBreakpoint(url) {
    var enabled = this._xhrBreakpoints.get(url);
    this._xhrBreakpoints.delete(url);
    if (enabled) {
      for (var model of SDK.targetManager.models(SDK.DOMDebuggerModel))
        model._agent.removeXHRBreakpoint(url);
    }
    this._saveXHRBreakpoints();
  }

  /**
   * @param {string} url
   * @param {boolean} enabled
   */
  toggleXHRBreakpoint(url, enabled) {
    this._xhrBreakpoints.set(url, enabled);
    for (var model of SDK.targetManager.models(SDK.DOMDebuggerModel)) {
      if (enabled)
        model._agent.setXHRBreakpoint(url);
      else
        model._agent.removeXHRBreakpoint(url);
    }
    this._saveXHRBreakpoints();
  }

  /**
   * @override
   * @param {!SDK.DOMDebuggerModel} domDebuggerModel
   */
  modelAdded(domDebuggerModel) {
    for (var url of this._xhrBreakpoints.keys()) {
      if (this._xhrBreakpoints.get(url))
        domDebuggerModel._agent.setXHRBreakpoint(url);
    }
    for (var breakpoint of this._eventListenerBreakpoints) {
      if (breakpoint._enabled)
        breakpoint._updateOnModel(domDebuggerModel);
    }
  }

  /**
   * @override
   * @param {!SDK.DOMDebuggerModel} domDebuggerModel
   */
  modelRemoved(domDebuggerModel) {
  }
};

/** @type {!SDK.DOMDebuggerManager} */
SDK.domDebuggerManager;
