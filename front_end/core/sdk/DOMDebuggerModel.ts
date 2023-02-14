// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';

import {CategorizedBreakpoint} from './CategorizedBreakpoint.js';
import {type Location} from './DebuggerModel.js';

import {DOMModel, Events as DOMModelEvents, type DOMNode} from './DOMModel.js';
import {RemoteObject} from './RemoteObject.js';
import {RuntimeModel} from './RuntimeModel.js';

import {Capability, type Target} from './Target.js';
import {SDKModel} from './SDKModel.js';

import {TargetManager, type SDKModelObserver} from './TargetManager.js';

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
  /**
   *@description Text for the service worker type.
   */
  worker: 'Worker',
};
const str_ = i18n.i18n.registerUIStrings('core/sdk/DOMDebuggerModel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

// Some instrumentation breakpoints have their titles adjusted to localized
// versions, and some are merely renamed to more recognizable names.
//
// This function returns a table that links the breakpoint names and replacement
// titles.
function getInstrumentationBreakpointTitles(): [string, string|Common.UIString.LocalizedString][] {
  return [
    ['setTimeout.callback', i18nString(UIStrings.setTimeoutOrIntervalFired, {PH1: 'setTimeout'})],
    ['setInterval.callback', i18nString(UIStrings.setTimeoutOrIntervalFired, {PH1: 'setInterval'})],
    ['scriptFirstStatement', i18nString(UIStrings.scriptFirstStatement)],
    ['scriptBlockedByCSP', i18nString(UIStrings.scriptBlockedByContentSecurity)],
    ['requestAnimationFrame', i18nString(UIStrings.requestAnimationFrame)],
    ['cancelAnimationFrame', i18nString(UIStrings.cancelAnimationFrame)],
    ['requestAnimationFrame.callback', i18nString(UIStrings.animationFrameFired)],
    ['webglErrorFired', i18nString(UIStrings.webglErrorFired)],
    ['webglWarningFired', i18nString(UIStrings.webglWarningFired)],
    ['Element.setInnerHTML', i18nString(UIStrings.setInnerhtml)],
    ['canvasContextCreated', i18nString(UIStrings.createCanvasContext)],
    ['Geolocation.getCurrentPosition', 'getCurrentPosition'],
    ['Geolocation.watchPosition', 'watchPosition'],
    ['Notification.requestPermission', 'requestPermission'],
    ['DOMWindow.close', 'window.close'],
    ['Document.write', 'document.write'],
    ['audioContextCreated', i18nString(UIStrings.createAudiocontext)],
    ['audioContextClosed', i18nString(UIStrings.closeAudiocontext)],
    ['audioContextResumed', i18nString(UIStrings.resumeAudiocontext)],
    ['audioContextSuspended', i18nString(UIStrings.suspendAudiocontext)],
  ];
}

export class DOMDebuggerModel extends SDKModel<EventTypes> {
  readonly agent: ProtocolProxyApi.DOMDebuggerApi;
  readonly #runtimeModelInternal: RuntimeModel;
  #domModel: DOMModel;
  #domBreakpointsInternal: DOMBreakpoint[];
  readonly #domBreakpointsSetting: Common.Settings.Setting<{
    url: Platform.DevToolsPath.UrlString,
    path: string,
    type: Protocol.DOMDebugger.DOMBreakpointType,
    enabled: boolean,
  }[]>;
  suspended = false;

  constructor(target: Target) {
    super(target);
    this.agent = target.domdebuggerAgent();
    this.#runtimeModelInternal = (target.model(RuntimeModel) as RuntimeModel);
    this.#domModel = (target.model(DOMModel) as DOMModel);
    this.#domModel.addEventListener(DOMModelEvents.DocumentUpdated, this.documentUpdated, this);
    this.#domModel.addEventListener(DOMModelEvents.NodeRemoved, this.nodeRemoved, this);

    this.#domBreakpointsInternal = [];
    this.#domBreakpointsSetting = Common.Settings.Settings.instance().createLocalSetting('domBreakpoints', []);
    if (this.#domModel.existingDocument()) {
      void this.documentUpdated();
    }
  }

  runtimeModel(): RuntimeModel {
    return this.#runtimeModelInternal;
  }

  async suspendModel(): Promise<void> {
    this.suspended = true;
  }

  async resumeModel(): Promise<void> {
    this.suspended = false;
  }

  async eventListeners(remoteObject: RemoteObject): Promise<EventListener[]> {
    console.assert(remoteObject.runtimeModel() === this.#runtimeModelInternal);
    if (!remoteObject.objectId) {
      return [];
    }

    const listeners = await this.agent.invoke_getEventListeners({objectId: remoteObject.objectId});
    const eventListeners = [];
    for (const payload of listeners.listeners || []) {
      const location = this.#runtimeModelInternal.debuggerModel().createRawLocationByScriptId(
          payload.scriptId, payload.lineNumber, payload.columnNumber);
      if (!location) {
        continue;
      }
      eventListeners.push(new EventListener(
          this, remoteObject, payload.type, payload.useCapture, payload.passive, payload.once,
          payload.handler ? this.#runtimeModelInternal.createRemoteObject(payload.handler) : null,
          payload.originalHandler ? this.#runtimeModelInternal.createRemoteObject(payload.originalHandler) : null,
          location, null));
    }
    return eventListeners;
  }

  retrieveDOMBreakpoints(): void {
    void this.#domModel.requestDocument();
  }

  domBreakpoints(): DOMBreakpoint[] {
    return this.#domBreakpointsInternal.slice();
  }

  hasDOMBreakpoint(node: DOMNode, type: Protocol.DOMDebugger.DOMBreakpointType): boolean {
    return this.#domBreakpointsInternal.some(breakpoint => (breakpoint.node === node && breakpoint.type === type));
  }

  setDOMBreakpoint(node: DOMNode, type: Protocol.DOMDebugger.DOMBreakpointType): DOMBreakpoint {
    for (const breakpoint of this.#domBreakpointsInternal) {
      if (breakpoint.node === node && breakpoint.type === type) {
        this.toggleDOMBreakpoint(breakpoint, true);
        return breakpoint;
      }
    }
    const breakpoint = new DOMBreakpoint(this, node, type, true);
    this.#domBreakpointsInternal.push(breakpoint);
    this.saveDOMBreakpoints();
    this.enableDOMBreakpoint(breakpoint);
    this.dispatchEventToListeners(Events.DOMBreakpointAdded, breakpoint);
    return breakpoint;
  }

  removeDOMBreakpoint(node: DOMNode, type: Protocol.DOMDebugger.DOMBreakpointType): void {
    this.removeDOMBreakpoints(breakpoint => breakpoint.node === node && breakpoint.type === type);
  }

  removeAllDOMBreakpoints(): void {
    this.removeDOMBreakpoints(_breakpoint => true);
  }

  toggleDOMBreakpoint(breakpoint: DOMBreakpoint, enabled: boolean): void {
    if (enabled === breakpoint.enabled) {
      return;
    }
    breakpoint.enabled = enabled;
    if (enabled) {
      this.enableDOMBreakpoint(breakpoint);
    } else {
      this.disableDOMBreakpoint(breakpoint);
    }
    this.dispatchEventToListeners(Events.DOMBreakpointToggled, breakpoint);
  }

  private enableDOMBreakpoint(breakpoint: DOMBreakpoint): void {
    if (breakpoint.node.id) {
      void this.agent.invoke_setDOMBreakpoint({nodeId: breakpoint.node.id, type: breakpoint.type});
      breakpoint.node.setMarker(Marker, true);
    }
  }

  private disableDOMBreakpoint(breakpoint: DOMBreakpoint): void {
    if (breakpoint.node.id) {
      void this.agent.invoke_removeDOMBreakpoint({nodeId: breakpoint.node.id, type: breakpoint.type});
      breakpoint.node.setMarker(Marker, this.nodeHasBreakpoints(breakpoint.node) ? true : null);
    }
  }

  private nodeHasBreakpoints(node: DOMNode): boolean {
    for (const breakpoint of this.#domBreakpointsInternal) {
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
    const node = this.#domModel.nodeForId(auxData['nodeId']);
    if (!type || !node) {
      return null;
    }
    let targetNode: (DOMNode|null)|null = null;
    let insertion = false;
    if (type === Protocol.DOMDebugger.DOMBreakpointType.SubtreeModified) {
      insertion = auxData['insertion'] || false;
      targetNode = this.#domModel.nodeForId(auxData['targetNodeId']);
    }
    return {type: type, node: node, targetNode: targetNode, insertion: insertion};
  }

  private currentURL(): Platform.DevToolsPath.UrlString {
    const domDocument = this.#domModel.existingDocument();
    return domDocument ? domDocument.documentURL : Platform.DevToolsPath.EmptyUrlString;
  }

  private async documentUpdated(): Promise<void> {
    if (this.suspended) {
      return;
    }
    const removed = this.#domBreakpointsInternal;
    this.#domBreakpointsInternal = [];
    this.dispatchEventToListeners(Events.DOMBreakpointsRemoved, removed);

    // this.currentURL() is empty when the page is reloaded because the
    // new document has not been requested yet and the old one has been
    // removed. Therefore, we need to request the document and wait for it.
    // Note that requestDocument() caches the document so that it is requested
    // only once.
    const document = await this.#domModel.requestDocument();
    const currentURL = document ? document.documentURL : Platform.DevToolsPath.EmptyUrlString;
    for (const breakpoint of this.#domBreakpointsSetting.get()) {
      if (breakpoint.url === currentURL) {
        void this.#domModel.pushNodeByPathToFrontend(breakpoint.path).then(appendBreakpoint.bind(this, breakpoint));
      }
    }

    function appendBreakpoint(
        this: DOMDebuggerModel, breakpoint: {
          type: Protocol.DOMDebugger.DOMBreakpointType,
          enabled: boolean,
        },
        nodeId: Protocol.DOM.NodeId|null): void {
      const node = nodeId ? this.#domModel.nodeForId(nodeId) : null;
      if (!node) {
        return;
      }
      const domBreakpoint = new DOMBreakpoint(this, node, breakpoint.type, breakpoint.enabled);
      this.#domBreakpointsInternal.push(domBreakpoint);
      if (breakpoint.enabled) {
        this.enableDOMBreakpoint(domBreakpoint);
      }
      this.dispatchEventToListeners(Events.DOMBreakpointAdded, domBreakpoint);
    }
  }

  private removeDOMBreakpoints(filter: (arg0: DOMBreakpoint) => boolean): void {
    const removed = [];
    const left = [];
    for (const breakpoint of this.#domBreakpointsInternal) {
      if (filter(breakpoint)) {
        removed.push(breakpoint);
        if (breakpoint.enabled) {
          breakpoint.enabled = false;
          this.disableDOMBreakpoint(breakpoint);
        }
      } else {
        left.push(breakpoint);
      }
    }

    if (!removed.length) {
      return;
    }
    this.#domBreakpointsInternal = left;
    this.saveDOMBreakpoints();
    this.dispatchEventToListeners(Events.DOMBreakpointsRemoved, removed);
  }

  private nodeRemoved(event: Common.EventTarget.EventTargetEvent<{node: DOMNode, parent: DOMNode}>): void {
    if (this.suspended) {
      return;
    }
    const {node} = event.data;
    const children = node.children() || [];
    this.removeDOMBreakpoints(breakpoint => breakpoint.node === node || children.indexOf(breakpoint.node) !== -1);
  }

  private saveDOMBreakpoints(): void {
    const currentURL = this.currentURL();
    const breakpoints = this.#domBreakpointsSetting.get().filter((breakpoint: {
                                                                   url: Platform.DevToolsPath.UrlString,
                                                                 }) => breakpoint.url !== currentURL);
    for (const breakpoint of this.#domBreakpointsInternal) {
      breakpoints.push(
          {url: currentURL, path: breakpoint.node.path(), type: breakpoint.type, enabled: breakpoint.enabled});
    }
    this.#domBreakpointsSetting.set(breakpoints);
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  DOMBreakpointAdded = 'DOMBreakpointAdded',
  DOMBreakpointToggled = 'DOMBreakpointToggled',
  DOMBreakpointsRemoved = 'DOMBreakpointsRemoved',
}

