var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/timeline/overlays/OverlaysImpl.js
var OverlaysImpl_exports = {};
__export(OverlaysImpl_exports, {
  AnnotationOverlayActionEvent: () => AnnotationOverlayActionEvent,
  ConsentDialogVisibilityChange: () => ConsentDialogVisibilityChange,
  EntryLabelMouseClick: () => EntryLabelMouseClick,
  EventReferenceClick: () => EventReferenceClick,
  Overlays: () => Overlays,
  TimeRangeMouseOutEvent: () => TimeRangeMouseOutEvent,
  TimeRangeMouseOverEvent: () => TimeRangeMouseOverEvent,
  chartForEntry: () => chartForEntry,
  entriesForOverlay: () => entriesForOverlay,
  jsLogContext: () => jsLogContext,
  overlayIsSingleton: () => overlayIsSingleton,
  overlayTypeIsSingleton: () => overlayTypeIsSingleton,
  timingsForOverlayEntry: () => timingsForOverlayEntry,
  traceWindowContainingOverlays: () => traceWindowContainingOverlays
});
import * as Common from "./../../../core/common/common.js";
import * as i18n from "./../../../core/i18n/i18n.js";
import * as Platform from "./../../../core/platform/platform.js";
import * as AIAssistance from "./../../../models/ai_assistance/ai_assistance.js";
import * as Trace from "./../../../models/trace/trace.js";
import * as VisualLogging from "./../../../ui/visual_logging/visual_logging.js";
import * as Components from "./components/components.js";
var UIStrings = {
  /**
   * @description Text for showing that a metric was observed in the local environment.
   * @example {LCP} PH1
   */
  fieldMetricMarkerLocal: "{PH1} - Local",
  /**
   * @description Text for showing that a metric was observed in the field, from real use data (CrUX). Also denotes if from URL or Origin dataset.
   * @example {LCP} PH1
   * @example {URL} PH2
   */
  fieldMetricMarkerField: "{PH1} - Field ({PH2})",
  /**
   * @description Label for an option that selects the page's specific URL as opposed to it's entire origin/domain.
   */
  urlOption: "URL",
  /**
   * @description Label for an option that selects the page's entire origin/domain as opposed to it's specific URL.
   */
  originOption: "Origin"
};
var str_ = i18n.i18n.registerUIStrings("panels/timeline/overlays/OverlaysImpl.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var NETWORK_RESIZE_ELEM_HEIGHT_PX = 8;
function traceWindowContainingOverlays(overlays) {
  const windows = overlays.map(Trace.Helpers.Timing.traceWindowFromOverlay).filter((b) => !!b);
  return Trace.Helpers.Timing.combineTraceWindowsMicro(windows);
}
function entriesForOverlay(overlay) {
  const entries = [];
  switch (overlay.type) {
    case "ENTRY_SELECTED": {
      entries.push(overlay.entry);
      break;
    }
    case "ENTRY_OUTLINE": {
      entries.push(overlay.entry);
      break;
    }
    case "TIME_RANGE": {
      break;
    }
    case "ENTRY_LABEL": {
      entries.push(overlay.entry);
      break;
    }
    case "ENTRIES_LINK": {
      entries.push(overlay.entryFrom);
      if (overlay.entryTo) {
        entries.push(overlay.entryTo);
      }
      break;
    }
    case "TIMESPAN_BREAKDOWN": {
      if (overlay.entry) {
        entries.push(overlay.entry);
      }
      break;
    }
    case "TIMESTAMP_MARKER": {
      break;
    }
    case "CANDY_STRIPED_TIME_RANGE": {
      entries.push(overlay.entry);
      break;
    }
    case "TIMINGS_MARKER": {
      entries.push(...overlay.entries);
      break;
    }
    case "BOTTOM_INFO_BAR":
      break;
    default:
      Platform.assertNever(overlay, `Unknown overlay type ${JSON.stringify(overlay)}`);
  }
  return entries;
}
function chartForEntry(entry) {
  if (Trace.Types.Events.isNetworkTrackEntry(entry)) {
    return "network";
  }
  return "main";
}
function overlayIsSingleton(overlay) {
  return overlayTypeIsSingleton(overlay.type);
}
function overlayTypeIsSingleton(type) {
  return type === "TIMESTAMP_MARKER" || type === "ENTRY_SELECTED" || type === "BOTTOM_INFO_BAR";
}
var AnnotationOverlayActionEvent = class _AnnotationOverlayActionEvent extends Event {
  overlay;
  action;
  static eventName = "annotationoverlayactionsevent";
  constructor(overlay, action) {
    super(_AnnotationOverlayActionEvent.eventName);
    this.overlay = overlay;
    this.action = action;
  }
};
var ConsentDialogVisibilityChange = class _ConsentDialogVisibilityChange extends Event {
  isVisible;
  static eventName = "consentdialogvisibilitychange";
  constructor(isVisible) {
    super(_ConsentDialogVisibilityChange.eventName, { bubbles: true, composed: true });
    this.isVisible = isVisible;
  }
};
var TimeRangeMouseOverEvent = class _TimeRangeMouseOverEvent extends Event {
  overlay;
  static eventName = "timerangemouseoverevent";
  constructor(overlay) {
    super(_TimeRangeMouseOverEvent.eventName, { bubbles: true });
    this.overlay = overlay;
  }
};
var TimeRangeMouseOutEvent = class _TimeRangeMouseOutEvent extends Event {
  static eventName = "timerangemouseoutevent";
  constructor() {
    super(_TimeRangeMouseOutEvent.eventName, { bubbles: true });
  }
};
var EntryLabelMouseClick = class _EntryLabelMouseClick extends Event {
  overlay;
  static eventName = "entrylabelmouseclick";
  constructor(overlay) {
    super(_EntryLabelMouseClick.eventName, { composed: true, bubbles: true });
    this.overlay = overlay;
  }
};
var EventReferenceClick = class _EventReferenceClick extends Event {
  event;
  static eventName = "eventreferenceclick";
  constructor(event) {
    super(_EventReferenceClick.eventName, { bubbles: true, composed: true });
    this.event = event;
  }
};
var Overlays = class extends EventTarget {
  /**
   * The list of active overlays. Overlays can't be marked as visible or
   * hidden; every overlay in this list is rendered.
   * We track each overlay against the HTML Element we have rendered. This is
   * because on first render of a new overlay, we create it, but then on
   * subsequent renders we do not destroy and recreate it, instead we update it
   * based on the new position of the timeline.
   */
  #overlaysToElements = /* @__PURE__ */ new Map();
  #singletonOverlays = /* @__PURE__ */ new Map();
  // When the Entries Link Annotation is created, the arrow needs to follow the mouse.
  // Update the mouse coordinates while it is being created.
  #lastMouseOffsetX = null;
  #lastMouseOffsetY = null;
  // `entriesLinkInProgress` is the entries link Overlay that has not yet been fully created
  // and only has the entry that the link starts from set.
  // We save it as a separate variable because when the second entry of the link is not chosen yet,
  // the arrow follows the mouse. To achieve that, update the coordinates of `entriesLinkInProgress`
  // on mousemove. There can only be one link in the process on being created so the mousemove
  // only needs to update `entriesLinkInProgress` link overlay.
  #entriesLinkInProgress;
  #dimensions = {
    trace: {
      visibleWindow: null
    },
    charts: {
      main: null,
      network: null
    }
  };
  /**
   * To calculate the Y pixel value for an event we need access to the chart
   * and data provider in order to find out what level the event is on, and from
   * there calculate the pixel value for that level.
   */
  #charts;
  /**
   * The Overlays class will take each overlay, generate its HTML, and add it
   * to the container. This container is provided for us when the class is
   * created so we can manage its contents as overlays come and go.
   */
  #overlaysContainer;
  // Setting that specified if the annotations overlays need to be visible.
  // It is switched on/off from the annotations tab in the sidebar.
  #annotationsHiddenSetting;
  /**
   * The OverlaysManager sometimes needs to find out if an entry is visible or
   * not, and if not, why not - for example, if the user has collapsed its
   * parent. We define these query functions that must be supplied in order to
   * answer these questions.
   */
  #queries;
  constructor(init) {
    super();
    this.#overlaysContainer = init.container;
    this.#charts = init.charts;
    this.#queries = init.entryQueries;
    this.#entriesLinkInProgress = null;
    this.#annotationsHiddenSetting = Common.Settings.Settings.instance().moduleSetting("annotations-hidden");
    this.#annotationsHiddenSetting.addChangeListener(this.update.bind(this));
    init.flameChartsContainers.main.addEventListener("mousemove", (event) => this.#updateMouseCoordinatesProgressEntriesLink.bind(this)(event, "main"));
    init.flameChartsContainers.network.addEventListener("mousemove", (event) => this.#updateMouseCoordinatesProgressEntriesLink.bind(this)(event, "network"));
  }
  // Toggle display of the whole OverlaysContainer.
  // This function is used to hide all overlays when the Flamechart is in the 'reorder tracks' state.
  // If the tracks are being reordered, they are collapsed and we do not want to display
  // anything except the tracks reordering interface.
  //
  // Do not change individual overlays visibility with 'setOverlayElementVisibility' since we do not
  // want to overwrite the overlays visibility state that was set before entering the reordering state.
  toggleAllOverlaysDisplayed(allOverlaysDisplayed) {
    this.#overlaysContainer.style.display = allOverlaysDisplayed ? "block" : "none";
  }
  // Mousemove event listener to get mouse coordinates and update them for the entries link that is being created.
  //
  // The 'mousemove' event is attached to `flameChartsContainers` instead of `overlaysContainer`
  // because `overlaysContainer` doesn't have events to enable the interaction with the
  // Flamecharts beneath it.
  #updateMouseCoordinatesProgressEntriesLink(event, chart) {
    if (this.#entriesLinkInProgress?.state !== "pending_to_event") {
      return;
    }
    const mouseEvent = event;
    this.#lastMouseOffsetX = mouseEvent.offsetX;
    this.#lastMouseOffsetY = mouseEvent.offsetY;
    const networkHeight = this.#dimensions.charts.network?.heightPixels ?? 0;
    const linkInProgressElement = this.#overlaysToElements.get(this.#entriesLinkInProgress);
    if (linkInProgressElement) {
      const component = linkInProgressElement.querySelector("devtools-entries-link-overlay");
      const yCoordinate = mouseEvent.offsetY + (chart === "main" ? networkHeight : 0);
      component.toEntryCoordinateAndDimensions = { x: mouseEvent.offsetX, y: yCoordinate };
    }
  }
  /**
   * Add a new overlay to the view.
   */
  add(newOverlay) {
    if (this.#overlaysToElements.has(newOverlay)) {
      return newOverlay;
    }
    if (overlayIsSingleton(newOverlay)) {
      const existing = this.#singletonOverlays.get(newOverlay.type);
      if (existing) {
        this.updateExisting(existing, newOverlay);
        return existing;
      }
      this.#singletonOverlays.set(newOverlay.type, newOverlay);
    }
    this.#overlaysToElements.set(newOverlay, null);
    return newOverlay;
  }
  /**
   * Update an existing overlay without destroying and recreating its
   * associated DOM.
   *
   * This is useful if you need to rapidly update an overlay's data - e.g.
   * dragging to create time ranges - without the thrashing of destroying the
   * old overlay and re-creating the new one.
   */
  updateExisting(existingOverlay, newData) {
    if (!this.#overlaysToElements.has(existingOverlay)) {
      console.error("Trying to update an overlay that does not exist.");
      return;
    }
    for (const [key, value] of Object.entries(newData)) {
      const k = key;
      existingOverlay[k] = value;
    }
  }
  enterLabelEditMode(overlay) {
    const element = this.#overlaysToElements.get(overlay);
    const component = element?.querySelector("devtools-entry-label-overlay");
    if (component) {
      component.setLabelEditabilityAndRemoveEmptyLabel(true);
    }
  }
  bringLabelForward(overlay) {
    for (const element2 of this.#overlaysToElements.values()) {
      element2?.classList.remove("bring-forward");
    }
    const element = this.#overlaysToElements.get(overlay);
    element?.classList.add("bring-forward");
  }
  /**
   * @returns the list of overlays associated with a given entry.
   */
  overlaysForEntry(entry) {
    const matches = [];
    for (const [overlay] of this.#overlaysToElements) {
      if ("entry" in overlay && overlay.entry === entry) {
        matches.push(overlay);
      }
    }
    return matches;
  }
  /**
   * Used for debugging and testing. Do not mutate the element directly using
   * this method.
   */
  elementForOverlay(overlay) {
    return this.#overlaysToElements.get(overlay) ?? null;
  }
  /**
   * Removes any active overlays that match the provided type.
   * @returns the number of overlays that were removed.
   */
  removeOverlaysOfType(type) {
    if (overlayTypeIsSingleton(type)) {
      const singleton = this.#singletonOverlays.get(type);
      if (singleton) {
        this.remove(singleton);
        return 1;
      }
      return 0;
    }
    const overlaysToRemove = Array.from(this.#overlaysToElements.keys()).filter((overlay) => {
      return overlay.type === type;
    });
    for (const overlay of overlaysToRemove) {
      this.remove(overlay);
    }
    return overlaysToRemove.length;
  }
  /**
   * @returns all overlays that match the provided type.
   */
  overlaysOfType(type) {
    if (overlayTypeIsSingleton(type)) {
      const singleton = this.#singletonOverlays.get(type);
      if (singleton) {
        return [singleton];
      }
      return [];
    }
    const matches = [];
    function overlayIsOfType(overlay) {
      return overlay.type === type;
    }
    for (const [overlay] of this.#overlaysToElements) {
      if (overlayIsOfType(overlay)) {
        matches.push(overlay);
      }
    }
    return matches;
  }
  /**
   * @returns all overlays.
   */
  allOverlays() {
    return [...this.#overlaysToElements.keys()];
  }
  /**
   * Removes the provided overlay from the list of overlays and destroys any
   * DOM associated with it.
   */
  remove(overlay) {
    const htmlElement = this.#overlaysToElements.get(overlay);
    if (htmlElement && this.#overlaysContainer) {
      this.#overlaysContainer.removeChild(htmlElement);
    }
    this.#overlaysToElements.delete(overlay);
    if (overlayIsSingleton(overlay)) {
      this.#singletonOverlays.delete(overlay.type);
    }
  }
  /**
   * Update the dimensions of a chart.
   * IMPORTANT: this does not trigger a re-draw. You must call the render() method manually.
   */
  updateChartDimensions(chart, dimensions) {
    this.#dimensions.charts[chart] = dimensions;
  }
  /**
   * Update the visible window of the UI.
   * IMPORTANT: this does not trigger a re-draw. You must call the render() method manually.
   */
  updateVisibleWindow(visibleWindow) {
    this.#dimensions.trace.visibleWindow = visibleWindow;
  }
  /**
   * Clears all overlays and all data. Call this when the trace is changing
   * (e.g. the user has imported/recorded a new trace) and we need to start from
   * scratch and remove all overlays relating to the previous trace.
   */
  reset() {
    if (this.#overlaysContainer) {
      this.#overlaysContainer.innerHTML = "";
    }
    this.#overlaysToElements.clear();
    this.#singletonOverlays.clear();
    this.#dimensions.trace.visibleWindow = null;
    this.#dimensions.charts.main = null;
    this.#dimensions.charts.network = null;
  }
  /**
   * Updates the Overlays UI: new overlays will be rendered onto the view, and
   * existing overlays will have their positions changed to ensure they are
   * rendered in the right place.
   */
  async update() {
    const timeRangeOverlays = [];
    for (const [overlay, existingElement] of this.#overlaysToElements) {
      const element = existingElement || this.#createElementForNewOverlay(overlay);
      if (!existingElement) {
        this.#overlaysToElements.set(overlay, element);
        this.#overlaysContainer.appendChild(element);
      }
      this.#updateOverlayBeforePositioning(overlay, element);
      this.#positionOverlay(overlay, element);
      this.#updateOverlayAfterPositioning(overlay, element);
      if (overlay.type === "TIME_RANGE") {
        timeRangeOverlays.push(overlay);
      }
    }
    if (timeRangeOverlays.length > 1) {
      this.#positionOverlappingTimeRangeLabels(timeRangeOverlays);
    }
  }
  /**
   * If any time-range overlays overlap, we try to adjust their horizontal
   * position in order to make sure you can distinguish them and that the labels
   * do not entirely overlap.
   * This is very much minimal best effort, and does not guarantee that all
   * labels will remain readable.
   */
  #positionOverlappingTimeRangeLabels(overlays) {
    const overlaysSorted = overlays.toSorted((o1, o2) => {
      return o1.bounds.min - o2.bounds.min;
    });
    const overlapsByOverlay = /* @__PURE__ */ new Map();
    for (let i = 0; i < overlaysSorted.length; i++) {
      const current = overlaysSorted[i];
      const overlaps = [];
      for (let j = i + 1; j < overlaysSorted.length; j++) {
        const next = overlaysSorted[j];
        const currentAndNextOverlap = Trace.Helpers.Timing.boundsIncludeTimeRange({
          bounds: current.bounds,
          timeRange: next.bounds
        });
        if (currentAndNextOverlap) {
          overlaps.push(next);
        } else {
          break;
        }
      }
      overlapsByOverlay.set(current, overlaps);
    }
    for (const [firstOverlay, overlappingOverlays] of overlapsByOverlay) {
      const element = this.#overlaysToElements.get(firstOverlay);
      if (!element) {
        continue;
      }
      let firstIndexForOverlapClass = 1;
      if (element.getAttribute("class")?.includes("overlap-")) {
        firstIndexForOverlapClass = 0;
      }
      overlappingOverlays.forEach((overlay) => {
        const element2 = this.#overlaysToElements.get(overlay);
        element2?.classList.add(`overlap-${firstIndexForOverlapClass++}`);
      });
    }
  }
  #positionOverlay(overlay, element) {
    const annotationsAreHidden = this.#annotationsHiddenSetting.get();
    switch (overlay.type) {
      case "ENTRY_SELECTED": {
        const isVisible = this.entryIsVisibleOnChart(overlay.entry);
        this.#setOverlayElementVisibility(element, isVisible);
        if (isVisible) {
          this.#positionEntryBorderOutlineType(overlay.entry, element);
        }
        break;
      }
      case "ENTRY_OUTLINE": {
        if (this.entryIsVisibleOnChart(overlay.entry)) {
          this.#setOverlayElementVisibility(element, true);
          this.#positionEntryBorderOutlineType(overlay.entry, element);
        } else {
          this.#setOverlayElementVisibility(element, false);
        }
        break;
      }
      case "TIME_RANGE": {
        if (overlay.label.length) {
          this.#setOverlayElementVisibility(element, !annotationsAreHidden);
        }
        this.#positionTimeRangeOverlay(overlay, element);
        break;
      }
      case "ENTRY_LABEL": {
        const entryVisible = this.entryIsVisibleOnChart(overlay.entry);
        this.#setOverlayElementVisibility(element, entryVisible && !annotationsAreHidden);
        if (entryVisible) {
          const entryLabelVisibleHeight = this.#positionEntryLabelOverlay(overlay, element);
          const component = element.querySelector("devtools-entry-label-overlay");
          if (component && entryLabelVisibleHeight) {
            component.entryLabelVisibleHeight = entryLabelVisibleHeight;
          }
        }
        break;
      }
      case "ENTRIES_LINK": {
        const entriesToConnect = this.#calculateFromAndToForEntriesLink(overlay);
        const isVisible = entriesToConnect !== null && !annotationsAreHidden;
        this.#setOverlayElementVisibility(element, isVisible);
        if (isVisible) {
          this.#positionEntriesLinkOverlay(overlay, element, entriesToConnect);
        }
        break;
      }
      case "TIMESPAN_BREAKDOWN": {
        this.#positionTimespanBreakdownOverlay(overlay, element);
        if (overlay.entry) {
          const { visibleWindow } = this.#dimensions.trace;
          const isVisible = Boolean(visibleWindow && this.#entryIsVerticallyVisibleOnChart(overlay.entry) && Trace.Helpers.Timing.boundsIncludeTimeRange({
            bounds: visibleWindow,
            timeRange: overlay.sections[0].bounds
          }));
          this.#setOverlayElementVisibility(element, isVisible);
        }
        break;
      }
      case "TIMESTAMP_MARKER": {
        const { visibleWindow } = this.#dimensions.trace;
        const isVisible = Boolean(visibleWindow && Trace.Helpers.Timing.timestampIsInBounds(visibleWindow, overlay.timestamp));
        this.#setOverlayElementVisibility(element, isVisible);
        if (isVisible) {
          this.#positionTimingOverlay(overlay, element);
        }
        break;
      }
      case "CANDY_STRIPED_TIME_RANGE": {
        const { visibleWindow } = this.#dimensions.trace;
        const isVisible = Boolean(visibleWindow && this.#entryIsVerticallyVisibleOnChart(overlay.entry) && Trace.Helpers.Timing.boundsIncludeTimeRange({
          bounds: visibleWindow,
          timeRange: overlay.bounds
        }));
        this.#setOverlayElementVisibility(element, isVisible);
        if (isVisible) {
          this.#positionCandyStripedTimeRange(overlay, element);
        }
        break;
      }
      case "TIMINGS_MARKER": {
        const { visibleWindow } = this.#dimensions.trace;
        const isVisible = Boolean(visibleWindow && this.#entryIsHorizontallyVisibleOnChart(overlay.entries[0]));
        this.#setOverlayElementVisibility(element, isVisible);
        if (isVisible) {
          this.#positionTimingOverlay(overlay, element);
        }
        break;
      }
      case "BOTTOM_INFO_BAR": {
        this.#positionInfoBarBanner(overlay, element);
        break;
      }
      default: {
        Platform.TypeScriptUtilities.assertNever(overlay, `Unknown overlay: ${JSON.stringify(overlay)}`);
      }
    }
  }
  #positionInfoBarBanner(overlay, element) {
    const mainChart = this.#dimensions.charts.main;
    if (!mainChart) {
      this.#setOverlayElementVisibility(element, false);
      return;
    }
    const defaultBannerHeight = 40;
    const totalHeight = this.#charts.mainChart.totalContentHeight();
    const pixelsHiddenBelowViewport = totalHeight - (mainChart.scrollOffsetPixels + mainChart.heightPixels);
    const visiblePixelsOfBanner = defaultBannerHeight - pixelsHiddenBelowViewport;
    if (visiblePixelsOfBanner <= 0) {
      this.#setOverlayElementVisibility(element, false);
      return;
    }
    this.#setOverlayElementVisibility(element, true);
    const actualBannerHeight = overlay.infobar.element.clientHeight;
    const adjustedVisiblePixels = visiblePixelsOfBanner - defaultBannerHeight + actualBannerHeight;
    element.style.height = `${Math.min(adjustedVisiblePixels, actualBannerHeight)}px`;
    if (this.#charts.mainChart.verticalScrollBarVisible()) {
      element.style.right = "11px";
    } else {
      element.style.right = "0";
    }
  }
  #positionTimingOverlay(overlay, element) {
    let left;
    switch (overlay.type) {
      case "TIMINGS_MARKER": {
        const timings = Trace.Helpers.Timing.eventTimingsMicroSeconds(overlay.entries[0]);
        left = this.#xPixelForMicroSeconds("main", timings.startTime);
        break;
      }
      case "TIMESTAMP_MARKER": {
        left = this.#xPixelForMicroSeconds("main", overlay.timestamp);
        break;
      }
    }
    element.style.left = `${left}px`;
  }
  #positionTimespanBreakdownOverlay(overlay, element) {
    if (overlay.sections.length === 0) {
      return;
    }
    const component = element.querySelector("devtools-timespan-breakdown-overlay");
    const elementSections = component?.renderedSections() ?? [];
    const leftEdgePixel = this.#xPixelForMicroSeconds("main", overlay.sections[0].bounds.min);
    const rightEdgePixel = this.#xPixelForMicroSeconds("main", overlay.sections[overlay.sections.length - 1].bounds.max);
    if (leftEdgePixel === null || rightEdgePixel === null) {
      return;
    }
    const rangeWidth = rightEdgePixel - leftEdgePixel;
    element.style.left = `${leftEdgePixel}px`;
    element.style.width = `${rangeWidth}px`;
    if (elementSections.length === 0) {
      return;
    }
    let count = 0;
    for (const section of overlay.sections) {
      const leftPixel = this.#xPixelForMicroSeconds("main", section.bounds.min);
      const rightPixel = this.#xPixelForMicroSeconds("main", section.bounds.max);
      if (leftPixel === null || rightPixel === null) {
        return;
      }
      const rangeWidth2 = rightPixel - leftPixel;
      const sectionElement = elementSections[count];
      sectionElement.style.left = `${leftPixel}px`;
      sectionElement.style.width = `${rangeWidth2}px`;
      count++;
    }
    if (overlay.entry && (overlay.renderLocation === "BELOW_EVENT" || overlay.renderLocation === "ABOVE_EVENT")) {
      const MAX_BOX_HEIGHT = 50;
      element.style.maxHeight = `${MAX_BOX_HEIGHT}px`;
      const y = this.yPixelForEventOnChart(overlay.entry);
      if (y === null) {
        return;
      }
      const eventHeight = this.pixelHeightForEventOnChart(overlay.entry);
      if (eventHeight === null) {
        return;
      }
      if (overlay.renderLocation === "BELOW_EVENT") {
        const top = y + eventHeight;
        element.style.top = `${top}px`;
      } else {
        const PADDING = 7;
        const bottom = y - PADDING;
        const minSpace = Math.max(bottom, 0);
        const height = Math.min(MAX_BOX_HEIGHT, minSpace);
        const top = bottom - height;
        element.style.top = `${top}px`;
      }
    }
  }
  /**
   * Positions the arrow between two entries. Takes in the entriesToConnect
   * because if one of the original entries is hidden in a collapsed main thread
   * icicle, we use its parent to connect to.
   */
  #positionEntriesLinkOverlay(overlay, element, entriesToConnect) {
    const component = element.querySelector("devtools-entries-link-overlay");
    if (component) {
      const fromEntryInCollapsedTrack = this.#entryIsInCollapsedTrack(entriesToConnect.entryFrom);
      const toEntryInCollapsedTrack = entriesToConnect.entryTo && this.#entryIsInCollapsedTrack(entriesToConnect.entryTo);
      const bothEntriesInCollapsedTrack = Boolean(fromEntryInCollapsedTrack && toEntryInCollapsedTrack);
      if (bothEntriesInCollapsedTrack) {
        this.#setOverlayElementVisibility(element, false);
        return;
      }
      const hideArrow = Boolean(fromEntryInCollapsedTrack || toEntryInCollapsedTrack);
      component.hideArrow = hideArrow;
      const { entryFrom, entryTo, entryFromIsSource, entryToIsSource } = entriesToConnect;
      const entryFromWrapper = component.entryFromWrapper();
      if (!entryFromWrapper) {
        return;
      }
      const entryFromVisibility = this.entryIsVisibleOnChart(entryFrom) && !fromEntryInCollapsedTrack;
      const entryToVisibility = entryTo ? this.entryIsVisibleOnChart(entryTo) && !toEntryInCollapsedTrack : false;
      let fromEntryX = 0;
      let fromEntryY = this.#yCoordinateForNotVisibleEntry(entryFrom);
      if (entryFromVisibility) {
        const fromEntryParams = this.#positionEntryBorderOutlineType(entriesToConnect.entryFrom, entryFromWrapper);
        if (fromEntryParams) {
          const fromEntryHeight = fromEntryParams?.entryHeight;
          const fromEntryWidth = fromEntryParams?.entryWidth;
          const fromCutOffHeight = fromEntryParams?.cutOffHeight;
          fromEntryX = fromEntryParams?.x;
          fromEntryY = fromEntryParams?.y;
          component.fromEntryCoordinateAndDimensions = { x: fromEntryX, y: fromEntryY, length: fromEntryWidth, height: fromEntryHeight - fromCutOffHeight };
        } else {
          return;
        }
      }
      if (!entryFromVisibility && overlay.state === "creation_not_started") {
        this.dispatchEvent(new AnnotationOverlayActionEvent(overlay, "Remove"));
      }
      const entryToWrapper = component.entryToWrapper();
      if (entryTo && entryToWrapper) {
        let toEntryX = this.xPixelForEventStartOnChart(entryTo) ?? 0;
        let toEntryY = this.#yCoordinateForNotVisibleEntry(entryTo);
        const toEntryParams = this.#positionEntryBorderOutlineType(entryTo, entryToWrapper);
        if (toEntryParams) {
          const toEntryHeight = toEntryParams?.entryHeight;
          const toEntryWidth = toEntryParams?.entryWidth;
          const toCutOffHeight = toEntryParams?.cutOffHeight;
          toEntryX = toEntryParams?.x;
          toEntryY = toEntryParams?.y;
          component.toEntryCoordinateAndDimensions = {
            x: toEntryX,
            y: toEntryY,
            length: toEntryWidth,
            height: toEntryHeight - toCutOffHeight
          };
        } else {
          component.toEntryCoordinateAndDimensions = {
            x: toEntryX,
            y: toEntryY
          };
          return;
        }
      } else {
        this.#entriesLinkInProgress = overlay;
      }
      component.fromEntryIsSource = entryFromIsSource;
      component.toEntryIsSource = entryToIsSource;
      component.entriesVisibility = {
        fromEntryVisibility: entryFromVisibility,
        toEntryVisibility: entryToVisibility
      };
    }
  }
  /**
   *  Return Y coordinate for an arrow connecting 2 entries to attach to if the entry is not visible.
   *  For example, if the entry is scrolled up from the visible area , return the y index of the edge of the track:
   *  --
   * |  | - entry off the visible chart
   *  --
   *
   * --Y---------------  -- Y is the returned coordinate that the arrow should point to
   *
   * flamechart data     -- visible flamechart data between the 2 lines
   * ------------------
   *
   * On the contrary, if the entry is scrolled off the bottom, get the coordinate of the top of the visible canvas.
   */
  #yCoordinateForNotVisibleEntry(entry) {
    const chartName = chartForEntry(entry);
    const y = this.yPixelForEventOnChart(entry);
    if (y === null) {
      return 0;
    }
    if (chartName === "main") {
      if (!this.#dimensions.charts.main?.heightPixels) {
        return 0;
      }
      const yWithoutNetwork = y - this.networkChartOffsetHeight();
      if (yWithoutNetwork < 0) {
        return this.networkChartOffsetHeight();
      }
    }
    if (chartName === "network") {
      if (!this.#dimensions.charts.network) {
        return 0;
      }
      if (y > this.#dimensions.charts.network.heightPixels) {
        return this.#dimensions.charts.network.heightPixels;
      }
    }
    return y;
  }
  #positionTimeRangeOverlay(overlay, element) {
    const leftEdgePixel = this.#xPixelForMicroSeconds("main", overlay.bounds.min);
    const rightEdgePixel = this.#xPixelForMicroSeconds("main", overlay.bounds.max);
    if (leftEdgePixel === null || rightEdgePixel === null) {
      return;
    }
    const rangeWidth = rightEdgePixel - leftEdgePixel;
    element.style.left = `${leftEdgePixel}px`;
    element.style.width = `${rangeWidth}px`;
  }
  /**
   * @param overlay the EntrySelected overlay that we need to position.
   * @param element the DOM element representing the overlay
   */
  #positionEntryLabelOverlay(overlay, element) {
    const component = element.querySelector("devtools-entry-label-overlay");
    if (!component) {
      return null;
    }
    const entryWrapper = component.entryHighlightWrapper();
    const inputField = component.shadowRoot?.querySelector(".input-field");
    if (!entryWrapper) {
      return null;
    }
    const { entryHeight, entryWidth, cutOffHeight = 0, x, y } = this.#positionEntryBorderOutlineType(overlay.entry, entryWrapper) || {};
    if (!entryHeight || !entryWidth || x === null || !y) {
      return null;
    }
    const inputFieldHeight = inputField?.offsetHeight ?? 25;
    element.style.top = `${y - Components.EntryLabelOverlay.EntryLabelOverlay.LABEL_CONNECTOR_HEIGHT - inputFieldHeight}px`;
    element.style.left = `${x}px`;
    element.style.width = `${entryWidth}px`;
    return entryHeight - cutOffHeight;
  }
  #positionCandyStripedTimeRange(overlay, element) {
    const chartName = chartForEntry(overlay.entry);
    const startX = this.#xPixelForMicroSeconds(chartName, overlay.bounds.min);
    const endX = this.#xPixelForMicroSeconds(chartName, overlay.bounds.max);
    if (startX === null || endX === null) {
      return;
    }
    const widthPixels = endX - startX;
    const finalWidth = Math.max(2, widthPixels);
    element.style.width = `${finalWidth}px`;
    element.style.left = `${startX}px`;
    let y = this.yPixelForEventOnChart(overlay.entry);
    if (y === null) {
      return;
    }
    const totalHeight = this.pixelHeightForEventOnChart(overlay.entry) ?? 0;
    let height = totalHeight;
    if (height === null) {
      return;
    }
    if (chartName === "main") {
      const chartTopPadding = this.networkChartOffsetHeight();
      const cutOffTop = y < chartTopPadding;
      height = cutOffTop ? Math.abs(y + height - chartTopPadding) : height;
      element.classList.toggle("cut-off-top", cutOffTop);
      if (cutOffTop) {
        y = y + totalHeight - height;
      }
    } else {
      const networkHeight = this.#dimensions.charts.network?.heightPixels ?? 0;
      const lastVisibleY = y + totalHeight;
      const cutOffBottom = lastVisibleY > networkHeight;
      const cutOffTop = y > networkHeight;
      element.classList.toggle("cut-off-top", cutOffTop);
      element.classList.toggle("cut-off-bottom", cutOffBottom);
      if (cutOffBottom) {
        height = networkHeight - y;
      }
    }
    element.style.height = `${height}px`;
    element.style.top = `${y}px`;
  }
  /**
   * Draw and position borders around an entry. Multiple overlays either fully consist
   * of a border around an entry of have an entry border as a part of the overlay.
   * Positions an EntrySelected or EntryOutline overlay and a part of the Trace.Types.Overlays.EntryLabel.
   * @param overlay the EntrySelected/EntryOutline/Trace.Types.Overlays.EntryLabel overlay that we need to position.
   * @param element the DOM element representing the overlay
   */
  #positionEntryBorderOutlineType(entry, element) {
    const chartName = chartForEntry(entry);
    let x = this.xPixelForEventStartOnChart(entry);
    let y = this.yPixelForEventOnChart(entry);
    const chartWidth = chartName === "main" ? this.#dimensions.charts.main?.widthPixels : this.#dimensions.charts.network?.widthPixels;
    if (x === null || y === null || !chartWidth) {
      return null;
    }
    const { endTime } = timingsForOverlayEntry(entry);
    const endX = this.#xPixelForMicroSeconds(chartName, endTime);
    if (endX === null) {
      return null;
    }
    const totalHeight = this.pixelHeightForEventOnChart(entry) ?? 0;
    let height = totalHeight;
    if (height === null) {
      return null;
    }
    let widthPixels = endX - x;
    const provider = chartName === "main" ? this.#charts.mainProvider : this.#charts.networkProvider;
    const chart = chartName === "main" ? this.#charts.mainChart : this.#charts.networkChart;
    const index = provider.indexForEvent?.(entry);
    const customPos = chart.getCustomDrawnPositionForEntryIndex(index ?? -1);
    if (customPos) {
      x = customPos.x;
      widthPixels = customPos.width;
    }
    const cutOffRight = x + widthPixels > chartWidth ? x + widthPixels - chartWidth : null;
    const cutOffLeft = x < 0 ? Math.abs(x) : null;
    element.classList.toggle("cut-off-right", cutOffRight !== null);
    if (cutOffRight) {
      widthPixels = widthPixels - cutOffRight;
    }
    if (cutOffLeft) {
      x = 0;
      widthPixels = widthPixels - cutOffLeft;
    }
    const finalWidth = Math.max(2, widthPixels);
    element.style.width = `${finalWidth}px`;
    if (chartName === "main") {
      const chartTopPadding = this.networkChartOffsetHeight();
      const cutOffTop = y < chartTopPadding;
      height = cutOffTop ? Math.abs(y + height - chartTopPadding) : height;
      element.classList.toggle("cut-off-top", cutOffTop);
      if (cutOffTop) {
        y = y + totalHeight - height;
      }
    } else {
      const networkHeight = this.#dimensions.charts.network?.heightPixels ?? 0;
      const lastVisibleY = y + totalHeight;
      const cutOffBottom = lastVisibleY > networkHeight;
      element.classList.toggle("cut-off-bottom", cutOffBottom);
      if (cutOffBottom) {
        height = networkHeight - y;
      }
    }
    element.style.height = `${height}px`;
    element.style.top = `${y}px`;
    element.style.left = `${x}px`;
    return { entryHeight: totalHeight, entryWidth: finalWidth, cutOffHeight: totalHeight - height, x, y };
  }
  /**
   * We draw an arrow between connected entries but this can get complicated
   * depending on if the entries are visible or not. For example, the user might
   * draw a connection to an entry in the main thread but then collapse the
   * parent of that entry. In this case the entry we want to draw to is the
   * first visible parent of that entry rather than the (invisible) entry.
   */
  #calculateFromAndToForEntriesLink(overlay) {
    if (!overlay.entryTo) {
      return {
        entryFrom: overlay.entryFrom,
        entryTo: overlay.entryTo,
        entryFromIsSource: true,
        entryToIsSource: true
      };
    }
    let entryFrom = overlay.entryFrom;
    let entryTo = overlay.entryTo ?? null;
    if (this.#queries.isEntryCollapsedByUser(overlay.entryFrom)) {
      entryFrom = this.#queries.firstVisibleParentForEntry(overlay.entryFrom);
    }
    if (overlay.entryTo && this.#queries.isEntryCollapsedByUser(overlay.entryTo)) {
      entryTo = this.#queries.firstVisibleParentForEntry(overlay.entryTo);
    }
    if (entryFrom === null || entryTo === null) {
      return null;
    }
    return {
      entryFrom,
      entryFromIsSource: entryFrom === overlay.entryFrom,
      entryTo,
      entryToIsSource: entryTo === overlay.entryTo
    };
  }
  // Dimms all label annotations except the one that is hovered over in the timeline or sidebar.
  // The highlighter annotation is brought forward.
  highlightOverlay(overlay) {
    const allLabelOverlays = this.overlaysOfType("ENTRY_LABEL");
    for (const otherOverlay of allLabelOverlays) {
      const element = this.elementForOverlay(otherOverlay);
      const component = element?.querySelector("devtools-entry-label-overlay");
      if (element && !component?.hasAttribute("data-user-editing-label")) {
        if (otherOverlay === overlay) {
          element.style.opacity = "1";
          element.style.zIndex = "3";
        } else {
          element.style.opacity = "0.5";
          element.style.zIndex = "2";
        }
      }
    }
  }
  undimAllEntryLabels() {
    const allLabelOverlays = this.overlaysOfType("ENTRY_LABEL");
    for (const otherOverlay of allLabelOverlays) {
      const element = this.elementForOverlay(otherOverlay);
      if (element) {
        element.style.opacity = "1";
        element.style.zIndex = "2";
      }
    }
  }
  #createElementForNewOverlay(overlay) {
    const overlayElement = document.createElement("div");
    overlayElement.classList.add("overlay-item", `overlay-type-${overlay.type}`);
    const jslogContext = jsLogContext(overlay);
    if (jslogContext) {
      overlayElement.setAttribute("jslog", `${VisualLogging.item(jslogContext)}`);
    }
    switch (overlay.type) {
      case "ENTRY_LABEL": {
        const shouldDrawLabelBelowEntry = Trace.Types.Events.isLegacyTimelineFrame(overlay.entry);
        const component = new Components.EntryLabelOverlay.EntryLabelOverlay(overlay.label, shouldDrawLabelBelowEntry);
        const parsedTrace = this.#queries.parsedTrace();
        const callTree = parsedTrace ? AIAssistance.AICallTree.AICallTree.fromEvent(overlay.entry, parsedTrace) : null;
        component.callTree = callTree;
        component.addEventListener(Components.EntryLabelOverlay.LabelAnnotationsConsentDialogVisibilityChange.eventName, (e) => {
          const event = e;
          this.dispatchEvent(new ConsentDialogVisibilityChange(event.isVisible));
        });
        component.addEventListener(Components.EntryLabelOverlay.EntryLabelRemoveEvent.eventName, () => {
          this.dispatchEvent(new AnnotationOverlayActionEvent(overlay, "Remove"));
        });
        component.addEventListener(Components.EntryLabelOverlay.EntryLabelChangeEvent.eventName, (event) => {
          const newLabel = event.newLabel;
          overlay.label = newLabel;
          this.dispatchEvent(new AnnotationOverlayActionEvent(overlay, "Update"));
        });
        overlayElement.addEventListener("mouseover", () => {
          this.highlightOverlay(overlay);
        });
        overlayElement.addEventListener("mouseout", () => {
          this.undimAllEntryLabels();
        });
        overlayElement.appendChild(component);
        overlayElement.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.dispatchEvent(new EntryLabelMouseClick(overlay));
        });
        return overlayElement;
      }
      case "ENTRIES_LINK": {
        const entries = this.#calculateFromAndToForEntriesLink(overlay);
        if (entries === null) {
          return overlayElement;
        }
        const entryEndX = this.xPixelForEventEndOnChart(entries.entryFrom) ?? 0;
        const entryStartX = this.xPixelForEventEndOnChart(entries.entryFrom) ?? 0;
        const entryStartY = this.yPixelForEventOnChart(entries.entryFrom) ?? 0;
        const entryWidth = entryEndX - entryStartX;
        const entryHeight = this.pixelHeightForEventOnChart(entries.entryFrom) ?? 0;
        const component = new Components.EntriesLinkOverlay.EntriesLinkOverlay({ x: entryEndX, y: entryStartY, width: entryWidth, height: entryHeight }, overlay.state);
        component.addEventListener(Components.EntriesLinkOverlay.EntryLinkStartCreating.eventName, () => {
          overlay.state = "pending_to_event";
          this.dispatchEvent(new AnnotationOverlayActionEvent(overlay, "Update"));
        });
        overlayElement.appendChild(component);
        return overlayElement;
      }
      case "ENTRY_OUTLINE": {
        overlayElement.classList.add(`outline-reason-${overlay.outlineReason}`);
        return overlayElement;
      }
      case "TIME_RANGE": {
        const component = new Components.TimeRangeOverlay.TimeRangeOverlay(overlay.label);
        component.duration = overlay.showDuration ? overlay.bounds.range : null;
        component.canvasRect = this.#charts.mainChart.canvasBoundingClientRect();
        component.addEventListener(Components.TimeRangeOverlay.TimeRangeLabelChangeEvent.eventName, (event) => {
          const newLabel = event.newLabel;
          overlay.label = newLabel;
          this.dispatchEvent(new AnnotationOverlayActionEvent(overlay, "Update"));
        });
        component.addEventListener(Components.TimeRangeOverlay.TimeRangeRemoveEvent.eventName, () => {
          this.dispatchEvent(new AnnotationOverlayActionEvent(overlay, "Remove"));
        });
        component.addEventListener("mouseover", () => {
          this.dispatchEvent(new TimeRangeMouseOverEvent(overlay));
        });
        component.addEventListener("mouseout", () => {
          this.dispatchEvent(new TimeRangeMouseOutEvent());
        });
        overlayElement.appendChild(component);
        return overlayElement;
      }
      case "TIMESPAN_BREAKDOWN": {
        const component = new Components.TimespanBreakdownOverlay.TimespanBreakdownOverlay();
        component.sections = overlay.sections;
        component.canvasRect = this.#charts.mainChart.canvasBoundingClientRect();
        component.isBelowEntry = overlay.renderLocation === "BELOW_EVENT";
        overlayElement.appendChild(component);
        return overlayElement;
      }
      case "TIMINGS_MARKER": {
        const { color } = Trace.Styles.markerDetailsForEvent(overlay.entries[0]);
        const markersComponent = this.#createTimingsMarkerElement(overlay);
        overlayElement.appendChild(markersComponent);
        overlayElement.style.backgroundColor = color;
        return overlayElement;
      }
      default: {
        return overlayElement;
      }
    }
  }
  #clickEvent(event) {
    this.dispatchEvent(new EventReferenceClick(event));
  }
  #createOverlayPopover(adjustedTimestamp, name, fieldResult) {
    const popoverElement = document.createElement("div");
    const popoverContents = popoverElement.createChild("div", "overlay-popover");
    popoverContents.createChild("span", "overlay-popover-time").textContent = i18n.TimeUtilities.formatMicroSecondsTime(adjustedTimestamp);
    popoverContents.createChild("span", "overlay-popover-title").textContent = fieldResult ? i18nString(UIStrings.fieldMetricMarkerLocal, { PH1: name }) : name;
    if (fieldResult) {
      const popoverContents2 = popoverElement.createChild("div", "overlay-popover");
      popoverContents2.createChild("span", "overlay-popover-time").textContent = i18n.TimeUtilities.formatMicroSecondsTime(fieldResult.value);
      let scope = fieldResult.pageScope;
      if (fieldResult.pageScope === "url") {
        scope = i18nString(UIStrings.urlOption);
      } else if (fieldResult.pageScope === "origin") {
        scope = i18nString(UIStrings.originOption);
      }
      popoverContents2.createChild("span", "overlay-popover-title").textContent = i18nString(UIStrings.fieldMetricMarkerField, {
        PH1: name,
        PH2: scope
      });
    }
    return popoverElement;
  }
  #mouseMoveOverlay(e, event, name, overlay, markers, marker) {
    if (Trace.Types.Events.isSoftNavigationStart(event)) {
      name = "Soft Nav";
    }
    const fieldResult = overlay.entryToFieldResult.get(event);
    const popoverElement = this.#createOverlayPopover(overlay.adjustedTimestamp, name, fieldResult);
    this.#lastMouseOffsetX = e.offsetX + (markers.offsetLeft || 0) + (marker.offsetLeft || 0);
    this.#lastMouseOffsetY = e.offsetY + markers.offsetTop || 0;
    this.#charts.mainChart.updateMouseOffset(this.#lastMouseOffsetX, this.#lastMouseOffsetY);
    this.#charts.mainChart.updatePopoverContents(popoverElement);
  }
  #mouseOutOverlay() {
    this.#lastMouseOffsetX = -1;
    this.#lastMouseOffsetY = -1;
    this.#charts.mainChart.updateMouseOffset(this.#lastMouseOffsetX, this.#lastMouseOffsetY);
    this.#charts.mainChart.hideHighlight();
  }
  #createTimingsMarkerElement(overlay) {
    const markers = document.createElement("div");
    markers.classList.add("markers");
    for (const entry of overlay.entries) {
      const { color, title } = Trace.Styles.markerDetailsForEvent(entry);
      const marker = document.createElement("div");
      marker.classList.add("marker-title");
      marker.textContent = title;
      marker.style.backgroundColor = color;
      markers.appendChild(marker);
      marker.addEventListener("click", () => this.#clickEvent(entry));
      marker.addEventListener("mousemove", (e) => this.#mouseMoveOverlay(e, entry, title, overlay, markers, marker));
      marker.addEventListener("mouseout", () => this.#mouseOutOverlay());
    }
    return markers;
  }
  /**
   * Some overlays store data in their components that needs to be updated
   * before we position an overlay. Else, we might position an overlay based on
   * stale data. This method is used to update an overlay BEFORE it is then
   * positioned onto the canvas. It is the right place to ensure an overlay has
   * the latest data it needs.
   */
  #updateOverlayBeforePositioning(overlay, element) {
    switch (overlay.type) {
      case "ENTRY_SELECTED":
        break;
      case "TIME_RANGE": {
        const component = element.querySelector("devtools-time-range-overlay");
        if (component) {
          component.duration = overlay.showDuration ? overlay.bounds.range : null;
          component.canvasRect = this.#charts.mainChart.canvasBoundingClientRect();
        }
        break;
      }
      case "ENTRY_LABEL":
      case "ENTRY_OUTLINE":
      case "ENTRIES_LINK": {
        const component = element.querySelector("devtools-entries-link-overlay");
        if (component) {
          component.canvasRect = this.#charts.mainChart.canvasBoundingClientRect();
        }
        break;
      }
      case "TIMESPAN_BREAKDOWN": {
        const component = element.querySelector("devtools-timespan-breakdown-overlay");
        if (component) {
          component.sections = overlay.sections;
          component.canvasRect = this.#charts.mainChart.canvasBoundingClientRect();
        }
        break;
      }
      case "TIMESTAMP_MARKER":
        break;
      case "CANDY_STRIPED_TIME_RANGE":
        break;
      case "TIMINGS_MARKER":
        break;
      case "BOTTOM_INFO_BAR":
        {
          if (element.contains(overlay.infobar.element)) {
            return;
          }
          element.innerHTML = "";
          element.appendChild(overlay.infobar.element);
        }
        break;
      default:
        Platform.TypeScriptUtilities.assertNever(overlay, `Unexpected overlay ${overlay}`);
    }
  }
  /**
   * Some overlays have custom logic within them to manage visibility of
   * labels/etc that can be impacted if the positioning or size of the overlay
   * has changed. This method can be used to run code after an overlay has
   * been updated + repositioned on the timeline.
   */
  #updateOverlayAfterPositioning(overlay, element) {
    switch (overlay.type) {
      case "ENTRY_SELECTED":
        break;
      case "TIME_RANGE": {
        const component = element.querySelector("devtools-time-range-overlay");
        component?.updateLabelPositioning();
        break;
      }
      case "ENTRY_LABEL":
        break;
      case "ENTRY_OUTLINE":
        break;
      case "ENTRIES_LINK":
        break;
      case "TIMESPAN_BREAKDOWN": {
        const component = element.querySelector("devtools-timespan-breakdown-overlay");
        component?.checkSectionLabelPositioning();
        break;
      }
      case "TIMESTAMP_MARKER":
        break;
      case "CANDY_STRIPED_TIME_RANGE":
        break;
      case "TIMINGS_MARKER":
        break;
      case "BOTTOM_INFO_BAR":
        break;
      default:
        Platform.TypeScriptUtilities.assertNever(overlay, `Unexpected overlay ${overlay}`);
    }
  }
  /**
   * @returns true if the entry is visible on chart, which means that both
   * horizontally and vertically it is at least partially in view.
   */
  entryIsVisibleOnChart(entry) {
    const verticallyVisible = this.#entryIsVerticallyVisibleOnChart(entry);
    const horiziontallyVisible = this.#entryIsHorizontallyVisibleOnChart(entry);
    return verticallyVisible && horiziontallyVisible;
  }
  /**
   * Calculates if an entry is visible horizontally. This is easy because we
   * don't have to consider any pixels and can instead check that its start and
   * end times intersect with the visible window.
   */
  #entryIsHorizontallyVisibleOnChart(entry) {
    if (this.#dimensions.trace.visibleWindow === null) {
      return false;
    }
    const { startTime, endTime } = timingsForOverlayEntry(entry);
    const entryTimeRange = Trace.Helpers.Timing.traceWindowFromMicroSeconds(startTime, endTime);
    return Trace.Helpers.Timing.boundsIncludeTimeRange({
      bounds: this.#dimensions.trace.visibleWindow,
      timeRange: entryTimeRange
    });
  }
  #entryIsInCollapsedTrack(entry) {
    const chartName = chartForEntry(entry);
    const provider = chartName === "main" ? this.#charts.mainProvider : this.#charts.networkProvider;
    const entryIndex = provider.indexForEvent?.(entry) ?? null;
    if (entryIndex === null) {
      return false;
    }
    const group = provider.groupForEvent?.(entryIndex) ?? null;
    if (!group) {
      return false;
    }
    return Boolean(group.expanded) === false;
  }
  /**
   * Calculate if an entry is visible vertically on the chart. A bit fiddly as
   * we have to figure out its pixel offset and go on that. Unlike horizontal
   * visibility, we can't work solely from its microsecond values.
   */
  #entryIsVerticallyVisibleOnChart(entry) {
    const chartName = chartForEntry(entry);
    const y = this.yPixelForEventOnChart(entry);
    if (y === null) {
      return false;
    }
    const eventHeight = this.pixelHeightForEventOnChart(entry);
    if (!eventHeight) {
      return false;
    }
    if (chartName === "main") {
      if (!this.#dimensions.charts.main?.heightPixels) {
        return false;
      }
      const yWithoutNetwork = y - this.networkChartOffsetHeight();
      if (yWithoutNetwork + eventHeight < 0) {
        return false;
      }
      if (yWithoutNetwork > this.#dimensions.charts.main.heightPixels) {
        return false;
      }
    }
    if (chartName === "network") {
      if (!this.#dimensions.charts.network) {
        return false;
      }
      if (y <= -14) {
        return false;
      }
      if (y > this.#dimensions.charts.network.heightPixels) {
        return false;
      }
    }
    return true;
  }
  /**
   * Calculate the X pixel position for an event start on the timeline.
   * @param chartName the chart that the event is on. It is expected that both
   * charts have the same width so this doesn't make a difference - but it might
   * in the future if the UI changes, hence asking for it.
   * @param event the trace event you want to get the pixel position of
   */
  xPixelForEventStartOnChart(event) {
    const chartName = chartForEntry(event);
    const { startTime } = timingsForOverlayEntry(event);
    return this.#xPixelForMicroSeconds(chartName, startTime);
  }
  /**
   * Calculate the X pixel position for an event end on the timeline.
   * @param chartName the chart that the event is on. It is expected that both
   * charts have the same width so this doesn't make a difference - but it might
   * in the future if the UI changes, hence asking for it.
   * @param event the trace event you want to get the pixel position of
   */
  xPixelForEventEndOnChart(event) {
    const chartName = chartForEntry(event);
    const { endTime } = timingsForOverlayEntry(event);
    return this.#xPixelForMicroSeconds(chartName, endTime);
  }
  /**
   * Calculate the xPixel for a given timestamp. To do this we calculate how
   * far in microseconds from the left of the visible window an event is, and
   * divide that by the total time span. This gives us a fraction representing
   * how far along the timeline the event is. We can then multiply that by the
   * width of the canvas to get its pixel position.
   */
  #xPixelForMicroSeconds(chart, timestamp) {
    if (this.#dimensions.trace.visibleWindow === null) {
      console.error("Cannot calculate xPixel without visible trace window.");
      return null;
    }
    const canvasWidthPixels = this.#dimensions.charts[chart]?.widthPixels ?? null;
    if (canvasWidthPixels === null) {
      console.error(`Cannot calculate xPixel without ${chart} dimensions.`);
      return null;
    }
    const timeFromLeft = timestamp - this.#dimensions.trace.visibleWindow.min;
    const totalTimeSpan = this.#dimensions.trace.visibleWindow.range;
    return Math.floor(timeFromLeft / totalTimeSpan * canvasWidthPixels);
  }
  /**
   * Calculate the Y pixel position for the event on the timeline relative to
   * the entire window.
   * This means if the event is in the main flame chart and below the network,
   * we add the height of the network chart to the Y value to position it
   * correctly.
   * This can return null if any data was missing, or if the event is not
   * visible (if the level it's on is hidden because the track is collapsed,
   * for example)
   */
  yPixelForEventOnChart(event) {
    const chartName = chartForEntry(event);
    const chart = chartName === "main" ? this.#charts.mainChart : this.#charts.networkChart;
    const provider = chartName === "main" ? this.#charts.mainProvider : this.#charts.networkProvider;
    const indexForEntry = provider.indexForEvent?.(event);
    if (typeof indexForEntry !== "number") {
      return null;
    }
    const timelineData = provider.timelineData();
    if (timelineData === null) {
      return null;
    }
    const level = timelineData.entryLevels.at(indexForEntry);
    if (typeof level === "undefined") {
      return null;
    }
    if (!chart.levelIsVisible(level)) {
      return null;
    }
    const pixelOffsetForLevel = chart.levelToOffset(level);
    let pixelAdjustedForScroll = pixelOffsetForLevel - (this.#dimensions.charts[chartName]?.scrollOffsetPixels ?? 0);
    if (chartName === "main") {
      pixelAdjustedForScroll += this.networkChartOffsetHeight();
    }
    return pixelAdjustedForScroll;
  }
  /**
   * Calculate the height of the event on the timeline.
   */
  pixelHeightForEventOnChart(event) {
    const chartName = chartForEntry(event);
    const chart = chartName === "main" ? this.#charts.mainChart : this.#charts.networkChart;
    const provider = chartName === "main" ? this.#charts.mainProvider : this.#charts.networkProvider;
    const indexForEntry = provider.indexForEvent?.(event);
    if (typeof indexForEntry !== "number") {
      return null;
    }
    const timelineData = provider.timelineData();
    if (timelineData === null) {
      return null;
    }
    const level = timelineData.entryLevels.at(indexForEntry);
    if (typeof level === "undefined") {
      return null;
    }
    return chart.levelHeight(level);
  }
  /**
   * Calculate the height of the network chart. If the network chart has
   * height, we also allow for the size of the resize handle shown between the
   * two charts.
   *
   * Note that it is possible for the chart to have 0 height if the user is
   * looking at a trace with no network requests.
   */
  networkChartOffsetHeight() {
    if (this.#dimensions.charts.network === null) {
      return 0;
    }
    if (this.#dimensions.charts.network.heightPixels === 0) {
      return 0;
    }
    if (this.#dimensions.charts.network.allGroupsCollapsed) {
      return this.#dimensions.charts.network.heightPixels;
    }
    return this.#dimensions.charts.network.heightPixels + NETWORK_RESIZE_ELEM_HEIGHT_PX;
  }
  /**
   * Hides or shows an element. We used to use visibility rather than display,
   * but a child of an element with visibility: hidden may still be visible if
   * its own `display` property is set.
   */
  #setOverlayElementVisibility(element, isVisible) {
    element.style.display = isVisible ? "block" : "none";
  }
};
function timingsForOverlayEntry(entry) {
  if (Trace.Types.Events.isLegacyTimelineFrame(entry)) {
    return {
      startTime: entry.startTime,
      endTime: entry.endTime,
      duration: entry.duration
    };
  }
  return Trace.Helpers.Timing.eventTimingsMicroSeconds(entry);
}
function jsLogContext(overlay) {
  switch (overlay.type) {
    case "ENTRY_SELECTED": {
      return null;
    }
    case "ENTRY_OUTLINE": {
      return `timeline.overlays.entry-outline-${Platform.StringUtilities.toKebabCase(overlay.outlineReason)}`;
    }
    case "ENTRY_LABEL": {
      return "timeline.overlays.entry-label";
    }
    case "ENTRIES_LINK": {
      if (overlay.state !== "connected") {
        return null;
      }
      return "timeline.overlays.entries-link";
    }
    case "TIME_RANGE": {
      return "timeline.overlays.time-range";
    }
    case "TIMESPAN_BREAKDOWN": {
      return "timeline.overlays.timespan-breakdown";
    }
    case "TIMESTAMP_MARKER": {
      return "timeline.overlays.cursor-timestamp-marker";
    }
    case "CANDY_STRIPED_TIME_RANGE": {
      return "timeline.overlays.candy-striped-time-range";
    }
    case "TIMINGS_MARKER": {
      return "timeline.overlays.timings-marker";
    }
    case "BOTTOM_INFO_BAR":
      return "timeline.overlays.info-bar";
    default:
      Platform.assertNever(overlay, "Unknown overlay type");
  }
}
export {
  OverlaysImpl_exports as Overlays
};
//# sourceMappingURL=overlays.js.map
