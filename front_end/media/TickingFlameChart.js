// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as PerfUI from '../perf_ui/perf_ui.js';
import * as ThemeSupport from '../theme_support/theme_support.js';
import * as UI from '../ui/ui.js';

import {PlayerEvent} from './MediaModel.js';  // eslint-disable-line no-unused-vars
import {Bounds, FormatMillisecondsToSeconds} from './TickingFlameChartHelpers.js';

const defaultFont = '11px ' + Host.Platform.fontFamily();
const defaultColor =
    ThemeSupport.ThemeSupport.instance().patchColorText('#444', ThemeSupport.ThemeSupport.ColorUsage.Foreground);

const DefaultStyle = {
  height: 20,
  padding: 2,
  collapsible: false,
  font: defaultFont,
  color: defaultColor,
  backgroundColor: 'rgba(100 0 0 / 10%)',
  nestingLevel: 0,
  itemsHeight: 20,
  shareHeaderLine: false,
  useFirstLineForOverview: false,
  useDecoratorsForOverview: false
};

export const HotColorScheme = ['#ffba08', '#faa307', '#f48c06', '#e85d04', '#dc2f02', '#d00000', '#9d0208'];
export const ColdColorScheme = ['#7400b8', '#6930c3', '#5e60ce', '#5390d9', '#4ea8de', '#48bfe3', '#56cfe1', '#64dfdf'];


/**
 * @param {string} backgroundColor
 * @return {string}
 */
function calculateFontColor(backgroundColor) {
  // Dark background needs a light font.
  if (Common.Color.Color.parse(backgroundColor).hsla()[2] < 0.5) {
    return '#eee';
  }
  return '#444';
}


/**
 * @typedef {{
 *     setLive: (!function(number):number),
 *     setComplete: (!function(number):undefined),
 *     updateMaxTime: (!function(number):undefined)
 * }}
 */
let EventHandlers;  // eslint-disable-line no-unused-vars


/**
 * @typedef {{
 *     level: number,
 *     startTime: number,
 *     duration: (number|undefined),
 *     name: string,
 *     color: (string|undefined),
 *     hoverData: (Object|undefined|null)
 * }}
 */
export let EventProperties;  // eslint-disable-line no-unused-vars

/**
 * Wrapper class for each event displayed on the timeline.
 * @unrestricted
 */
export class Event {
  constructor(timelineData, eventHandlers, eventProperties = {}) {
    // These allow the event to privately change it's own data in the timeline.
    this._timelineData = timelineData;
    this._setLive = eventHandlers.setLive;
    this._setComplete = eventHandlers.setComplete;
    this._updateMaxTime = eventHandlers.updateMaxTime;

    // This is the index in the timelineData arrays we should be writing to.
    this._selfIndex = this._timelineData.entryLevels.length;
    this._live = false;

    // Can't use the dict||or||default syntax, since NaN is a valid expected duration.
    const duration = eventProperties['duration'] === undefined ? 0 : eventProperties['duration'];

    this._timelineData.entryLevels.push(eventProperties['level'] || 0);
    this._timelineData.entryStartTimes.push(eventProperties['startTime'] || 0);
    this._timelineData.entryTotalTimes.push(duration);  // May initially push -1

    // If -1 was pushed, we need to update it. The set end time method helps with this.
    if (duration === -1) {
      this.endTime = -1;
    }

    this._title = eventProperties['name'] || '';
    this._color = eventProperties['color'] || HotColorScheme[0];
    this._fontColor = calculateFontColor(this._color);
    this._hoverData = eventProperties['hoverData'] || {};
  }

  /**
   * Render hovertext into the |htmlElement|
   * @param {!HTMLElement} htmlElement
   */
  decorate(htmlElement) {
    htmlElement.createChild('span').textContent = `Name: ${this._title}`;
    htmlElement.createChild('br');

    const startTimeReadable = FormatMillisecondsToSeconds(this.startTime, 2);
    if (this._live) {
      htmlElement.createChild('span').textContent = `Duration: ${startTimeReadable} - LIVE!`;
    } else if (!isNaN(this.duration)) {
      const durationReadable = FormatMillisecondsToSeconds(this.duration + this.startTime, 2);
      htmlElement.createChild('span').textContent = `Duration: ${startTimeReadable} - ${durationReadable}`;
    } else {
      htmlElement.createChild('span').textContent = `Time: ${startTimeReadable}`;
    }
  }

