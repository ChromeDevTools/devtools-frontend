// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';

import {Location} from './DebuggerModel.js';                                // eslint-disable-line no-unused-vars
import {DOMModel, DOMNode, Events as DOMModelEvents} from './DOMModel.js';  // eslint-disable-line no-unused-vars
import {RemoteObject} from './RemoteObject.js';
import {RuntimeModel} from './RuntimeModel.js';
import {Capability, SDKModel, SDKModelObserver, Target, TargetManager} from './SDKModel.js';  // eslint-disable-line no-unused-vars

export class DOMDebuggerModel extends SDKModel {
  /**
   * @param {!Target} target
   */
  constructor(target) {
    super(target);
    this._agent = target.domdebuggerAgent();
    this._runtimeModel = /** @type {!RuntimeModel} */ (target.model(RuntimeModel));
    this._domModel = /** @type {!DOMModel} */ (target.model(DOMModel));
    this._domModel.addEventListener(DOMModelEvents.DocumentUpdated, this._documentUpdated, this);
    this._domModel.addEventListener(DOMModelEvents.NodeRemoved, this._nodeRemoved, this);

    /** @type {!Array<!DOMBreakpoint>} */
    this._domBreakpoints = [];
    this._domBreakpointsSetting = Common.Settings.Settings.instance().createLocalSetting('domBreakpoints', []);
    if (this._domModel.existingDocument()) {
      this._documentUpdated();
    }
  }

  /**
   * @return {!RuntimeModel}
   */
  runtimeModel() {
    return this._runtimeModel;
  }

  /**
   * @param {!RemoteObject} remoteObject
   * @return {!Promise<!Array<!EventListener>>}
   */
  async eventListeners(remoteObject) {
    console.assert(remoteObject.runtimeModel() === this._runtimeModel);
    if (!remoteObject.objectId) {
      return [];
    }

    const payloads = await this._agent.getEventListeners(/** @type {string} */ (remoteObject.objectId));
    const eventListeners = [];
    for (const payload of payloads || []) {
      const location = this._runtimeModel.debuggerModel().createRawLocationByScriptId(
          payload.scriptId, payload.lineNumber, payload.columnNumber);
      if (!location) {
        continue;
      }
      eventListeners.push(new EventListener(
          this, remoteObject, payload.type, payload.useCapture, payload.passive, payload.once,
          payload.handler ? this._runtimeModel.createRemoteObject(payload.handler) : null,
          payload.originalHandler ? this._runtimeModel.createRemoteObject(payload.originalHandler) : null, location,
          null));
    }
    return eventListeners;
  }

  retrieveDOMBreakpoints() {
    this._domModel.requestDocument();
  }

  /**
   * @return {!Array<!DOMBreakpoint>}
   */
  domBreakpoints() {
    return this._domBreakpoints.slice();
  }

  /**
   * @param {!DOMNode} node
   * @param {!Protocol.DOMDebugger.DOMBreakpointType} type
   * @return {boolean}
   */
  hasDOMBreakpoint(node, type) {
    return this._domBreakpoints.some(breakpoint => (breakpoint.node === node && breakpoint.type === type));
  }

  /**
   * @param {!DOMNode} node
   * @param {!Protocol.DOMDebugger.DOMBreakpointType} type
   * @return {!DOMBreakpoint}
   */
  setDOMBreakpoint(node, type) {
    for (const breakpoint of this._domBreakpoints) {
      if (breakpoint.node === node && breakpoint.type === type) {
        this.toggleDOMBreakpoint(breakpoint, true);
        return breakpoint;
      }
    }
    const breakpoint = new DOMBreakpoint(this, node, type, true);
    this._domBreakpoints.push(breakpoint);
    this._saveDOMBreakpoints();
    this._enableDOMBreakpoint(breakpoint);
    this.dispatchEventToListeners(Events.DOMBreakpointAdded, breakpoint);
    return breakpoint;
  }

  /**
   * @param {!DOMNode} node
   * @param {!Protocol.DOMDebugger.DOMBreakpointType} type
   */
  removeDOMBreakpoint(node, type) {
    this._removeDOMBreakpoints(breakpoint => breakpoint.node === node && breakpoint.type === type);
  }

