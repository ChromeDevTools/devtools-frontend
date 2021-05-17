// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';

import type {Location} from './DebuggerModel.js'; // eslint-disable-line no-unused-vars
import type {DOMNode} from './DOMModel.js';
import {DOMModel, Events as DOMModelEvents} from './DOMModel.js';  // eslint-disable-line no-unused-vars
import {RemoteObject} from './RemoteObject.js';
import {RuntimeModel} from './RuntimeModel.js';
import type {SDKModelObserver, Target} from './SDKModel.js';
import {Capability, SDKModel, TargetManager} from './SDKModel.js';  // eslint-disable-line no-unused-vars

const UIStrings = {
  /**
  *@description Title for a category of breakpoints on Trusted Type violations
  */
  trustedTypeViolations: 'Trusted Type Violations',
  /**
   * @description Noun. Title for a checkbox that turns on breakpoints on Trusted Type sink violations.
   * "Trusted Types" is a Web API. A "Sink" (Noun, singular) is a special function, akin to a data sink, that expects
   * to receive data in a specific format. Should the data be in the wrong format, or something else
   * go wrong, its called a "sink violation".
   */
  sinkViolations: 'Sink Violations',
  /**
  *@description Title for a checkbox that turns on breakpoints on Trusted Type policy violations
  */
  policyViolations: 'Policy Violations',
  /**
  *@description Text that refers to the animation of the web page
  */
  animation: 'Animation',
  /**
  *@description Text in DOMDebugger Model
  */
  canvas: 'Canvas',
  /**
  *@description Title for a group of cities
  */
  geolocation: 'Geolocation',
  /**
  *@description Text in DOMDebugger Model
  */
  notification: 'Notification',
  /**
  *@description Text to parse something
  */
  parse: 'Parse',
  /**
  *@description Label for a group of JavaScript files
  */
  script: 'Script',
  /**
  *@description Text in DOMDebugger Model
  */
  timer: 'Timer',
  /**
  *@description Text in DOMDebugger Model
  */
  window: 'Window',
  /**
  *@description Title of the WebAudio tool
  */
  webaudio: 'WebAudio',
  /**
  *@description Text that appears on a button for the media resource type filter.
  */
  media: 'Media',
  /**
  *@description Text in DOMDebugger Model
  */
  pictureinpicture: 'Picture-in-Picture',
  /**
  *@description Text in DOMDebugger Model
  */
  clipboard: 'Clipboard',
  /**
   * @description Noun. Describes a group of DOM events (such as 'select' and 'submit') in this context.
   */
  control: 'Control',
  /**
  *@description Text that refers to device such as a phone
  */
  device: 'Device',
  /**
  *@description Text in DOMDebugger Model
  */
  domMutation: 'DOM Mutation',
  /**
  *@description Text in DOMDebugger Model
  */
  dragDrop: 'Drag / drop',
  /**
  *@description Text in DOMDebugger Model
  */
  keyboard: 'Keyboard',
  /**
  *@description Text to load something
  */
  load: 'Load',
  /**
  *@description Text in DOMDebugger Model
  */
  mouse: 'Mouse',
  /**
  *@description Text in DOMDebugger Model
  */
  pointer: 'Pointer',
  /**
  *@description Text for the touch type to simulate on a device
  */
  touch: 'Touch',
  /**
  *@description Text that appears on a button for the xhr resource type filter.
  */
  xhr: 'XHR',
  /**
  *@description Text in the Event Listener Breakpoints Panel of the JavaScript Debugger in the Sources Panel
  *@example {setTimeout} PH1
  */
  setTimeoutOrIntervalFired: '{PH1} fired',
  /**
  *@description Text in the Event Listener Breakpoints Panel of the JavaScript Debugger in the Sources Panel
  */
  scriptFirstStatement: 'Script First Statement',
  /**
  *@description Text in the Event Listener Breakpoints Panel of the JavaScript Debugger in the Sources Panel
  */
  scriptBlockedByContentSecurity: 'Script Blocked by Content Security Policy',
  /**
  *@description Text for the request animation frame event
  */
  requestAnimationFrame: 'Request Animation Frame',
  /**
  *@description Text to cancel the animation frame
  */
  cancelAnimationFrame: 'Cancel Animation Frame',
  /**
  *@description Text for the event that an animation frame is fired
  */
  animationFrameFired: 'Animation Frame Fired',
  /**
  *@description Text in the Event Listener Breakpoints Panel of the JavaScript Debugger in the Sources Panel
  */
  webglErrorFired: 'WebGL Error Fired',
  /**
  *@description Text in the Event Listener Breakpoints Panel of the JavaScript Debugger in the Sources Panel
  */
  webglWarningFired: 'WebGL Warning Fired',
  /**
  *@description Text in the Event Listener Breakpoints Panel of the JavaScript Debugger in the Sources Panel
  */
  setInnerhtml: 'Set `innerHTML`',
  /**
  *@description Name of a breakpoint type in the Sources Panel.
  */
  createCanvasContext: 'Create canvas context',
  /**
  *@description Name of a breakpoint type in the Sources Panel.
  */
  createAudiocontext: 'Create `AudioContext`',
  /**
  *@description Name of a breakpoint type in the Sources Panel. Close is a verb.
  */
  closeAudiocontext: 'Close `AudioContext`',
  /**
  *@description Name of a breakpoint type in the Sources Panel. Resume is a verb.
  */
  resumeAudiocontext: 'Resume `AudioContext`',
  /**
  *@description Name of a breakpoint type in the Sources Panel.
  */
  suspendAudiocontext: 'Suspend `AudioContext`',
  /**
  *@description Error message text
  *@example {Snag Error} PH1
  */
  webglErrorFiredS: 'WebGL Error Fired ({PH1})',
  /**
  *@description Text in DOMDebugger Model
  *@example {"script-src 'self'"} PH1
  */
  scriptBlockedDueToContent: 'Script blocked due to Content Security Policy directive: {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('core/sdk/DOMDebuggerModel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class DOMDebuggerModel extends SDKModel {
  _agent: ProtocolProxyApi.DOMDebuggerApi;
  _runtimeModel: RuntimeModel;
  _domModel: DOMModel;
  _domBreakpoints: DOMBreakpoint[];
  _domBreakpointsSetting: Common.Settings
      .Setting<{url: string, path: string, type: Protocol.DOMDebugger.DOMBreakpointType, enabled: boolean}[]>;
  suspended = false;

  constructor(target: Target) {
    super(target);
    this._agent = target.domdebuggerAgent();
    this._runtimeModel = (target.model(RuntimeModel) as RuntimeModel);
    this._domModel = (target.model(DOMModel) as DOMModel);
    this._domModel.addEventListener(DOMModelEvents.DocumentUpdated, this._documentUpdated, this);
    this._domModel.addEventListener(DOMModelEvents.NodeRemoved, this._nodeRemoved, this);

    this._domBreakpoints = [];
    this._domBreakpointsSetting = Common.Settings.Settings.instance().createLocalSetting('domBreakpoints', []);
    if (this._domModel.existingDocument()) {
      this._documentUpdated();
    }
  }

  runtimeModel(): RuntimeModel {
    return this._runtimeModel;
  }

  async suspendModel(): Promise<void> {
    this.suspended = true;
  }

  async resumeModel(): Promise<void> {
    this.suspended = false;
  }

  async eventListeners(remoteObject: RemoteObject): Promise<EventListener[]> {
    console.assert(remoteObject.runtimeModel() === this._runtimeModel);
    if (!remoteObject.objectId) {
      return [];
    }

    const listeners = await this._agent.invoke_getEventListeners({objectId: (remoteObject.objectId as string)});
    const eventListeners = [];
    for (const payload of listeners.listeners || []) {
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

  retrieveDOMBreakpoints(): void {
    this._domModel.requestDocument();
  }

  domBreakpoints(): DOMBreakpoint[] {
    return this._domBreakpoints.slice();
  }

  hasDOMBreakpoint(node: DOMNode, type: Protocol.DOMDebugger.DOMBreakpointType): boolean {
    return this._domBreakpoints.some(breakpoint => (breakpoint.node === node && breakpoint.type === type));
  }

  setDOMBreakpoint(node: DOMNode, type: Protocol.DOMDebugger.DOMBreakpointType): DOMBreakpoint {
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

  removeDOMBreakpoint(node: DOMNode, type: Protocol.DOMDebugger.DOMBreakpointType): void {
    this._removeDOMBreakpoints(breakpoint => breakpoint.node === node && breakpoint.type === type);
  }

  removeAllDOMBreakpoints(): void {
    this._removeDOMBreakpoints(_breakpoint => true);
  }

  toggleDOMBreakpoint(breakpoint: DOMBreakpoint, enabled: boolean): void {
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

  _enableDOMBreakpoint(breakpoint: DOMBreakpoint): void {
    if (breakpoint.node.id) {
      this._agent.invoke_setDOMBreakpoint({nodeId: breakpoint.node.id, type: breakpoint.type});
      breakpoint.node.setMarker(Marker, true);
    }
  }

  _disableDOMBreakpoint(breakpoint: DOMBreakpoint): void {
    if (breakpoint.node.id) {
      this._agent.invoke_removeDOMBreakpoint({nodeId: breakpoint.node.id, type: breakpoint.type});
      breakpoint.node.setMarker(Marker, this._nodeHasBreakpoints(breakpoint.node) ? true : null);
    }
  }

  _nodeHasBreakpoints(node: DOMNode): boolean {
    for (const breakpoint of this._domBreakpoints) {
      if (breakpoint.node === node && breakpoint.enabled) {
        return true;
      }
    }
    return false;
  }

  resolveDOMBreakpointData(auxData: {
    type: Protocol.DOMDebugger.DOMBreakpointType,
    nodeId: Protocol.DOM.NodeId,
    targetNodeId: Protocol.DOM.NodeId,
    insertion: boolean,
  }): {
    type: Protocol.DOMDebugger.DOMBreakpointType,
    node: DOMNode,
    targetNode: DOMNode|null,
    insertion: boolean,
  }|null {
    const type = auxData['type'];
    const node = this._domModel.nodeForId(auxData['nodeId']);
    if (!type || !node) {
      return null;
    }
    let targetNode: (DOMNode|null)|null = null;
    let insertion = false;
    if (type === Protocol.DOMDebugger.DOMBreakpointType.SubtreeModified) {
      insertion = auxData['insertion'] || false;
      targetNode = this._domModel.nodeForId(auxData['targetNodeId']);
    }
    return {type: type, node: node, targetNode: targetNode, insertion: insertion};
  }

  _currentURL(): string {
    const domDocument = this._domModel.existingDocument();
    return domDocument ? domDocument.documentURL : '';
  }

  async _documentUpdated(): Promise<void> {
    if (this.suspended) {
      return;
    }
    const removed = this._domBreakpoints;
    this._domBreakpoints = [];
    this.dispatchEventToListeners(Events.DOMBreakpointsRemoved, removed);

    // this._currentURL() is empty when the page is reloaded because the
    // new document has not been requested yet and the old one has been
    // removed. Therefore, we need to request the document and wait for it.
    // Note that requestDocument() caches the document so that it is requested
    // only once.
    const document = await this._domModel.requestDocument();
    const currentURL = document ? document.documentURL : '';
    for (const breakpoint of this._domBreakpointsSetting.get()) {
      if (breakpoint.url === currentURL) {
        this._domModel.pushNodeByPathToFrontend(breakpoint.path).then(appendBreakpoint.bind(this, breakpoint));
      }
    }

    function appendBreakpoint(
        this: DOMDebuggerModel, breakpoint: {
          type: Protocol.DOMDebugger.DOMBreakpointType,
          enabled: boolean,
        },
        nodeId: number|null): void {
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

  _removeDOMBreakpoints(filter: (arg0: DOMBreakpoint) => boolean): void {
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

  _nodeRemoved(event: Common.EventTarget.EventTargetEvent): void {
    if (this.suspended) {
      return;
    }
    const node = (event.data.node as DOMNode);
    const children = node.children() || [];
    this._removeDOMBreakpoints(breakpoint => breakpoint.node === node || children.indexOf(breakpoint.node) !== -1);
  }

  _saveDOMBreakpoints(): void {
    const currentURL = this._currentURL();
    const breakpoints = this._domBreakpointsSetting.get().filter((breakpoint: {
                                                                   url: string,
                                                                 }) => breakpoint.url !== currentURL);
    for (const breakpoint of this._domBreakpoints) {
      breakpoints.push(
          {url: currentURL, path: breakpoint.node.path(), type: breakpoint.type, enabled: breakpoint.enabled});
    }
    this._domBreakpointsSetting.set(breakpoints);
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  DOMBreakpointAdded = 'DOMBreakpointAdded',
  DOMBreakpointToggled = 'DOMBreakpointToggled',
  DOMBreakpointsRemoved = 'DOMBreakpointsRemoved',
}


const Marker = 'breakpoint-marker';

export class DOMBreakpoint {
  domDebuggerModel: DOMDebuggerModel;
  node: DOMNode;
  type: Protocol.DOMDebugger.DOMBreakpointType;
  enabled: boolean;

  constructor(
      domDebuggerModel: DOMDebuggerModel, node: DOMNode, type: Protocol.DOMDebugger.DOMBreakpointType,
      enabled: boolean) {
    this.domDebuggerModel = domDebuggerModel;
    this.node = node;
    this.type = type;
    this.enabled = enabled;
  }
}

export class EventListener {
  _domDebuggerModel: DOMDebuggerModel;
  _eventTarget: RemoteObject;
  _type: string;
  _useCapture: boolean;
  _passive: boolean;
  _once: boolean;
  _handler: RemoteObject|null;
  _originalHandler: RemoteObject|null;
  _location: Location;
  _sourceURL: string;
  _customRemoveFunction: RemoteObject|null;
  _origin: string;

  constructor(
      domDebuggerModel: DOMDebuggerModel, eventTarget: RemoteObject, type: string, useCapture: boolean,
      passive: boolean, once: boolean, handler: RemoteObject|null, originalHandler: RemoteObject|null,
      location: Location, customRemoveFunction: RemoteObject|null, origin?: string) {
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

  domDebuggerModel(): DOMDebuggerModel {
    return this._domDebuggerModel;
  }

  type(): string {
    return this._type;
  }

  useCapture(): boolean {
    return this._useCapture;
  }

  passive(): boolean {
    return this._passive;
  }

  once(): boolean {
    return this._once;
  }

  handler(): RemoteObject|null {
    return this._handler;
  }

  location(): Location {
    return this._location;
  }

  sourceURL(): string {
    return this._sourceURL;
  }

  originalHandler(): RemoteObject|null {
    return this._originalHandler;
  }

  canRemove(): boolean {
    return Boolean(this._customRemoveFunction) || this._origin !== EventListener.Origin.FrameworkUser;
  }

  remove(): Promise<void> {
    if (!this.canRemove()) {
      return Promise.resolve(undefined);
    }

    if (this._origin !== EventListener.Origin.FrameworkUser) {
      function removeListener(
          this: {
            removeEventListener: (arg0: string, arg1: () => void, arg2: boolean) => void,
          },
          type: string, listener: () => void, useCapture: boolean): void {
        this.removeEventListener(type, listener, useCapture);
        // @ts-ignore:
        if (this['on' + type]) {
          // @ts-ignore:
          this['on' + type] = undefined;
        }
      }

      return this._eventTarget
                 .callFunction(
                     // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
                     // @ts-expect-error
                     removeListener,
                     [
                       RemoteObject.toCallArgument(this._type),
                       RemoteObject.toCallArgument(this._originalHandler),
                       RemoteObject.toCallArgument(this._useCapture),
                     ])
                 .then(() => undefined) as Promise<undefined>;
    }

    if (this._customRemoveFunction) {
      function callCustomRemove(
          this: (arg0: string, arg1: () => void, arg2: boolean, arg3: boolean) => void, type: string,
          listener: () => void, useCapture: boolean, passive: boolean): void {
        this.call(null, type, listener, useCapture, passive);
      }

      return this._customRemoveFunction
          .callFunction(
              // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
              // @ts-expect-error
              callCustomRemove,
              [
                RemoteObject.toCallArgument(this._type),
                RemoteObject.toCallArgument(this._originalHandler),
                RemoteObject.toCallArgument(this._useCapture),
                RemoteObject.toCallArgument(this._passive),
              ])
          .then(() => undefined);
    }
    return Promise.resolve(undefined);
  }

  canTogglePassive(): boolean {
    return this._origin !== EventListener.Origin.FrameworkUser;
  }

  togglePassive(): Promise<undefined> {
    return this._eventTarget
        .callFunction(
            // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
            // @ts-expect-error
            callTogglePassive,
            [
              RemoteObject.toCallArgument(this._type),
              RemoteObject.toCallArgument(this._originalHandler),
              RemoteObject.toCallArgument(this._useCapture),
              RemoteObject.toCallArgument(this._passive),
            ])
        .then(() => undefined);

    function callTogglePassive(
        this: {
          addEventListener: (arg0: string, arg1: () => void, arg2: {
            capture: boolean,
            passive: boolean,
          }) => void,
          removeEventListener: (arg0: string, arg1: () => void, arg2: {
            capture: boolean,
          }) => void,
        },
        type: string, listener: () => void, useCapture: boolean, passive: boolean): void {
      this.removeEventListener(type, listener, {capture: useCapture});
      this.addEventListener(type, listener, {capture: useCapture, passive: !passive});
    }
  }

  origin(): string {
    return this._origin;
  }

  markAsFramework(): void {
    this._origin = EventListener.Origin.Framework;
  }

  isScrollBlockingType(): boolean {
    return this._type === 'touchstart' || this._type === 'touchmove' || this._type === 'mousewheel' ||
        this._type === 'wheel';
  }
}

export namespace EventListener {
  // TODO(crbug.com/1167717): Make this a const enum again
  // eslint-disable-next-line rulesdir/const_enum
  export enum Origin {
    Raw = 'Raw',
    Framework = 'Framework',
    FrameworkUser = 'FrameworkUser',
  }
}

export class CategorizedBreakpoint {
  _category: string;
  _title: string;
  _enabled: boolean;

  constructor(category: string, title: string) {
    this._category = category;
    this._title = title;
    this._enabled = false;
  }

  category(): string {
    return this._category;
  }

  enabled(): boolean {
    return this._enabled;
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  title(): string {
    return this._title;
  }
}

export class CSPViolationBreakpoint extends CategorizedBreakpoint {
  _type: Protocol.DOMDebugger.CSPViolationType;
  constructor(category: string, title: string, type: Protocol.DOMDebugger.CSPViolationType) {
    super(category, title);
    this._type = type;
  }

  type(): Protocol.DOMDebugger.CSPViolationType {
    return this._type;
  }
}

export class EventListenerBreakpoint extends CategorizedBreakpoint {
  _instrumentationName: string;
  _eventName: string;
  _eventTargetNames: string[];
  constructor(
      instrumentationName: string, eventName: string, eventTargetNames: string[], category: string, title: string) {
    super(category, title);
    this._instrumentationName = instrumentationName;
    this._eventName = eventName;
    this._eventTargetNames = eventTargetNames;
  }

  setEnabled(enabled: boolean): void {
    if (this._enabled === enabled) {
      return;
    }
    super.setEnabled(enabled);
    for (const model of TargetManager.instance().models(DOMDebuggerModel)) {
      this._updateOnModel(model);
    }
  }

  _updateOnModel(model: DOMDebuggerModel): void {
    if (this._instrumentationName) {
      if (this._enabled) {
        model._agent.invoke_setInstrumentationBreakpoint({eventName: this._instrumentationName});
      } else {
        model._agent.invoke_removeInstrumentationBreakpoint({eventName: this._instrumentationName});
      }
    } else {
      for (const eventTargetName of this._eventTargetNames) {
        if (this._enabled) {
          model._agent.invoke_setEventListenerBreakpoint({eventName: this._eventName, targetName: eventTargetName});
        } else {
          model._agent.invoke_removeEventListenerBreakpoint({eventName: this._eventName, targetName: eventTargetName});
        }
      }
    }
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static readonly _listener = 'listener:';
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static readonly _instrumentation = 'instrumentation:';
}

let domDebuggerManagerInstance: DOMDebuggerManager;

export class DOMDebuggerManager implements SDKModelObserver<DOMDebuggerModel> {
  _xhrBreakpointsSetting: Common.Settings.Setting<{url: string, enabled: boolean}[]>;
  _xhrBreakpoints: Map<string, boolean>;
  _cspViolationsToBreakOn: CSPViolationBreakpoint[];
  _eventListenerBreakpoints: EventListenerBreakpoint[];

  constructor() {
    this._xhrBreakpointsSetting = Common.Settings.Settings.instance().createLocalSetting('xhrBreakpoints', []);
    this._xhrBreakpoints = new Map();
    for (const breakpoint of this._xhrBreakpointsSetting.get()) {
      this._xhrBreakpoints.set(breakpoint.url, breakpoint.enabled);
    }

    this._cspViolationsToBreakOn = [];
    this._cspViolationsToBreakOn.push(new CSPViolationBreakpoint(
        i18nString(UIStrings.trustedTypeViolations), i18nString(UIStrings.sinkViolations),
        Protocol.DOMDebugger.CSPViolationType.TrustedtypeSinkViolation));
    this._cspViolationsToBreakOn.push(new CSPViolationBreakpoint(
        i18nString(UIStrings.trustedTypeViolations), i18nString(UIStrings.policyViolations),
        Protocol.DOMDebugger.CSPViolationType.TrustedtypePolicyViolation));

    this._eventListenerBreakpoints = [];
    this._createInstrumentationBreakpoints(
        i18nString(UIStrings.animation),
        ['requestAnimationFrame', 'cancelAnimationFrame', 'requestAnimationFrame.callback']);
    this._createInstrumentationBreakpoints(
        i18nString(UIStrings.canvas), ['canvasContextCreated', 'webglErrorFired', 'webglWarningFired']);
    this._createInstrumentationBreakpoints(
        i18nString(UIStrings.geolocation), ['Geolocation.getCurrentPosition', 'Geolocation.watchPosition']);
    this._createInstrumentationBreakpoints(i18nString(UIStrings.notification), ['Notification.requestPermission']);
    this._createInstrumentationBreakpoints(i18nString(UIStrings.parse), ['Element.setInnerHTML', 'Document.write']);
    this._createInstrumentationBreakpoints(
        i18nString(UIStrings.script), ['scriptFirstStatement', 'scriptBlockedByCSP']);
    this._createInstrumentationBreakpoints(
        i18nString(UIStrings.timer),
        ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setTimeout.callback', 'setInterval.callback']);
    this._createInstrumentationBreakpoints(i18nString(UIStrings.window), ['DOMWindow.close']);
    this._createInstrumentationBreakpoints(
        i18nString(UIStrings.webaudio),
        ['audioContextCreated', 'audioContextClosed', 'audioContextResumed', 'audioContextSuspended']);

    this._createEventListenerBreakpoints(
        i18nString(UIStrings.media),
        [
          'play',      'pause',          'playing',    'canplay',    'canplaythrough', 'seeking',
          'seeked',    'timeupdate',     'ended',      'ratechange', 'durationchange', 'volumechange',
          'loadstart', 'progress',       'suspend',    'abort',      'error',          'emptied',
          'stalled',   'loadedmetadata', 'loadeddata', 'waiting',
        ],
        ['audio', 'video']);
    this._createEventListenerBreakpoints(
        i18nString(UIStrings.pictureinpicture), ['enterpictureinpicture', 'leavepictureinpicture'], ['video']);
    this._createEventListenerBreakpoints(
        i18nString(UIStrings.pictureinpicture), ['resize'], ['PictureInPictureWindow']);
    this._createEventListenerBreakpoints(
        i18nString(UIStrings.clipboard), ['copy', 'cut', 'paste', 'beforecopy', 'beforecut', 'beforepaste'], ['*']);
    this._createEventListenerBreakpoints(
        i18nString(UIStrings.control),
        ['resize', 'scroll', 'zoom', 'focus', 'blur', 'select', 'change', 'submit', 'reset'], ['*']);
    this._createEventListenerBreakpoints(i18nString(UIStrings.device), ['deviceorientation', 'devicemotion'], ['*']);
    this._createEventListenerBreakpoints(
        i18nString(UIStrings.domMutation),
        [
          'DOMActivate',
          'DOMFocusIn',
          'DOMFocusOut',
          'DOMAttrModified',
          'DOMCharacterDataModified',
          'DOMNodeInserted',
          'DOMNodeInsertedIntoDocument',
          'DOMNodeRemoved',
          'DOMNodeRemovedFromDocument',
          'DOMSubtreeModified',
          'DOMContentLoaded',
        ],
        ['*']);
    this._createEventListenerBreakpoints(
        i18nString(UIStrings.dragDrop), ['drag', 'dragstart', 'dragend', 'dragenter', 'dragover', 'dragleave', 'drop'],
        ['*']);

    this._createEventListenerBreakpoints(
        i18nString(UIStrings.keyboard), ['keydown', 'keyup', 'keypress', 'input'], ['*']);
    this._createEventListenerBreakpoints(
        i18nString(UIStrings.load), ['load', 'beforeunload', 'unload', 'abort', 'error', 'hashchange', 'popstate'],
        ['*']);
    this._createEventListenerBreakpoints(
        i18nString(UIStrings.mouse),
        [
          'auxclick',
          'click',
          'dblclick',
          'mousedown',
          'mouseup',
          'mouseover',
          'mousemove',
          'mouseout',
          'mouseenter',
          'mouseleave',
          'mousewheel',
          'wheel',
          'contextmenu',
        ],
        ['*']);
    this._createEventListenerBreakpoints(
        i18nString(UIStrings.pointer),
        [
          'pointerover',
          'pointerout',
          'pointerenter',
          'pointerleave',
          'pointerdown',
          'pointerup',
          'pointermove',
          'pointercancel',
          'gotpointercapture',
          'lostpointercapture',
          'pointerrawupdate',
        ],
        ['*']);
    this._createEventListenerBreakpoints(
        i18nString(UIStrings.touch), ['touchstart', 'touchmove', 'touchend', 'touchcancel'], ['*']);
    this._createEventListenerBreakpoints(i18nString('Worker'), ['message', 'messageerror'], ['*']);
    this._createEventListenerBreakpoints(
        i18nString(UIStrings.xhr),
        ['readystatechange', 'load', 'loadstart', 'loadend', 'abort', 'error', 'progress', 'timeout'],
        ['xmlhttprequest', 'xmlhttprequestupload']);

    let breakpoint;
    breakpoint = this._resolveEventListenerBreakpoint('instrumentation:setTimeout.callback');
    if (breakpoint) {
      breakpoint._title = i18nString(UIStrings.setTimeoutOrIntervalFired, {PH1: 'setTimeout'});
    }
    breakpoint = this._resolveEventListenerBreakpoint('instrumentation:setInterval.callback');
    if (breakpoint) {
      breakpoint._title = i18nString(UIStrings.setTimeoutOrIntervalFired, {PH1: 'setInterval'});
    }
    breakpoint = this._resolveEventListenerBreakpoint('instrumentation:scriptFirstStatement');
    if (breakpoint) {
      breakpoint._title = i18nString(UIStrings.scriptFirstStatement);
    }
    breakpoint = this._resolveEventListenerBreakpoint('instrumentation:scriptBlockedByCSP');
    if (breakpoint) {
      breakpoint._title = i18nString(UIStrings.scriptBlockedByContentSecurity);
    }
    breakpoint = this._resolveEventListenerBreakpoint('instrumentation:requestAnimationFrame');
    if (breakpoint) {
      breakpoint._title = i18nString(UIStrings.requestAnimationFrame);
    }
    breakpoint = this._resolveEventListenerBreakpoint('instrumentation:cancelAnimationFrame');
    if (breakpoint) {
      breakpoint._title = i18nString(UIStrings.cancelAnimationFrame);
    }
    breakpoint = this._resolveEventListenerBreakpoint('instrumentation:requestAnimationFrame.callback');
    if (breakpoint) {
      breakpoint._title = i18nString(UIStrings.animationFrameFired);
    }
    breakpoint = this._resolveEventListenerBreakpoint('instrumentation:webglErrorFired');
    if (breakpoint) {
      breakpoint._title = i18nString(UIStrings.webglErrorFired);
    }
    breakpoint = this._resolveEventListenerBreakpoint('instrumentation:webglWarningFired');
    if (breakpoint) {
      breakpoint._title = i18nString(UIStrings.webglWarningFired);
    }
    breakpoint = this._resolveEventListenerBreakpoint('instrumentation:Element.setInnerHTML');
    if (breakpoint) {
      breakpoint._title = i18nString(UIStrings.setInnerhtml);
    }
    breakpoint = this._resolveEventListenerBreakpoint('instrumentation:canvasContextCreated');
    if (breakpoint) {
      breakpoint._title = i18nString(UIStrings.createCanvasContext);
    }
    breakpoint = this._resolveEventListenerBreakpoint('instrumentation:Geolocation.getCurrentPosition');
    if (breakpoint) {
      breakpoint._title = 'getCurrentPosition';
    }
    breakpoint = this._resolveEventListenerBreakpoint('instrumentation:Geolocation.watchPosition');
    if (breakpoint) {
      breakpoint._title = 'watchPosition';
    }
    breakpoint = this._resolveEventListenerBreakpoint('instrumentation:Notification.requestPermission');
    if (breakpoint) {
      breakpoint._title = 'requestPermission';
    }
    breakpoint = this._resolveEventListenerBreakpoint('instrumentation:DOMWindow.close');
    if (breakpoint) {
      breakpoint._title = 'window.close';
    }
    breakpoint = this._resolveEventListenerBreakpoint('instrumentation:Document.write');
    if (breakpoint) {
      breakpoint._title = 'document.write';
    }
    breakpoint = this._resolveEventListenerBreakpoint('instrumentation:audioContextCreated');
    if (breakpoint) {
      breakpoint._title = i18nString(UIStrings.createAudiocontext);
    }
    breakpoint = this._resolveEventListenerBreakpoint('instrumentation:audioContextClosed');
    if (breakpoint) {
      breakpoint._title = i18nString(UIStrings.closeAudiocontext);
    }
    breakpoint = this._resolveEventListenerBreakpoint('instrumentation:audioContextResumed');
    if (breakpoint) {
      breakpoint._title = i18nString(UIStrings.resumeAudiocontext);
    }
    breakpoint = this._resolveEventListenerBreakpoint('instrumentation:audioContextSuspended');
    if (breakpoint) {
      breakpoint._title = i18nString(UIStrings.suspendAudiocontext);
    }

    TargetManager.instance().observeModels(DOMDebuggerModel, this);
  }

  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): DOMDebuggerManager {
    const {forceNew} = opts;
    if (!domDebuggerManagerInstance || forceNew) {
      domDebuggerManagerInstance = new DOMDebuggerManager();
    }

    return domDebuggerManagerInstance;
  }

  cspViolationBreakpoints(): CSPViolationBreakpoint[] {
    return this._cspViolationsToBreakOn.slice();
  }

  _createInstrumentationBreakpoints(category: string, instrumentationNames: string[]): void {
    for (const instrumentationName of instrumentationNames) {
      this._eventListenerBreakpoints.push(
          new EventListenerBreakpoint(instrumentationName, '', [], category, instrumentationName));
    }
  }

  _createEventListenerBreakpoints(category: string, eventNames: string[], eventTargetNames: string[]): void {
    for (const eventName of eventNames) {
      this._eventListenerBreakpoints.push(
          new EventListenerBreakpoint('', eventName, eventTargetNames, category, eventName));
    }
  }

  _resolveEventListenerBreakpoint(eventName: string, eventTargetName?: string): EventListenerBreakpoint|null {
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
    let result: EventListenerBreakpoint|null = null;
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

  eventListenerBreakpoints(): EventListenerBreakpoint[] {
    return this._eventListenerBreakpoints.slice();
  }

  resolveEventListenerBreakpointTitle(auxData: {
    eventName: string,
    webglErrorName: string,
    directiveText: string,
    targetName: string,
  }): string {
    const id = auxData['eventName'];
    if (id === 'instrumentation:webglErrorFired' && auxData['webglErrorName']) {
      let errorName: string = auxData['webglErrorName'];
      // If there is a hex code of the error, display only this.
      errorName = errorName.replace(/^.*(0x[0-9a-f]+).*$/i, '$1');
      return i18nString(UIStrings.webglErrorFiredS, {PH1: errorName});
    }
    if (id === 'instrumentation:scriptBlockedByCSP' && auxData['directiveText']) {
      return i18nString(UIStrings.scriptBlockedDueToContent, {PH1: auxData['directiveText']});
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

  resolveEventListenerBreakpoint(auxData: {
    eventName: string,
    targetName: string,
  }): EventListenerBreakpoint|null {
    return this._resolveEventListenerBreakpoint(auxData['eventName'], auxData['targetName']);
  }

  updateCSPViolationBreakpoints(): void {
    const violationTypes = this._cspViolationsToBreakOn.filter(v => v.enabled()).map(v => v.type());
    for (const model of TargetManager.instance().models(DOMDebuggerModel)) {
      this._updateCSPViolationBreakpointsForModel(model, violationTypes);
    }
  }

  _updateCSPViolationBreakpointsForModel(
      model: DOMDebuggerModel, violationTypes: Protocol.DOMDebugger.CSPViolationType[]): void {
    model._agent.invoke_setBreakOnCSPViolation({violationTypes: violationTypes});
  }

  xhrBreakpoints(): Map<string, boolean> {
    return this._xhrBreakpoints;
  }

  _saveXHRBreakpoints(): void {
    const breakpoints = [];
    for (const url of this._xhrBreakpoints.keys()) {
      breakpoints.push({url: url, enabled: this._xhrBreakpoints.get(url) || false});
    }
    this._xhrBreakpointsSetting.set(breakpoints);
  }

  addXHRBreakpoint(url: string, enabled: boolean): void {
    this._xhrBreakpoints.set(url, enabled);
    if (enabled) {
      for (const model of TargetManager.instance().models(DOMDebuggerModel)) {
        model._agent.invoke_setXHRBreakpoint({url});
      }
    }
    this._saveXHRBreakpoints();
  }

  removeXHRBreakpoint(url: string): void {
    const enabled = this._xhrBreakpoints.get(url);
    this._xhrBreakpoints.delete(url);
    if (enabled) {
      for (const model of TargetManager.instance().models(DOMDebuggerModel)) {
        model._agent.invoke_removeXHRBreakpoint({url});
      }
    }
    this._saveXHRBreakpoints();
  }

  toggleXHRBreakpoint(url: string, enabled: boolean): void {
    this._xhrBreakpoints.set(url, enabled);
    for (const model of TargetManager.instance().models(DOMDebuggerModel)) {
      if (enabled) {
        model._agent.invoke_setXHRBreakpoint({url});
      } else {
        model._agent.invoke_removeXHRBreakpoint({url});
      }
    }
    this._saveXHRBreakpoints();
  }

  modelAdded(domDebuggerModel: DOMDebuggerModel): void {
    for (const url of this._xhrBreakpoints.keys()) {
      if (this._xhrBreakpoints.get(url)) {
        domDebuggerModel._agent.invoke_setXHRBreakpoint({url: url});
      }
    }
    for (const breakpoint of this._eventListenerBreakpoints) {
      if (breakpoint._enabled) {
        breakpoint._updateOnModel(domDebuggerModel);
      }
    }
    const violationTypes = this._cspViolationsToBreakOn.filter(v => v.enabled()).map(v => v.type());
    this._updateCSPViolationBreakpointsForModel(domDebuggerModel, violationTypes);
  }

  modelRemoved(_domDebuggerModel: DOMDebuggerModel): void {
  }
}

SDKModel.register(DOMDebuggerModel, {capabilities: Capability.DOM, autostart: false});