  /**
   * set an event to be "live" where it's ended time is always the chart maximum
   * or to be a fixed time.
   * @param {number} time
   */
  set endTime(time) {
    // Setting end time to -1 signals that an event becomes live
    if (time === -1) {
      this._timelineData.entryTotalTimes[this._selfIndex] = this._setLive(this._selfIndex);
      this._live = true;
    } else {
      this._live = false;
      const duration = time - this._timelineData.entryStartTimes[this._selfIndex];
      this._timelineData.entryTotalTimes[this._selfIndex] = duration;
      this._setComplete(this._selfIndex);
      this._updateMaxTime(time);
    }
  }

  /**
   * @return {number}
   */
  get id() {
    return this._selfIndex;
  }

  /**
   * @param {number} level
   */
  set level(level) {
    this._timelineData.entryLevels[this._selfIndex] = level;
  }

  /**
   * @param {string} text
   */
  set title(text) {
    this._title = text;
  }

  /**
   * @return {string}
   */
  get title() {
    return this._title;
  }

  /**
   * @param {string} color
   */
  set color(color) {
    this._color = color;
    this._fontColor = calculateFontColor(this._color);
  }

  /**
   * @return {string}
   */
  get color() {
    return this._color;
  }

  get fontColor() {
    return this._fontColor;
  }

  /**
   * @return {number}
   */
  get startTime() {
    // Round it
    return this._timelineData.entryStartTimes[this._selfIndex];
  }

  /**
   * @return {number}
   */
  get duration() {
    return this._timelineData.entryTotalTimes[this._selfIndex];
  }

  /**
   * @return {boolean}
   */
  get live() {
    return this._live;
  }
}


/**
 * @unrestricted
 */
export class TickingFlameChart extends UI.Widget.VBox {
  constructor() {
    super();

    // set to update once per second _while the tab is active_
    this._intervalTimer = null;
    this._lastTimestamp = 0;
    this._canTick = true;
    this._ticking = false;
    this._isShown = false;

    // The max bounds for scroll-out.
    this._bounds = new Bounds(0, 1000, 30000, 1000);

    // Create the data provider with the initial max bounds,
    // as well as a function to attempt bounds updating everywhere.
    this._dataProvider = new TickingFlameChartDataProvider(this._bounds, this._updateMaxTime.bind(this));

    // Delegate doesn't do much for now.
    this._delegate = new TickingFlameChartDelegate();

    // Chart settings.
    this._chartGroupExpansionSetting =
        Common.Settings.Settings.instance().createSetting('mediaFlameChartGroupExpansion', {});

    // Create the chart.
    this._chart =
        new PerfUI.FlameChart.FlameChart(this._dataProvider, this._delegate, this._chartGroupExpansionSetting);

    // TODO: needs to have support in the delegate for supporting this.
    this._chart.disableRangeSelection();

    // Scrolling should change the current bounds, and repaint the chart.
    this._chart.bindCanvasEvent('wheel', this._onScroll.bind(this));

    // Add the chart.
    this._chart.show(this.contentElement);
  }

  /**
   * Add a marker with |properties| at |time|.
   * @param {!EventProperties} properties
   */
  addMarker(properties) {
    properties['duration'] = NaN;
    this.startEvent(properties);
  }

  /**
   * Create an event which will be set to live by default.
   * @param {!EventProperties} properties
   * @return {!Event}
   */
  startEvent(properties) {
    // Make sure that an unspecified event gets live duration.
    // Have to check for undefined, since NaN is allowed but evaluates to false.
    if (properties['duration'] === undefined) {
      properties['duration'] = -1;
    }
    const time = properties['startTime'] || 0;

    // Event has to be created before the updateMaxTime call.
    const event = this._dataProvider.startEvent(properties);

    this._updateMaxTime(time);
    return event;
  }

  /**
   * Add a group with |name| that can contain |depth| different tracks.
   * @param {string} name
   * @param {number} depth
   */
  addGroup(name, depth) {
    this._dataProvider.addGroup(name, depth);
  }

