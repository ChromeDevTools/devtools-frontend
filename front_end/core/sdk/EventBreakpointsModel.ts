// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';

import {CategorizedBreakpoint, Category} from './CategorizedBreakpoint.js';
import {SDKModel} from './SDKModel.js';
import {Capability, type Target} from './Target.js';
import {type SDKModelObserver, TargetManager} from './TargetManager.js';

const UIStrings = {
  /**
   * @description Name of a breakpoint type.
   * https://github.com/WICG/turtledove/blob/main/FLEDGE.md#32-on-device-bidding
   */
  beforeBidderWorkletBiddingStart: 'Bidder Bidding Phase Start',

  /**
   * @description Name of a breakpoint type.
   * https://github.com/WICG/turtledove/blob/main/FLEDGE.md#52-buyer-reporting-on-render-and-ad-events
   */
  beforeBidderWorkletReportingStart: 'Bidder Reporting Phase Start',

  /**
   * @description Name of a breakpoint type.
   * https://github.com/WICG/turtledove/blob/main/FLEDGE.md#23-scoring-bids
   */
  beforeSellerWorkletScoringStart: 'Seller Scoring Phase Start',

  /**
   * @description Name of a breakpoint type.
   * https://github.com/WICG/turtledove/blob/main/FLEDGE.md#51-seller-reporting-on-render
   */
  beforeSellerWorkletReportingStart: 'Seller Reporting Phase Start',
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

const str_ = i18n.i18n.registerUIStrings('core/sdk/EventBreakpointsModel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

const enum InstrumentationNames {
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

// We use an object literal instead of an ES map since TS ensures that all
// variants of the `InstrumentationNames` enum are present.
const INSTRUMENTATION_NAME_TITELS: Record<InstrumentationNames, () => Common.UIString.LocalizedString> = {
  [InstrumentationNames.BeforeBidderWorkletBiddingStart]: i18nLazyString(UIStrings.beforeBidderWorkletBiddingStart),
  [InstrumentationNames.BeforeBidderWorkletReportingStart]: i18nLazyString(UIStrings.beforeBidderWorkletReportingStart),
  [InstrumentationNames.BeforeSellerWorkletScoringStart]: i18nLazyString(UIStrings.beforeSellerWorkletScoringStart),
  [InstrumentationNames.BeforeSellerWorkletReportingStart]: i18nLazyString(UIStrings.beforeSellerWorkletReportingStart),
  [InstrumentationNames.SetTimeout]: i18n.i18n.lockedLazyString('setTimeout'),
  [InstrumentationNames.ClearTimeout]: i18n.i18n.lockedLazyString('clearTimeout'),
  [InstrumentationNames.SetInterval]: i18n.i18n.lockedLazyString('setInterval'),
  [InstrumentationNames.ClearInterval]: i18n.i18n.lockedLazyString('clearInterval'),
  [InstrumentationNames.SetTimeoutCallback]: i18nLazyString(UIStrings.setTimeoutOrIntervalFired, {PH1: 'setTimeout'}),
  [InstrumentationNames.SetIntervalCallback]: i18nLazyString(UIStrings.setTimeoutOrIntervalFired, {PH1: 'setInterval'}),
  [InstrumentationNames.ScriptFirstStatement]: i18nLazyString(UIStrings.scriptFirstStatement),
  [InstrumentationNames.ScriptBlockedByCSP]: i18nLazyString(UIStrings.scriptBlockedByContentSecurity),
  [InstrumentationNames.RequestAnimationFrame]: i18nLazyString(UIStrings.requestAnimationFrame),
  [InstrumentationNames.CancelAnimationFrame]: i18nLazyString(UIStrings.cancelAnimationFrame),
  [InstrumentationNames.RequestAnimationFrameCallback]: i18nLazyString(UIStrings.animationFrameFired),
  [InstrumentationNames.WebGLErrorFired]: i18nLazyString(UIStrings.webglErrorFired),
  [InstrumentationNames.WebGLWarningFired]: i18nLazyString(UIStrings.webglWarningFired),
  [InstrumentationNames.ElementSetInnerHTML]: i18nLazyString(UIStrings.setInnerhtml),
  [InstrumentationNames.CanvasContextCreated]: i18nLazyString(UIStrings.createCanvasContext),
  [InstrumentationNames.GeolocationGetCurrentPosition]: i18n.i18n.lockedLazyString('getCurrentPosition'),
  [InstrumentationNames.GeolocationWatchPosition]: i18n.i18n.lockedLazyString('watchPosition'),
  [InstrumentationNames.NotificationRequestPermission]: i18n.i18n.lockedLazyString('requestPermission'),
  [InstrumentationNames.DOMWindowClose]: i18n.i18n.lockedLazyString('window.close'),
  [InstrumentationNames.DocumentWrite]: i18n.i18n.lockedLazyString('document.write'),
  [InstrumentationNames.AudioContextCreated]: i18nLazyString(UIStrings.createAudiocontext),
  [InstrumentationNames.AudioContextClosed]: i18nLazyString(UIStrings.closeAudiocontext),
  [InstrumentationNames.AudioContextResumed]: i18nLazyString(UIStrings.resumeAudiocontext),
  [InstrumentationNames.AudioContextSuspended]: i18nLazyString(UIStrings.suspendAudiocontext),
};

function getTitleForInstrumentationName(instrumentationName: InstrumentationNames): Common.UIString.LocalizedString {
  return INSTRUMENTATION_NAME_TITELS[instrumentationName]();
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
  readonly instrumentationName: string;
  constructor(instrumentationName: InstrumentationNames, category: Category) {
    super(category, getTitleForInstrumentationName(instrumentationName));
    this.instrumentationName = instrumentationName;
  }

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
      void model.agent.invoke_setInstrumentationBreakpoint({eventName: this.instrumentationName});
    } else {
      void model.agent.invoke_removeInstrumentationBreakpoint({eventName: this.instrumentationName});
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
      this.#eventListenerBreakpointsInternal.push(new EventListenerBreakpoint(instrumentationName, category));
    }
  }

  eventListenerBreakpoints(): EventListenerBreakpoint[] {
    return this.#eventListenerBreakpointsInternal.slice();
  }

  resolveEventListenerBreakpointTitle(auxData: {
    eventName: string,
    webglErrorName: string,
    directiveText: string,
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
    const breakpoint = this.resolveEventListenerBreakpoint(auxData);
    return breakpoint?.title() ?? '';
  }

  resolveEventListenerBreakpoint(auxData: {eventName: string}): EventListenerBreakpoint|null {
    const eventName = auxData.eventName;
    if (!eventName.startsWith(EventListenerBreakpoint.instrumentationPrefix)) {
      return null;
    }

    const instrumentationName = eventName.substring(EventListenerBreakpoint.instrumentationPrefix.length);
    return this.#eventListenerBreakpointsInternal.find(b => b.instrumentationName === instrumentationName) || null;
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