  removeAllDOMBreakpoints() {
    this._removeDOMBreakpoints(breakpoint => true);
  }

  /**
   * @param {!DOMBreakpoint} breakpoint
   * @param {boolean} enabled
   */
  toggleDOMBreakpoint(breakpoint, enabled) {
    if (enabled === breakpoint.enabled) {
      return;
    }
    breakpoint.enabled = enabled;
    if (enabled) {
      this._enableDOMBreakpoint(breakpoint);
    } else {
      this._disableDOMBreakpoint(breakpoint);
    }
    this.dispatchEventToListeners(Events.DOMBreakpointToggled, breakpoint);
  }

  /**
   * @param {!DOMBreakpoint} breakpoint
   */
  _enableDOMBreakpoint(breakpoint) {
    this._agent.setDOMBreakpoint(breakpoint.node.id, breakpoint.type);
    breakpoint.node.setMarker(Marker, true);
  }

  /**
   * @param {!DOMBreakpoint} breakpoint
   */
  _disableDOMBreakpoint(breakpoint) {
    this._agent.removeDOMBreakpoint(breakpoint.node.id, breakpoint.type);
    breakpoint.node.setMarker(Marker, this._nodeHasBreakpoints(breakpoint.node) ? true : null);
  }

  /**
   * @param {!DOMNode} node
   * @return {boolean}
   */
  _nodeHasBreakpoints(node) {
    for (const breakpoint of this._domBreakpoints) {
      if (breakpoint.node === node && breakpoint.enabled) {
        return true;
      }
    }
    return false;
  }

  /**
   * @param {!Object} auxData
   * @return {?{type: !Protocol.DOMDebugger.DOMBreakpointType, node: !DOMNode, targetNode: ?DOMNode, insertion: boolean}}
   */
  resolveDOMBreakpointData(auxData) {
    const type = auxData['type'];
    const node = this._domModel.nodeForId(auxData['nodeId']);
    if (!type || !node) {
      return null;
    }
    let targetNode = null;
    let insertion = false;
    if (type === Protocol.DOMDebugger.DOMBreakpointType.SubtreeModified) {
      insertion = auxData['insertion'] || false;
      targetNode = this._domModel.nodeForId(auxData['targetNodeId']);
    }
    return {type: type, node: node, targetNode: targetNode, insertion: insertion};
  }

  /**
   * @return {string}
   */
  _currentURL() {
    const domDocument = this._domModel.existingDocument();
    return domDocument ? domDocument.documentURL : '';
  }

  _documentUpdated() {
    const removed = this._domBreakpoints;
    this._domBreakpoints = [];
    this.dispatchEventToListeners(Events.DOMBreakpointsRemoved, removed);

    const currentURL = this._currentURL();
    for (const breakpoint of this._domBreakpointsSetting.get()) {
      if (breakpoint.url === currentURL) {
        this._domModel.pushNodeByPathToFrontend(breakpoint.path).then(appendBreakpoint.bind(this, breakpoint));
      }
    }

    /**
     * @param {!{type: !Protocol.DOMDebugger.DOMBreakpointType, enabled: boolean}} breakpoint
     * @param {?number} nodeId
     * @this {DOMDebuggerModel}
     */
    function appendBreakpoint(breakpoint, nodeId) {
      const node = nodeId ? this._domModel.nodeForId(nodeId) : null;
      if (!node) {
        return;
      }
      const domBreakpoint = new DOMBreakpoint(this, node, breakpoint.type, breakpoint.enabled);
      this._domBreakpoints.push(domBreakpoint);
      if (breakpoint.enabled) {
        this._enableDOMBreakpoint(domBreakpoint);
      }
      this.dispatchEventToListeners(Events.DOMBreakpointAdded, domBreakpoint);
    }
  }