  _updateMaxTime(time) {
    if (this._bounds.pushMaxAtLeastTo(time)) {
      this._updateRender();
    }
  }

  _onScroll(e) {
    // TODO: is this a good divisor? does it account for high presicision scroll wheels?
    // low precisision scroll wheels?
    const scrollTickCount = Math.round(e.deltaY / 50);
    const scrollPositionRatio = e.offsetX / e.srcElement.clientWidth;
    if (scrollTickCount > 0) {
      this._bounds.zoomOut(scrollTickCount, scrollPositionRatio);
    } else {
      this._bounds.zoomIn(-scrollTickCount, scrollPositionRatio);
    }
    this._updateRender();
  }

  /**
   * @override
   */
  willHide() {
    this._isShown = false;
    if (this._ticking) {
      this._stop();
    }
  }

  /**
   * @override
   */
  wasShown() {
    this._isShown = true;
    if (this._canTick && !this._ticking) {
      this._start();
    }
  }

  /**
   * Is the timeline allowed to tick forward.
   * @param {boolean} allowed
   */
  set canTick(allowed) {
    this._canTick = allowed;
    if (this._ticking && !allowed) {
      this._stop();
    }
    if (!this._ticking && this._isShown && allowed) {
      this._start();
    }
  }

  _start() {
    if (this._lastTimestamp === 0) {
      this._lastTimestamp = Date.now();
    }
    if (this._intervalTimer !== null || this._stoppedPermanently) {
      return;
    }
    // 16 ms is roughly 60 fps.
    this._intervalTimer = setInterval(this._updateRender.bind(this), 16);
    this._ticking = true;
  }

  _stop(permanently = false) {
    clearInterval(this._intervalTimer);
    this._intervalTimer = null;
    if (permanently) {
      this._stoppedPermanently = true;
    }
    this._ticking = false;
  }

  _updateRender() {
    if (this._ticking) {
      const currentTimestamp = Date.now();
      const duration = currentTimestamp - this._lastTimestamp;
      this._lastTimestamp = currentTimestamp;
      this._bounds.addMax(duration);
    }
    this._dataProvider.updateMaxTime(this._bounds);
    this._chart.setWindowTimes(this._bounds.low, this._bounds.high, true);
    this._chart.scheduleUpdate();
  }
}


/**
 * Doesn't do much right now, but can be used in the future for selecting events.
 * @implements {PerfUI.FlameChart.FlameChartDelegate}
 */
class TickingFlameChartDelegate {
  constructor() {
  }

  /**
   * @override
   * @param {number} windowStartTime
   * @param {number} windowEndTime
   * @param {boolean} animate
   */
  windowChanged(windowStartTime, windowEndTime, animate) {
  }

  /**
   * @override
   * @param {number} startTime
   * @param {number} endTime
   */
  updateRangeSelection(startTime, endTime) {
  }

  /**
   * @override
   * @param {!PerfUI.FlameChart.FlameChart} flameChart
   * @param {?PerfUI.FlameChart.Group} group
   */
  updateSelectedGroup(flameChart, group) {
  }
}


/**
 * @implements {PerfUI.FlameChart.FlameChartDataProvider}
 */
class TickingFlameChartDataProvider {
  constructor(initialBounds, updateMaxTime) {
    // do _not_ call this method from within this class - only for passing to events.
    this._updateMaxTimeHandle = updateMaxTime;

    this._bounds = initialBounds;

    // All the events which should have their time updated when the chart ticks.
    this._liveEvents = new Set();

    // All events.
    // Map<Event>
    this._eventMap = new Map();

    // Contains the numerical indicies. This is passed as a reference to the events
    // so that they can update it when they change.
    this._timelineData = new PerfUI.FlameChart.TimelineData([], [], [], []);

    // The current sum of all group heights.
    this._maxLevel = 0;
  }

  /**
   * Add a group with |name| that can contain |depth| different tracks.
   * @param {string} name
   * @param {number} depth
   */
  addGroup(name, depth) {
    this._timelineData.groups.push(
        {name: name, startLevel: this._maxLevel, expanded: true, selectable: false, style: DefaultStyle});
    this._maxLevel += depth;
  }

