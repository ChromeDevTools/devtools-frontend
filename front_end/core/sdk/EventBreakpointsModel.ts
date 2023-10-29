// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';

import {CategorizedBreakpoint, Category} from './CategorizedBreakpoint.js';
import {type EventListenerPausedDetailsAuxData} from './DebuggerModel.js';
import {SDKModel} from './SDKModel.js';
import {Capability, type Target} from './Target.js';
import {type SDKModelObserver, TargetManager} from './TargetManager.js';

export const enum InstrumentationNames {
  BeforeBidderWorkletBiddingStart = 'beforeBidderWorkletBiddingStart',
  BeforeBidderWorkletReportingStart = 'beforeBidderWorkletReportingStart',
  BeforeSellerWorkletScoringStart = 'beforeSellerWorkletScoringStart',
  BeforeSellerWorkletReportingStart = 'beforeSellerWorkletReportingStart',
  SetTimeout = 'setTimeout',
  ClearTimeout = 'clearTimeout',
  SetInterval = 'setInterval',
  ClearInterval = 'clearInterval',
  SetTimeoutCallback = 'setTimeout.callback',
  SetIntervalCallback = 'setInterval.callback',
  ScriptFirstStatement = 'scriptFirstStatement',
  ScriptBlockedByCSP = 'scriptBlockedByCSP',
  SharedStorageWorkletScriptFirstStatement = 'sharedStorageWorkletScriptFirstStatement',
  RequestAnimationFrame = 'requestAnimationFrame',
  CancelAnimationFrame = 'cancelAnimationFrame',
  RequestAnimationFrameCallback = 'requestAnimationFrame.callback',
  WebGLErrorFired = 'webglErrorFired',
  WebGLWarningFired = 'webglWarningFired',
  ElementSetInnerHTML = 'Element.setInnerHTML',
  CanvasContextCreated = 'canvasContextCreated',
  GeolocationGetCurrentPosition = 'Geolocation.getCurrentPosition',
  GeolocationWatchPosition = 'Geolocation.watchPosition',
  NotificationRequestPermission = 'Notification.requestPermission',
  DOMWindowClose = 'DOMWindow.close',
  DocumentWrite = 'Document.write',
  AudioContextCreated = 'audioContextCreated',
  AudioContextClosed = 'audioContextClosed',
  AudioContextResumed = 'audioContextResumed',
  AudioContextSuspended = 'audioContextSuspended',
}

export class EventBreakpointsModel extends SDKModel<void> {
  readonly agent: ProtocolProxyApi.EventBreakpointsApi;

  constructor(target: Target) {
    super(target);
    this.agent = target.eventBreakpointsAgent();
  }
}

// This implementation (as opposed to similar class in DOMDebuggerModel) is for
// instrumentation breakpoints in targets that run JS but do not have a DOM.
class EventListenerBreakpoint extends CategorizedBreakpoint {

  override setEnabled(enabled: boolean): void {
    if (this.enabled() === enabled) {
      return;
    }
    super.setEnabled(enabled);
    for (const model of TargetManager.instance().models(EventBreakpointsModel)) {
      this.updateOnModel(model);
    }
  }

  updateOnModel(model: EventBreakpointsModel): void {
    if (this.enabled()) {
      void model.agent.invoke_setInstrumentationBreakpoint({eventName: this.name});
    } else {
      void model.agent.invoke_removeInstrumentationBreakpoint({eventName: this.name});
    }
  }

  static readonly instrumentationPrefix = 'instrumentation:';
}

let eventBreakpointManagerInstance: EventBreakpointsManager;

export class EventBreakpointsManager implements SDKModelObserver<EventBreakpointsModel> {
  readonly #eventListenerBreakpointsInternal: EventListenerBreakpoint[] = [];