  /**
   * @param {function(!DOMBreakpoint):boolean} filter
   */
  _removeDOMBreakpoints(filter) {
    const removed = [];
    const left = [];
    for (const breakpoint of this._domBreakpoints) {
      if (filter(breakpoint)) {
        removed.push(breakpoint);
        if (breakpoint.enabled) {
          breakpoint.enabled = false;
          this._disableDOMBreakpoint(breakpoint);
        }
      } else {
        left.push(breakpoint);
      }
    }

    if (!removed.length) {
      return;
    }
    this._domBreakpoints = left;
    this._saveDOMBreakpoints();
    this.dispatchEventToListeners(Events.DOMBreakpointsRemoved, removed);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _nodeRemoved(event) {
    const node = /** @type {!DOMNode} */ (event.data.node);
    const children = node.children() || [];
    this._removeDOMBreakpoints(breakpoint => breakpoint.node === node || children.indexOf(breakpoint.node) !== -1);
  }

  _saveDOMBreakpoints() {
    const currentURL = this._currentURL();
    const breakpoints = this._domBreakpointsSetting.get().filter(breakpoint => breakpoint.url !== currentURL);
    for (const breakpoint of this._domBreakpoints) {
      breakpoints.push(
          {url: currentURL, path: breakpoint.node.path(), type: breakpoint.type, enabled: breakpoint.enabled});
    }
    this._domBreakpointsSetting.set(breakpoints);
  }
}

/** @enum {symbol} */
export const Events = {
  DOMBreakpointAdded: Symbol('DOMBreakpointAdded'),
  DOMBreakpointToggled: Symbol('DOMBreakpointToggled'),
  DOMBreakpointsRemoved: Symbol('DOMBreakpointsRemoved'),
};

const Marker = 'breakpoint-marker';

export class DOMBreakpoint {
  /**
   * @param {!DOMDebuggerModel} domDebuggerModel
   * @param {!DOMNode} node
   * @param {!Protocol.DOMDebugger.DOMBreakpointType} type
   * @param {boolean} enabled
   */
  constructor(domDebuggerModel, node, type, enabled) {
    this.domDebuggerModel = domDebuggerModel;
    this.node = node;
    this.type = type;
    this.enabled = enabled;
  }
}

export class EventListener {
  /**
   * @param {!DOMDebuggerModel} domDebuggerModel
   * @param {!RemoteObject} eventTarget
   * @param {string} type
   * @param {boolean} useCapture
   * @param {boolean} passive
   * @param {boolean} once
   * @param {?RemoteObject} handler
   * @param {?SDK.RemoteObject} originalHandler
   * @param {!Location} location
   * @param {?SDK.RemoteObject} customRemoveFunction
   * @param {!EventListener.Origin=} origin
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
    const script = location.script();
    this._sourceURL = script ? script.contentURL() : '';
    this._customRemoveFunction = customRemoveFunction;
    this._origin = origin || EventListener.Origin.Raw;
  }

  /**
   * @return {!DOMDebuggerModel}
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
   * @return {?RemoteObject}
   */
  handler() {
    return this._handler;
  }

  /**
   * @return {!Location}
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
   * @return {?RemoteObject}
   */
  originalHandler() {
    return this._originalHandler;
  }

  /**
   * @return {boolean}
   */
  canRemove() {
    return !!this._customRemoveFunction || this._origin !== EventListener.Origin.FrameworkUser;
  }

