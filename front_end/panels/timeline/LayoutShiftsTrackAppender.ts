// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as Trace from '../../models/trace/trace.js';
import * as ComponentHelpers from '../../ui/components/helpers/helpers.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';

import {buildGroupStyle, buildTrackHeader} from './AppenderUtils.js';
import {
  type CompatibilityTracksAppender,
  type DrawOverride,
  type HighlightedEntryInfo,
  type TrackAppender,
  type TrackAppenderName,
  VisualLoggingTrackName,
} from './CompatibilityTracksAppender.js';
import * as Utils from './utils/utils.js';

const UIStrings = {
  /**
   *@description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  layoutShifts: 'Layout shifts',
  /**
   *@description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  layoutShiftCluster: 'Layout shift cluster',
  /**
   *@description Text in Timeline Flame Chart Data Provider of the Performance panel
   */
  layoutShift: 'Layout shift',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/LayoutShiftsTrackAppender.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

// Bit of a hack: LayoutShifts are instant events, so have no duration. But
// OPP doesn't do well at making tiny events easy to spot and click. So we
// set it to a small duration so that the user is able to see and click
// them more easily. Long term we will explore a better UI solution to
// allow us to do this properly and not hack around it.
// TODO: Delete this once the new Layout Shift UI ships out of the TIMELINE_LAYOUT_SHIFT_DETAILS experiment
export const LAYOUT_SHIFT_SYNTHETIC_DURATION = Trace.Types.Timing.MicroSeconds(5_000);

export class LayoutShiftsTrackAppender implements TrackAppender {
  readonly appenderName: TrackAppenderName = 'LayoutShifts';

  #compatibilityBuilder: CompatibilityTracksAppender;
  #parsedTrace: Readonly<Trace.Handlers.Types.ParsedTrace>;

  constructor(compatibilityBuilder: CompatibilityTracksAppender, parsedTrace: Trace.Handlers.Types.ParsedTrace) {
    this.#compatibilityBuilder = compatibilityBuilder;
    this.#parsedTrace = parsedTrace;
  }

  /**
   * Appends into the flame chart data the data corresponding to the
   * layout shifts track.
   * @param trackStartLevel the horizontal level of the flame chart events where
   * the track's events will start being appended.
   * @param expanded wether the track should be rendered expanded.
   * @returns the first available level to append more data after having
   * appended the track's events.
   */
  appendTrackAtLevel(trackStartLevel: number, expanded?: boolean): number {
    if (this.#parsedTrace.LayoutShifts.clusters.length === 0) {
      return trackStartLevel;
    }
    this.#appendTrackHeaderAtLevel(trackStartLevel, expanded);
    return this.#appendLayoutShiftsAtLevel(trackStartLevel);
  }

  /**
   * Adds into the flame chart data the header corresponding to the
   * layout shifts track. A header is added in the shape of a group in the
   * flame chart data. A group has a predefined style and a reference
   * to the definition of the legacy track (which should be removed
   * in the future).
   * @param currentLevel the flame chart level at which the header is
   * appended.
   */
  #appendTrackHeaderAtLevel(currentLevel: number, expanded?: boolean): void {
    const style = buildGroupStyle({collapsible: false});
    const group = buildTrackHeader(
        VisualLoggingTrackName.LAYOUT_SHIFTS, currentLevel, i18nString(UIStrings.layoutShifts), style,
        /* selectable= */ true, expanded);
    this.#compatibilityBuilder.registerTrackForGroup(group, this);
  }

  /**
   * Adds into the flame chart data all the layout shifts. These are taken from
   * the clusters that are collected in the LayoutShiftsHandler.
   * @param currentLevel the flame chart level from which layout shifts will
   * be appended.
   * @returns the next level after the last occupied by the appended
   * layout shifts (the first available level to append more data).
   */
  #appendLayoutShiftsAtLevel(currentLevel: number): number {
    const allLayoutShifts = this.#parsedTrace.LayoutShifts.clusters.flatMap(cluster => cluster.events);

    if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.TIMELINE_INSIGHTS)) {
      const allClusters = this.#parsedTrace.LayoutShifts.clusters;
      this.#compatibilityBuilder.appendEventsAtLevel(allClusters, currentLevel, this);
    }

    void this.preloadScreenshots(allLayoutShifts);
    return this.#compatibilityBuilder.appendEventsAtLevel(allLayoutShifts, currentLevel, this);
  }

  /*
    ------------------------------------------------------------------------------------
     The following methods  are invoked by the flame chart renderer to query features about
     events on rendering.
    ------------------------------------------------------------------------------------
  */

  /**
   * Gets the color an event added by this appender should be rendered with.
   */
  colorForEvent(event: Trace.Types.Events.Event): string {
    const renderingColor = ThemeSupport.ThemeSupport.instance().getComputedValue('--app-color-rendering');
    if (Trace.Types.Events.isSyntheticLayoutShiftCluster(event)) {
      const parsedColor = Common.Color.parse(renderingColor);
      if (parsedColor) {
        const colorWithAlpha = parsedColor.setAlpha(0.5).asString(Common.Color.Format.RGBA);
        return colorWithAlpha;
      }
    }
    return renderingColor;
  }

  /**
   * Gets the title an event added by this appender should be rendered with.
   */
  titleForEvent(event: Trace.Types.Events.Event): string {
    if (Trace.Types.Events.isLayoutShift(event)) {
      return i18nString(UIStrings.layoutShift);
    }
    return '';
  }

  /**
   * Returns the info shown when an event added by this appender
   * is hovered in the timeline.
   */
  highlightedEntryInfo(event: Trace.Types.Events.Event): HighlightedEntryInfo {
    const score = Trace.Types.Events.isLayoutShift(event)       ? event.args.data?.weighted_score_delta ?? 0 :
        Trace.Types.Events.isSyntheticLayoutShiftCluster(event) ? event.clusterCumulativeScore :
                                                                  -1;
    const title = Trace.Types.Events.isLayoutShift(event)       ? i18nString(UIStrings.layoutShift) :
        Trace.Types.Events.isSyntheticLayoutShiftCluster(event) ? i18nString(UIStrings.layoutShiftCluster) :
                                                                  event.name;

    let additionalElement;
    if (Trace.Types.Events.isSyntheticLayoutShift(event)) {
      // Screenshots are max 500x500 naturally, but on a laptop in dock-to-right, 500px tall usually doesn't fit.
      // In the future, we may investigate a way to dynamically scale this tooltip content per available space.
      const maxSize = new UI.Geometry.Size(510, 400);
      const vizElem = LayoutShiftsTrackAppender.createShiftViz(event, this.#parsedTrace, maxSize);
      if (vizElem) {
        additionalElement = vizElem;
      }
    }

    // Score isn't a duration, but the UI works anyhow.
    return {title, formattedTime: score.toFixed(4), additionalElement};
  }

  getDrawOverride(event: Trace.Types.Events.Event): DrawOverride|undefined {
    if (!Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.TIMELINE_INSIGHTS)) {
      // If the new CLS experience isn't on.. Continue to present that Shifts are 5ms long. (but now via drawOverrides)
      // TODO: Remove this when the experiment ships
      if (Trace.Types.Events.isLayoutShift(event)) {
        return (context, x, y, _width, levelHeight, timeToPosition) => {
          const fakeDurMs = Trace.Helpers.Timing.microSecondsToMilliseconds(
              Trace.Types.Timing.MicroSeconds(event.ts + LAYOUT_SHIFT_SYNTHETIC_DURATION));
          const barEnd = timeToPosition(fakeDurMs);
          const barWidth = barEnd - x;
          context.fillStyle = this.colorForEvent(event);
          context.fillRect(x, y, barWidth - 0.5, levelHeight - 1);
          return {
            x,
            width: barWidth,
          };
        };
      }
    }

    if (Trace.Types.Events.isLayoutShift(event)) {
      const score = event.args.data?.weighted_score_delta || 0;

      // `buffer` is how much space is between the actual diamond shape and the
      // edge of its select box. The select box will have a constant size
      // so a larger `buffer` will create a smaller diamond.
      //
      // This logic will scale the size of the diamond based on the layout shift score.
      // A LS score of >=0.1 will create a diamond of maximum size
      // A LS score of ~0 will create a diamond of minimum size (exactly 0 should not happen in practice)
      const bufferScale = 1 - Math.min(score / 0.10, 1);

      return (context, x, y, _width, levelHeight) => {
        // levelHeight is 17px, so this math translates to a minimum diamond size of 5.6px tall.
        const maxBuffer = levelHeight / 3;
        const buffer = bufferScale * maxBuffer;

        const boxSize = levelHeight;
        const halfSize = boxSize / 2;
        context.save();
        context.beginPath();
        context.moveTo(x, y + buffer);
        context.lineTo(x + halfSize - buffer, y + halfSize);
        context.lineTo(x, y + levelHeight - buffer);
        context.lineTo(x - halfSize + buffer, y + halfSize);
        context.closePath();
        context.fillStyle = this.colorForEvent(event);

        context.fill();
        context.restore();
        return {
          x: x - halfSize,
          width: boxSize,
        };
      };
    }
    if (Trace.Types.Events.isSyntheticLayoutShiftCluster(event)) {
      return (context, x, y, width, levelHeight) => {
        const barHeight = levelHeight * 0.2;
        const barY = y + (levelHeight - barHeight) / 2 + 0.5;
        context.fillStyle = this.colorForEvent(event);
        context.fillRect(x, barY, width - 0.5, barHeight - 1);
        return {x, width, z: -1};
      };
    }
    return;
  }

  preloadScreenshots(events: Trace.Types.Events.SyntheticLayoutShift[]): Promise<(void|undefined)[]> {
    const screenshotsToLoad: Set<Trace.Types.Events.SyntheticScreenshot> = new Set();
    for (const event of events) {
      const shots = event.parsedData.screenshots;
      shots.before && screenshotsToLoad.add(shots.before);
      shots.after && screenshotsToLoad.add(shots.after);
    }

    const screenshots = Array.from(screenshotsToLoad);
    return Utils.ImageCache.preload(screenshots);
  }

  static createShiftViz(
      event: Trace.Types.Events.SyntheticLayoutShift, parsedTrace: Trace.Handlers.Types.ParsedTrace,
      maxSize: UI.Geometry.Size): HTMLElement|undefined {
    const screenshots = event.parsedData.screenshots;
    const {viewportRect, devicePixelRatio: dpr} = parsedTrace.Meta;
    const vizContainer = document.createElement('div');
    vizContainer.classList.add('layout-shift-viz');

    const beforeImg = screenshots.before && Utils.ImageCache.getOrQueue(screenshots.before);
    const afterImg = screenshots.after && Utils.ImageCache.getOrQueue(screenshots.after);

    if (!beforeImg || !afterImg || !viewportRect || dpr === undefined) {
      return;
    }

    /** 1 of 3 scaling factors.
     * The Layout Instability API in Blink, which reports the LayoutShift trace events, is not based on CSS pixels but
     * physical pixels. As such the values in the impacted_nodes field need to be normalized to CSS units in order to
     * map them to the viewport dimensions, which we get in CSS pixels. We do that by dividing the values by the devicePixelRatio.
     * See https://crbug.com/1300309
     */
    const toCssPixelRect = (rect: Trace.Types.Events.TraceRect): DOMRect => {
      return new DOMRect(rect[0] / dpr, rect[1] / dpr, rect[2] / dpr, rect[3] / dpr);
    };

    // 2 of 3 scaling factors. Turns CSS pixels into pixels relative to the size of the screenshot image's natural size.
    const screenshotImageScaleFactor =
        Math.min(beforeImg.naturalWidth / viewportRect.width, beforeImg.naturalHeight / viewportRect.height, 1);

    // 3 of 3 scaling factors. We can constrain this UI by a maxSize in case we want it smaller.
    // If this is being size constrained, it needs to be done in JS (rather than css max-width, etc)....
    // That's because this function is complete before it's added to the DOM.. so we can't query offsetHeight for its resolved size…
    const maxSizeScaleFactor =
        Math.min(maxSize.width / beforeImg.naturalWidth, maxSize.height / beforeImg.naturalHeight, 1);
    for (const elem of [vizContainer, afterImg, beforeImg]) {
      elem.style.width = `${beforeImg.naturalWidth * maxSizeScaleFactor}px`;
      elem.style.height = `${beforeImg.naturalHeight * maxSizeScaleFactor}px`;
    }

    const beforeRects = event.args.data?.impacted_nodes?.map(node => toCssPixelRect(node.old_rect)) ?? [];
    const afterRects = event.args.data?.impacted_nodes?.map(node => toCssPixelRect(node.new_rect)) ?? [];

    function startVizAnimation(): void {
      if (!beforeImg || !afterImg) {
        return;
      }

      // If image is reused, drop existing anims
      [beforeImg, afterImg].flatMap(img => img.getAnimations()).forEach(a => a.cancel());

      const easing = 'ease-out';
      const vizAnimOpts: KeyframeAnimationOptions = {
        duration: 3000,
        iterations: Infinity,
        fill: 'forwards',
        easing,
      };
      // Using keyframe offsets to add "delay" to both the start and the end.
      // https://drafts.csswg.org/web-animations-1/#:~:text=Keyframe%20offsets%20can%20be%20specified%20using%20either%20form%20as%20illustrated%20below%3A
      // Animate the "after" screenshot's opacity in.
      afterImg.animate({opacity: [0, 0, 1, 1, 1], easing}, vizAnimOpts);

      const getRectPosition = (rect: DOMRect): Keyframe => ({
        left: `${rect.x * maxSizeScaleFactor * screenshotImageScaleFactor}px`,
        top: `${rect.y * maxSizeScaleFactor * screenshotImageScaleFactor}px`,
        width: `${rect.width * maxSizeScaleFactor * screenshotImageScaleFactor}px`,
        height: `${rect.height * maxSizeScaleFactor * screenshotImageScaleFactor}px`,
        opacity: 0.7,
        outlineWidth: '1px',
        easing,
      });

      // Create and position individual rects representing each impacted_node within a shift
      beforeRects.forEach((beforeRect, i) => {
        const afterRect = afterRects[i];
        const rectEl = document.createElement('div');
        rectEl.classList.add('layout-shift-viz-rect');
        vizContainer.appendChild(rectEl);

        let beforePos = getRectPosition(beforeRect);
        let afterPos = getRectPosition(afterRect);
        afterPos.opacity = 0.4;

        // Edge case: if either before or after is 0x0x0x0, then we'll fade it in/out in the same location.
        if ([beforeRect.width, beforeRect.height, beforeRect.x, beforeRect.y].every(v => v === 0)) {
          beforePos = {...afterPos};
          beforePos.opacity = '0';
        }
        if ([afterRect.width, afterRect.height, afterRect.x, afterRect.y].every(v => v === 0)) {
          afterPos = {...beforePos};
          afterPos.opacity = '0';
        }

        // Keep these keyframe offsets sync'd with other animate() ones above.
        // The 4px outline slightly pulses the rect so it's easier to distinguish
        rectEl.animate([beforePos, beforePos, {...afterPos, outlineWidth: '4px'}, afterPos, afterPos], vizAnimOpts);
      });
    }

    // If not done within the render lifecycle, getAnimations() falsely returns [] which allows animations to pile up on the same screenshot
    void ComponentHelpers.ScheduledRender.scheduleRender(vizContainer, () => startVizAnimation());

    vizContainer.append(beforeImg, afterImg);
    return vizContainer;
  }
}
