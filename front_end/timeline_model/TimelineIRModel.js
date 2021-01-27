// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as SDK from '../sdk/sdk.js';  // eslint-disable-line no-unused-vars

import {RecordType} from './TimelineModel.js';

export const UIStrings = {
  /**
  *@description Text in Timeline IRModel of the Performance panel
  *@example {2s} PH1
  *@example {3s} PH2
  */
  twoFlingsAtTheSameTimeSVsS: 'Two flings at the same time? {PH1} vs {PH2}',
  /**
  *@description Text in Timeline IRModel of the Performance panel
  *@example {2s} PH1
  *@example {3s} PH2
  */
  twoTouchesAtTheSameTimeSVsS: 'Two touches at the same time? {PH1} vs {PH2}',
};
const str_ = i18n.i18n.registerUIStrings('timeline_model/TimelineIRModel.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/**
 * @type {!WeakMap<!SDK.TracingModel.Event, !Phases>}
 */
const eventToPhase = new WeakMap();

export class TimelineIRModel {
  constructor() {
    // Attributes below are guaranteed to be set by reset();

    /** @type {!Array<!Common.SegmentedRange.Segment>} */
    this._segments;
    /** @type {!Common.SegmentedRange.SegmentedRange} */
    this._drags;
    /** @type {!Common.SegmentedRange.SegmentedRange} */
    this._cssAnimations;
    /** @type {!Common.SegmentedRange.SegmentedRange} */
    this._responses;
    /** @type {!Common.SegmentedRange.SegmentedRange} */
    this._scrolls;

    this.reset();
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @return {(!Phases|undefined)}
   */
  static phaseForEvent(event) {
    return eventToPhase.get(event);
  }

  /**
   * @param {?Array<!SDK.TracingModel.AsyncEvent>} inputLatencies
   * @param {?Array<!SDK.TracingModel.AsyncEvent>} animations
   */
  populate(inputLatencies, animations) {
    this.reset();
    if (!inputLatencies) {
      return;
    }
    this._processInputLatencies(inputLatencies);
    if (animations) {
      this._processAnimations(animations);
    }
    const range = new Common.SegmentedRange.SegmentedRange();
    range.appendRange(this._drags);  // Drags take lower precedence than animation, as we can't detect them reliably.
    range.appendRange(this._cssAnimations);
    range.appendRange(this._scrolls);
    range.appendRange(this._responses);
    this._segments = range.segments();
  }

  /**
   * @param {!Array<!SDK.TracingModel.AsyncEvent>} events
   */
  _processInputLatencies(events) {
    const eventTypes = InputEvents;
    const phases = Phases;
    const thresholdsMs = TimelineIRModel._mergeThresholdsMs;

    let scrollStart;
    let flingStart;
    let touchStart;
    let firstTouchMove;
    let mouseWheel;
    let mouseDown;
    let mouseMove;

    for (let i = 0; i < events.length; ++i) {
      const event = events[i];
      if (i > 0 && events[i].startTime < events[i - 1].startTime) {
        console.assert(false, 'Unordered input events');
      }
      const type = this._inputEventType(event.name);
      switch (type) {
        case eventTypes.ScrollBegin:
          this._scrolls.append(this._segmentForEvent(event, phases.Scroll));
          scrollStart = event;
          break;

        case eventTypes.ScrollEnd:
          if (scrollStart) {
            this._scrolls.append(this._segmentForEventRange(scrollStart, event, phases.Scroll));
          } else {
            this._scrolls.append(this._segmentForEvent(event, phases.Scroll));
          }
          scrollStart = null;
          break;

        case eventTypes.ScrollUpdate:
          touchStart = null;  // Since we're scrolling now, disregard other touch gestures.
          this._scrolls.append(this._segmentForEvent(event, phases.Scroll));
          break;

        case eventTypes.FlingStart:
          if (flingStart) {
            Common.Console.Console.instance().error(
                i18nString(UIStrings.twoFlingsAtTheSameTimeSVsS, {PH1: flingStart.startTime, PH2: event.startTime}));
            break;
          }
          flingStart = event;
          break;

        case eventTypes.FlingCancel:
          // FIXME: also process renderer fling events.
          if (!flingStart) {
            break;
          }
          this._scrolls.append(this._segmentForEventRange(flingStart, event, phases.Fling));
          flingStart = null;
          break;

        case eventTypes.ImplSideFling:
          this._scrolls.append(this._segmentForEvent(event, phases.Fling));
          break;

        case eventTypes.ShowPress:
        case eventTypes.Tap:
        case eventTypes.KeyDown:
        case eventTypes.KeyDownRaw:
        case eventTypes.KeyUp:
        case eventTypes.Char:
        case eventTypes.Click:
        case eventTypes.ContextMenu:
          this._responses.append(this._segmentForEvent(event, phases.Response));
          break;

        case eventTypes.TouchStart:
          // We do not produce any response segment for TouchStart -- there's either going to be one upon
          // TouchMove for drag, or one for GestureTap.
          if (touchStart) {
            Common.Console.Console.instance().error(
                i18nString(UIStrings.twoTouchesAtTheSameTimeSVsS, {PH1: touchStart.startTime, PH2: event.startTime}));
            break;
          }
          touchStart = event;
          this._setPhaseForEvent(event, phases.Response);
          firstTouchMove = null;
          break;

        case eventTypes.TouchCancel:
          touchStart = null;
          break;

        case eventTypes.TouchMove:
          if (firstTouchMove) {
            this._drags.append(this._segmentForEvent(event, phases.Drag));
          } else if (touchStart) {
            firstTouchMove = event;
            this._responses.append(this._segmentForEventRange(touchStart, event, phases.Response));
          }
          break;

        case eventTypes.TouchEnd:
          touchStart = null;
          break;

        case eventTypes.MouseDown:
          mouseDown = event;
          mouseMove = null;
          break;

        case eventTypes.MouseMove:
          if (mouseDown && !mouseMove && mouseDown.startTime + thresholdsMs.mouse > event.startTime) {
            this._responses.append(this._segmentForEvent(mouseDown, phases.Response));
            this._responses.append(this._segmentForEvent(event, phases.Response));
          } else if (mouseDown) {
            this._drags.append(this._segmentForEvent(event, phases.Drag));
          }
          mouseMove = event;
          break;

        case eventTypes.MouseUp:
          this._responses.append(this._segmentForEvent(event, phases.Response));
          mouseDown = null;
          break;

        case eventTypes.MouseWheel:
          // Do not consider first MouseWheel as trace viewer's implementation does -- in case of MouseWheel it's not really special.
          if (mouseWheel && canMerge(thresholdsMs.mouse, mouseWheel, event)) {
            this._scrolls.append(this._segmentForEventRange(mouseWheel, event, phases.Scroll));
          } else {
            this._scrolls.append(this._segmentForEvent(event, phases.Scroll));
          }
          mouseWheel = event;
          break;
      }
    }

    /**
     * @param {number} threshold
     * @param {!SDK.TracingModel.AsyncEvent} first
     * @param {!SDK.TracingModel.AsyncEvent} second
     * @return {boolean}
     */
    function canMerge(threshold, first, second) {
      if (first.endTime === undefined) {
        return false;
      }
      return first.endTime < second.startTime && second.startTime < first.endTime + threshold;
    }
  }

  /**
   * @param {!Array<!SDK.TracingModel.AsyncEvent>} events
   */
  _processAnimations(events) {
    for (let i = 0; i < events.length; ++i) {
      this._cssAnimations.append(this._segmentForEvent(events[i], Phases.Animation));
    }
  }

  /**
   * @param {!SDK.TracingModel.AsyncEvent} event
   * @param {!Phases} phase
   * @return {!Common.SegmentedRange.Segment}
   */
  _segmentForEvent(event, phase) {
    this._setPhaseForEvent(event, phase);
    return new Common.SegmentedRange.Segment(
        event.startTime, event.endTime !== undefined ? event.endTime : Number.MAX_SAFE_INTEGER, phase);
  }

  /**
   * @param {!SDK.TracingModel.AsyncEvent} startEvent
   * @param {!SDK.TracingModel.AsyncEvent} endEvent
   * @param {!Phases} phase
   * @return {!Common.SegmentedRange.Segment}
   */
  _segmentForEventRange(startEvent, endEvent, phase) {
    this._setPhaseForEvent(startEvent, phase);
    this._setPhaseForEvent(endEvent, phase);
    return new Common.SegmentedRange.Segment(
        startEvent.startTime, startEvent.endTime !== undefined ? startEvent.endTime : Number.MAX_SAFE_INTEGER, phase);
  }

  /**
   * @param {!SDK.TracingModel.AsyncEvent} asyncEvent
   * @param {!Phases} phase
   */
  _setPhaseForEvent(asyncEvent, phase) {
    eventToPhase.set(asyncEvent.steps[0], phase);
  }

  /**
   * @return {!Array<!Common.SegmentedRange.Segment>}
   */
  interactionRecords() {
    return this._segments;
  }

  reset() {
    const thresholdsMs = TimelineIRModel._mergeThresholdsMs;

    this._segments = [];
    this._drags = new Common.SegmentedRange.SegmentedRange(merge.bind(null, thresholdsMs.mouse));
    this._cssAnimations = new Common.SegmentedRange.SegmentedRange(merge.bind(null, thresholdsMs.animation));
    this._responses = new Common.SegmentedRange.SegmentedRange(merge.bind(null, 0));
    this._scrolls = new Common.SegmentedRange.SegmentedRange(merge.bind(null, thresholdsMs.animation));

    /**
     * @param {number} threshold
     * @param {!Common.SegmentedRange.Segment} first
     * @param {!Common.SegmentedRange.Segment} second
     */
    function merge(threshold, first, second) {
      return first.end + threshold >= second.begin && first.data === second.data ? first : null;
    }
  }

  /**
   * @param {string} eventName
   * @return {?InputEvents}
   */
  _inputEventType(eventName) {
    const prefix = 'InputLatency::';
    if (!eventName.startsWith(prefix)) {
      if (eventName === InputEvents.ImplSideFling) {
        return /** @type {!InputEvents} */ (eventName);
      }
      console.error('Unrecognized input latency event: ' + eventName);
      return null;
    }
    return /** @type {!InputEvents} */ (eventName.substr(prefix.length));
  }
}

/**
 * @enum {string}
 */
export const Phases = {
  Idle: 'Idle',
  Response: 'Response',
  Scroll: 'Scroll',
  Fling: 'Fling',
  Drag: 'Drag',
  Animation: 'Animation',
  Uncategorized: 'Uncategorized'
};

/**
 * @enum {string}
 */
export const InputEvents = {
  Char: 'Char',
  Click: 'GestureClick',
  ContextMenu: 'ContextMenu',
  FlingCancel: 'GestureFlingCancel',
  FlingStart: 'GestureFlingStart',
  ImplSideFling: RecordType.ImplSideFling,
  KeyDown: 'KeyDown',
  KeyDownRaw: 'RawKeyDown',
  KeyUp: 'KeyUp',
  LatencyScrollUpdate: 'ScrollUpdate',
  MouseDown: 'MouseDown',
  MouseMove: 'MouseMove',
  MouseUp: 'MouseUp',
  MouseWheel: 'MouseWheel',
  PinchBegin: 'GesturePinchBegin',
  PinchEnd: 'GesturePinchEnd',
  PinchUpdate: 'GesturePinchUpdate',
  ScrollBegin: 'GestureScrollBegin',
  ScrollEnd: 'GestureScrollEnd',
  ScrollUpdate: 'GestureScrollUpdate',
  ScrollUpdateRenderer: 'ScrollUpdate',
  ShowPress: 'GestureShowPress',
  Tap: 'GestureTap',
  TapCancel: 'GestureTapCancel',
  TapDown: 'GestureTapDown',
  TouchCancel: 'TouchCancel',
  TouchEnd: 'TouchEnd',
  TouchMove: 'TouchMove',
  TouchStart: 'TouchStart'
};

TimelineIRModel._mergeThresholdsMs = {
  animation: 1,
  mouse: 40,
};

TimelineIRModel._eventIRPhase = Symbol('eventIRPhase');
