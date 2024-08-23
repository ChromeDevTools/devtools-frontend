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
  BEFORE_BIDDER_WORKLET_BIDDING_START = 'beforeBidderWorkletBiddingStart',
  BEFORE_BIDDER_WORKLET_REPORTING_START = 'beforeBidderWorkletReportingStart',
  BEFORE_SELLER_WORKLET_SCORING_START = 'beforeSellerWorkletScoringStart',
  BEFORE_SELLER_WORKLET_REPORTING_START = 'beforeSellerWorkletReportingStart',
  SET_TIMEOUT = 'setTimeout',
  CLEAR_TIMEOUT = 'clearTimeout',
  SET_TIMEOUT_CALLBACK = 'setTimeout.callback',
  SET_INTERVAL = 'setInterval',
  CLEAR_INTERVAL = 'clearInterval',
  SET_INTERVAL_CALLBACK = 'setInterval.callback',
  SCRIPT_FIRST_STATEMENT = 'scriptFirstStatement',
  SCRIPT_BLOCKED_BY_CSP = 'scriptBlockedByCSP',
  SHARED_STORAGE_WORKLET_SCRIPT_FIRST_STATEMENT = 'sharedStorageWorkletScriptFirstStatement',
  REQUEST_ANIMATION_FRAME = 'requestAnimationFrame',
  CANCEL_ANIMATION_FRAME = 'cancelAnimationFrame',
  REQUEST_ANIMATION_FRAME_CALLBACK = 'requestAnimationFrame.callback',
  WEBGL_ERROR_FIRED = 'webglErrorFired',
  WEBGL_WARNING_FIRED = 'webglWarningFired',
  ELEMENT_SET_INNER_HTML = 'Element.setInnerHTML',
  CANVAS_CONTEXT_CREATED = 'canvasContextCreated',
  GEOLOCATION_GET_CURRENT_POSITION = 'Geolocation.getCurrentPosition',
  GEOLOCATION_WATCH_POSITION = 'Geolocation.watchPosition',
  NOTIFCATION_REQUEST_PERMISSION = 'Notification.requestPermission',
  DOM_WINDOW_CLOSE = 'DOMWindow.close',
  DOCUMENT_WRITE = 'Document.write',
  AUDIO_CONTEXT_CREATED = 'audioContextCreated',
  AUDIO_CONTEXT_CLOSED = 'audioContextClosed',
  AUDIO_CONTEXT_RESUMED = 'audioContextResumed',
  AUDIO_CONTEXT_SUSPENDED = 'audioContextSuspended',
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
    this.createInstrumentationBreakpoints(Category.AUCTION_WORKLET, [
      InstrumentationNames.BEFORE_BIDDER_WORKLET_BIDDING_START,
      InstrumentationNames.BEFORE_BIDDER_WORKLET_REPORTING_START,
      InstrumentationNames.BEFORE_SELLER_WORKLET_SCORING_START,
      InstrumentationNames.BEFORE_SELLER_WORKLET_REPORTING_START,
    ]);
    this.createInstrumentationBreakpoints(Category.ANIMATION, [
      InstrumentationNames.REQUEST_ANIMATION_FRAME,
      InstrumentationNames.CANCEL_ANIMATION_FRAME,
      InstrumentationNames.REQUEST_ANIMATION_FRAME_CALLBACK,
    ]);
    this.createInstrumentationBreakpoints(Category.CANVAS, [
      InstrumentationNames.CANVAS_CONTEXT_CREATED,
      InstrumentationNames.WEBGL_ERROR_FIRED,
      InstrumentationNames.WEBGL_WARNING_FIRED,
    ]);
    this.createInstrumentationBreakpoints(Category.GEOLOCATION, [
      InstrumentationNames.GEOLOCATION_GET_CURRENT_POSITION,
      InstrumentationNames.GEOLOCATION_WATCH_POSITION,
    ]);
    this.createInstrumentationBreakpoints(Category.NOTIFICATION, [
      InstrumentationNames.NOTIFCATION_REQUEST_PERMISSION,
    ]);
    this.createInstrumentationBreakpoints(Category.PARSE, [
      InstrumentationNames.ELEMENT_SET_INNER_HTML,
      InstrumentationNames.DOCUMENT_WRITE,
    ]);
    this.createInstrumentationBreakpoints(Category.SCRIPT, [
      InstrumentationNames.SCRIPT_FIRST_STATEMENT,
      InstrumentationNames.SCRIPT_BLOCKED_BY_CSP,
    ]);
    this.createInstrumentationBreakpoints(Category.SHARED_STORAGE_WORKLET, [
      InstrumentationNames.SHARED_STORAGE_WORKLET_SCRIPT_FIRST_STATEMENT,
    ]);
    this.createInstrumentationBreakpoints(Category.TIMER, [
      InstrumentationNames.SET_TIMEOUT,
      InstrumentationNames.CLEAR_TIMEOUT,
      InstrumentationNames.SET_TIMEOUT_CALLBACK,
      InstrumentationNames.SET_INTERVAL,
      InstrumentationNames.CLEAR_INTERVAL,
      InstrumentationNames.SET_INTERVAL_CALLBACK,
    ]);
    this.createInstrumentationBreakpoints(Category.WINDOW, [
      InstrumentationNames.DOM_WINDOW_CLOSE,
    ]);
    this.createInstrumentationBreakpoints(Category.WEB_AUDIO, [
      InstrumentationNames.AUDIO_CONTEXT_CREATED,
      InstrumentationNames.AUDIO_CONTEXT_CLOSED,
      InstrumentationNames.AUDIO_CONTEXT_RESUMED,
      InstrumentationNames.AUDIO_CONTEXT_SUSPENDED,
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

SDKModel.register(EventBreakpointsModel, {capabilities: Capability.EVENT_BREAKPOINTS, autostart: false});
