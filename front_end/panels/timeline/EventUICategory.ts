// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as TraceEngine from '../../models/trace/trace.js';

const UIStrings = {
  /**
   *@description Category in the Summary view of the Performance panel to indicate time spent to load resources
   */
  loading: 'Loading',
  /**
   *@description Text in Timeline for the Experience title
   */
  experience: 'Experience',
  /**
   *@description Category in the Summary view of the Performance panel to indicate time spent in script execution
   */
  scripting: 'Scripting',
  /**
   *@description Category in the Summary view of the Performance panel to indicate time spent in rendering the web page
   */
  rendering: 'Rendering',
  /**
   *@description Category in the Summary view of the Performance panel to indicate time spent to visually represent the web page
   */
  painting: 'Painting',
  /**
   *@description Event category in the Performance panel for time spent in the GPU
   */
  gpu: 'GPU',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  async: 'Async',
  /**
   *@description Category in the Summary view of the Performance panel to indicate time spent in the rest of the system
   */
  system: 'System',
  /**
   *@description Category in the Summary view of the Performance panel to indicate idle time
   */
  idle: 'Idle',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  task: 'Task',
  /**
   *@description Text for other types of items
   */
  other: 'Other',
  /**
   *@description Text that refers to the animation of the web page
   */
  animation: 'Animation',
  /**
   *@description Text that refers to some events
   */
  event: 'Event',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  requestMainThreadFrame: 'Request Main Thread Frame',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  frameStart: 'Frame Start',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  frameStartMainThread: 'Frame Start (main thread)',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  drawFrame: 'Draw Frame',
  /**
   *@description Noun for an event in the Performance panel. This marks time
    spent in an operation that only happens when the profiler is active.
   */
  profilingOverhead: 'Profiling Overhead',
  /**
   *@description The process the browser uses to determine a target element for a
   *pointer event. Typically, this is determined by considering the pointer's
   *location and also the visual layout of elements on the screen.
   */
  hitTest: 'Hit Test',
  /**
   *@description Noun for an event in the Performance panel. The browser has decided
   *that the styles for some elements need to be recalculated and scheduled that
   *recalculation process at some time in the future.
   */
  scheduleStyleRecalculation: 'Schedule Style Recalculation',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  recalculateStyle: 'Recalculate Style',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  invalidateLayout: 'Invalidate Layout',
  /**
   *@description Noun for an event in the Performance panel. Layerize is a step
   *where we calculate which layers to create.
   */
  layerize: 'Layerize',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  layout: 'Layout',
  /**
   *@description Noun for an event in the Performance panel. Paint setup is a
   *step before the 'Paint' event. A paint event is when the browser draws pixels
   *to the screen. This step is the setup beforehand.
   */
  paintSetup: 'Paint Setup',
  /**
   *@description Noun for a paint event in the Performance panel, where an image
   *was being painted. A paint event is when the browser draws pixels to the
   *screen, in this case specifically for an image in a website.
   */
  paintImage: 'Paint Image',
  /**
   *@description Noun for an event in the Performance panel. Pre-paint is a
   *step before the 'Paint' event. A paint event is when the browser records the
   *instructions for drawing the page. This step is the setup beforehand.
   */
  prePaint: 'Pre-Paint',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  updateLayer: 'Update Layer',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  updateLayerTree: 'Update Layer Tree',
  /**
   *@description Noun for a paint event in the Performance panel. A paint event is when the browser draws pixels to the screen.
   */
  paint: 'Paint',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  rasterizePaint: 'Rasterize Paint',
  /**
   *@description The action to scroll
   */
  scroll: 'Scroll',
  /**
   *@description Noun for an event in the Performance panel. Commit is a step
   *where we send (also known as "commit") layers to the compositor thread. This
   *step follows the "Layerize" step which is what calculates which layers to
   *create.
   */
  commit: 'Commit',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  compositeLayers: 'Composite Layers',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  computeIntersections: 'Compute Intersections',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  parseHtml: 'Parse HTML',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  parseStylesheet: 'Parse Stylesheet',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  installTimer: 'Install Timer',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  removeTimer: 'Remove Timer',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  timerFired: 'Timer Fired',
  /**
   *@description Text for an event. Shown in the timeline in the Performance panel.
   * XHR refers to XmlHttpRequest, a Web API. This particular Web API has a property
   * named 'readyState' (https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/readyState). When
   * the 'readyState' property changes the text is shown.
   */
  xhrReadyStateChange: '`XHR` Ready State Change',
  /**
   * @description Text for an event. Shown in the timeline in the Perforamnce panel.
   * XHR refers to XmlHttpRequest, a Web API. (see https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest)
   * The text is shown when a XmlHttpRequest load event happens on the inspected page.
   */
  xhrLoad: '`XHR` Load',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  compileScript: 'Compile Script',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  cacheScript: 'Cache Script Code',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  compileCode: 'Compile Code',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  optimizeCode: 'Optimize Code',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  evaluateScript: 'Evaluate Script',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  compileModule: 'Compile Module',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  cacheModule: 'Cache Module Code',
  /**
   * @description Text for an event. Shown in the timeline in the Perforamnce panel.
   * "Module" refers to JavaScript modules: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
   * JavaScript modules are a way to organize JavaScript code.
   * "Evaluate" is the phase when the JavaScript code of a module is executed.
   */
  evaluateModule: 'Evaluate Module',
  /**
   *@description Noun indicating that a compile task (type: streaming) happened.
   */
  streamingCompileTask: 'Streaming Compile Task',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  waitingForNetwork: 'Waiting for Network',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  parseAndCompile: 'Parse and Compile',
  /**
   * @description Text in Timeline UIUtils of the Performance panel.
   * "Code Cache" refers to JavaScript bytecode cache: https://v8.dev/blog/code-caching-for-devs
   * "Deserialize" refers to the process of reading the code cache.
   */
  deserializeCodeCache: 'Deserialize Code Cache',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  streamingWasmResponse: 'Streaming Wasm Response',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  compiledWasmModule: 'Compiled Wasm Module',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  cachedWasmModule: 'Cached Wasm Module',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  wasmModuleCacheHit: 'Wasm Module Cache Hit',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  wasmModuleCacheInvalid: 'Wasm Module Cache Invalid',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  frameStartedLoading: 'Frame Started Loading',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  onloadEvent: 'Onload Event',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  domcontentloadedEvent: 'DOMContentLoaded Event',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  firstPaint: 'First Paint',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  firstContentfulPaint: 'First Contentful Paint',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  largestContentfulPaint: 'Largest Contentful Paint',
  /**
   *@description Text for timestamps of items
   */
  timestamp: 'Timestamp',
  /**
   *@description Noun for a 'time' event that happens in the Console (a tool in
   * DevTools). The user can trigger console time events from their code, and
   * they will show up in the Performance panel. Time events are used to measure
   * the duration of something, e.g. the user will emit two time events at the
   * start and end of some interesting task.
   */
  consoleTime: 'Console Time',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  userTiming: 'User Timing',
  /**
   * @description Name for an event shown in the Performance panel. When a network
   * request is about to be sent by the browser, the time is recorded and DevTools
   * is notified that a network request will be sent momentarily.
   */
  willSendRequest: 'Will Send Request',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  sendRequest: 'Send Request',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  receiveResponse: 'Receive Response',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  finishLoading: 'Finish Loading',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  receiveData: 'Receive Data',
  /**
   *@description Event category in the Performance panel for time spent to execute microtasks in JavaScript
   */
  runMicrotasks: 'Run Microtasks',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  functionCall: 'Function Call',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  gcEvent: 'GC Event',
  /**
   *@description Event category in the Performance panel for time spent to perform a full Garbage Collection pass
   */
  majorGc: 'Major GC',
  /**
   *@description Event category in the Performance panel for time spent to perform a quick Garbage Collection pass
   */
  minorGc: 'Minor GC',
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
   *@description Text in Timeline UIUtils of the Performance panel
   */
  requestIdleCallback: 'Request Idle Callback',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  cancelIdleCallback: 'Cancel Idle Callback',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  fireIdleCallback: 'Fire Idle Callback',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  createWebsocket: 'Create WebSocket',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  sendWebsocketHandshake: 'Send WebSocket Handshake',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  receiveWebsocketHandshake: 'Receive WebSocket Handshake',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  destroyWebsocket: 'Destroy WebSocket',
  /**
   *@description Event category in the Performance panel for time spent in the embedder of the WebView
   */
  embedderCallback: 'Embedder Callback',
  /**
   *@description Event category in the Performance panel for time spent decoding an image
   */
  imageDecode: 'Image Decode',
  /**
   *@description Event category in the Performance panel for time spent to resize an image
   */
  imageResize: 'Image Resize',
  /**
   *@description Event category in the Performance panel for time spent to perform Garbage Collection for the Document Object Model
   */
  domGc: 'DOM GC',
  /**
   *@description Event category in the Performance panel for time spent to perform encryption
   */
  encrypt: 'Encrypt',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  encryptReply: 'Encrypt Reply',
  /**
   *@description Event category in the Performance panel for time spent to perform decryption
   */
  decrypt: 'Decrypt',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  decryptReply: 'Decrypt Reply',
  /**
   * @description Noun phrase meaning 'the browser was preparing the digest'.
   * Digest: https://developer.mozilla.org/en-US/docs/Glossary/Digest
   */
  digest: 'Digest',
  /**
   *@description Noun phrase meaning 'the browser was preparing the digest
   *reply'. Digest: https://developer.mozilla.org/en-US/docs/Glossary/Digest
   */
  digestReply: 'Digest Reply',
  /**
   *@description The 'sign' stage of a web crypto event. Shown when displaying what the website was doing at a particular point in time.
   */
  sign: 'Sign',
  /**
   * @description Noun phrase for an event of the Web Crypto API. The event is recorded when the signing process is concluded.
   * Signature: https://developer.mozilla.org/en-US/docs/Glossary/Signature/Security
   */
  signReply: 'Sign Reply',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  verify: 'Verify',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  verifyReply: 'Verify Reply',
  /**
   *@description Text in Timeline UIUtils of the Performance panel
   */
  asyncTask: 'Async Task',
  /**
   *@description Text in Timeline for Layout Shift records
   */
  layoutShift: 'Layout Shift',
  /**
   *@description Text in Timeline for an Event Timing record
   */
  eventTiming: 'Event Timing',
  /**
   *@description Event category in the Performance panel for JavaScript nodes in CPUProfile
   */
  jsFrame: 'JS Frame',
};