  constructor() {
    this.createInstrumentationBreakpoints(Category.AuctionWorklet, [
      InstrumentationNames.BeforeBidderWorkletBiddingStart,
      InstrumentationNames.BeforeBidderWorkletReportingStart,
      InstrumentationNames.BeforeSellerWorkletScoringStart,
      InstrumentationNames.BeforeSellerWorkletReportingStart,
    ]);
    this.createInstrumentationBreakpoints(Category.Animation, [
      InstrumentationNames.RequestAnimationFrame,
      InstrumentationNames.CancelAnimationFrame,
      InstrumentationNames.RequestAnimationFrameCallback,
    ]);
    this.createInstrumentationBreakpoints(Category.Canvas, [
      InstrumentationNames.CanvasContextCreated,
      InstrumentationNames.WebGLErrorFired,
      InstrumentationNames.WebGLWarningFired,
    ]);
    this.createInstrumentationBreakpoints(Category.Geolocation, [
      InstrumentationNames.GeolocationGetCurrentPosition,
      InstrumentationNames.GeolocationWatchPosition,
    ]);
    this.createInstrumentationBreakpoints(Category.Notification, [
      InstrumentationNames.NotificationRequestPermission,
    ]);
    this.createInstrumentationBreakpoints(Category.Parse, [
      InstrumentationNames.ElementSetInnerHTML,
      InstrumentationNames.DocumentWrite,
    ]);
    this.createInstrumentationBreakpoints(Category.Script, [
      InstrumentationNames.ScriptFirstStatement,
      InstrumentationNames.ScriptBlockedByCSP,
    ]);
    this.createInstrumentationBreakpoints(Category.SharedStorageWorklet, [
      InstrumentationNames.SharedStorageWorkletScriptFirstStatement,
    ]);
    this.createInstrumentationBreakpoints(Category.Timer, [
      InstrumentationNames.SetTimeout,
      InstrumentationNames.ClearTimeout,
      InstrumentationNames.SetInterval,
      InstrumentationNames.ClearInterval,
      InstrumentationNames.SetTimeoutCallback,
      InstrumentationNames.SetIntervalCallback,
    ]);
    this.createInstrumentationBreakpoints(Category.Window, [
      InstrumentationNames.DOMWindowClose,
    ]);
    this.createInstrumentationBreakpoints(Category.WebAudio, [
      InstrumentationNames.AudioContextCreated,
      InstrumentationNames.AudioContextClosed,
      InstrumentationNames.AudioContextResumed,
      InstrumentationNames.AudioContextSuspended,
    ]);

    TargetManager.instance().observeModels(EventBreakpointsModel, this);
  }

  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): EventBreakpointsManager {
    const {forceNew} = opts;
    if (!eventBreakpointManagerInstance || forceNew) {
      eventBreakpointManagerInstance = new EventBreakpointsManager();
    }

    return eventBreakpointManagerInstance;
  }

  private createInstrumentationBreakpoints(category: Category, instrumentationNames: InstrumentationNames[]): void {
    for (const instrumentationName of instrumentationNames) {
      this.#eventListenerBreakpointsInternal.push(new EventListenerBreakpoint(category, instrumentationName));
    }
  }

  eventListenerBreakpoints(): EventListenerBreakpoint[] {
    return this.#eventListenerBreakpointsInternal.slice();
  }

  resolveEventListenerBreakpoint({eventName}: EventListenerPausedDetailsAuxData): EventListenerBreakpoint|null {
    if (!eventName.startsWith(EventListenerBreakpoint.instrumentationPrefix)) {
      return null;
    }

    const instrumentationName = eventName.substring(EventListenerBreakpoint.instrumentationPrefix.length);
    return this.#eventListenerBreakpointsInternal.find(b => b.name === instrumentationName) || null;
  }

  modelAdded(eventBreakpointModel: EventBreakpointsModel): void {
    for (const breakpoint of this.#eventListenerBreakpointsInternal) {
      if (breakpoint.enabled()) {
        breakpoint.updateOnModel(eventBreakpointModel);
      }
    }
  }

  modelRemoved(_eventBreakpointModel: EventBreakpointsModel): void {
  }
}

SDKModel.register(EventBreakpointsModel, {capabilities: Capability.EventBreakpoints, autostart: false});
