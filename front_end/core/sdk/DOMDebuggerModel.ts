// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';
import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';

import {CategorizedBreakpoint, Category} from './CategorizedBreakpoint.js';
import type {EventListenerPausedDetailsAuxData, Location} from './DebuggerModel.js';
import {DOMModel, type DOMNode, Events as DOMModelEvents} from './DOMModel.js';
import {RemoteObject} from './RemoteObject.js';
import {RuntimeModel} from './RuntimeModel.js';
import {SDKModel} from './SDKModel.js';
import {Capability, type Target} from './Target.js';
import {type SDKModelObserver, TargetManager} from './TargetManager.js';

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
    this.#domBreakpointsSetting = Common.Settings.Settings.instance().createLocalSetting('dom-breakpoints', []);
    if (this.#domModel.existingDocument()) {
      void this.documentUpdated();
    }
  }

  runtimeModel(): RuntimeModel {
    return this.#runtimeModelInternal;
  }

  override async suspendModel(): Promise<void> {
    this.suspended = true;
  }

  override async resumeModel(): Promise<void> {
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
    this.dispatchEventToListeners(Events.DOM_BREAKPOINT_ADDED, breakpoint);
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
    this.dispatchEventToListeners(Events.DOM_BREAKPOINT_TOGGLED, breakpoint);
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
    return {type, node, targetNode, insertion};
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
    this.dispatchEventToListeners(Events.DOM_BREAKPOINTS_REMOVED, removed);

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
      this.dispatchEventToListeners(Events.DOM_BREAKPOINT_ADDED, domBreakpoint);
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
    this.dispatchEventToListeners(Events.DOM_BREAKPOINTS_REMOVED, removed);
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

export const enum Events {
  DOM_BREAKPOINT_ADDED = 'DOMBreakpointAdded',
  DOM_BREAKPOINT_TOGGLED = 'DOMBreakpointToggled',
  DOM_BREAKPOINTS_REMOVED = 'DOMBreakpointsRemoved',
}

export type EventTypes = {
  [Events.DOM_BREAKPOINT_ADDED]: DOMBreakpoint,
  [Events.DOM_BREAKPOINT_TOGGLED]: DOMBreakpoint,
  [Events.DOM_BREAKPOINTS_REMOVED]: DOMBreakpoint[],
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
    this.#originInternal = origin || EventListener.Origin.RAW;
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
    return Boolean(this.#customRemoveFunction) || this.#originInternal !== EventListener.Origin.FRAMEWORK_USER;
  }

  remove(): Promise<void> {
    if (!this.canRemove()) {
      return Promise.resolve(undefined);
    }

    if (this.#originInternal !== EventListener.Origin.FRAMEWORK_USER) {
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
    return this.#originInternal !== EventListener.Origin.FRAMEWORK_USER;
  }

  togglePassive(): Promise<undefined> {
    return this.#eventTarget
        .callFunction(
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
    this.#originInternal = EventListener.Origin.FRAMEWORK;
  }

  isScrollBlockingType(): boolean {
    return this.#typeInternal === 'touchstart' || this.#typeInternal === 'touchmove' ||
        this.#typeInternal === 'mousewheel' || this.#typeInternal === 'wheel';
  }
}

export namespace EventListener {
  export const enum Origin {
    RAW = 'Raw',
    FRAMEWORK = 'Framework',
    FRAMEWORK_USER = 'FrameworkUser',
  }
}

export class CSPViolationBreakpoint extends CategorizedBreakpoint {
  readonly #typeInternal: Protocol.DOMDebugger.CSPViolationType;
  constructor(category: Category, type: Protocol.DOMDebugger.CSPViolationType) {
    super(category, type);
    this.#typeInternal = type;
  }

  type(): Protocol.DOMDebugger.CSPViolationType {
    return this.#typeInternal;
  }
}

export class DOMEventListenerBreakpoint extends CategorizedBreakpoint {
  readonly eventTargetNames: string[];
  constructor(eventName: string, eventTargetNames: string[], category: Category) {
    super(category, eventName);
    this.eventTargetNames = eventTargetNames;
  }

  override setEnabled(enabled: boolean): void {
    if (this.enabled() === enabled) {
      return;
    }
    super.setEnabled(enabled);
    for (const model of TargetManager.instance().models(DOMDebuggerModel)) {
      this.updateOnModel(model);
    }
  }

  updateOnModel(model: DOMDebuggerModel): void {
    for (const eventTargetName of this.eventTargetNames) {
      if (this.enabled()) {
        void model.agent.invoke_setEventListenerBreakpoint({eventName: this.name, targetName: eventTargetName});
      } else {
        void model.agent.invoke_removeEventListenerBreakpoint({eventName: this.name, targetName: eventTargetName});
      }
    }
  }

  static readonly listener = 'listener:';
}

let domDebuggerManagerInstance: DOMDebuggerManager;

export class DOMDebuggerManager implements SDKModelObserver<DOMDebuggerModel> {
  readonly #xhrBreakpointsSetting: Common.Settings.Setting<{url: string, enabled: boolean}[]>;
  readonly #xhrBreakpointsInternal: Map<string, boolean>;
  readonly #cspViolationsToBreakOn: CSPViolationBreakpoint[];
  readonly #eventListenerBreakpointsInternal: DOMEventListenerBreakpoint[];

  constructor() {
    this.#xhrBreakpointsSetting = Common.Settings.Settings.instance().createLocalSetting('xhr-breakpoints', []);
    this.#xhrBreakpointsInternal = new Map();
    for (const breakpoint of this.#xhrBreakpointsSetting.get()) {
      this.#xhrBreakpointsInternal.set(breakpoint.url, breakpoint.enabled);
    }

    this.#cspViolationsToBreakOn = [];
    this.#cspViolationsToBreakOn.push(new CSPViolationBreakpoint(
        Category.TRUSTED_TYPE_VIOLATION, Protocol.DOMDebugger.CSPViolationType.TrustedtypeSinkViolation));
    this.#cspViolationsToBreakOn.push(new CSPViolationBreakpoint(
        Category.TRUSTED_TYPE_VIOLATION, Protocol.DOMDebugger.CSPViolationType.TrustedtypePolicyViolation));

    this.#eventListenerBreakpointsInternal = [];
    this.createEventListenerBreakpoints(
        Category.MEDIA,
        [
          'play',      'pause',          'playing',    'canplay',    'canplaythrough', 'seeking',
          'seeked',    'timeupdate',     'ended',      'ratechange', 'durationchange', 'volumechange',
          'loadstart', 'progress',       'suspend',    'abort',      'error',          'emptied',
          'stalled',   'loadedmetadata', 'loadeddata', 'waiting',
        ],
        ['audio', 'video']);
    this.createEventListenerBreakpoints(
        Category.PICTURE_IN_PICTURE, ['enterpictureinpicture', 'leavepictureinpicture'], ['video']);
    this.createEventListenerBreakpoints(Category.PICTURE_IN_PICTURE, ['resize'], ['PictureInPictureWindow']);
    this.createEventListenerBreakpoints(Category.PICTURE_IN_PICTURE, ['enter'], ['documentPictureInPicture']);
    this.createEventListenerBreakpoints(
        Category.CLIPBOARD, ['copy', 'cut', 'paste', 'beforecopy', 'beforecut', 'beforepaste'], ['*']);
    this.createEventListenerBreakpoints(
        Category.CONTROL,
        [
          'resize',
          'scroll',
          'scrollend',
          'scrollsnapchange',
          'scrollsnapchanging',
          'zoom',
          'focus',
          'blur',
          'select',
          'change',
          'submit',
          'reset',
        ],
        ['*']);
    this.createEventListenerBreakpoints(Category.DEVICE, ['deviceorientation', 'devicemotion'], ['*']);
    this.createEventListenerBreakpoints(
        Category.DOM_MUTATION,
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
        Category.DRAG_DROP, ['drag', 'dragstart', 'dragend', 'dragenter', 'dragover', 'dragleave', 'drop'], ['*']);

    this.createEventListenerBreakpoints(Category.KEYBOARD, ['keydown', 'keyup', 'keypress', 'input'], ['*']);
    this.createEventListenerBreakpoints(
        Category.LOAD,
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
        Category.MOUSE,
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
        Category.POINTER,
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
    this.createEventListenerBreakpoints(Category.TOUCH, ['touchstart', 'touchmove', 'touchend', 'touchcancel'], ['*']);
    this.createEventListenerBreakpoints(Category.WORKER, ['message', 'messageerror'], ['*']);
    this.createEventListenerBreakpoints(
        Category.XHR, ['readystatechange', 'load', 'loadstart', 'loadend', 'abort', 'error', 'progress', 'timeout'],
        ['xmlhttprequest', 'xmlhttprequestupload']);

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

  private createEventListenerBreakpoints(category: Category, eventNames: string[], eventTargetNames: string[]): void {
    for (const eventName of eventNames) {
      this.#eventListenerBreakpointsInternal.push(
          new DOMEventListenerBreakpoint(eventName, eventTargetNames, category));
    }
  }

  resolveEventListenerBreakpoint({eventName, targetName}: EventListenerPausedDetailsAuxData): DOMEventListenerBreakpoint
      |null {
    const listenerPrefix = 'listener:';
    if (eventName.startsWith(listenerPrefix)) {
      eventName = eventName.substring(listenerPrefix.length);
    } else {
      return null;
    }
    targetName = (targetName || '*').toLowerCase();
    let result: DOMEventListenerBreakpoint|null = null;
    for (const breakpoint of this.#eventListenerBreakpointsInternal) {
      if (eventName && breakpoint.name === eventName && breakpoint.eventTargetNames.indexOf(targetName) !== -1) {
        result = breakpoint;
      }
      if (!result && eventName && breakpoint.name === eventName && breakpoint.eventTargetNames.indexOf('*') !== -1) {
        result = breakpoint;
      }
    }
    return result;
  }

  eventListenerBreakpoints(): DOMEventListenerBreakpoint[] {
    return this.#eventListenerBreakpointsInternal.slice();
  }

  updateCSPViolationBreakpoints(): void {
    const violationTypes = this.#cspViolationsToBreakOn.filter(v => v.enabled()).map(v => v.type());
    for (const model of TargetManager.instance().models(DOMDebuggerModel)) {
      this.updateCSPViolationBreakpointsForModel(model, violationTypes);
    }
  }

  private updateCSPViolationBreakpointsForModel(
      model: DOMDebuggerModel, violationTypes: Protocol.DOMDebugger.CSPViolationType[]): void {
    void model.agent.invoke_setBreakOnCSPViolation({violationTypes});
  }

  xhrBreakpoints(): Map<string, boolean> {
    return this.#xhrBreakpointsInternal;
  }

  private saveXHRBreakpoints(): void {
    const breakpoints = [];
    for (const url of this.#xhrBreakpointsInternal.keys()) {
      breakpoints.push({url, enabled: this.#xhrBreakpointsInternal.get(url) || false});
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
        void domDebuggerModel.agent.invoke_setXHRBreakpoint({url});
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
