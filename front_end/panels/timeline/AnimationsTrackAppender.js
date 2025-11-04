// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as Trace from '../../models/trace/trace.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';
import { addDecorationToEvent, buildGroupStyle, buildTrackHeader } from './AppenderUtils.js';
const UIStrings = {
    /**
     * @description Text in Timeline Flame Chart Data Provider of the Performance panel
     */
    animations: 'Animations',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/AnimationsTrackAppender.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class AnimationsTrackAppender {
    appenderName = 'Animations';
    #compatibilityBuilder;
    #parsedTrace;
    #eventAppendedCallback = this.#eventAppendedCallbackFunction.bind(this);
    constructor(compatibilityBuilder, parsedTrace) {
        this.#compatibilityBuilder = compatibilityBuilder;
        this.#parsedTrace = parsedTrace;
    }
    appendTrackAtLevel(trackStartLevel, expanded) {
        const animations = this.#parsedTrace.data.Animations.animations;
        if (animations.length === 0) {
            return trackStartLevel;
        }
        this.#appendTrackHeaderAtLevel(trackStartLevel, expanded);
        return this.#compatibilityBuilder.appendEventsAtLevel(animations, trackStartLevel, this, this.#eventAppendedCallback);
    }
    #appendTrackHeaderAtLevel(currentLevel, expanded) {
        const style = buildGroupStyle({ useFirstLineForOverview: false });
        const group = buildTrackHeader("animations" /* VisualLoggingTrackName.ANIMATIONS */, currentLevel, i18nString(UIStrings.animations), style, 
        /* selectable= */ true, expanded);
        this.#compatibilityBuilder.registerTrackForGroup(group, this);
    }
    #eventAppendedCallbackFunction(event, index) {
        if (event && Trace.Types.Events.isSyntheticAnimation(event)) {
            const failures = Trace.Insights.Models.CLSCulprits.getNonCompositedFailure(event);
            if (failures.length) {
                addDecorationToEvent(this.#compatibilityBuilder.getFlameChartTimelineData(), index, {
                    type: "WARNING_TRIANGLE" /* PerfUI.FlameChart.FlameChartDecorationType.WARNING_TRIANGLE */,
                });
            }
        }
    }
    colorForEvent() {
        return ThemeSupport.ThemeSupport.instance().getComputedValue('--app-color-rendering');
    }
}
//# sourceMappingURL=AnimationsTrackAppender.js.map