var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/media/EventDisplayTable.js
var EventDisplayTable_exports = {};
__export(EventDisplayTable_exports, {
  EventNode: () => EventNode,
  PlayerEventsView: () => PlayerEventsView
});
import * as i18n from "./../../core/i18n/i18n.js";
import * as DataGrid from "./../../ui/legacy/components/data_grid/data_grid.js";
import * as SourceFrame from "./../../ui/legacy/components/source_frame/source_frame.js";
import * as UI from "./../../ui/legacy/legacy.js";
import * as VisualLogging from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/media/eventDisplayTable.css.js
var eventDisplayTable_css_default = `/*
 * Copyright 2019 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.no-border-top-datagrid > .data-grid {
  /* make sure there is no top border, it ruins the menu view */
  border-top: 0;
}

.event-display-table-contents-table-container > .widget > .data-grid {
  height: 100%;
}

.data-grid .event-display-table-basic-text-table-entry {
  line-height: 26px;
}

.event-display-table-contents-json-wrapper > .json-view {
  overflow: visible;
}

/*# sourceURL=${import.meta.resolve("./eventDisplayTable.css")} */`;

// gen/front_end/panels/media/EventDisplayTable.js
var UIStrings = {
  /**
   * @description Text for timestamps of items
   */
  timestamp: "Timestamp",
  /**
   * @description The column header for event names.
   */
  eventName: "Event name",
  /**
   * @description Text for the value of something
   */
  value: "Value",
  /**
   * @description The accessible name of a table that displays information about events that occurred
   * while a video/media player was present on the page.
   */
  eventDisplay: "Event display"
};
var str_ = i18n.i18n.registerUIStrings("panels/media/EventDisplayTable.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var EventNode = class extends DataGrid.DataGrid.DataGridNode {
  expandableElement;
  constructor(event) {
    super(event, false);
    this.expandableElement = null;
  }
  createCell(columnId) {
    const cell = this.createTD(columnId);
    const cellData = this.data[columnId];
    if (columnId === "value") {
      const enclosed = cell.createChild("div", "event-display-table-contents-json-wrapper");
      this.expandableElement = new SourceFrame.JSONView.JSONView(new SourceFrame.JSONView.ParsedJSON(cellData, "", ""), true);
      this.expandableElement.markAsRoot();
      this.expandableElement.show(enclosed);
    } else {
      cell.classList.add("event-display-table-basic-text-table-entry");
      UI.UIUtils.createTextChild(cell, cellData);
    }
    return cell;
  }
};
var PlayerEventsView = class _PlayerEventsView extends UI.Widget.VBox {
  dataGrid;
  firstEventTime;
  constructor() {
    super({ jslog: `${VisualLogging.pane("events")}` });
    this.registerRequiredCSS(eventDisplayTable_css_default);
    this.contentElement.classList.add("event-display-table-contents-table-container");
    this.dataGrid = this.createDataGrid([
      {
        id: "display-timestamp",
        title: i18nString(UIStrings.timestamp),
        weight: 1,
        sortable: false
      },
      { id: "event", title: i18nString(UIStrings.eventName), weight: 2, sortable: false },
      {
        id: "value",
        title: i18nString(UIStrings.value),
        weight: 7,
        sortable: false
      }
    ]);
    this.firstEventTime = 0;
    this.dataGrid.setStriped(true);
    this.dataGrid.asWidget().show(this.contentElement);
  }
  createDataGrid(headers) {
    const gridColumnDescs = [];
    for (const headerDesc of headers) {
      gridColumnDescs.push(_PlayerEventsView.convertToGridDescriptor(headerDesc));
    }
    const datagrid = new DataGrid.DataGrid.DataGridImpl({
      displayName: i18nString(UIStrings.eventDisplay),
      columns: gridColumnDescs,
      deleteCallback: void 0,
      refreshCallback: void 0
    });
    datagrid.asWidget().contentElement.classList.add("no-border-top-datagrid");
    return datagrid;
  }
  onEvent(event) {
    if (this.firstEventTime === 0 && typeof event.timestamp === "number") {
      this.firstEventTime = event.timestamp;
    }
    event = this.subtractFirstEventTime(event);
    const stringified = event.value;
    try {
      const json = JSON.parse(stringified);
      event.event = json.event;
      delete json["event"];
      event.value = json;
      const node = new EventNode(event);
      const scroll = this.dataGrid.scrollContainer;
      const isAtBottom = scroll.scrollTop === scroll.scrollHeight - scroll.offsetHeight;
      this.dataGrid.rootNode().appendChild(node);
      if (isAtBottom) {
        scroll.scrollTop = scroll.scrollHeight;
      }
    } catch {
    }
  }
  subtractFirstEventTime(event) {
    if (typeof event.timestamp === "number") {
      event.displayTimestamp = (event.timestamp - this.firstEventTime).toFixed(3);
    }
    return event;
  }
  static convertToGridDescriptor(columnConfig) {
    return {
      id: columnConfig.id,
      title: columnConfig.title,
      sortable: columnConfig.sortable,
      weight: columnConfig.weight || 0,
      sort: DataGrid.DataGrid.Order.Ascending
    };
  }
};

// gen/front_end/panels/media/MainView.js
var MainView_exports = {};
__export(MainView_exports, {
  MainView: () => MainView,
  PlayerDataDownloadManager: () => PlayerDataDownloadManager
});
import * as i18n13 from "./../../core/i18n/i18n.js";
import * as SDK2 from "./../../core/sdk/sdk.js";
import * as UI7 from "./../../ui/legacy/legacy.js";

// gen/front_end/panels/media/MediaModel.js
var MediaModel_exports = {};
__export(MediaModel_exports, {
  MediaModel: () => MediaModel
});
import * as SDK from "./../../core/sdk/sdk.js";
var MediaModel = class extends SDK.SDKModel.SDKModel {
  enabled;
  agent;
  constructor(target) {
    super(target);
    this.enabled = false;
    this.agent = target.mediaAgent();
    target.registerMediaDispatcher(this);
  }
  async resumeModel() {
    if (!this.enabled) {
      return await Promise.resolve();
    }
    await this.agent.invoke_enable();
  }
  ensureEnabled() {
    void this.agent.invoke_enable();
    this.enabled = true;
  }
  playerPropertiesChanged(event) {
    this.dispatchEventToListeners("PlayerPropertiesChanged", event);
  }
  playerEventsAdded(event) {
    this.dispatchEventToListeners("PlayerEventsAdded", event);
  }
  playerMessagesLogged(event) {
    this.dispatchEventToListeners("PlayerMessagesLogged", event);
  }
  playerErrorsRaised(event) {
    this.dispatchEventToListeners("PlayerErrorsRaised", event);
  }
  playerCreated({ player }) {
    this.dispatchEventToListeners("PlayerCreated", player);
  }
};
SDK.SDKModel.SDKModel.register(MediaModel, { capabilities: 262144, autostart: false });

// gen/front_end/panels/media/PlayerDetailView.js
var PlayerDetailView_exports = {};
__export(PlayerDetailView_exports, {
  PlayerDetailView: () => PlayerDetailView
});
import * as i18n9 from "./../../core/i18n/i18n.js";
import * as UI5 from "./../../ui/legacy/legacy.js";

// gen/front_end/panels/media/EventTimelineView.js
import * as i18n3 from "./../../core/i18n/i18n.js";
import * as VisualLogging2 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/media/TickingFlameChart.js
var TickingFlameChart_exports = {};
__export(TickingFlameChart_exports, {
  ColdColorScheme: () => ColdColorScheme,
  Event: () => Event,
  HotColorScheme: () => HotColorScheme,
  TickingFlameChart: () => TickingFlameChart
});
import * as Common from "./../../core/common/common.js";
import * as Host from "./../../core/host/host.js";
import * as PerfUI from "./../../ui/legacy/components/perf_ui/perf_ui.js";
import * as UI2 from "./../../ui/legacy/legacy.js";
import * as ThemeSupport from "./../../ui/legacy/theme_support/theme_support.js";