  /**
   * @return {!Promise<undefined>}
   */
  remove() {
    if (!this.canRemove()) {
      return Promise.resolve();
    }

    if (this._origin !== EventListener.Origin.FrameworkUser) {
      /**
       * @param {string} type
       * @param {function()} listener
       * @param {boolean} useCapture
       * @this {Object}
       * @suppressReceiverCheck
       */
      function removeListener(type, listener, useCapture) {
        this.removeEventListener(type, listener, useCapture);
        if (this['on' + type]) {
          this['on' + type] = undefined;
        }
      }

      return /** @type {!Promise<undefined>} */ (this._eventTarget.callFunction(removeListener, [
        RemoteObject.toCallArgument(this._type), RemoteObject.toCallArgument(this._originalHandler),
        RemoteObject.toCallArgument(this._useCapture)
      ]));
    }

    return this._customRemoveFunction
        .callFunction(
            callCustomRemove,
            [
              RemoteObject.toCallArgument(this._type),
              RemoteObject.toCallArgument(this._originalHandler),
              RemoteObject.toCallArgument(this._useCapture),
              RemoteObject.toCallArgument(this._passive),
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
    return this._origin !== EventListener.Origin.FrameworkUser;
  }

  /**
   * @return {!Promise<undefined>}
   */
  togglePassive() {
    return /** @type {!Promise<undefined>} */ (this._eventTarget.callFunction(callTogglePassive, [
      RemoteObject.toCallArgument(this._type),
      RemoteObject.toCallArgument(this._originalHandler),
      RemoteObject.toCallArgument(this._useCapture),
      RemoteObject.toCallArgument(this._passive),
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
   * @return {!EventListener.Origin}
   */
  origin() {
    return this._origin;
  }

  markAsFramework() {
    this._origin = EventListener.Origin.Framework;
  }

  /**
   * @return {boolean}
   */
  isScrollBlockingType() {
    return this._type === 'touchstart' || this._type === 'touchmove' || this._type === 'mousewheel' ||
        this._type === 'wheel';
  }
}

/** @enum {string} */
EventListener.Origin = {
  Raw: 'Raw',
  Framework: 'Framework',
  FrameworkUser: 'FrameworkUser'
};

export class EventListenerBreakpoint {
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
    if (this._enabled === enabled) {
      return;
    }
    this._enabled = enabled;
    for (const model of TargetManager.instance().models(DOMDebuggerModel)) {
      this._updateOnModel(model);
    }
  }

  /**
   * @param {!DOMDebuggerModel} model
   */
  _updateOnModel(model) {
    if (this._instrumentationName) {
      if (this._enabled) {
        model._agent.setInstrumentationBreakpoint(this._instrumentationName);
      } else {
        model._agent.removeInstrumentationBreakpoint(this._instrumentationName);
      }
    } else {
      for (const eventTargetName of this._eventTargetNames) {
        if (this._enabled) {
          model._agent.setEventListenerBreakpoint(this._eventName, eventTargetName);
        } else {
          model._agent.removeEventListenerBreakpoint(this._eventName, eventTargetName);
        }
      }
    }
  }

  /**
   * @return {string}
   */
  title() {
    return this._title;
  }
}

EventListenerBreakpoint._listener = 'listener:';
EventListenerBreakpoint._instrumentation = 'instrumentation:';

/**
 * @implements {SDKModelObserver<!DOMDebuggerModel>}
 */
export class DOMDebuggerManager {
  constructor() {
    this._xhrBreakpointsSetting = Common.Settings.Settings.instance().createLocalSetting('xhrBreakpoints', []);
    /** @type {!Map<string, boolean>} */
    this._xhrBreakpoints = new Map();
    for (const breakpoint of this._xhrBreakpointsSetting.get()) {
      this._xhrBreakpoints.set(breakpoint.url, breakpoint.enabled);
    }

    /** @type {!Array<!EventListenerBreakpoint>} */
    this._eventListenerBreakpoints = [];
    this._createInstrumentationBreakpoints(
        Common.UIString.UIString('Animation'),
        ['requestAnimationFrame', 'cancelAnimationFrame', 'requestAnimationFrame.callback']);
    this._createInstrumentationBreakpoints(
        Common.UIString.UIString('Canvas'), ['canvasContextCreated', 'webglErrorFired', 'webglWarningFired']);
    this._createInstrumentationBreakpoints(
        Common.UIString.UIString('Geolocation'), ['Geolocation.getCurrentPosition', 'Geolocation.watchPosition']);
    this._createInstrumentationBreakpoints(
        Common.UIString.UIString('Notification'), ['Notification.requestPermission']);
    this._createInstrumentationBreakpoints(
        Common.UIString.UIString('Parse'), ['Element.setInnerHTML', 'Document.write']);
    this._createInstrumentationBreakpoints(
        Common.UIString.UIString('Script'), ['scriptFirstStatement', 'scriptBlockedByCSP']);
    this._createInstrumentationBreakpoints(
        Common.UIString.UIString('Timer'),
        ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setTimeout.callback', 'setInterval.callback']);
    this._createInstrumentationBreakpoints(Common.UIString.UIString('Window'), ['DOMWindow.close']);
    this._createInstrumentationBreakpoints(
        Common.UIString.UIString('WebAudio'),
        ['audioContextCreated', 'audioContextClosed', 'audioContextResumed', 'audioContextSuspended']);

    this._createEventListenerBreakpoints(
        Common.UIString.UIString('Media'),
        [
          'play',      'pause',          'playing',    'canplay',    'canplaythrough', 'seeking',
          'seeked',    'timeupdate',     'ended',      'ratechange', 'durationchange', 'volumechange',
          'loadstart', 'progress',       'suspend',    'abort',      'error',          'emptied',
          'stalled',   'loadedmetadata', 'loadeddata', 'waiting'
        ],
        ['audio', 'video']);
    this._createEventListenerBreakpoints(
        Common.UIString.UIString('Picture-in-Picture'), ['enterpictureinpicture', 'leavepictureinpicture'], ['video']);
    this._createEventListenerBreakpoints(
        Common.UIString.UIString('Picture-in-Picture'), ['resize'], ['PictureInPictureWindow']);
    this._createEventListenerBreakpoints(
        Common.UIString.UIString('Clipboard'), ['copy', 'cut', 'paste', 'beforecopy', 'beforecut', 'beforepaste'],
        ['*']);
    this._createEventListenerBreakpoints(
        Common.UIString.UIString('Control'),
        ['resize', 'scroll', 'zoom', 'focus', 'blur', 'select', 'change', 'submit', 'reset'], ['*']);
    this._createEventListenerBreakpoints(
        Common.UIString.UIString('Device'), ['deviceorientation', 'devicemotion'], ['*']);
    this._createEventListenerBreakpoints(
        Common.UIString.UIString('DOM Mutation'),
        [
          'DOMActivate', 'DOMFocusIn', 'DOMFocusOut', 'DOMAttrModified', 'DOMCharacterDataModified', 'DOMNodeInserted',
          'DOMNodeInsertedIntoDocument', 'DOMNodeRemoved', 'DOMNodeRemovedFromDocument', 'DOMSubtreeModified',
          'DOMContentLoaded'
        ],
        ['*']);
    this._createEventListenerBreakpoints(
        Common.UIString.UIString('Drag / drop'),
        ['drag', 'dragstart', 'dragend', 'dragenter', 'dragover', 'dragleave', 'drop'], ['*']);

    this._createEventListenerBreakpoints(
        Common.UIString.UIString('Keyboard'), ['keydown', 'keyup', 'keypress', 'input'], ['*']);
    this._createEventListenerBreakpoints(
        Common.UIString.UIString('Load'),
        ['load', 'beforeunload', 'unload', 'abort', 'error', 'hashchange', 'popstate'], ['*']);
    this._createEventListenerBreakpoints(
        Common.UIString.UIString('Mouse'),
        [
          'auxclick', 'click', 'dblclick', 'mousedown', 'mouseup', 'mouseover', 'mousemove', 'mouseout', 'mouseenter',
          'mouseleave', 'mousewheel', 'wheel', 'contextmenu'
        ],
        ['*']);
    this._createEventListenerBreakpoints(
        Common.UIString.UIString('Pointer'),
        [
          'pointerover', 'pointerout', 'pointerenter', 'pointerleave', 'pointerdown', 'pointerup', 'pointermove',
          'pointercancel', 'gotpointercapture', 'lostpointercapture', 'pointerrawupdate'
        ],
        ['*']);
    this._createEventListenerBreakpoints(
        Common.UIString.UIString('Touch'), ['touchstart', 'touchmove', 'touchend', 'touchcancel'], ['*']);
    this._createEventListenerBreakpoints(Common.UIString.UIString('Worker'), ['message', 'messageerror'], ['*']);
    this._createEventListenerBreakpoints(
        Common.UIString.UIString('XHR'),
        ['readystatechange', 'load', 'loadstart', 'loadend', 'abort', 'error', 'progress', 'timeout'],
        ['xmlhttprequest', 'xmlhttprequestupload']);

    this._resolveEventListenerBreakpoint('instrumentation:setTimeout.callback')._title =
        Common.UIString.UIString('setTimeout fired');
    this._resolveEventListenerBreakpoint('instrumentation:setInterval.callback')._title =
        Common.UIString.UIString('setInterval fired');
    this._resolveEventListenerBreakpoint('instrumentation:scriptFirstStatement')._title =
        Common.UIString.UIString('Script First Statement');
    this._resolveEventListenerBreakpoint('instrumentation:scriptBlockedByCSP')._title =
        Common.UIString.UIString('Script Blocked by Content Security Policy');
    this._resolveEventListenerBreakpoint('instrumentation:requestAnimationFrame')._title =
        Common.UIString.UIString('Request Animation Frame');
    this._resolveEventListenerBreakpoint('instrumentation:cancelAnimationFrame')._title =
        Common.UIString.UIString('Cancel Animation Frame');
    this._resolveEventListenerBreakpoint('instrumentation:requestAnimationFrame.callback')._title =
        Common.UIString.UIString('Animation Frame Fired');
    this._resolveEventListenerBreakpoint('instrumentation:webglErrorFired')._title =
        Common.UIString.UIString('WebGL Error Fired');
    this._resolveEventListenerBreakpoint('instrumentation:webglWarningFired')._title =
        Common.UIString.UIString('WebGL Warning Fired');
    this._resolveEventListenerBreakpoint('instrumentation:Element.setInnerHTML')._title =
        Common.UIString.UIString('Set innerHTML');
    this._resolveEventListenerBreakpoint('instrumentation:canvasContextCreated')._title =
        Common.UIString.UIString('Create canvas context');
    this._resolveEventListenerBreakpoint('instrumentation:Geolocation.getCurrentPosition')._title =
        'getCurrentPosition';
    this._resolveEventListenerBreakpoint('instrumentation:Geolocation.watchPosition')._title = 'watchPosition';
    this._resolveEventListenerBreakpoint('instrumentation:Notification.requestPermission')._title = 'requestPermission';
    this._resolveEventListenerBreakpoint('instrumentation:DOMWindow.close')._title = 'window.close';
    this._resolveEventListenerBreakpoint('instrumentation:Document.write')._title = 'document.write';
    this._resolveEventListenerBreakpoint('instrumentation:audioContextCreated')._title =
        Common.UIString.UIString('Create AudioContext');
    this._resolveEventListenerBreakpoint('instrumentation:audioContextClosed')._title =
        Common.UIString.UIString('Close AudioContext');
    this._resolveEventListenerBreakpoint('instrumentation:audioContextResumed')._title =
        Common.UIString.UIString('Resume AudioContext');
    this._resolveEventListenerBreakpoint('instrumentation:audioContextSuspended')._title =
        Common.UIString.UIString('Suspend AudioContext');

    TargetManager.instance().observeModels(DOMDebuggerModel, this);
  }

  /**
   * @param {string} category
   * @param {!Array<string>} instrumentationNames
   */
  _createInstrumentationBreakpoints(category, instrumentationNames) {
    for (const instrumentationName of instrumentationNames) {
      this._eventListenerBreakpoints.push(
          new EventListenerBreakpoint(instrumentationName, '', [], category, instrumentationName));
    }
  }

  /**
   * @param {string} category
   * @param {!Array<string>} eventNames
   * @param {!Array<string>} eventTargetNames
   */
  _createEventListenerBreakpoints(category, eventNames, eventTargetNames) {
    for (const eventName of eventNames) {
      this._eventListenerBreakpoints.push(
          new EventListenerBreakpoint('', eventName, eventTargetNames, category, eventName));
    }
  }

  /**
   * @param {string} eventName
   * @param {string=} eventTargetName
   * @return {?EventListenerBreakpoint}
   */
  _resolveEventListenerBreakpoint(eventName, eventTargetName) {
    const instrumentationPrefix = 'instrumentation:';
    const listenerPrefix = 'listener:';
    let instrumentationName = '';
    if (eventName.startsWith(instrumentationPrefix)) {
      instrumentationName = eventName.substring(instrumentationPrefix.length);
      eventName = '';
    } else if (eventName.startsWith(listenerPrefix)) {
      eventName = eventName.substring(listenerPrefix.length);
    } else {
      return null;
    }
    eventTargetName = (eventTargetName || '*').toLowerCase();
    let result = null;
    for (const breakpoint of this._eventListenerBreakpoints) {
      if (instrumentationName && breakpoint._instrumentationName === instrumentationName) {
        result = breakpoint;
      }
      if (eventName && breakpoint._eventName === eventName &&
          breakpoint._eventTargetNames.indexOf(eventTargetName) !== -1) {
        result = breakpoint;
      }
      if (!result && eventName && breakpoint._eventName === eventName &&
          breakpoint._eventTargetNames.indexOf('*') !== -1) {
        result = breakpoint;
      }
    }
    return result;
  }

  /**
   * @return {!Array<!EventListenerBreakpoint>}
   */
  eventListenerBreakpoints() {
    return this._eventListenerBreakpoints.slice();
  }

  /**
   * @param {!Object} auxData
   * @return {string}
   */
  resolveEventListenerBreakpointTitle(auxData) {
    const id = auxData['eventName'];
    if (id === 'instrumentation:webglErrorFired' && auxData['webglErrorName']) {
      let errorName = auxData['webglErrorName'];
      // If there is a hex code of the error, display only this.
      errorName = errorName.replace(/^.*(0x[0-9a-f]+).*$/i, '$1');
      return Common.UIString.UIString('WebGL Error Fired (%s)', errorName);
    }
    if (id === 'instrumentation:scriptBlockedByCSP' && auxData['directiveText']) {
      return Common.UIString.UIString(
          'Script blocked due to Content Security Policy directive: %s', auxData['directiveText']);
    }
    const breakpoint = this._resolveEventListenerBreakpoint(id, auxData['targetName']);
    if (!breakpoint) {
      return '';
    }
    if (auxData['targetName']) {
      return auxData['targetName'] + '.' + breakpoint._title;
    }
    return breakpoint._title;
  }

  /**
   * @param {!Object} auxData
   * @return {?EventListenerBreakpoint}
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
    const breakpoints = [];
    for (const url of this._xhrBreakpoints.keys()) {
      breakpoints.push({url: url, enabled: this._xhrBreakpoints.get(url)});
    }
    this._xhrBreakpointsSetting.set(breakpoints);
  }

  /**
   * @param {string} url
   * @param {boolean} enabled
   */
  addXHRBreakpoint(url, enabled) {
    this._xhrBreakpoints.set(url, enabled);
    if (enabled) {
      for (const model of TargetManager.instance().models(DOMDebuggerModel)) {
        model._agent.setXHRBreakpoint(url);
      }
    }
    this._saveXHRBreakpoints();
  }

  /**
   * @param {string} url
   */
  removeXHRBreakpoint(url) {
    const enabled = this._xhrBreakpoints.get(url);
    this._xhrBreakpoints.delete(url);
    if (enabled) {
      for (const model of TargetManager.instance().models(DOMDebuggerModel)) {
        model._agent.removeXHRBreakpoint(url);
      }
    }
    this._saveXHRBreakpoints();
  }

  /**
   * @param {string} url
   * @param {boolean} enabled
   */
  toggleXHRBreakpoint(url, enabled) {
    this._xhrBreakpoints.set(url, enabled);
    for (const model of TargetManager.instance().models(DOMDebuggerModel)) {
      if (enabled) {
        model._agent.setXHRBreakpoint(url);
      } else {
        model._agent.removeXHRBreakpoint(url);
      }
    }
    this._saveXHRBreakpoints();
  }

  /**
   * @override
   * @param {!DOMDebuggerModel} domDebuggerModel
   */
  modelAdded(domDebuggerModel) {
    for (const url of this._xhrBreakpoints.keys()) {
      if (this._xhrBreakpoints.get(url)) {
        domDebuggerModel._agent.setXHRBreakpoint(url);
      }
    }
    for (const breakpoint of this._eventListenerBreakpoints) {
      if (breakpoint._enabled) {
        breakpoint._updateOnModel(domDebuggerModel);
      }
    }
  }

  /**
   * @override
   * @param {!DOMDebuggerModel} domDebuggerModel
   */
  modelRemoved(domDebuggerModel) {
  }
}

SDKModel.register(DOMDebuggerModel, Capability.DOM, false);