export type EventTypes = {
  [Events.DOMBreakpointAdded]: DOMBreakpoint,
  [Events.DOMBreakpointToggled]: DOMBreakpoint,
  [Events.DOMBreakpointsRemoved]: DOMBreakpoint[],
};

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
  readonly #domDebuggerModelInternal: DOMDebuggerModel;
  readonly #eventTarget: RemoteObject;
  readonly #typeInternal: string;
  readonly #useCaptureInternal: boolean;
  readonly #passiveInternal: boolean;
  readonly #onceInternal: boolean;
  readonly #handlerInternal: RemoteObject|null;
  readonly #originalHandlerInternal: RemoteObject|null;
  readonly #locationInternal: Location;
  readonly #sourceURLInternal: Platform.DevToolsPath.UrlString;
  readonly #customRemoveFunction: RemoteObject|null;
  #originInternal: string;

  constructor(
      domDebuggerModel: DOMDebuggerModel, eventTarget: RemoteObject, type: string, useCapture: boolean,
      passive: boolean, once: boolean, handler: RemoteObject|null, originalHandler: RemoteObject|null,
      location: Location, customRemoveFunction: RemoteObject|null, origin?: string) {
    this.#domDebuggerModelInternal = domDebuggerModel;
    this.#eventTarget = eventTarget;
    this.#typeInternal = type;
    this.#useCaptureInternal = useCapture;
    this.#passiveInternal = passive;
    this.#onceInternal = once;
    this.#handlerInternal = handler;
    this.#originalHandlerInternal = originalHandler || handler;
    this.#locationInternal = location;
    const script = location.script();
    this.#sourceURLInternal = script ? script.contentURL() : Platform.DevToolsPath.EmptyUrlString;
    this.#customRemoveFunction = customRemoveFunction;
    this.#originInternal = origin || EventListener.Origin.Raw;
  }

  domDebuggerModel(): DOMDebuggerModel {
    return this.#domDebuggerModelInternal;
  }

  type(): string {
    return this.#typeInternal;
  }

  useCapture(): boolean {
    return this.#useCaptureInternal;
  }

  passive(): boolean {
    return this.#passiveInternal;
  }

  once(): boolean {
    return this.#onceInternal;
  }

  handler(): RemoteObject|null {
    return this.#handlerInternal;
  }

  location(): Location {
    return this.#locationInternal;
  }

  sourceURL(): Platform.DevToolsPath.UrlString {
    return this.#sourceURLInternal;
  }

  originalHandler(): RemoteObject|null {
    return this.#originalHandlerInternal;
  }

  canRemove(): boolean {
    return Boolean(this.#customRemoveFunction) || this.#originInternal !== EventListener.Origin.FrameworkUser;
  }

  remove(): Promise<void> {
    if (!this.canRemove()) {
      return Promise.resolve(undefined);
    }

    if (this.#originInternal !== EventListener.Origin.FrameworkUser) {
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

      return this.#eventTarget
                 .callFunction(
                     // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
                     // @ts-expect-error
                     removeListener,
                     [
                       RemoteObject.toCallArgument(this.#typeInternal),
                       RemoteObject.toCallArgument(this.#originalHandlerInternal),
                       RemoteObject.toCallArgument(this.#useCaptureInternal),
                     ])
                 .then(() => undefined) as Promise<undefined>;
    }

    if (this.#customRemoveFunction) {
      function callCustomRemove(
          this: (arg0: string, arg1: () => void, arg2: boolean, arg3: boolean) => void, type: string,
          listener: () => void, useCapture: boolean, passive: boolean): void {
        this.call(null, type, listener, useCapture, passive);
      }

      return this.#customRemoveFunction
          .callFunction(
              // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
              // @ts-expect-error
              callCustomRemove,
              [
                RemoteObject.toCallArgument(this.#typeInternal),
                RemoteObject.toCallArgument(this.#originalHandlerInternal),
                RemoteObject.toCallArgument(this.#useCaptureInternal),
                RemoteObject.toCallArgument(this.#passiveInternal),
              ])
          .then(() => undefined);
    }
    return Promise.resolve(undefined);
  }

  canTogglePassive(): boolean {
    return this.#originInternal !== EventListener.Origin.FrameworkUser;
  }

  togglePassive(): Promise<undefined> {
    return this.#eventTarget
        .callFunction(
            // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
            // @ts-expect-error
            callTogglePassive,
            [
              RemoteObject.toCallArgument(this.#typeInternal),
              RemoteObject.toCallArgument(this.#originalHandlerInternal),
              RemoteObject.toCallArgument(this.#useCaptureInternal),
              RemoteObject.toCallArgument(this.#passiveInternal),
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
    return this.#originInternal;
  }

  markAsFramework(): void {
    this.#originInternal = EventListener.Origin.Framework;
  }

  isScrollBlockingType(): boolean {
    return this.#typeInternal === 'touchstart' || this.#typeInternal === 'touchmove' ||
        this.#typeInternal === 'mousewheel' || this.#typeInternal === 'wheel';
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

export class CSPViolationBreakpoint extends CategorizedBreakpoint {
  readonly #typeInternal: Protocol.DOMDebugger.CSPViolationType;
  constructor(category: string, title: string, type: Protocol.DOMDebugger.CSPViolationType) {
    super(category, title);
    this.#typeInternal = type;
  }

  type(): Protocol.DOMDebugger.CSPViolationType {
    return this.#typeInternal;
  }
}

export class DOMEventListenerBreakpoint extends CategorizedBreakpoint {
  readonly instrumentationName: string;
  readonly eventName: string;
  readonly eventTargetNames: string[];
  constructor(
      instrumentationName: string, eventName: string, eventTargetNames: string[], category: string, title: string) {
    super(category, title);
    this.instrumentationName = instrumentationName;
    this.eventName = eventName;
    this.eventTargetNames = eventTargetNames;
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled() === enabled) {
      return;
    }
    super.setEnabled(enabled);
    for (const model of TargetManager.instance().models(DOMDebuggerModel)) {
      this.updateOnModel(model);
    }
  }

  updateOnModel(model: DOMDebuggerModel): void {
    if (this.instrumentationName) {
      if (this.enabled()) {
        void model.agent.invoke_setInstrumentationBreakpoint({eventName: this.instrumentationName});
      } else {
        void model.agent.invoke_removeInstrumentationBreakpoint({eventName: this.instrumentationName});
      }
    } else {
      for (const eventTargetName of this.eventTargetNames) {
        if (this.enabled()) {
          void model.agent.invoke_setEventListenerBreakpoint({eventName: this.eventName, targetName: eventTargetName});
        } else {
          void model.agent.invoke_removeEventListenerBreakpoint(
              {eventName: this.eventName, targetName: eventTargetName});
        }
      }
    }
  }

  static readonly listener = 'listener:';
  static readonly instrumentation = 'instrumentation:';
}

let domDebuggerManagerInstance: DOMDebuggerManager;

export class DOMDebuggerManager implements SDKModelObserver<DOMDebuggerModel> {
  readonly #xhrBreakpointsSetting: Common.Settings.Setting<{url: string, enabled: boolean}[]>;
  readonly #xhrBreakpointsInternal: Map<string, boolean>;
  readonly #cspViolationsToBreakOn: CSPViolationBreakpoint[];
  readonly #eventListenerBreakpointsInternal: DOMEventListenerBreakpoint[];

  constructor() {
    this.#xhrBreakpointsSetting = Common.Settings.Settings.instance().createLocalSetting('xhrBreakpoints', []);
    this.#xhrBreakpointsInternal = new Map();
    for (const breakpoint of this.#xhrBreakpointsSetting.get()) {
      this.#xhrBreakpointsInternal.set(breakpoint.url, breakpoint.enabled);
    }

    this.#cspViolationsToBreakOn = [];
    this.#cspViolationsToBreakOn.push(new CSPViolationBreakpoint(
        i18nString(UIStrings.trustedTypeViolations), i18nString(UIStrings.sinkViolations),
        Protocol.DOMDebugger.CSPViolationType.TrustedtypeSinkViolation));
    this.#cspViolationsToBreakOn.push(new CSPViolationBreakpoint(
        i18nString(UIStrings.trustedTypeViolations), i18nString(UIStrings.policyViolations),
        Protocol.DOMDebugger.CSPViolationType.TrustedtypePolicyViolation));

    this.#eventListenerBreakpointsInternal = [];
    this.createInstrumentationBreakpoints(
        i18nString(UIStrings.animation),
        ['requestAnimationFrame', 'cancelAnimationFrame', 'requestAnimationFrame.callback']);
    this.createInstrumentationBreakpoints(
        i18nString(UIStrings.canvas), ['canvasContextCreated', 'webglErrorFired', 'webglWarningFired']);
    this.createInstrumentationBreakpoints(
        i18nString(UIStrings.geolocation), ['Geolocation.getCurrentPosition', 'Geolocation.watchPosition']);
    this.createInstrumentationBreakpoints(i18nString(UIStrings.notification), ['Notification.requestPermission']);
    this.createInstrumentationBreakpoints(i18nString(UIStrings.parse), ['Element.setInnerHTML', 'Document.write']);
    this.createInstrumentationBreakpoints(i18nString(UIStrings.script), ['scriptFirstStatement', 'scriptBlockedByCSP']);
    this.createInstrumentationBreakpoints(
        i18nString(UIStrings.timer),
        ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setTimeout.callback', 'setInterval.callback']);
    this.createInstrumentationBreakpoints(i18nString(UIStrings.window), ['DOMWindow.close']);
    this.createInstrumentationBreakpoints(
        i18nString(UIStrings.webaudio),
        ['audioContextCreated', 'audioContextClosed', 'audioContextResumed', 'audioContextSuspended']);

    this.createEventListenerBreakpoints(
        i18nString(UIStrings.media),
        [
          'play',      'pause',          'playing',    'canplay',    'canplaythrough', 'seeking',
          'seeked',    'timeupdate',     'ended',      'ratechange', 'durationchange', 'volumechange',
          'loadstart', 'progress',       'suspend',    'abort',      'error',          'emptied',
          'stalled',   'loadedmetadata', 'loadeddata', 'waiting',
        ],
        ['audio', 'video']);
    this.createEventListenerBreakpoints(
        i18nString(UIStrings.pictureinpicture), ['enterpictureinpicture', 'leavepictureinpicture'], ['video']);
    this.createEventListenerBreakpoints(i18nString(UIStrings.pictureinpicture), ['resize'], ['PictureInPictureWindow']);
    this.createEventListenerBreakpoints(i18nString(UIStrings.pictureinpicture), ['enter'], ['documentPictureInPicture']);
    this.createEventListenerBreakpoints(
        i18nString(UIStrings.clipboard), ['copy', 'cut', 'paste', 'beforecopy', 'beforecut', 'beforepaste'], ['*']);
    this.createEventListenerBreakpoints(
        i18nString(UIStrings.control),
        ['resize', 'scroll', 'zoom', 'focus', 'blur', 'select', 'change', 'submit', 'reset'], ['*']);
    this.createEventListenerBreakpoints(i18nString(UIStrings.device), ['deviceorientation', 'devicemotion'], ['*']);
    this.createEventListenerBreakpoints(
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
    this.createEventListenerBreakpoints(
        i18nString(UIStrings.dragDrop), ['drag', 'dragstart', 'dragend', 'dragenter', 'dragover', 'dragleave', 'drop'],
        ['*']);

    this.createEventListenerBreakpoints(
        i18nString(UIStrings.keyboard), ['keydown', 'keyup', 'keypress', 'input'], ['*']);
    this.createEventListenerBreakpoints(
        i18nString(UIStrings.load),
        [
          'load',
          'beforeunload',
          'unload',
          'abort',
          'error',
          'hashchange',
          'popstate',
          'navigate',
          'navigatesuccess',
          'navigateerror',
          'currentchange',
          'navigateto',
          'navigatefrom',
          'finish',
          'dispose',
        ],
        ['*']);
    this.createEventListenerBreakpoints(
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
    this.createEventListenerBreakpoints(
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
    this.createEventListenerBreakpoints(
        i18nString(UIStrings.touch), ['touchstart', 'touchmove', 'touchend', 'touchcancel'], ['*']);
    this.createEventListenerBreakpoints(i18nString(UIStrings.worker), ['message', 'messageerror'], ['*']);
    this.createEventListenerBreakpoints(
        i18nString(UIStrings.xhr),
        ['readystatechange', 'load', 'loadstart', 'loadend', 'abort', 'error', 'progress', 'timeout'],
        ['xmlhttprequest', 'xmlhttprequestupload']);

    for (const [name, newTitle] of getInstrumentationBreakpointTitles()) {
      const breakpoint = this.resolveEventListenerBreakpointInternal('instrumentation:' + name);
      if (breakpoint) {
        breakpoint.setTitle(newTitle);
      }
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
    return this.#cspViolationsToBreakOn.slice();
  }

  private createInstrumentationBreakpoints(category: string, instrumentationNames: string[]): void {
    for (const instrumentationName of instrumentationNames) {
      this.#eventListenerBreakpointsInternal.push(
          new DOMEventListenerBreakpoint(instrumentationName, '', [], category, instrumentationName));
    }
  }

  private createEventListenerBreakpoints(category: string, eventNames: string[], eventTargetNames: string[]): void {
    for (const eventName of eventNames) {
      this.#eventListenerBreakpointsInternal.push(
          new DOMEventListenerBreakpoint('', eventName, eventTargetNames, category, eventName));
    }
  }

  private resolveEventListenerBreakpointInternal(eventName: string, eventTargetName?: string):
      DOMEventListenerBreakpoint|null {
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
    let result: DOMEventListenerBreakpoint|null = null;
    for (const breakpoint of this.#eventListenerBreakpointsInternal) {
      if (instrumentationName && breakpoint.instrumentationName === instrumentationName) {
        result = breakpoint;
      }
      if (eventName && breakpoint.eventName === eventName &&
          breakpoint.eventTargetNames.indexOf(eventTargetName) !== -1) {
        result = breakpoint;
      }
      if (!result && eventName && breakpoint.eventName === eventName &&
          breakpoint.eventTargetNames.indexOf('*') !== -1) {
        result = breakpoint;
      }
    }
    return result;
  }

  eventListenerBreakpoints(): DOMEventListenerBreakpoint[] {
    return this.#eventListenerBreakpointsInternal.slice();
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
    const breakpoint = this.resolveEventListenerBreakpointInternal(id, auxData['targetName']);
    if (!breakpoint) {
      return '';
    }
    if (auxData['targetName']) {
      return auxData['targetName'] + '.' + breakpoint.title();
    }
    return breakpoint.title();
  }

  resolveEventListenerBreakpoint(auxData: {
    eventName: string,
    targetName: string,
  }): DOMEventListenerBreakpoint|null {
    return this.resolveEventListenerBreakpointInternal(auxData['eventName'], auxData['targetName']);
  }

  updateCSPViolationBreakpoints(): void {
    const violationTypes = this.#cspViolationsToBreakOn.filter(v => v.enabled()).map(v => v.type());
    for (const model of TargetManager.instance().models(DOMDebuggerModel)) {
      this.updateCSPViolationBreakpointsForModel(model, violationTypes);
    }
  }

  private updateCSPViolationBreakpointsForModel(
      model: DOMDebuggerModel, violationTypes: Protocol.DOMDebugger.CSPViolationType[]): void {
    void model.agent.invoke_setBreakOnCSPViolation({violationTypes: violationTypes});
  }

  xhrBreakpoints(): Map<string, boolean> {
    return this.#xhrBreakpointsInternal;
  }

  private saveXHRBreakpoints(): void {
    const breakpoints = [];
    for (const url of this.#xhrBreakpointsInternal.keys()) {
      breakpoints.push({url: url, enabled: this.#xhrBreakpointsInternal.get(url) || false});
    }
    this.#xhrBreakpointsSetting.set(breakpoints);
  }

  addXHRBreakpoint(url: string, enabled: boolean): void {
    this.#xhrBreakpointsInternal.set(url, enabled);
    if (enabled) {
      for (const model of TargetManager.instance().models(DOMDebuggerModel)) {
        void model.agent.invoke_setXHRBreakpoint({url});
      }
    }
    this.saveXHRBreakpoints();
  }

  removeXHRBreakpoint(url: string): void {
    const enabled = this.#xhrBreakpointsInternal.get(url);
    this.#xhrBreakpointsInternal.delete(url);
    if (enabled) {
      for (const model of TargetManager.instance().models(DOMDebuggerModel)) {
        void model.agent.invoke_removeXHRBreakpoint({url});
      }
    }
    this.saveXHRBreakpoints();
  }

  toggleXHRBreakpoint(url: string, enabled: boolean): void {
    this.#xhrBreakpointsInternal.set(url, enabled);
    for (const model of TargetManager.instance().models(DOMDebuggerModel)) {
      if (enabled) {
        void model.agent.invoke_setXHRBreakpoint({url});
      } else {
        void model.agent.invoke_removeXHRBreakpoint({url});
      }
    }
    this.saveXHRBreakpoints();
  }

  modelAdded(domDebuggerModel: DOMDebuggerModel): void {
    for (const url of this.#xhrBreakpointsInternal.keys()) {
      if (this.#xhrBreakpointsInternal.get(url)) {
        void domDebuggerModel.agent.invoke_setXHRBreakpoint({url: url});
      }
    }
    for (const breakpoint of this.#eventListenerBreakpointsInternal) {
      if (breakpoint.enabled()) {
        breakpoint.updateOnModel(domDebuggerModel);
      }
    }
    const violationTypes = this.#cspViolationsToBreakOn.filter(v => v.enabled()).map(v => v.type());
    this.updateCSPViolationBreakpointsForModel(domDebuggerModel, violationTypes);
  }

  modelRemoved(_domDebuggerModel: DOMDebuggerModel): void {
  }
}

SDKModel.register(DOMDebuggerModel, {capabilities: Capability.DOM, autostart: false});