// gen/front_end/panels/media/TickingFlameChartHelpers.js
var TickingFlameChartHelpers_exports = {};
__export(TickingFlameChartHelpers_exports, {
  Bounds: () => Bounds,
  formatMillisecondsToSeconds: () => formatMillisecondsToSeconds
});
function formatMillisecondsToSeconds(ms, decimalPlaces) {
  const roundPower = Math.pow(10, 3 - decimalPlaces);
  const denominatorPower = Math.pow(10, Math.max(0, decimalPlaces));
  return `${Math.round(ms / roundPower) / denominatorPower} s`;
}
var Bounds = class {
  #min;
  #max;
  #low;
  #high;
  maxRange;
  minRange;
  constructor(initialLow, initialHigh, maxRange, minRange) {
    this.#min = initialLow;
    this.#max = initialHigh;
    this.#low = this.#min;
    this.#high = this.#max;
    this.maxRange = maxRange;
    this.minRange = minRange;
  }
  get low() {
    return this.#low;
  }
  get high() {
    return this.#high;
  }
  get min() {
    return this.#min;
  }
  get max() {
    return this.#max;
  }
  get range() {
    return this.#high - this.#low;
  }
  reassertBounds() {
    let needsAdjustment = true;
    while (needsAdjustment) {
      needsAdjustment = false;
      if (this.range < this.minRange) {
        needsAdjustment = true;
        const delta = (this.minRange - this.range) / 2;
        this.#high += delta;
        this.#low -= delta;
      }
      if (this.#low < this.#min) {
        needsAdjustment = true;
        this.#low = this.#min;
      }
      if (this.#high > this.#max) {
        needsAdjustment = true;
        this.#high = this.#max;
      }
    }
  }
  /**
   * zoom out |amount| ticks at position [0, 1] along the current range of the timeline.
   */
  zoomOut(amount, position) {
    const range = this.#high - this.#low;
    const growSize = range * Math.pow(1.1, amount) - range;
    const lowEnd = growSize * position;
    const highEnd = growSize - lowEnd;
    this.#low -= lowEnd;
    this.#high += highEnd;
    this.reassertBounds();
  }
  /**
   * zoom in |amount| ticks at position [0, 1] along the current range of the timeline.
   */
  zoomIn(amount, position) {
    const range = this.#high - this.#low;
    if (this.range <= this.minRange) {
      return;
    }
    const shrinkSize = range - range / Math.pow(1.1, amount);
    const lowEnd = shrinkSize * position;
    const highEnd = shrinkSize - lowEnd;
    this.#low += lowEnd;
    this.#high -= highEnd;
    this.reassertBounds();
  }
  /**
   * Add Xms to the max value, and scroll the timeline forward if the end is in sight.
   */
  addMax(amount) {
    const range = this.#high - this.#low;
    const isAtHighEnd = this.#high === this.#max;
    const isZoomedOut = this.#low === this.#min || range >= this.maxRange;
    this.#max += amount;
    if (isAtHighEnd && isZoomedOut) {
      this.#high = this.#max;
    }
    this.reassertBounds();
  }
  /**
   * Attempt to push the maximum time up to |time| ms.
   */
  pushMaxAtLeastTo(time) {
    if (this.#max < time) {
      this.addMax(time - this.#max);
      return true;
    }
    return false;
  }
};

// gen/front_end/panels/media/TickingFlameChart.js
var defaultFont = "11px " + Host.Platform.fontFamily();
function getGroupDefaultTextColor() {
  return ThemeSupport.ThemeSupport.instance().getComputedValue("--sys-color-on-surface");
}
var DefaultStyle = () => ({
  height: 20,
  padding: 2,
  collapsible: 1,
  font: defaultFont,
  color: getGroupDefaultTextColor(),
  backgroundColor: "rgba(100 0 0 / 10%)",
  nestingLevel: 0,
  itemsHeight: 20,
  shareHeaderLine: false,
  useFirstLineForOverview: false,
  useDecoratorsForOverview: false
});
var HotColorScheme = ["#ffba08", "#faa307", "#f48c06", "#e85d04", "#dc2f02", "#d00000", "#9d0208"];
var ColdColorScheme = ["#7400b8", "#6930c3", "#5e60ce", "#5390d9", "#4ea8de", "#48bfe3", "#56cfe1", "#64dfdf"];
function calculateFontColor(backgroundColor) {
  const parsedColor = Common.Color.parse(backgroundColor)?.as(
    "hsl"
    /* Common.Color.Format.HSL */
  );
  if (parsedColor && parsedColor.l < 0.5) {
    return "#eee";
  }
  return "#444";
}
var Event = class {
  timelineData;
  setLive;
  setComplete;
  updateMaxTime;
  selfIndex;
  #live;
  title;
  #color;
  #fontColor;
  constructor(timelineData, eventHandlers, eventProperties = { color: void 0, duration: void 0, level: 0, name: "", startTime: 0 }) {
    this.timelineData = timelineData;
    this.setLive = eventHandlers.setLive;
    this.setComplete = eventHandlers.setComplete;
    this.updateMaxTime = eventHandlers.updateMaxTime;
    this.selfIndex = this.timelineData.entryLevels.length;
    this.#live = false;
    const duration = eventProperties["duration"] === void 0 ? 0 : eventProperties["duration"];
    this.timelineData.entryLevels.push(eventProperties["level"] || 0);
    this.timelineData.entryStartTimes.push(eventProperties["startTime"] || 0);
    this.timelineData.entryTotalTimes.push(duration);
    if (duration === -1) {
      this.endTime = -1;
    }
    this.title = eventProperties["name"] || "";
    this.#color = eventProperties["color"] || HotColorScheme[0];
    this.#fontColor = calculateFontColor(this.#color);
  }
  /**
   * Render hovertext into the |htmlElement|
   */
  decorate(htmlElement) {
    htmlElement.createChild("span").textContent = `Name: ${this.title}`;
    htmlElement.createChild("br");
    const startTimeReadable = formatMillisecondsToSeconds(this.startTime, 2);
    if (this.#live) {
      htmlElement.createChild("span").textContent = `Duration: ${startTimeReadable} - LIVE!`;
    } else if (!isNaN(this.duration)) {
      const durationReadable = formatMillisecondsToSeconds(this.duration + this.startTime, 2);
      htmlElement.createChild("span").textContent = `Duration: ${startTimeReadable} - ${durationReadable}`;
    } else {
      htmlElement.createChild("span").textContent = `Time: ${startTimeReadable}`;
    }
  }
  /**
   * set an event to be "live" where it's ended time is always the chart maximum
   * or to be a fixed time.
   * @param time
   */
  set endTime(time) {
    if (time === -1) {
      this.timelineData.entryTotalTimes[this.selfIndex] = this.setLive(this.selfIndex);
      this.#live = true;
    } else {
      this.#live = false;
      const duration = time - this.timelineData.entryStartTimes[this.selfIndex];
      this.timelineData.entryTotalTimes[this.selfIndex] = duration;
      this.setComplete(this.selfIndex);
      this.updateMaxTime(time);
    }
  }
  get id() {
    return this.selfIndex;
  }
  set level(level) {
    this.timelineData.entryLevels[this.selfIndex] = level;
  }
  set color(color) {
    this.#color = color;
    this.#fontColor = calculateFontColor(this.#color);
  }
  get color() {
    return this.#color;
  }
  get fontColor() {
    return this.#fontColor;
  }
  get startTime() {
    return this.timelineData.entryStartTimes[this.selfIndex];
  }
  get duration() {
    return this.timelineData.entryTotalTimes[this.selfIndex];
  }
  get live() {
    return this.#live;
  }
};
var TickingFlameChart = class extends UI2.Widget.VBox {
  intervalTimer;
  lastTimestamp;
  #canTick;
  ticking;
  isShown;
  bounds;
  dataProvider;
  delegate;
  chartGroupExpansionSetting;
  chart;
  stoppedPermanently;
  constructor() {
    super();
    this.intervalTimer = 0;
    this.lastTimestamp = 0;
    this.#canTick = true;
    this.ticking = false;
    this.isShown = false;
    this.bounds = new Bounds(0, 1e3, 3e4, 1e3);
    this.dataProvider = new TickingFlameChartDataProvider(this.bounds, this.updateMaxTime.bind(this));
    this.delegate = new TickingFlameChartDelegate();
    this.chartGroupExpansionSetting = Common.Settings.Settings.instance().createSetting("media-flame-chart-group-expansion", {});
    this.chart = // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // @ts-expect-error
    new PerfUI.FlameChart.FlameChart(this.dataProvider, this.delegate, this.chartGroupExpansionSetting);
    this.chart.disableRangeSelection();
    this.chart.bindCanvasEvent("wheel", (e) => {
      this.onScroll(e);
    });
    this.chart.show(this.contentElement);
  }
  /**
   * Add a marker with |properties| at |time|.
   */
  addMarker(properties) {
    properties["duration"] = NaN;
    this.startEvent(properties);
  }
  /**
   * Create an event which will be set to live by default.
   */
  startEvent(properties) {
    if (properties["duration"] === void 0) {
      properties["duration"] = -1;
    }
    const time = properties["startTime"] || 0;
    const event = this.dataProvider.startEvent(properties);
    this.updateMaxTime(time);
    return event;
  }
  /**
   * Add a group with |name| that can contain |depth| different tracks.
   */
  addGroup(name, depth) {
    this.dataProvider.addGroup(name, depth);
  }
  updateMaxTime(time) {
    if (this.bounds.pushMaxAtLeastTo(time)) {
      this.updateRender();
    }
  }
  onScroll(e) {
    const scrollTickCount = Math.round(e.deltaY / 50);
    const scrollPositionRatio = e.offsetX / e.srcElement.clientWidth;
    if (scrollTickCount > 0) {
      this.bounds.zoomOut(scrollTickCount, scrollPositionRatio);
    } else {
      this.bounds.zoomIn(-scrollTickCount, scrollPositionRatio);
    }
    this.updateRender();
  }
  willHide() {
    super.willHide();
    this.isShown = false;
    if (this.ticking) {
      this.stop();
    }
  }
  wasShown() {
    super.wasShown();
    this.isShown = true;
    if (this.#canTick && !this.ticking) {
      this.start();
    }
  }
  set canTick(allowed) {
    this.#canTick = allowed;
    if (this.ticking && !allowed) {
      this.stop();
    }
    if (!this.ticking && this.isShown && allowed) {
      this.start();
    }
  }
  start() {
    if (this.lastTimestamp === 0) {
      this.lastTimestamp = Date.now();
    }
    if (this.intervalTimer !== 0 || this.stoppedPermanently) {
      return;
    }
    this.intervalTimer = window.setInterval(this.updateRender.bind(this), 16);
    this.ticking = true;
  }
  stop(permanently = false) {
    window.clearInterval(this.intervalTimer);
    this.intervalTimer = 0;
    if (permanently) {
      this.stoppedPermanently = true;
    }
    this.ticking = false;
  }
  updateRender() {
    if (this.ticking) {
      const currentTimestamp = Date.now();
      const duration = currentTimestamp - this.lastTimestamp;
      this.lastTimestamp = currentTimestamp;
      this.bounds.addMax(duration);
    }
    this.dataProvider.updateMaxTime(this.bounds);
    this.chart.setWindowTimes(this.bounds.low, this.bounds.high, true);
    this.chart.scheduleUpdate();
  }
};
var TickingFlameChartDelegate = class {
  windowChanged(_windowStartTime, _windowEndTime, _animate) {
  }
  updateRangeSelection(_startTime, _endTime) {
  }
  updateSelectedGroup(_flameChart, _group) {
  }
};
var TickingFlameChartDataProvider = class {
  updateMaxTimeHandle;
  bounds;
  liveEvents;
  eventMap;
  #timelineData;
  maxLevel;
  constructor(initialBounds, updateMaxTime) {
    this.updateMaxTimeHandle = updateMaxTime;
    this.bounds = initialBounds;
    this.liveEvents = /* @__PURE__ */ new Set();
    this.eventMap = /* @__PURE__ */ new Map();
    this.#timelineData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
    this.maxLevel = 0;
  }
  hasTrackConfigurationMode() {
    return false;
  }
  /**
   * Add a group with |name| that can contain |depth| different tracks.
   */
  addGroup(name, depth) {
    if (this.#timelineData.groups) {
      const newGroup = {
        name,
        startLevel: this.maxLevel,
        expanded: true,
        selectable: false,
        style: DefaultStyle(),
        track: null
      };
      this.#timelineData.groups.push(newGroup);
      ThemeSupport.ThemeSupport.instance().addEventListener(ThemeSupport.ThemeChangeEvent.eventName, () => {
        newGroup.style.color = getGroupDefaultTextColor();
      });
    }
    this.maxLevel += depth;
  }
  /**
   * Create an event which will be set to live by default.
   */
  startEvent(properties) {
    properties["level"] = properties["level"] || 0;
    if (properties["level"] > this.maxLevel) {
      throw new Error(`level ${properties["level"]} is above the maximum allowed of ${this.maxLevel}`);
    }
    const event = new Event(this.#timelineData, {
      setLive: this.setLive.bind(this),
      setComplete: this.setComplete.bind(this),
      updateMaxTime: this.updateMaxTimeHandle
    }, properties);
    this.eventMap.set(event.id, event);
    return event;
  }
  setLive(index) {
    this.liveEvents.add(index);
    return this.bounds.max;
  }
  setComplete(index) {
    this.liveEvents.delete(index);
  }
  updateMaxTime(bounds) {
    this.bounds = bounds;
    for (const eventID of this.liveEvents.entries()) {
      this.eventMap.get(eventID[0]).endTime = -1;
    }
  }
  maxStackDepth() {
    return this.maxLevel + 1;
  }
  timelineData() {
    return this.#timelineData;
  }
  /**
   * time in milliseconds
   */
  minimumBoundary() {
    return this.bounds.low;
  }
  totalTime() {
    return this.bounds.high;
  }
  entryColor(index) {
    return this.eventMap.get(index).color;
  }
  textColor(index) {
    return this.eventMap.get(index).fontColor;
  }
  entryTitle(index) {
    return this.eventMap.get(index).title;
  }
  entryFont(_index) {
    return defaultFont;
  }
  decorateEntry(_index, _context, _text, _barX, _barY, _barWidth, _barHeight, _unclippedBarX, _timeToPixelRatio) {
    return false;
  }
  forceDecoration(_index) {
    return false;
  }
  preparePopoverElement(index) {
    const element = document.createElement("div");
    this.eventMap.get(index).decorate(element);
    return element;
  }
  formatValue(value, _precision) {
    value += Math.round(this.bounds.low);
    if (this.bounds.range < 2800) {
      return formatMillisecondsToSeconds(value, 2);
    }
    if (this.bounds.range < 3e4) {
      return formatMillisecondsToSeconds(value, 1);
    }
    return formatMillisecondsToSeconds(value, 0);
  }
  canJumpToEntry(_entryIndex) {
    return false;
  }
};