export const EventCategories =
    ['Loading', 'Experience', 'Scripting', 'Rendering', 'Painting', 'GPU', 'Async', 'Other', 'Idle'] as const;
export type EventCategory = typeof EventCategories[number];

const str_ = i18n.i18n.registerUIStrings('panels/timeline/EventUICategory.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
export class EventCategoryStyle {
  visible: boolean;
  childColor: string;
  color: string;
  private titleCallback: () => string;
  private hiddenInternal?: boolean;

  constructor(titleCallback: () => string, visible: boolean, childColor: string, color: string) {
    this.titleCallback = titleCallback;
    this.visible = visible;
    this.childColor = childColor;
    this.color = color;
    this.hidden = false;
  }
  get title(): string {
    return this.titleCallback();
  }
  get hidden(): boolean {
    return Boolean(this.hiddenInternal);
  }

  set hidden(hidden: boolean) {
    this.hiddenInternal = hidden;
  }
}

export type CategoryPalette = {
  [c in EventCategory]: EventCategoryStyle
};

export const DEFAULT_CATEGORY_STYLES_PALETTE: CategoryPalette = {
  Loading: new EventCategoryStyle(i18nLazyString(UIStrings.loading), true, 'hsl(214, 67%, 74%)', 'hsl(214, 67%, 66%)'),
  Experience:
      new EventCategoryStyle(i18nLazyString(UIStrings.experience), false, 'hsl(5, 80%, 74%)', 'hsl(5, 80%, 66%)'),
  Scripting:
      new EventCategoryStyle(i18nLazyString(UIStrings.scripting), true, 'hsl(43, 83%, 72%)', 'hsl(43, 83%, 64%) '),
  Rendering:
      new EventCategoryStyle(i18nLazyString(UIStrings.rendering), true, 'hsl(256, 67%, 76%)', 'hsl(256, 67%, 70%)'),
  Painting:
      new EventCategoryStyle(i18nLazyString(UIStrings.painting), true, 'hsl(109, 33%, 64%)', 'hsl(109, 33%, 55%)'),
  GPU: new EventCategoryStyle(i18nLazyString(UIStrings.gpu), false, 'hsl(109, 33%, 64%)', 'hsl(109, 33%, 55%)'),
  Async: new EventCategoryStyle(i18nLazyString(UIStrings.async), false, 'hsl(0, 100%, 50%)', 'hsl(0, 100%, 40%)'),
  Other: new EventCategoryStyle(i18nLazyString(UIStrings.system), false, 'hsl(0, 0%, 87%)', 'hsl(0, 0%, 79%)'),
  Idle: new EventCategoryStyle(i18nLazyString(UIStrings.idle), false, 'hsl(0, 0%, 98%)', 'hsl(0, 0%, 98%)'),
};

/**
 * This map defines the styles for events shown in the panel. This
 * includes its color (which on the event's category, the label it's
 * displayed with and flag to know wether it's visible in the flamechart
 * or not).
 * The thread appenders use this map to determine if an event should be
 * shown in the flame chart. If an event is not in the map, then it
 * won't be shown, but it also won't be shown if it's marked as "hidden"
 * in its styles.
 *
 * The map is also used in other places, like the event's details view.
 */
export const EventStyles: Map<
    TraceEngine.Types.TraceEvents.KnownEventName,
    {categoryStyle: EventCategoryStyle, label: () => string, hidden?: boolean}> =
    new Map([
      [
        TraceEngine.Types.TraceEvents.KnownEventName.RunTask,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Other, label: i18nLazyString(UIStrings.task)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.ProfileCall,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.jsFrame)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.Program,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Other, label: i18nLazyString(UIStrings.other)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.StartProfiling,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Other, label: i18nLazyString(UIStrings.profilingOverhead)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.Animation,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Rendering, label: i18nLazyString(UIStrings.animation)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.EventDispatch,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.event)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.RequestMainThreadFrame,
        {
          categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Rendering,
          label: i18nLazyString(UIStrings.requestMainThreadFrame),
          hidden: true,
        },
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.BeginFrame,
        {
          categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Rendering,
          label: i18nLazyString(UIStrings.frameStart),
          hidden: true,
        },
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.BeginMainThreadFrame,
        {
          categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Rendering,
          label: i18nLazyString(UIStrings.frameStartMainThread),
          hidden: true,
        },
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.DrawFrame,
        {
          categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Rendering,
          label: i18nLazyString(UIStrings.drawFrame),
          hidden: true,
        },
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.HitTest,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Rendering, label: i18nLazyString(UIStrings.hitTest)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.ScheduleStyleRecalculation,
        {
          categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Rendering,
          label: i18nLazyString(UIStrings.scheduleStyleRecalculation),
        },
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.RecalculateStyles,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Rendering, label: i18nLazyString(UIStrings.recalculateStyle)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.UpdateLayoutTree,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Rendering, label: i18nLazyString(UIStrings.recalculateStyle)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.InvalidateLayout,
        {
          categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Rendering,
          label: i18nLazyString(UIStrings.invalidateLayout),
          hidden: true,
        },
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.Layerize,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Rendering, label: i18nLazyString(UIStrings.layerize)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.Layout,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Rendering, label: i18nLazyString(UIStrings.layout)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.PaintSetup,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Painting, label: i18nLazyString(UIStrings.paintSetup)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.PaintImage,
        {
          categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Painting,
          label: i18nLazyString(UIStrings.paintImage),
          hidden: true,
        },
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.UpdateLayer,
        {
          categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Painting,
          label: i18nLazyString(UIStrings.updateLayer),
          hidden: true,
        },
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.UpdateLayerTree,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Rendering, label: i18nLazyString(UIStrings.updateLayerTree)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.Paint,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Painting, label: i18nLazyString(UIStrings.paint)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.PrePaint,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Rendering, label: i18nLazyString(UIStrings.prePaint)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.RasterTask,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Painting, label: i18nLazyString(UIStrings.rasterizePaint)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.ScrollLayer,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Rendering, label: i18nLazyString(UIStrings.scroll)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.Commit,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Painting, label: i18nLazyString(UIStrings.commit)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.CompositeLayers,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Painting, label: i18nLazyString(UIStrings.compositeLayers)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.ComputeIntersections,
        {
          categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Rendering,
          label: i18nLazyString(UIStrings.computeIntersections),
        },
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.ParseHTML,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Loading, label: i18nLazyString(UIStrings.parseHtml)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.ParseAuthorStyleSheet,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Loading, label: i18nLazyString(UIStrings.parseStylesheet)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.TimerInstall,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.installTimer)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.TimerRemove,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.removeTimer)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.TimerFire,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.timerFired)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.XHRReadyStateChange,
        {
          categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting,
          label: i18nLazyString(UIStrings.xhrReadyStateChange),
        },
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.XHRLoad,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.xhrLoad)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.CompileScript,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.compileScript)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.CacheScript,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.cacheScript)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.CompileCode,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.compileCode)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.OptimizeCode,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.optimizeCode)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.EvaluateScript,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.evaluateScript)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.CompileModule,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.compileModule)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.CacheModule,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.cacheModule)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.EvaluateModule,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.evaluateModule)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.StreamingCompileScript,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Other, label: i18nLazyString(UIStrings.streamingCompileTask)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.StreamingCompileScriptWaiting,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Idle, label: i18nLazyString(UIStrings.waitingForNetwork)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.StreamingCompileScriptParsing,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.parseAndCompile)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.BackgroundDeserialize,
        {
          categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting,
          label: i18nLazyString(UIStrings.deserializeCodeCache),
        },
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.FinalizeDeserialization,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Other, label: i18nLazyString(UIStrings.profilingOverhead)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.WasmStreamFromResponseCallback,
        {
          categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting,
          label: i18nLazyString(UIStrings.streamingWasmResponse),
        },
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.WasmCompiledModule,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.compiledWasmModule)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.WasmCachedModule,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.cachedWasmModule)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.WasmModuleCacheHit,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.wasmModuleCacheHit)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.WasmModuleCacheInvalid,
        {
          categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting,
          label: i18nLazyString(UIStrings.wasmModuleCacheInvalid),
        },
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.FrameStartedLoading,
        {
          categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Loading,
          label: i18nLazyString(UIStrings.frameStartedLoading),
          hidden: true,
        },
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.MarkLoad,
        {
          categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting,
          label: i18nLazyString(UIStrings.onloadEvent),
          hidden: true,
        },
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.MarkDOMContent,
        {
          categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting,
          label: i18nLazyString(UIStrings.domcontentloadedEvent),
          hidden: true,
        },
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.MarkFirstPaint,
        {
          categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Painting,
          label: i18nLazyString(UIStrings.firstPaint),
          hidden: true,
        },
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.MarkFCP,
        {
          categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Rendering,
          label: i18nLazyString(UIStrings.firstContentfulPaint),
          hidden: true,
        },
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.MarkLCPCandidate,
        {
          categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Rendering,
          label: i18nLazyString(UIStrings.largestContentfulPaint),
          hidden: true,
        },
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.TimeStamp,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.timestamp)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.ConsoleTime,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.consoleTime)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.UserTiming,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.userTiming)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.ResourceWillSendRequest,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Loading, label: i18nLazyString(UIStrings.willSendRequest)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.ResourceSendRequest,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Loading, label: i18nLazyString(UIStrings.sendRequest)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.ResourceReceiveResponse,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Loading, label: i18nLazyString(UIStrings.receiveResponse)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.ResourceFinish,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Loading, label: i18nLazyString(UIStrings.finishLoading)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.ResourceReceivedData,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Loading, label: i18nLazyString(UIStrings.receiveData)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.RunMicrotasks,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.runMicrotasks)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.FunctionCall,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.functionCall)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.GC,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.gcEvent)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.MajorGC,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.majorGc)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.MinorGC,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.minorGc)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.RequestAnimationFrame,
        {
          categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting,
          label: i18nLazyString(UIStrings.requestAnimationFrame),
        },
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.CancelAnimationFrame,
        {
          categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting,
          label: i18nLazyString(UIStrings.cancelAnimationFrame),
        },
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.FireAnimationFrame,
        {
          categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting,
          label: i18nLazyString(UIStrings.animationFrameFired),
        },
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.RequestIdleCallback,
        {
          categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting,
          label: i18nLazyString(UIStrings.requestIdleCallback),
        },
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.CancelIdleCallback,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.cancelIdleCallback)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.FireIdleCallback,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.fireIdleCallback)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.WebSocketCreate,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.createWebsocket)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.WebSocketSendHandshakeRequest,
        {
          categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting,
          label: i18nLazyString(UIStrings.sendWebsocketHandshake),
        },
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.WebSocketReceiveHandshakeResponse,
        {
          categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting,
          label: i18nLazyString(UIStrings.receiveWebsocketHandshake),
        },
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.WebSocketDestroy,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.destroyWebsocket)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.EmbedderCallback,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.embedderCallback)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.DecodeImage,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Painting, label: i18nLazyString(UIStrings.imageDecode)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.ResizeImage,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Painting, label: i18nLazyString(UIStrings.imageResize)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.GPUTask,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.GPU, label: i18nLazyString(UIStrings.gpu)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.GCCollectGarbage,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.domGc)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.CryptoDoEncrypt,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.encrypt)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.CryptoDoEncryptReply,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.encryptReply)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.CryptoDoDecrypt,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.decrypt)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.CryptoDoDecryptReply,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.decryptReply)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.CryptoDoDigest,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.digest)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.CryptoDoDigestReply,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.digestReply)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.CryptoDoSign,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.sign)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.CryptoDoSignReply,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.signReply)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.CryptoDoVerify,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.verify)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.CryptoDoVerifyReply,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Scripting, label: i18nLazyString(UIStrings.verifyReply)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.AsyncTask,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Async, label: i18nLazyString(UIStrings.asyncTask)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.LayoutShift,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Experience, label: i18nLazyString(UIStrings.layoutShift)},
      ],
      [
        TraceEngine.Types.TraceEvents.KnownEventName.EventTiming,
        {categoryStyle: DEFAULT_CATEGORY_STYLES_PALETTE.Experience, label: i18nLazyString(UIStrings.eventTiming)},
      ],
    ]);