  /**
   * Create an event which will be set to live by default.
   * @param {!EventProperties} properties
   * @return {!Event}
   */
  startEvent(properties) {
    properties['level'] = properties['level'] || 0;
    if (properties['level'] > this._maxLevel) {
      throw `level ${properties['level']} is above the maximum allowed of ${this._maxLevel}`;
    }

    const event = new Event(
        this._timelineData, {
          setLive: this._setLive.bind(this),
          setComplete: this._setComplete.bind(this),
          updateMaxTime: this._updateMaxTimeHandle
        },
        properties);

    this._eventMap.set(event.id, event);
    return event;
  }

  /**
   * @param {number} index
   * @return {number}
   */
  _setLive(index) {
    this._liveEvents.add(index);
    return this._bounds.max;
  }

  /**
   * @param {number} index
   */
  _setComplete(index) {
    this._liveEvents.delete(index);
  }

  /**
   * @param {!Bounds} bounds
   */
  updateMaxTime(bounds) {
    this._bounds = bounds;
    for (const eventID of this._liveEvents.entries()) {
      // force recalculation of all live events.
      this._eventMap.get(eventID[0]).endTime = -1;
    }
  }


  /**
   * @override
   * @return {number}
   */
  maxStackDepth() {
    return this._maxLevel + 1;
  }

  /**
   * @override
   * @return {!PerfUI.FlameChart.TimelineData}
   */
  timelineData() {
    return this._timelineData;
  }

  /**
   * @override
   * @return {number} time in milliseconds
   */
  minimumBoundary() {
    return this._bounds.low;
  }

  /**
   * @override
   * @return {number}
   */
  totalTime() {
    return this._bounds.high;
  }

  /**
   * @override
   * @param {number} index
   * @return {string}
   */
  entryColor(index) {
    return this._eventMap.get(index).color;
  }

  /**
   * @override
   * @param {number} index
   * @return {string}
   */
  textColor(index) {
    return this._eventMap.get(index).fontColor;
  }

  /**
   * @override
   * @param {number} index
   * @return {?string}
   */
  entryTitle(index) {
    return this._eventMap.get(index).title;
  }

  /**
   * @override
   * @param {number} index
   * @return {?string}
   */
  entryFont(index) {
    return defaultFont;
  }

  /**
   * @override
   * @param {number} index
   * @param {!CanvasRenderingContext2D} context
   * @param {?string} text
   * @param {number} barX
   * @param {number} barY
   * @param {number} barWidth
   * @param {number} barHeight
   * @param {number} unclippedBarX
   * @param {number} timeToPixelRatio
   * @return {boolean}
   */
  decorateEntry(index, context, text, barX, barY, barWidth, barHeight, unclippedBarX, timeToPixelRatio) {
    return false;
  }

  /**
   * @override
   * @param {number} index
   * @return {boolean}
   */
  forceDecoration(index) {
    return false;
  }

  /**
   * @override
   * @param {number} index
   * @return {?Element}
   */
  prepareHighlightedEntryInfo(index) {
    const element = createElement('div');
    this._eventMap.get(index).decorate(element);
    return element;
  }

  /**
   * @override
   * @param {number} value
   * @param {number=} precision
   * @return {string}
   */
  formatValue(value, precision) {
    // value is always [0, X] so we need to add lower bound
    value += Math.round(this._bounds.low);

    // Magic numbers of pre-calculated logorithms.

    // we want to show additional decimals at the time when two adjacent labels
    // would otherwise show the same number. At 3840 pixels wide, that cutoff
    // happens to be about 30 seconds for one decimal and 2.8 for two decimals.
    if (this._bounds.range < 2800) {
      return FormatMillisecondsToSeconds(value, 2);
    }
    if (this._bounds.range < 30000) {
      return FormatMillisecondsToSeconds(value, 1);
    }
    return FormatMillisecondsToSeconds(value, 0);
  }

  /**
   * @override
   * @param {number} entryIndex
   * @return {boolean}
   */
  canJumpToEntry(entryIndex) {
    return false;
  }

  /**
   * @override
   */
  navStartTimes() {
    return new Map();
  }
}