// gen/front_end/panels/media/EventTimelineView.js
var NO_NORMALIZED_TIMESTAMP = -1.5;
var UIStrings2 = {
  /**
   * @description Title of the 'Playback Status' button
   */
  playbackStatus: "Playback Status",
  /**
   * @description Title of the 'Buffering Status' button
   */
  bufferingStatus: "Buffering Status"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/media/EventTimelineView.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var PlayerEventsTimeline = class extends TickingFlameChart {
  normalizedTimestamp;
  playbackStatusLastEvent;
  audioBufferingStateEvent;
  videoBufferingStateEvent;
  constructor() {
    super();
    this.element.setAttribute("jslog", `${VisualLogging2.pane("timeline")}`);
    this.normalizedTimestamp = NO_NORMALIZED_TIMESTAMP;
    this.addGroup(i18nString2(UIStrings2.playbackStatus), 2);
    this.addGroup(i18nString2(UIStrings2.bufferingStatus), 2);
    this.playbackStatusLastEvent = null;
    this.audioBufferingStateEvent = null;
    this.videoBufferingStateEvent = null;
  }
  ensureNoPreviousPlaybackEvent(normalizedTime) {
    if (this.playbackStatusLastEvent !== null) {
      this.playbackStatusLastEvent.endTime = normalizedTime;
      this.playbackStatusLastEvent = null;
    }
  }
  /**
   * Playback events are {kPlay, kPause, kSuspended, kEnded, and kWebMediaPlayerDestroyed}
   * once destroyed, a player cannot receive more events of any kind.
   */
  onPlaybackEvent(event, normalizedTime) {
    switch (event.event) {
      case "kPlay":
        this.canTick = true;
        this.ensureNoPreviousPlaybackEvent(normalizedTime);
        this.playbackStatusLastEvent = this.startEvent({
          level: 0,
          startTime: normalizedTime,
          name: "Play"
        });
        break;
      case "kPause":
        this.ensureNoPreviousPlaybackEvent(normalizedTime);
        this.playbackStatusLastEvent = this.startEvent({
          level: 0,
          startTime: normalizedTime,
          name: "Pause",
          color: HotColorScheme[1]
        });
        break;
      case "kWebMediaPlayerDestroyed":
        this.canTick = false;
        this.ensureNoPreviousPlaybackEvent(normalizedTime);
        this.addMarker({
          level: 1,
          startTime: normalizedTime,
          name: "Destroyed",
          color: HotColorScheme[4]
        });
        break;
      case "kSuspended":
        this.canTick = false;
        this.ensureNoPreviousPlaybackEvent(normalizedTime);
        this.playbackStatusLastEvent = this.startEvent({
          level: 1,
          startTime: normalizedTime,
          name: "Suspended",
          color: HotColorScheme[3]
        });
        break;
      case "kEnded":
        this.ensureNoPreviousPlaybackEvent(normalizedTime);
        this.playbackStatusLastEvent = this.startEvent({
          level: 1,
          startTime: normalizedTime,
          name: "Ended",
          color: HotColorScheme[2]
        });
        break;
      default:
        throw new Error(`_onPlaybackEvent cant handle ${event.event}`);
    }
  }
  bufferedEnough(state) {
    return state["state"] === "BUFFERING_HAVE_ENOUGH";
  }
  onBufferingStatus(event, normalizedTime) {
    let audioState = null;
    let videoState = null;
    switch (event.event) {
      case "kBufferingStateChanged":
        audioState = event.value["audio_buffering_state"];
        videoState = event.value["video_buffering_state"];
        if (audioState) {
          if (this.audioBufferingStateEvent !== null) {
            this.audioBufferingStateEvent.endTime = normalizedTime;
            this.audioBufferingStateEvent = null;
          }
          if (!this.bufferedEnough(audioState)) {
            this.audioBufferingStateEvent = this.startEvent({
              level: 3,
              startTime: normalizedTime,
              name: "Audio Buffering",
              color: ColdColorScheme[1]
            });
          }
        }
        if (videoState) {
          if (this.videoBufferingStateEvent !== null) {
            this.videoBufferingStateEvent.endTime = normalizedTime;
            this.videoBufferingStateEvent = null;
          }
          if (!this.bufferedEnough(videoState)) {
            this.videoBufferingStateEvent = this.startEvent({
              level: 2,
              startTime: normalizedTime,
              name: "Video Buffering",
              color: ColdColorScheme[0]
            });
          }
        }
        break;
      default:
        throw new Error(`_onPlaybackEvent cant handle ${event.event}`);
    }
  }
  onEvent(event) {
    if (this.normalizedTimestamp === NO_NORMALIZED_TIMESTAMP) {
      this.normalizedTimestamp = Number(event.timestamp);
    }
    const inMilliseconds = (Number(event.timestamp) - this.normalizedTimestamp) * 1e3;
    switch (event.event) {
      case "kPlay":
      case "kPause":
      case "kWebMediaPlayerDestroyed":
      case "kSuspended":
      case "kEnded":
        return this.onPlaybackEvent(event, inMilliseconds);
      case "kBufferingStateChanged":
        return this.onBufferingStatus(event, inMilliseconds);
      default:
    }
  }
};

// gen/front_end/panels/media/PlayerMessagesView.js
import "./../../ui/legacy/legacy.js";
import * as i18n5 from "./../../core/i18n/i18n.js";
import * as UI3 from "./../../ui/legacy/legacy.js";
import * as VisualLogging3 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/media/playerMessagesView.css.js
var playerMessagesView_css_default = `/*
 * Copyright 2020 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
.media-messages-header {
  background-color: var(--sys-color-cdt-base-container);
  border-bottom: 1px solid var(--sys-color-divider);
  min-height: 26px;
}

.media-messages-body {
  overflow-y: scroll;
}

.media-messages-level-dropdown-element {
  height: 18px;
  line-height: 18px;
}

.media-messages-level-dropdown-text {
  float: left;
}

.media-messages-level-dropdown-checkbox {
  float: left;
  width: 18px;
  height: 100%;
  padding-left: 2px;
}

.media-messages-message-container {
  margin: 4px;
  font-size: 14px;
  line-height: 18px;
  padding: 4px;
  user-select: text;
}

.media-messages-message-container + .media-messages-message-container {
  border-top: 1px solid var(--sys-color-divider);

  &.media-message-warning,
  &.media-message-error {
    border: none;
  }
}

.media-message-warning {
  border-radius: 5px;
  background-color: var(--sys-color-surface-yellow);
  color: var(--sys-color-on-surface-yellow);
}

.media-message-error {
  border-radius: 5px;
  background-color: var(--sys-color-surface-error);
  color: var(--sys-color-on-surface-error);
}

.media-messages-message-filtered {
  display: none;
}

.media-messages-message-unselected {
  display: none;
}

.status-error-box {
  font-family: monospace;
  border: 1px solid var(--sys-color-error-outline);
  border-radius: 5px;
  padding: 4px;
}

.status-error-field-label {
  padding-right: 10px;
  color: var(--sys-color-token-subtle);
}

.status-error-field-labeled {
  display: flex;
}

/*# sourceURL=${import.meta.resolve("./playerMessagesView.css")} */`;

// gen/front_end/panels/media/PlayerMessagesView.js
var UIStrings3 = {
  /**
   * @description A context menu item in the Console View of the Console panel
   */
  default: "Default",
  /**
   * @description Text in Network Throttling Selector of the Network panel
   */
  custom: "Custom",
  /**
   * @description Text for everything
   */
  all: "All",
  /**
   * @description Text for errors
   */
  error: "Error",
  /**
   * @description Text to indicate an item is a warning
   */
  warning: "Warning",
  /**
   * @description Sdk console message message level info of level Labels in Console View of the Console panel
   */
  info: "Info",
  /**
   * @description Debug log level
   */
  debug: "Debug",
  /**
   * @description Label for selecting between the set of log levels to show.
   */
  logLevel: "Log level:",
  /**
   * @description Default text for user-text-entry for searching log messages.
   */
  filterByLogMessages: "Filter by log messages",
  /**
   * @description The label for the group name that this error belongs to.
   */
  errorGroupLabel: "Error Group:",
  /**
   * @description The label for the numeric code associated with this error.
   */
  errorCodeLabel: "Error Code:",
  /**
   * @description The label for extra data associated with an error.
   */
  errorDataLabel: "Data:",
  /**
   * @description The label for the stacktrace associated with the error.
   */
  errorStackLabel: "Stacktrace:",
  /**
   * @description The label for a root cause error associated with this error.
   */
  errorCauseLabel: "Caused by:"
};
var str_3 = i18n5.i18n.registerUIStrings("panels/media/PlayerMessagesView.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var MessageLevelSelector = class {
  items;
  view;
  itemMap;
  hiddenLevels;
  bitFieldValue;
  #defaultTitle;
  customTitle;
  allTitle;
  elementsForItems;
  constructor(items, view) {
    this.items = items;
    this.view = view;
    this.itemMap = /* @__PURE__ */ new Map();
    this.hiddenLevels = [];
    this.bitFieldValue = 7;
    this.#defaultTitle = i18nString3(UIStrings3.default);
    this.customTitle = i18nString3(UIStrings3.custom);
    this.allTitle = i18nString3(UIStrings3.all);
    this.elementsForItems = /* @__PURE__ */ new WeakMap();
  }
  defaultTitle() {
    return this.#defaultTitle;
  }
  setDefault(dropdown) {
    dropdown.selectItem(this.items.at(0));
  }
  populate() {
    this.items.insert(this.items.length, {
      title: this.#defaultTitle,
      overwrite: true,
      stringValue: "",
      value: 7,
      selectable: void 0
    });
    this.items.insert(this.items.length, {
      title: this.allTitle,
      overwrite: true,
      stringValue: "",
      value: 15,
      selectable: void 0
    });
    this.items.insert(this.items.length, {
      title: i18nString3(UIStrings3.error),
      overwrite: false,
      stringValue: "error",
      value: 1,
      selectable: void 0
    });
    this.items.insert(this.items.length, {
      title: i18nString3(UIStrings3.warning),
      overwrite: false,
      stringValue: "warning",
      value: 2,
      selectable: void 0
    });
    this.items.insert(this.items.length, {
      title: i18nString3(UIStrings3.info),
      overwrite: false,
      stringValue: "info",
      value: 4,
      selectable: void 0
    });
    this.items.insert(this.items.length, {
      title: i18nString3(UIStrings3.debug),
      overwrite: false,
      stringValue: "debug",
      value: 8,
      selectable: void 0
    });
  }
  updateCheckMarks() {
    this.hiddenLevels = [];
    for (const [key, item2] of this.itemMap) {
      if (!item2.overwrite) {
        const elementForItem = this.elementsForItems.get(item2);
        if (elementForItem?.firstChild) {
          elementForItem.firstChild.remove();
        }
        if (elementForItem && key & this.bitFieldValue) {
          UI3.UIUtils.createTextChild(elementForItem.createChild("div"), "\u2713");
        } else {
          this.hiddenLevels.push(item2.stringValue);
        }
      }
    }
  }
  titleFor(item2) {
    if (item2.overwrite) {
      this.bitFieldValue = item2.value;
    } else {
      this.bitFieldValue ^= item2.value;
    }
    if (this.bitFieldValue === 7) {
      return this.#defaultTitle;
    }
    if (this.bitFieldValue === 15) {
      return this.allTitle;
    }
    const potentialMatch = this.itemMap.get(this.bitFieldValue);
    if (potentialMatch) {
      return potentialMatch.title;
    }
    return this.customTitle;
  }
  createElementForItem(item2) {
    const element = document.createElement("div");
    const shadowRoot = UI3.UIUtils.createShadowRootWithCoreStyles(element, { cssFile: playerMessagesView_css_default });
    const container = shadowRoot.createChild("div", "media-messages-level-dropdown-element");
    const checkBox = container.createChild("div", "media-messages-level-dropdown-checkbox");
    const text = container.createChild("span", "media-messages-level-dropdown-text");
    UI3.UIUtils.createTextChild(text, item2.title);
    this.elementsForItems.set(item2, checkBox);
    this.itemMap.set(item2.value, item2);
    this.updateCheckMarks();
    this.view.regenerateMessageDisplayCss(this.hiddenLevels);
    return element;
  }
  isItemSelectable(_item) {
    return true;
  }
  itemSelected(_item) {
    this.updateCheckMarks();
    this.view.regenerateMessageDisplayCss(this.hiddenLevels);
  }
  highlightedItemChanged(_from, _to, _fromElement, _toElement) {
  }
};
var PlayerMessagesView = class extends UI3.Widget.VBox {
  headerPanel;
  bodyPanel;
  messageLevelSelector;
  constructor() {
    super({ jslog: `${VisualLogging3.pane("messages")}` });
    this.registerRequiredCSS(playerMessagesView_css_default);
    this.headerPanel = this.contentElement.createChild("div", "media-messages-header");
    this.bodyPanel = this.contentElement.createChild("div", "media-messages-body");
    this.buildToolbar();
  }
  buildToolbar() {
    const toolbar = this.headerPanel.createChild("devtools-toolbar", "media-messages-toolbar");
    toolbar.appendText(i18nString3(UIStrings3.logLevel));
    toolbar.appendToolbarItem(this.createDropdown());
    toolbar.appendSeparator();
    toolbar.appendToolbarItem(this.createFilterInput());
  }
  createDropdown() {
    const items = new UI3.ListModel.ListModel();
    this.messageLevelSelector = new MessageLevelSelector(items, this);
    const dropDown = new UI3.SoftDropDown.SoftDropDown(items, this.messageLevelSelector, "log-level");
    dropDown.setRowHeight(18);
    this.messageLevelSelector.populate();
    this.messageLevelSelector.setDefault(dropDown);
    const dropDownItem = new UI3.Toolbar.ToolbarItem(dropDown.element);
    dropDownItem.element.classList.add("toolbar-has-dropdown");
    dropDownItem.setEnabled(true);
    dropDownItem.setTitle(this.messageLevelSelector.defaultTitle());
    UI3.ARIAUtils.setLabel(dropDownItem.element, `${i18nString3(UIStrings3.logLevel)} ${this.messageLevelSelector.defaultTitle()}`);
    return dropDownItem;
  }
  createFilterInput() {
    const filterInput = new UI3.Toolbar.ToolbarFilter(i18nString3(UIStrings3.filterByLogMessages), 1, 1);
    filterInput.addEventListener("TextChanged", (data) => {
      this.filterByString(data);
    }, this);
    return filterInput;
  }
  regenerateMessageDisplayCss(hiddenLevels) {
    const messages = this.bodyPanel.getElementsByClassName("media-messages-message-container");
    for (const message of messages) {
      if (this.matchesHiddenLevels(message, hiddenLevels)) {
        message.classList.add("media-messages-message-unselected");
      } else {
        message.classList.remove("media-messages-message-unselected");
      }
    }
  }
  matchesHiddenLevels(element, hiddenLevels) {
    for (const level of hiddenLevels) {
      if (element.classList.contains("media-message-" + level)) {
        return true;
      }
    }
    return false;
  }
  filterByString(userStringData) {
    const userString = userStringData.data;
    const messages = this.bodyPanel.getElementsByClassName("media-messages-message-container");
    for (const message of messages) {
      if (userString === "") {
        message.classList.remove("media-messages-message-filtered");
      } else if (message.textContent?.includes(userString)) {
        message.classList.remove("media-messages-message-filtered");
      } else {
        message.classList.add("media-messages-message-filtered");
      }
    }
  }
  addMessage(message) {
    const container = this.bodyPanel.createChild("div", "media-messages-message-container media-message-" + message.level);
    UI3.UIUtils.createTextChild(container, message.message);
  }
  errorToDiv(error) {
    const entry = UI3.Fragment.Fragment.build`
    <div class="status-error-box">
    <div class="status-error-field-labeled">
      <span class="status-error-field-label" $="status-error-group"></span>
      <span>${error.errorType}</span>
    </div>
    <div class="status-error-field-labeled">
      <span class="status-error-field-label" $="status-error-code"></span>
      <span>${error.code}</span>
    </div>
    <div class="status-error-field-labeled" $="status-error-data">
    </div>
    <div class="status-error-field-labeled" $="status-error-stack">
    </div>
    <div class="status-error-field-labeled" $="status-error-cause">
    </div>
    `;
    entry.$("status-error-group").textContent = i18nString3(UIStrings3.errorGroupLabel);
    entry.$("status-error-code").textContent = i18nString3(UIStrings3.errorCodeLabel);
    if (Object.keys(error.data).length !== 0) {
      const label = entry.$("status-error-data").createChild("span", "status-error-field-label");
      UI3.UIUtils.createTextChild(label, i18nString3(UIStrings3.errorDataLabel));
      const dataContent = entry.$("status-error-data").createChild("div");
      for (const [key, value] of Object.entries(error.data)) {
        const datumContent = dataContent.createChild("div");
        UI3.UIUtils.createTextChild(datumContent, `${key}: ${value}`);
      }
    }
    if (error.stack.length !== 0) {
      const label = entry.$("status-error-stack").createChild("span", "status-error-field-label");
      UI3.UIUtils.createTextChild(label, i18nString3(UIStrings3.errorStackLabel));
      const stackContent = entry.$("status-error-stack").createChild("div");
      for (const stackEntry of error.stack) {
        const frameBox = stackContent.createChild("div");
        UI3.UIUtils.createTextChild(frameBox, `${stackEntry.file}:${stackEntry.line}`);
      }
    }
    if (error.cause.length !== 0) {
      const label = entry.$("status-error-cause").createChild("span", "status-error-field-label");
      UI3.UIUtils.createTextChild(label, i18nString3(UIStrings3.errorCauseLabel));
      entry.$("status-error-cause").appendChild(this.errorToDiv(error.cause[0]));
    }
    return entry.element();
  }
  addError(error) {
    const container = this.bodyPanel.createChild("div", "media-messages-message-container media-message-error");
    container.appendChild(this.errorToDiv(error));
  }
};

// gen/front_end/panels/media/PlayerPropertiesView.js
var PlayerPropertiesView_exports = {};
__export(PlayerPropertiesView_exports, {
  AttributesView: () => AttributesView,
  AudioTrackManager: () => AudioTrackManager,
  DefaultPropertyRenderer: () => DefaultPropertyRenderer,
  FormattedPropertyRenderer: () => FormattedPropertyRenderer,
  NestedPropertyRenderer: () => NestedPropertyRenderer,
  PlayerPropertiesView: () => PlayerPropertiesView,
  PropertyRenderer: () => PropertyRenderer,
  TextTrackManager: () => TextTrackManager,
  TrackManager: () => TrackManager,
  VideoTrackManager: () => VideoTrackManager
});
import * as i18n7 from "./../../core/i18n/i18n.js";
import * as Platform2 from "./../../core/platform/platform.js";
import * as SourceFrame2 from "./../../ui/legacy/components/source_frame/source_frame.js";
import * as UI4 from "./../../ui/legacy/legacy.js";
import * as VisualLogging4 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/media/playerPropertiesView.css.js
var playerPropertiesView_css_default = `/*
 * Copyright 2019 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.media-attributes-view {
  border-bottom: 1px solid var(--sys-color-divider);
}

.media-property-renderer {
  line-height: 20px;
  min-height: 28px;
  padding: 4px 10px;
  display: block;
  overflow: hidden;

  &:hover {
    background: var(--sys-color-state-hover-on-subtle);
  }
}

.media-property-renderer:nth-child(even):not(:hover) {
  background: var(--sys-color-surface1);
}

.media-property-renderer:has(.json-view) {
  padding-bottom: 0;
}

.media-property-renderer:has(.json-view > .expanded) {
  padding-bottom: 4px;
}

.media-property-renderer-hidden {
  display: none;
}

.media-property-renderer-title {
  font-size: 12px;
  float: left;
  width: 150px;
}

.media-property-renderer-title::first-letter {
  text-transform: uppercase;
}

.media-property-renderer-contents {
  position: relative;

  & > .json-view {
    overflow: hidden;
    padding: 0;
  }
}

.media-properties-frame {
  display: block;
  overflow-x: hidden;
}

/*# sourceURL=${import.meta.resolve("./playerPropertiesView.css")} */`;

// gen/front_end/panels/media/PlayerPropertiesView.js
var UIStrings4 = {
  /**
   * @description The type of media, for example - video, audio, or text. Capitalized.
   */
  video: "Video",
  /**
   * @description The type of media, for example - video, audio, or text. Capitalized.
   */
  audio: "Audio",
  /**
   * @description A video or audio stream - but capitalized.
   */
  track: "Track",
  /**
   * @description A device that converts media files into playable streams of audio or video.
   */
  decoder: "Decoder",
  /**
   * @description Title of the 'Properties' tool in the sidebar of the elements tool
   */
  properties: "Properties",
  /**
   * @description Menu label for text tracks, it is followed by a number, like 'Text Track #1'
   */
  textTrack: "Text track",
  /**
   * @description Placeholder text stating that there are no text tracks on this player. A text track
   * is all of the text that accompanies a particular video.
   */
  noTextTracks: "No text tracks",
  /**
   * @description Media property giving the width x height of the video
   */
  resolution: "Resolution",
  /**
   * @description Media property giving the file size of the media
   */
  fileSize: "File size",
  /**
   * @description Media property giving the media file bitrate
   */
  bitrate: "Bitrate",
  /**
   * @description Text for the duration of something
   */
  duration: "Duration",
  /**
   * @description The label for a timestamp when a video was started.
   */
  startTime: "Start time",
  /**
   * @description Media property signaling whether the media is streaming
   */
  streaming: "Streaming",
  /**
   * @description Media property describing where the media is playing from.
   */
  playbackFrameUrl: "Playback frame URL",
  /**
   * @description Media property giving the title of the frame where the media is embedded
   */
  playbackFrameTitle: "Playback frame title",
  /**
   * @description Media property describing whether the file is single or cross origin in nature
   */
  singleoriginPlayback: "Single-origin playback",
  /**
   * @description Media property describing support for range http headers
   */
  rangeHeaderSupport: "`Range` header support",
  /**
   * @description Media property giving the media file frame rate
   */
  frameRate: "Frame rate",
  /**
   * @description Media property giving the distance of the playback quality from the ideal playback.
   * Roughness is the opposite to smoothness, i.e. whether each frame of the video was played at the
   * right time so that the video looks smooth when it plays.
   */
  videoPlaybackRoughness: "Video playback roughness",
  /**
   * @description A score describing how choppy the video playback is.
   */
  videoFreezingScore: "Video freezing score",
  /**
   * @description Media property giving the name of the renderer being used
   */
  rendererName: "Renderer name",
  /**
   * @description Media property giving the name of the decoder being used
   */
  decoderName: "Decoder name",
  /**
   * @description There is no decoder
   */
  noDecoder: "No decoder",
  /**
   * @description Media property signaling whether a hardware decoder is being used
   */
  hardwareDecoder: "Hardware decoder",
  /**
   * @description Media property signaling whether the content is encrypted. This is a noun phrase for
   *a demultiplexer that does decryption.
   */
  decryptingDemuxer: "Decrypting demuxer",
  /**
   * @description Media property giving the name of the video encoder being used.
   */
  encoderName: "Encoder name",
  /**
   * @description There is no encoder.
   */
  noEncoder: "No encoder",
  /**
   * @description Media property signaling whether the encoder is hardware accelerated.
   */
  hardwareEncoder: "Hardware encoder",
  /**
   * @description Property for adaptive (HLS) playback which shows the start/end time of the loaded content buffer
   */
  hlsBufferedRanges: "Buffered media ranges"
};
var str_4 = i18n7.i18n.registerUIStrings("panels/media/PlayerPropertiesView.ts", UIStrings4);
var i18nString4 = i18n7.i18n.getLocalizedString.bind(void 0, str_4);
var i18nLazyString = i18n7.i18n.getLazilyComputedLocalizedString.bind(void 0, str_4);
var PropertyRenderer = class extends UI4.Widget.VBox {
  contents;
  value;
  pseudoColorProtectionElement;
  constructor(title) {
    super();
    this.contentElement.classList.add("media-property-renderer");
    const titleElement = this.contentElement.createChild("span", "media-property-renderer-title");
    this.contents = this.contentElement.createChild("div", "media-property-renderer-contents");
    UI4.UIUtils.createTextChild(titleElement, title);
    this.value = null;
    this.pseudoColorProtectionElement = null;
    this.contentElement.classList.add("media-property-renderer-hidden");
  }
  updateData(propvalue) {
    if (propvalue === "" || propvalue === null) {
      this.changeContents(null);
    } else if (this.value === propvalue) {
      return;
    } else {
      this.value = propvalue;
      this.updateDataInternal(propvalue);
    }
  }
  updateDataInternal(propvalue) {
    try {
      const parsed = JSON.parse(propvalue);
      this.changeContents(parsed);
    } catch {
      this.changeContents(propvalue);
    }
  }
  unsetNestedContents() {
    this.contentElement.classList.add("media-property-renderer-hidden");
    if (this.pseudoColorProtectionElement === null) {
      this.pseudoColorProtectionElement = document.createElement("div");
      this.pseudoColorProtectionElement.classList.add("media-property-renderer");
      this.pseudoColorProtectionElement.classList.add("media-property-renderer-hidden");
      this.contentElement.parentNode.insertBefore(this.pseudoColorProtectionElement, this.contentElement);
    }
  }
  changeNestedContents(value) {
    if (value === null || Object.keys(value).length === 0) {
      this.unsetNestedContents();
    } else {
      if (this.pseudoColorProtectionElement !== null) {
        this.pseudoColorProtectionElement.remove();
        this.pseudoColorProtectionElement = null;
      }
      this.contentElement.classList.remove("media-property-renderer-hidden");
      this.contents.removeChildren();
      const jsonWrapperElement = new SourceFrame2.JSONView.JSONView(new SourceFrame2.JSONView.ParsedJSON(value, "", ""), true);
      jsonWrapperElement.show(this.contents);
    }
  }
  changeContents(value) {
    if (value === null) {
      this.unsetNestedContents();
    } else {
      if (this.pseudoColorProtectionElement !== null) {
        this.pseudoColorProtectionElement.remove();
        this.pseudoColorProtectionElement = null;
      }
      this.contentElement.classList.remove("media-property-renderer-hidden");
      this.contents.removeChildren();
      const spanElement = document.createElement("span");
      spanElement.textContent = value;
      this.contents.appendChild(spanElement);
    }
  }
};
var FormattedPropertyRenderer = class extends PropertyRenderer {
  formatfunction;
  constructor(title, formatfunction) {
    super(title);
    this.formatfunction = formatfunction;
  }
  updateDataInternal(propvalue) {
    try {
      const parsed = JSON.parse(propvalue);
      this.changeContents(this.formatfunction(parsed));
    } catch {
      const unparsed = propvalue;
      this.changeContents(this.formatfunction(unparsed));
    }
  }
};
var DefaultPropertyRenderer = class extends PropertyRenderer {
  constructor(title, defaultText) {
    super(title);
    this.changeContents(defaultText);
  }
};
var NestedPropertyRenderer = class extends PropertyRenderer {
  constructor(title, content) {
    super(title);
    this.changeNestedContents(content);
  }
};
var AttributesView = class extends UI4.Widget.VBox {
  contentHash;
  constructor(elements) {
    super();
    this.contentHash = 0;
    this.contentElement.classList.add("media-attributes-view");
    for (const element of elements) {
      element.show(this.contentElement);
      const content = this.contentElement.textContent;
      if (content !== null) {
        this.contentHash += Platform2.StringUtilities.hashCode(content);
      }
    }
  }
  getContentHash() {
    return this.contentHash;
  }
};
var TrackManager = class {
  type;
  view;
  constructor(propertiesView, type) {
    this.type = type;
    this.view = propertiesView;
  }
  updateData(value) {
    const tabs = this.view.getTabs(this.type);
    const newTabs = JSON.parse(value);
    let enumerate = 1;
    for (const tabData of newTabs) {
      this.addNewTab(tabs, tabData, enumerate);
      enumerate++;
    }
  }
  addNewTab(tabs, tabData, tabNumber) {
    const tabElements = [];
    for (const [name, data] of Object.entries(tabData)) {
      if (typeof data === "object") {
        tabElements.push(new NestedPropertyRenderer(i18n7.i18n.lockedString(name), data));
      } else {
        tabElements.push(new DefaultPropertyRenderer(i18n7.i18n.lockedString(name), data));
      }
    }
    const newTab = new AttributesView(tabElements);
    tabs.addNewTab(tabNumber, newTab);
  }
};
var VideoTrackManager = class extends TrackManager {
  constructor(propertiesView) {
    super(propertiesView, "video");
  }
};
var TextTrackManager = class extends TrackManager {
  constructor(propertiesView) {
    super(propertiesView, "text");
  }
};
var AudioTrackManager = class extends TrackManager {
  constructor(propertiesView) {
    super(propertiesView, "audio");
  }
};
var TrackTypeLocalized = {
  Video: i18nLazyString(UIStrings4.video),
  Audio: i18nLazyString(UIStrings4.audio)
};
var GenericTrackMenu = class extends UI4.TabbedPane.TabbedPane {
  decoderName;
  trackName;
  constructor(decoderName, trackName = i18nString4(UIStrings4.track)) {
    super();
    this.decoderName = decoderName;
    this.trackName = trackName;
  }
  addNewTab(trackNumber, element) {
    const localizedTrackLower = i18nString4(UIStrings4.track);
    const tabId = `track-${trackNumber}`;
    if (this.hasTab(tabId)) {
      const tabElement = this.tabView(tabId);
      if (tabElement === null) {
        return;
      }
      if (tabElement.getContentHash() === element.getContentHash()) {
        return;
      }
      this.closeTab(
        tabId,
        /* userGesture=*/
        false
      );
    }
    this.appendTab(
      tabId,
      // No need for localizing, internal ID.
      `${this.trackName} #${trackNumber}`,
      element,
      `${this.decoderName} ${localizedTrackLower} #${trackNumber}`
    );
  }
};
var DecoderTrackMenu = class extends GenericTrackMenu {
  constructor(decoderName, informationalElement) {
    super(decoderName);
    const decoderLocalized = i18nString4(UIStrings4.decoder);
    const title = `${decoderName} ${decoderLocalized}`;
    const propertiesLocalized = i18nString4(UIStrings4.properties);
    const hoverText = `${title} ${propertiesLocalized}`;
    this.appendTab("decoder-properties", title, informationalElement, hoverText);
  }
};
var NoTracksPlaceholderMenu = class extends UI4.Widget.VBox {
  isPlaceholder;
  wrapping;
  constructor(wrapping, placeholderText) {
    super();
    this.isPlaceholder = true;
    this.wrapping = wrapping;
    this.wrapping.appendTab("_placeholder", placeholderText, new UI4.Widget.VBox(), placeholderText);
    this.wrapping.show(this.contentElement);
  }
  addNewTab(trackNumber, element) {
    if (this.isPlaceholder) {
      this.wrapping.closeTab("_placeholder");
      this.isPlaceholder = false;
    }
    this.wrapping.addNewTab(trackNumber, element);
  }
};
var PlayerPropertiesView = class extends UI4.Widget.VBox {
  mediaElements;
  videoDecoderElements;
  audioDecoderElements;
  attributeMap;
  videoProperties;
  videoDecoderProperties;
  audioDecoderProperties;
  videoDecoderTabs;
  audioDecoderTabs;
  textTracksTabs;
  constructor() {
    super({ jslog: `${VisualLogging4.pane("properties")}` });
    this.registerRequiredCSS(playerPropertiesView_css_default);
    this.contentElement.classList.add("media-properties-frame");
    this.mediaElements = [];
    this.videoDecoderElements = [];
    this.audioDecoderElements = [];
    this.attributeMap = /* @__PURE__ */ new Map();
    this.populateAttributesAndElements();
    this.videoProperties = new AttributesView(this.mediaElements);
    this.videoDecoderProperties = new AttributesView(this.videoDecoderElements);
    this.audioDecoderProperties = new AttributesView(this.audioDecoderElements);
    this.videoProperties.show(this.contentElement);
    this.videoDecoderTabs = new DecoderTrackMenu(TrackTypeLocalized.Video(), this.videoDecoderProperties);
    this.videoDecoderTabs.show(this.contentElement);
    this.audioDecoderTabs = new DecoderTrackMenu(TrackTypeLocalized.Audio(), this.audioDecoderProperties);
    this.audioDecoderTabs.show(this.contentElement);
    this.textTracksTabs = null;
  }
  lazyCreateTrackTabs() {
    let textTracksTabs = this.textTracksTabs;
    if (textTracksTabs === null) {
      const textTracks = new GenericTrackMenu(i18nString4(UIStrings4.textTrack));
      textTracksTabs = new NoTracksPlaceholderMenu(textTracks, i18nString4(UIStrings4.noTextTracks));
      textTracksTabs.show(this.contentElement);
      this.textTracksTabs = textTracksTabs;
    }
    return textTracksTabs;
  }
  getTabs(type) {
    if (type === "audio") {
      return this.audioDecoderTabs;
    }
    if (type === "video") {
      return this.videoDecoderTabs;
    }
    if (type === "text") {
      return this.lazyCreateTrackTabs();
    }
    throw new Error("Unreachable");
  }
  onProperty(property) {
    const renderer = this.attributeMap.get(property.name);
    if (!renderer) {
      throw new Error(`Player property "${property.name}" not supported.`);
    }
    renderer.updateData(property.value);
  }
  formatKbps(bitsPerSecond) {
    if (bitsPerSecond === "") {
      return "0 kbps";
    }
    const kbps = Math.floor(Number(bitsPerSecond) / 1e3);
    return `${kbps} kbps`;
  }
  formatTime(seconds) {
    if (seconds === "") {
      return "0:00";
    }
    const date = /* @__PURE__ */ new Date();
    date.setSeconds(Number(seconds));
    return date.toISOString().substr(11, 8);
  }
  formatFileSize(bytes) {
    if (bytes === "") {
      return "0 bytes";
    }
    const actualBytes = Number(bytes);
    if (actualBytes < 1e3) {
      return `${bytes} bytes`;
    }
    const power = Math.floor(Math.log10(actualBytes) / 3);
    const suffix = ["bytes", "kB", "MB", "GB", "TB"][power];
    const bytesDecimal = (actualBytes / Math.pow(1e3, power)).toFixed(2);
    return `${bytesDecimal} ${suffix}`;
  }
  formatBufferedRanges(ranges) {
    return ranges.map((range) => {
      return "[" + range[0] + " \u2192 " + range[1] + "]";
    }).join(", ");
  }
  populateAttributesAndElements() {
    const resolution = new PropertyRenderer(i18nString4(UIStrings4.resolution));
    this.mediaElements.push(resolution);
    this.attributeMap.set("kResolution", resolution);
    const fileSize = new FormattedPropertyRenderer(i18nString4(UIStrings4.fileSize), this.formatFileSize);
    this.mediaElements.push(fileSize);
    this.attributeMap.set("kTotalBytes", fileSize);
    const bitrate = new FormattedPropertyRenderer(i18nString4(UIStrings4.bitrate), this.formatKbps);
    this.mediaElements.push(bitrate);
    this.attributeMap.set("kBitrate", bitrate);
    const duration = new FormattedPropertyRenderer(i18nString4(UIStrings4.duration), this.formatTime);
    this.mediaElements.push(duration);
    this.attributeMap.set("kMaxDuration", duration);
    const startTime = new PropertyRenderer(i18nString4(UIStrings4.startTime));
    this.mediaElements.push(startTime);
    this.attributeMap.set("kStartTime", startTime);
    const streaming = new PropertyRenderer(i18nString4(UIStrings4.streaming));
    this.mediaElements.push(streaming);
    this.attributeMap.set("kIsStreaming", streaming);
    const frameUrl = new PropertyRenderer(i18nString4(UIStrings4.playbackFrameUrl));
    this.mediaElements.push(frameUrl);
    this.attributeMap.set("kFrameUrl", frameUrl);
    const frameTitle = new PropertyRenderer(i18nString4(UIStrings4.playbackFrameTitle));
    this.mediaElements.push(frameTitle);
    this.attributeMap.set("kFrameTitle", frameTitle);
    const singleOrigin = new PropertyRenderer(i18nString4(UIStrings4.singleoriginPlayback));
    this.mediaElements.push(singleOrigin);
    this.attributeMap.set("kIsSingleOrigin", singleOrigin);
    const rangeHeaders = new PropertyRenderer(i18nString4(UIStrings4.rangeHeaderSupport));
    this.mediaElements.push(rangeHeaders);
    this.attributeMap.set("kIsRangeHeaderSupported", rangeHeaders);
    const frameRate = new PropertyRenderer(i18nString4(UIStrings4.frameRate));
    this.mediaElements.push(frameRate);
    this.attributeMap.set("kFramerate", frameRate);
    const roughness = new PropertyRenderer(i18nString4(UIStrings4.videoPlaybackRoughness));
    this.mediaElements.push(roughness);
    this.attributeMap.set("kVideoPlaybackRoughness", roughness);
    const freezingScore = new PropertyRenderer(i18nString4(UIStrings4.videoFreezingScore));
    this.mediaElements.push(freezingScore);
    this.attributeMap.set("kVideoPlaybackFreezing", freezingScore);
    const rendererName = new PropertyRenderer(i18nString4(UIStrings4.rendererName));
    this.mediaElements.push(rendererName);
    this.attributeMap.set("kRendererName", rendererName);
    const hlsBufferedRanges = new FormattedPropertyRenderer(i18nString4(UIStrings4.hlsBufferedRanges), this.formatBufferedRanges);
    this.mediaElements.push(hlsBufferedRanges);
    this.attributeMap.set("kHlsBufferedRanges", hlsBufferedRanges);
    const decoderName = new DefaultPropertyRenderer(i18nString4(UIStrings4.decoderName), i18nString4(UIStrings4.noDecoder));
    this.videoDecoderElements.push(decoderName);
    this.attributeMap.set("kVideoDecoderName", decoderName);
    const videoPlatformDecoder = new PropertyRenderer(i18nString4(UIStrings4.hardwareDecoder));
    this.videoDecoderElements.push(videoPlatformDecoder);
    this.attributeMap.set("kIsPlatformVideoDecoder", videoPlatformDecoder);
    const encoderName = new DefaultPropertyRenderer(i18nString4(UIStrings4.encoderName), i18nString4(UIStrings4.noEncoder));
    this.videoDecoderElements.push(encoderName);
    this.attributeMap.set("kVideoEncoderName", encoderName);
    const videoPlatformEncoder = new PropertyRenderer(i18nString4(UIStrings4.hardwareEncoder));
    this.videoDecoderElements.push(videoPlatformEncoder);
    this.attributeMap.set("kIsPlatformVideoEncoder", videoPlatformEncoder);
    const videoDDS = new PropertyRenderer(i18nString4(UIStrings4.decryptingDemuxer));
    this.videoDecoderElements.push(videoDDS);
    this.attributeMap.set("kIsVideoDecryptingDemuxerStream", videoDDS);
    const videoTrackManager = new VideoTrackManager(this);
    this.attributeMap.set("kVideoTracks", videoTrackManager);
    const audioDecoder = new DefaultPropertyRenderer(i18nString4(UIStrings4.decoderName), i18nString4(UIStrings4.noDecoder));
    this.audioDecoderElements.push(audioDecoder);
    this.attributeMap.set("kAudioDecoderName", audioDecoder);
    const audioPlatformDecoder = new PropertyRenderer(i18nString4(UIStrings4.hardwareDecoder));
    this.audioDecoderElements.push(audioPlatformDecoder);
    this.attributeMap.set("kIsPlatformAudioDecoder", audioPlatformDecoder);
    const audioDDS = new PropertyRenderer(i18nString4(UIStrings4.decryptingDemuxer));
    this.audioDecoderElements.push(audioDDS);
    this.attributeMap.set("kIsAudioDecryptingDemuxerStream", audioDDS);
    const audioTrackManager = new AudioTrackManager(this);
    this.attributeMap.set("kAudioTracks", audioTrackManager);
    const textTrackManager = new TextTrackManager(this);
    this.attributeMap.set("kTextTracks", textTrackManager);
  }
};

// gen/front_end/panels/media/PlayerDetailView.js
var UIStrings5 = {
  /**
   * @description Title of the 'Properties' tool in the sidebar of the elements tool
   */
  properties: "Properties",
  /**
   * @description Button text for viewing properties.
   */
  playerProperties: "Player properties",
  /**
   * @description Button text for viewing events.
   */
  events: "Events",
  /**
   * @description Hover text for the Events button.
   */
  playerEvents: "Player events",
  /**
   * @description Text in Network Item View of the Network panel
   */
  messages: "Messages",
  /**
   * @description Column header for messages view.
   */
  playerMessages: "Player messages",
  /**
   * @description Title for the timeline tab.
   */
  timeline: "Timeline",
  /**
   * @description Hovertext for Timeline tab.
   */
  playerTimeline: "Player timeline"
};
var str_5 = i18n9.i18n.registerUIStrings("panels/media/PlayerDetailView.ts", UIStrings5);
var i18nString5 = i18n9.i18n.getLocalizedString.bind(void 0, str_5);
var PlayerDetailView = class extends UI5.TabbedPane.TabbedPane {
  eventView;
  propertyView;
  messageView;
  timelineView;
  constructor() {
    super();
    this.eventView = new PlayerEventsView();
    this.propertyView = new PlayerPropertiesView();
    this.messageView = new PlayerMessagesView();
    this.timelineView = new PlayerEventsTimeline();
    this.appendTab("properties", i18nString5(UIStrings5.properties), this.propertyView, i18nString5(UIStrings5.playerProperties));
    this.appendTab("events", i18nString5(UIStrings5.events), this.eventView, i18nString5(UIStrings5.playerEvents));
    this.appendTab("messages", i18nString5(UIStrings5.messages), this.messageView, i18nString5(UIStrings5.playerMessages));
    this.appendTab("timeline", i18nString5(UIStrings5.timeline), this.timelineView, i18nString5(UIStrings5.playerTimeline));
  }
  onProperty(property) {
    this.propertyView.onProperty(property);
  }
  onError(error) {
    this.messageView.addError(error);
  }
  onMessage(message) {
    this.messageView.addMessage(message);
  }
  onEvent(event) {
    this.eventView.onEvent(event);
    this.timelineView.onEvent(event);
  }
};

// gen/front_end/panels/media/PlayerListView.js
var PlayerListView_exports = {};
__export(PlayerListView_exports, {
  PlayerListView: () => PlayerListView
});
import * as i18n11 from "./../../core/i18n/i18n.js";
import * as IconButton from "./../../ui/components/icon_button/icon_button.js";
import * as UI6 from "./../../ui/legacy/legacy.js";
import * as VisualLogging5 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/media/playerListView.css.js
var playerListView_css_default = `/*
 * Copyright 2019 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.tree-outline {
  padding-left: 0;
  color: var(--sys-color-token-subtle);
}

li.storage-group-list-item {
  padding: 10px 8px 6px;
}

li.storage-group-list-item:not(:first-child) {
  border-top: 1px solid var(--sys-color-divider);
}

li.storage-group-list-item::before {
  display: none;
}

.player-entry-row {
  height: 26px;
  min-height: 26px;
  line-height: 26px;

  &:nth-child(odd) {
    background: var(--sys-color-surface1);
  }

  &:hover {
    background: var(--sys-color-state-hover-on-subtle);
  }

  &.selected {
    background: var(--sys-color-tonal-container);
    color: var(--sys-color-on-tonal-container);
  }
}

.player-entry-status-icon-centering {
  margin: auto;
  display: inherit;
}

.player-entry-status-icon {
  width: 28px;
  min-width: 28px;
  height: 26px;
  border-right: 1px solid var(--sys-color-divider);
  overflow: hidden;
}

.player-entry-frame-title {
  height: 26px;
  width: 125px;
  min-width: 125px;
  text-overflow: ellipsis;
  padding: 0 10px;
  border-right: 1px solid var(--sys-color-divider);
  overflow: hidden;
}

.player-entry-player-title {
  height: 26px;
  padding-left: 10px;
  overflow: hidden;
}

.player-entry-header {
  height: 27px;
  line-height: 27px;
  min-height: 27px;
  padding-left: 10px;
  border-bottom: 1px solid var(--sys-color-divider);
}

/*# sourceURL=${import.meta.resolve("./playerListView.css")} */`;

// gen/front_end/panels/media/PlayerListView.js
var UIStrings6 = {
  /**
   * @description A right-click context menu entry which when clicked causes the menu entry for that player to be removed.
   */
  hidePlayer: "Hide player",
  /**
   * @description A right-click context menu entry which should keep the element selected, while hiding all other entries.
   */
  hideAllOthers: "Hide all others",
  /**
   * @description Context menu entry which downloads the json dump when clicked
   */
  savePlayerInfo: "Save player info",
  /**
   * @description Side-panel entry title text for the players section.
   */
  players: "Players"
};
var str_6 = i18n11.i18n.registerUIStrings("panels/media/PlayerListView.ts", UIStrings6);
var i18nString6 = i18n11.i18n.getLocalizedString.bind(void 0, str_6);
var PlayerListView = class extends UI6.Widget.VBox {
  playerEntryFragments;
  playerEntriesWithHostnameFrameTitle;
  mainContainer;
  currentlySelectedEntry;
  constructor(mainContainer) {
    super({ useShadowDom: true });
    this.registerRequiredCSS(playerListView_css_default);
    this.playerEntryFragments = /* @__PURE__ */ new Map();
    this.playerEntriesWithHostnameFrameTitle = /* @__PURE__ */ new Set();
    this.mainContainer = mainContainer;
    this.currentlySelectedEntry = null;
    this.contentElement.createChild("div", "player-entry-header").textContent = i18nString6(UIStrings6.players);
  }
  createPlayerListEntry(playerID) {
    const entry = UI6.Fragment.Fragment.build`
    <div class="player-entry-row hbox">
    <div class="player-entry-status-icon vbox">
    <div $="icon" class="player-entry-status-icon-centering"></div>
    </div>
    <div $="frame-title" class="player-entry-frame-title">FrameTitle</div>
    <div $="player-title" class="player-entry-player-title">PlayerTitle</div>
    </div>
    `;
    const element = entry.element();
    element.setAttribute("jslog", `${VisualLogging5.item("player").track({ click: true })}`);
    element.addEventListener("click", this.selectPlayer.bind(this, playerID, element));
    element.addEventListener("contextmenu", this.rightClickPlayer.bind(this, playerID));
    entry.$("icon").appendChild(IconButton.Icon.create("pause", "media-player"));
    return entry;
  }
  selectPlayerById(playerID) {
    const fragment = this.playerEntryFragments.get(playerID);
    if (fragment) {
      this.selectPlayer(playerID, fragment.element());
    }
  }
  selectPlayer(playerID, element) {
    this.mainContainer.renderMainPanel(playerID);
    if (this.currentlySelectedEntry !== null) {
      this.currentlySelectedEntry.classList.remove("selected");
      this.currentlySelectedEntry.classList.remove("force-white-icons");
    }
    element.classList.add("selected");
    element.classList.add("force-white-icons");
    this.currentlySelectedEntry = element;
  }
  rightClickPlayer(playerID, event) {
    const contextMenu = new UI6.ContextMenu.ContextMenu(event);
    contextMenu.headerSection().appendItem(i18nString6(UIStrings6.hidePlayer), this.mainContainer.markPlayerForDeletion.bind(this.mainContainer, playerID), { jslogContext: "hide-player" });
    contextMenu.headerSection().appendItem(i18nString6(UIStrings6.hideAllOthers), this.mainContainer.markOtherPlayersForDeletion.bind(this.mainContainer, playerID), { jslogContext: "hide-all-others" });
    contextMenu.headerSection().appendItem(i18nString6(UIStrings6.savePlayerInfo), this.mainContainer.exportPlayerData.bind(this.mainContainer, playerID), { jslogContext: "save-player-info" });
    void contextMenu.show();
    return true;
  }
  setMediaElementFrameTitle(playerID, frameTitle, isHostname) {
    if (this.playerEntriesWithHostnameFrameTitle.has(playerID)) {
      if (!isHostname) {
        this.playerEntriesWithHostnameFrameTitle.delete(playerID);
      }
    } else if (isHostname) {
      return;
    }
    if (!this.playerEntryFragments.has(playerID)) {
      return;
    }
    const fragment = this.playerEntryFragments.get(playerID);
    if (fragment?.element() === void 0) {
      return;
    }
    fragment.$("frame-title").textContent = frameTitle;
  }
  setMediaElementPlayerTitle(playerID, playerTitle) {
    if (!this.playerEntryFragments.has(playerID)) {
      return;
    }
    const fragment = this.playerEntryFragments.get(playerID);
    if (fragment === void 0) {
      return;
    }
    fragment.$("player-title").textContent = playerTitle;
  }
  setMediaElementPlayerIcon(playerID, iconName) {
    if (!this.playerEntryFragments.has(playerID)) {
      return;
    }
    const fragment = this.playerEntryFragments.get(playerID);
    if (fragment === void 0) {
      return;
    }
    const icon = fragment.$("icon");
    if (icon === void 0) {
      return;
    }
    icon.textContent = "";
    icon.appendChild(IconButton.Icon.create(iconName, "media-player"));
  }
  formatAndEvaluate(playerID, func, candidate, min, max) {
    if (candidate.length <= min) {
      return;
    }
    if (candidate.length >= max) {
      candidate = candidate.substring(0, max - 1) + "\u2026";
    }
    func.bind(this)(playerID, candidate);
  }
  addMediaElementItem(playerID) {
    const sidebarEntry = this.createPlayerListEntry(playerID);
    this.contentElement.appendChild(sidebarEntry.element());
    this.playerEntryFragments.set(playerID, sidebarEntry);
    this.playerEntriesWithHostnameFrameTitle.add(playerID);
  }
  deletePlayer(playerID) {
    if (!this.playerEntryFragments.has(playerID)) {
      return;
    }
    const fragment = this.playerEntryFragments.get(playerID);
    if (fragment?.element() === void 0) {
      return;
    }
    this.contentElement.removeChild(fragment.element());
    this.playerEntryFragments.delete(playerID);
  }
  onEvent(playerID, event) {
    const parsed = JSON.parse(event.value);
    const eventType = parsed.event;
    if (eventType === "kLoad") {
      const url = parsed.url;
      const videoName = url.substring(url.lastIndexOf("/") + 1);
      this.formatAndEvaluate(playerID, this.setMediaElementPlayerTitle, videoName, 1, 20);
      return;
    }
    if (eventType === "kPlay") {
      this.setMediaElementPlayerIcon(playerID, "play");
      return;
    }
    if (eventType === "kPause" || eventType === "kEnded") {
      this.setMediaElementPlayerIcon(playerID, "pause");
      return;
    }
    if (eventType === "kWebMediaPlayerDestroyed") {
      this.setMediaElementPlayerIcon(playerID, "cross");
      return;
    }
  }
  onProperty(playerID, property) {
    if (property.name === "kFrameUrl") {
      const frameTitle = new URL(property.value).hostname;
      this.formatAndEvaluate(playerID, this.setMediaElementFrameTitle, frameTitle, 1, 20);
      return;
    }
    if (property.name === "kFrameTitle" && property.value) {
      this.formatAndEvaluate(playerID, this.setMediaElementFrameTitle, property.value, 1, 20);
      return;
    }
  }
  onError(_playerID, _error) {
  }
  onMessage(_playerID, _message) {
  }
};

// gen/front_end/panels/media/MainView.js
var UIStrings7 = {
  /**
   * @description Text to show if no media player has been selected
   * A media player can be an audio and video source of a page.
   */
  noPlayerDetailsSelected: "No media player selected",
  /**
   * @description Text to instruct the user on how to view media player details
   * A media player can be an audio and video source of a page.
   */
  selectToViewDetails: "Select a media player to inspect its details.",
  /**
   * @description Text to show if no player can be shown
   * A media player can be an audio and video source of a page.
   */
  noMediaPlayer: "No media player",
  /**
   * @description Text to explain this panel
   * A media player can be an audio and video source of a page.
   */
  mediaPlayerDescription: "On this page you can view and export media player details."
};
var str_7 = i18n13.i18n.registerUIStrings("panels/media/MainView.ts", UIStrings7);
var i18nString7 = i18n13.i18n.getLocalizedString.bind(void 0, str_7);
var MEDIA_PLAYER_EXPLANATION_URL = "https://developer.chrome.com/docs/devtools/media-panel#hide-show";
var PlayerDataCollection = class {
  properties;
  messages;
  events;
  errors;
  constructor() {
    this.properties = /* @__PURE__ */ new Map();
    this.messages = [];
    this.events = [];
    this.errors = [];
  }
  onProperty(property) {
    this.properties.set(property.name, property.value);
  }
  onError(error) {
    this.errors.push(error);
  }
  onMessage(message) {
    this.messages.push(message);
  }
  onEvent(event) {
    this.events.push(event);
  }
  export() {
    return { properties: this.properties, messages: this.messages, events: this.events, errors: this.errors };
  }
};
var PlayerDataDownloadManager = class {
  playerDataCollection;
  constructor() {
    this.playerDataCollection = /* @__PURE__ */ new Map();
  }
  addPlayer(playerID) {
    this.playerDataCollection.set(playerID, new PlayerDataCollection());
  }
  onProperty(playerID, property) {
    const playerProperty = this.playerDataCollection.get(playerID);
    if (!playerProperty) {
      return;
    }
    playerProperty.onProperty(property);
  }
  onError(playerID, error) {
    const playerProperty = this.playerDataCollection.get(playerID);
    if (!playerProperty) {
      return;
    }
    playerProperty.onError(error);
  }
  onMessage(playerID, message) {
    const playerProperty = this.playerDataCollection.get(playerID);
    if (!playerProperty) {
      return;
    }
    playerProperty.onMessage(message);
  }
  onEvent(playerID, event) {
    const playerProperty = this.playerDataCollection.get(playerID);
    if (!playerProperty) {
      return;
    }
    playerProperty.onEvent(event);
  }
  exportPlayerData(playerID) {
    const playerProperty = this.playerDataCollection.get(playerID);
    if (!playerProperty) {
      throw new Error("Unable to find player");
    }
    return playerProperty.export();
  }
  deletePlayer(playerID) {
    this.playerDataCollection.delete(playerID);
  }
};
var MainView = class extends UI7.Panel.PanelWithSidebar {
  detailPanels;
  deletedPlayers;
  downloadStore;
  sidebar;
  #playerIdsToPlayers;
  #domNodeIdsToPlayerIds;
  #placeholder;
  #initialPlayersLoadedPromise;
  #initialPlayersLoadedPromiseResolve = () => {
  };
  constructor(downloadStore = new PlayerDataDownloadManager()) {
    super("media");
    this.detailPanels = /* @__PURE__ */ new Map();
    this.#playerIdsToPlayers = /* @__PURE__ */ new Map();
    this.#domNodeIdsToPlayerIds = /* @__PURE__ */ new Map();
    this.#initialPlayersLoadedPromise = new Promise((resolve) => {
      this.#initialPlayersLoadedPromiseResolve = resolve;
    });
    this.deletedPlayers = /* @__PURE__ */ new Set();
    this.downloadStore = downloadStore;
    this.sidebar = new PlayerListView(this);
    this.sidebar.show(this.panelSidebarElement());
    this.splitWidget().hideSidebar();
    this.#placeholder = new UI7.EmptyWidget.EmptyWidget(i18nString7(UIStrings7.noMediaPlayer), UIStrings7.mediaPlayerDescription);
    this.#placeholder.show(this.mainElement());
    this.#placeholder.link = MEDIA_PLAYER_EXPLANATION_URL;
    SDK2.TargetManager.TargetManager.instance().observeModels(MediaModel, this, { scoped: true });
  }
  renderMainPanel(playerID) {
    if (!this.detailPanels.has(playerID)) {
      return;
    }
    const mainWidget = this.splitWidget().mainWidget();
    if (mainWidget) {
      mainWidget.detachChildWidgets();
    }
    this.detailPanels.get(playerID)?.show(this.mainElement());
  }
  wasShown() {
    super.wasShown();
    for (const model of SDK2.TargetManager.TargetManager.instance().models(MediaModel, { scoped: true })) {
      this.addEventListeners(model);
    }
  }
  willHide() {
    super.willHide();
    for (const model of SDK2.TargetManager.TargetManager.instance().models(MediaModel, { scoped: true })) {
      this.removeEventListeners(model);
    }
  }
  modelAdded(model) {
    if (this.isShowing()) {
      this.addEventListeners(model);
    }
  }
  modelRemoved(model) {
    this.removeEventListeners(model);
  }
  addEventListeners(mediaModel) {
    mediaModel.ensureEnabled();
    mediaModel.addEventListener("PlayerPropertiesChanged", this.propertiesChanged, this);
    mediaModel.addEventListener("PlayerEventsAdded", this.eventsAdded, this);
    mediaModel.addEventListener("PlayerMessagesLogged", this.messagesLogged, this);
    mediaModel.addEventListener("PlayerErrorsRaised", this.errorsRaised, this);
    mediaModel.addEventListener("PlayerCreated", this.playerCreated, this);
  }
  removeEventListeners(mediaModel) {
    mediaModel.removeEventListener("PlayerPropertiesChanged", this.propertiesChanged, this);
    mediaModel.removeEventListener("PlayerEventsAdded", this.eventsAdded, this);
    mediaModel.removeEventListener("PlayerMessagesLogged", this.messagesLogged, this);
    mediaModel.removeEventListener("PlayerErrorsRaised", this.errorsRaised, this);
    mediaModel.removeEventListener("PlayerCreated", this.playerCreated, this);
  }
  propertiesChanged(event) {
    for (const property of event.data.properties) {
      this.onProperty(event.data.playerId, property);
    }
  }
  eventsAdded(event) {
    for (const ev of event.data.events) {
      this.onEvent(event.data.playerId, ev);
    }
  }
  messagesLogged(event) {
    for (const message of event.data.messages) {
      this.onMessage(event.data.playerId, message);
    }
  }
  errorsRaised(event) {
    for (const error of event.data.errors) {
      this.onError(event.data.playerId, error);
    }
  }
  shouldPropagate(playerID) {
    return !this.deletedPlayers.has(playerID) && this.detailPanels.has(playerID);
  }
  onProperty(playerID, property) {
    if (!this.shouldPropagate(playerID)) {
      return;
    }
    this.sidebar.onProperty(playerID, property);
    this.downloadStore.onProperty(playerID, property);
    this.detailPanels.get(playerID)?.onProperty(property);
  }
  onError(playerID, error) {
    if (!this.shouldPropagate(playerID)) {
      return;
    }
    this.sidebar.onError(playerID, error);
    this.downloadStore.onError(playerID, error);
    this.detailPanels.get(playerID)?.onError(error);
  }
  onMessage(playerID, message) {
    if (!this.shouldPropagate(playerID)) {
      return;
    }
    this.sidebar.onMessage(playerID, message);
    this.downloadStore.onMessage(playerID, message);
    this.detailPanels.get(playerID)?.onMessage(message);
  }
  onEvent(playerID, event) {
    if (!this.shouldPropagate(playerID)) {
      return;
    }
    this.sidebar.onEvent(playerID, event);
    this.downloadStore.onEvent(playerID, event);
    this.detailPanels.get(playerID)?.onEvent(event);
  }
  selectPlayerByDOMNodeId(domNodeId) {
    const playerId = this.#domNodeIdsToPlayerIds.get(domNodeId);
    if (!playerId) {
      return;
    }
    const player = this.#playerIdsToPlayers.get(playerId);
    if (player) {
      this.sidebar.selectPlayerById(player.playerId);
    }
  }
  waitForInitialPlayers() {
    return this.#initialPlayersLoadedPromise;
  }
  playerCreated(event) {
    const player = event.data;
    this.#playerIdsToPlayers.set(player.playerId, player);
    if (player.domNodeId) {
      this.#domNodeIdsToPlayerIds.set(player.domNodeId, player.playerId);
    }
    if (this.splitWidget().showMode() !== "Both") {
      this.splitWidget().showBoth();
    }
    this.sidebar.addMediaElementItem(player.playerId);
    this.detailPanels.set(player.playerId, new PlayerDetailView());
    this.downloadStore.addPlayer(player.playerId);
    if (this.detailPanels.size === 1) {
      this.#placeholder.header = i18nString7(UIStrings7.noPlayerDetailsSelected);
      this.#placeholder.text = i18nString7(UIStrings7.selectToViewDetails);
    }
    this.#initialPlayersLoadedPromiseResolve();
  }
  markPlayerForDeletion(playerID) {
    this.deletedPlayers.add(playerID);
    this.detailPanels.delete(playerID);
    const player = this.#playerIdsToPlayers.get(playerID);
    if (player?.domNodeId) {
      this.#domNodeIdsToPlayerIds.delete(player.domNodeId);
    }
    this.#playerIdsToPlayers.delete(playerID);
    this.sidebar.deletePlayer(playerID);
    this.downloadStore.deletePlayer(playerID);
    if (this.detailPanels.size === 0) {
      this.#placeholder.header = i18nString7(UIStrings7.noMediaPlayer);
      this.#placeholder.text = i18nString7(UIStrings7.mediaPlayerDescription);
      this.splitWidget().hideSidebar();
      const mainWidget = this.splitWidget().mainWidget();
      if (mainWidget) {
        mainWidget.detachChildWidgets();
      }
      this.#placeholder.show(this.mainElement());
    }
  }
  markOtherPlayersForDeletion(playerID) {
    for (const keyID of this.detailPanels.keys()) {
      if (keyID !== playerID) {
        this.markPlayerForDeletion(keyID);
      }
    }
  }
  exportPlayerData(playerID) {
    const dump = this.downloadStore.exportPlayerData(playerID);
    const uriContent = "data:application/octet-stream," + encodeURIComponent(JSON.stringify(dump, null, 2));
    const anchor = document.createElement("a");
    anchor.href = uriContent;
    anchor.download = playerID + ".json";
    anchor.click();
  }
};
export {
  MainView_exports as MainView,
  MediaModel_exports as MediaModel,
  PlayerDetailView_exports as PlayerDetailView,
  EventDisplayTable_exports as PlayerEventsView,
  PlayerListView_exports as PlayerListView,
  PlayerPropertiesView_exports as PlayerPropertiesView,
  TickingFlameChart_exports as TickingFlameChart,
  TickingFlameChartHelpers_exports as TickingFlameChartHelpers
};
//# sourceMappingURL=media.js.map
