// Copyright 2017 The Chromium Authors
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
  readonly #runtimeModel: RuntimeModel;
  #domModel: DOMModel;
  #domBreakpoints: DOMBreakpoint[];
  readonly #domBreakpointsSetting: Common.Settings.Setting<Array<{
    url: Platform.DevToolsPath.UrlString,
    path: string,
    type: Protocol.DOMDebugger.DOMBreakpointType,
    enabled: boolean,
  }>>;
  suspended = false;

  constructor(target: Target) {
    super(target);
    this.agent = target.domdebuggerAgent();
    this.#runtimeModel = (target.model(RuntimeModel) as RuntimeModel);
    this.#domModel = (target.model(DOMModel) as DOMModel);
    this.#domModel.addEventListener(DOMModelEvents.DocumentUpdated, this.documentUpdated, this);
    this.#domModel.addEventListener(DOMModelEvents.NodeRemoved, this.nodeRemoved, this);

    this.#domBreakpoints = [];
    this.#domBreakpointsSetting = Common.Settings.Settings.instance().createLocalSetting('dom-breakpoints', []);
    if (this.#domModel.existingDocument()) {
      void this.documentUpdated();
    }
  }

  runtimeModel(): RuntimeModel {
    return this.#runtimeModel;
  }

  override async suspendModel(): Promise<void> {
    this.suspended = true;
  }

  override async resumeModel(): Promise<void> {
    this.suspended = false;
  }

  async eventListeners(remoteObject: RemoteObject): Promise<EventListener[]> {
    console.assert(remoteObject.runtimeModel() === this.#runtimeModel);
    if (!remoteObject.objectId) {
      return [];
    }

    const listeners = await this.agent.invoke_getEventListeners({objectId: remoteObject.objectId});
    const eventListeners = [];
    for (const payload of listeners.listeners || []) {
      const location = this.#runtimeModel.debuggerModel().createRawLocationByScriptId(
          payload.scriptId, payload.lineNumber, payload.columnNumber);
      if (!location) {
        continue;
      }
      eventListeners.push(new EventListener(
          this, remoteObject, payload.type, payload.useCapture, payload.passive, payload.once,
          payload.handler ? this.#runtimeModel.createRemoteObject(payload.handler) : null,
          payload.originalHandler ? this.#runtimeModel.createRemoteObject(payload.originalHandler) : null, location,
          null));
    }
    return eventListeners;
  }

  retrieveDOMBreakpoints(): void {
    void this.#domModel.requestDocument();
  }

  domBreakpoints(): DOMBreakpoint[] {
    return this.#domBreakpoints.slice();
  }

  hasDOMBreakpoint(node: DOMNode, type: Protocol.DOMDebugger.DOMBreakpointType): boolean {
    return this.#domBreakpoints.some(breakpoint => (breakpoint.node === node && breakpoint.type === type));
  }

  setDOMBreakpoint(node: DOMNode, type: Protocol.DOMDebugger.DOMBreakpointType): DOMBreakpoint {
    for (const breakpoint of this.#domBreakpoints) {
      if (breakpoint.node === node && breakpoint.type === type) {
        this.toggleDOMBreakpoint(breakpoint, true);
        return breakpoint;
      }
    }
    const breakpoint = new DOMBreakpoint(this, node, type, true);
    this.#domBreakpoints.push(breakpoint);
    this.enableDOMBreakpoint(breakpoint);
    this.saveDOMBreakpoints();
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
    this.saveDOMBreakpoints();
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
    for (const breakpoint of this.#domBreakpoints) {
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
    const removed = this.#domBreakpoints;
    this.#domBreakpoints = [];
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

      // Before creating a new DOMBreakpoint, we need to ensure there's no
      // existing breakpoint with the same node and breakpoint type, else we would create
      // multiple DOMBreakpoints of the same type and for the same node.
      for (const existingBreakpoint of this.#domBreakpoints) {
        if (existingBreakpoint.node === node && existingBreakpoint.type === breakpoint.type) {
          return;
        }
      }

      const domBreakpoint = new DOMBreakpoint(this, node, breakpoint.type, breakpoint.enabled);
      this.#domBreakpoints.push(domBreakpoint);
      if (breakpoint.enabled) {
        this.enableDOMBreakpoint(domBreakpoint);
      }
      this.dispatchEventToListeners(Events.DOM_BREAKPOINT_ADDED, domBreakpoint);
    }
  }

  private removeDOMBreakpoints(filter: (arg0: DOMBreakpoint) => boolean): void {
    const removed = [];
    const left = [];
    for (const breakpoint of this.#domBreakpoints) {
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
    this.#domBreakpoints = left;
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
    for (const breakpoint of this.#domBreakpoints) {
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

export interface EventTypes {
  [Events.DOM_BREAKPOINT_ADDED]: DOMBreakpoint;
  [Events.DOM_BREAKPOINT_TOGGLED]: DOMBreakpoint;
  [Events.DOM_BREAKPOINTS_REMOVED]: DOMBreakpoint[];
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
  readonly #domDebuggerModel: DOMDebuggerModel;
  readonly #eventTarget: RemoteObject;
  readonly #type: string;
  readonly #useCapture: boolean;
  readonly #passive: boolean;
  readonly #once: boolean;
  readonly #handler: RemoteObject|null;
  readonly #originalHandler: RemoteObject|null;
  readonly #location: Location;
  readonly #sourceURL: Platform.DevToolsPath.UrlString;
  readonly #customRemoveFunction: RemoteObject|null;
  #origin: string;

  constructor(
      domDebuggerModel: DOMDebuggerModel, eventTarget: RemoteObject, type: string, useCapture: boolean,
      passive: boolean, once: boolean, handler: RemoteObject|null, originalHandler: RemoteObject|null,
      location: Location, customRemoveFunction: RemoteObject|null, origin?: string) {
    this.#domDebuggerModel = domDebuggerModel;
    this.#eventTarget = eventTarget;
    this.#type = type;
    this.#useCapture = useCapture;
    this.#passive = passive;
    this.#once = once;
    this.#handler = handler;
    this.#originalHandler = originalHandler || handler;
    this.#location = location;
    const script = location.script();
    this.#sourceURL = script ? script.contentURL() : Platform.DevToolsPath.EmptyUrlString;
    this.#customRemoveFunction = customRemoveFunction;
    this.#origin = origin || EventListener.Origin.RAW;
  }

  domDebuggerModel(): DOMDebuggerModel {
    return this.#domDebuggerModel;
  }

  type(): string {
    return this.#type;
  }

  useCapture(): boolean {
    return this.#useCapture;
  }

  passive(): boolean {
    return this.#passive;
  }

  once(): boolean {
    return this.#once;
  }

  handler(): RemoteObject|null {
    return this.#handler;
  }

  location(): Location {
    return this.#location;
  }

  sourceURL(): Platform.DevToolsPath.UrlString {
    return this.#sourceURL;
  }

  originalHandler(): RemoteObject|null {
    return this.#originalHandler;
  }

  canRemove(): boolean {
    return Boolean(this.#customRemoveFunction) || this.#origin !== EventListener.Origin.FRAMEWORK_USER;
  }

  remove(): Promise<void> {
    if (!this.canRemove()) {
      return Promise.resolve(undefined);
    }

    if (this.#origin !== EventListener.Origin.FRAMEWORK_USER) {
      function removeListener(
          this: {
            removeEventListener: (arg0: string, arg1: () => void, arg2: boolean) => void,
          },
          type: string, listener: () => void, useCapture: boolean): void {
        this.removeEventListener(type, listener, useCapture);
        // @ts-expect-error:
        if (this['on' + type]) {
          // @ts-expect-error:
          this['on' + type] = undefined;
        }
      }

      return this.#eventTarget
          .callFunction(
              removeListener,
              [
                RemoteObject.toCallArgument(this.#type),
                RemoteObject.toCallArgument(this.#originalHandler),
                RemoteObject.toCallArgument(this.#useCapture),
              ])
          .then(() => undefined);
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
                RemoteObject.toCallArgument(this.#type),
                RemoteObject.toCallArgument(this.#originalHandler),
                RemoteObject.toCallArgument(this.#useCapture),
                RemoteObject.toCallArgument(this.#passive),
              ])
          .then(() => undefined);
    }
    return Promise.resolve(undefined);
  }

  canTogglePassive(): boolean {
    return this.#origin !== EventListener.Origin.FRAMEWORK_USER;
  }

  togglePassive(): Promise<undefined> {
    return this.#eventTarget
        .callFunction(
            callTogglePassive,
            [
              RemoteObject.toCallArgument(this.#type),
              RemoteObject.toCallArgument(this.#originalHandler),
              RemoteObject.toCallArgument(this.#useCapture),
              RemoteObject.toCallArgument(this.#passive),
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
    return this.#origin;
  }

  markAsFramework(): void {
    this.#origin = EventListener.Origin.FRAMEWORK;
  }

  isScrollBlockingType(): boolean {
    return this.#type === 'touchstart' || this.#type === 'touchmove' || this.#type === 'mousewheel' ||
        this.#type === 'wheel';
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
  readonly #type: Protocol.DOMDebugger.CSPViolationType;
  constructor(category: Category, type: Protocol.DOMDebugger.CSPViolationType) {
    super(category, type);
    this.#type = type;
  }

  type(): Protocol.DOMDebugger.CSPViolationType {
    return this.#type;
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
  readonly #xhrBreakpointsSetting: Common.Settings.Setting<Array<{url: string, enabled: boolean}>>;
  readonly #xhrBreakpoints = new Map<string, boolean>();

  readonly #cspViolationsToBreakOn: CSPViolationBreakpoint[] = [];
  readonly #eventListenerBreakpoints: DOMEventListenerBreakpoint[] = [];

  constructor() {
    this.#xhrBreakpointsSetting = Common.Settings.Settings.instance().createLocalSetting('xhr-breakpoints', []);
    for (const breakpoint of this.#xhrBreakpointsSetting.get()) {
      this.#xhrBreakpoints.set(breakpoint.url, breakpoint.enabled);
    }

    this.#cspViolationsToBreakOn.push(new CSPViolationBreakpoint(
        Category.TRUSTED_TYPE_VIOLATION, Protocol.DOMDebugger.CSPViolationType.TrustedtypeSinkViolation));
    this.#cspViolationsToBreakOn.push(new CSPViolationBreakpoint(
        Category.TRUSTED_TYPE_VIOLATION, Protocol.DOMDebugger.CSPViolationType.TrustedtypePolicyViolation));

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
      this.#eventListenerBreakpoints.push(new DOMEventListenerBreakpoint(eventName, eventTargetNames, category));
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
    for (const breakpoint of this.#eventListenerBreakpoints) {
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
    return this.#eventListenerBreakpoints.slice();
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
    return this.#xhrBreakpoints;
  }

  private saveXHRBreakpoints(): void {
    const breakpoints = [];
    for (const url of this.#xhrBreakpoints.keys()) {
      breakpoints.push({url, enabled: this.#xhrBreakpoints.get(url) || false});
    }
    this.#xhrBreakpointsSetting.set(breakpoints);
  }

  addXHRBreakpoint(url: string, enabled: boolean): void {
    this.#xhrBreakpoints.set(url, enabled);
    if (enabled) {
      for (const model of TargetManager.instance().models(DOMDebuggerModel)) {
        void model.agent.invoke_setXHRBreakpoint({url});
      }
    }
    this.saveXHRBreakpoints();
  }

  removeXHRBreakpoint(url: string): void {
    const enabled = this.#xhrBreakpoints.get(url);
    this.#xhrBreakpoints.delete(url);
    if (enabled) {
      for (const model of TargetManager.instance().models(DOMDebuggerModel)) {
        void model.agent.invoke_removeXHRBreakpoint({url});
      }
    }
    this.saveXHRBreakpoints();
  }

  toggleXHRBreakpoint(url: string, enabled: boolean): void {
    this.#xhrBreakpoints.set(url, enabled);
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
    for (const url of this.#xhrBreakpoints.keys()) {
      if (this.#xhrBreakpoints.get(url)) {
        void domDebuggerModel.agent.invoke_setXHRBreakpoint({url});
      }
    }
    for (const breakpoint of this.#eventListenerBreakpoints) {
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
