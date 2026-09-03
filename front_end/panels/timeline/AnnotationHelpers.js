// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Trace from '../../models/trace/trace.js';
import * as TraceBounds from '../../services/trace_bounds/trace_bounds.js';
const UIStrings = {
    /**
     * @description Screen reader announcement when entering label editing mode in the Performance panel.
     */
    srEnterLabelEditMode: 'Editing the annotation label text',
    /**
     * @description Screen reader announcement when an entry label text has been updated in the Performance panel.
     * @example {Hello world} PH1
     */
    srLabelTextUpdated: 'Label updated to {PH1}',
    /**
     * @description Screen reader announcement when the bounds of a time range annotation have been updated in the Performance panel.
     * @example {13ms} PH1
     * @example {20ms} PH2
     */
    srTimeRangeBoundsUpdated: 'Time range updated, starting at {PH1} and ending at {PH2}',
    /**
     * @description Accessible label for a time range overlay in the timeline flame chart.
     */
    timeRange: 'time range',
    /**
     * @description Accessible label for an entry label overlay in the timeline flame chart.
     */
    entryLabel: 'entry label',
    /**
     * @description Accessible label for a connected entries overlay in the timeline flame chart.
     */
    entriesLink: 'connected entries',
    /**
     * @description Screen reader announcement when an annotation has been removed in the Performance panel.
     * @example {Entry Label} PH1
     */
    srAnnotationRemoved: 'The {PH1} annotation has been removed',
    /**
     * @description Screen reader announcement when an annotation has been added in the Performance panel.
     * @example {Entry Label} PH1
     */
    srAnnotationAdded: 'The {PH1} annotation has been added',
    /**
     * @description Screen reader announcement when the connected entries annotation links to two events in the Performance panel.
     * @example {Paint} PH1
     * @example {Function call} PH2
     */
    srEntriesLinked: 'The connected entries annotation now links from {PH1} to {PH2}',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/AnnotationHelpers.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export function getAnnotationEntries(annotation) {
    const entries = [];
    switch (annotation.type) {
        case 'ENTRY_LABEL':
            entries.push(annotation.entry);
            break;
        case 'TIME_RANGE':
            break;
        case 'ENTRIES_LINK':
            entries.push(annotation.entryFrom);
            if (annotation.entryTo) {
                entries.push(annotation.entryTo);
            }
            break;
        default:
            Platform.assertNever(annotation, 'Unsupported annotation type');
    }
    return entries;
}
/**
 * Gets a trace window that contains the given annotation. May return `null`
 * if there is no valid window (an ENTRIES_LINK without a `to` entry for
 * example.)
 */
export function getAnnotationWindow(annotation) {
    let annotationWindow = null;
    const minVisibleEntryDuration = Trace.Types.Timing.Milli(1);
    switch (annotation.type) {
        case 'ENTRY_LABEL': {
            const eventDuration = annotation.entry.dur ?? Trace.Helpers.Timing.milliToMicro(minVisibleEntryDuration);
            annotationWindow = Trace.Helpers.Timing.traceWindowFromMicroSeconds(annotation.entry.ts, Trace.Types.Timing.Micro(annotation.entry.ts + eventDuration));
            break;
        }
        case 'TIME_RANGE': {
            annotationWindow = annotation.bounds;
            break;
        }
        case 'ENTRIES_LINK': {
            // If entryTo does not exist, the annotation is in the process of being created.
            // Do not allow to zoom into it in this case.
            if (!annotation.entryTo) {
                break;
            }
            const fromEventDuration = (annotation.entryFrom.dur) ?? minVisibleEntryDuration;
            const toEventDuration = annotation.entryTo.dur ?? minVisibleEntryDuration;
            // To choose window max, check which entry ends later
            const fromEntryEndTS = (annotation.entryFrom.ts + fromEventDuration);
            const toEntryEndTS = (annotation.entryTo.ts + toEventDuration);
            const maxTimestamp = Math.max(fromEntryEndTS, toEntryEndTS);
            annotationWindow = Trace.Helpers.Timing.traceWindowFromMicroSeconds(annotation.entryFrom.ts, Trace.Types.Timing.Micro(maxTimestamp));
            break;
        }
        default:
            Platform.assertNever(annotation, 'Unsupported annotation type');
    }
    return annotationWindow;
}
export function isTimeRangeLabel(overlay) {
    return overlay.type === 'TIME_RANGE';
}
export function isEntriesLink(overlay) {
    return overlay.type === 'ENTRIES_LINK';
}
export function isEntryLabel(overlay) {
    return overlay.type === 'ENTRY_LABEL';
}
function labelForOverlay(overlay) {
    if (isTimeRangeLabel(overlay) || isEntryLabel(overlay)) {
        return overlay.label;
    }
    return null;
}
export function ariaDescriptionForOverlay(overlay) {
    if (isTimeRangeLabel(overlay)) {
        return i18nString(UIStrings.timeRange);
    }
    if (isEntriesLink(overlay)) {
        return i18nString(UIStrings.entriesLink);
    }
    if (isEntryLabel(overlay)) {
        // Don't announce an empty label
        return overlay.label.length > 0 ? i18nString(UIStrings.entryLabel) : null;
    }
    // Not an annotation overlay: ignore.
    return null;
}
export function ariaAnnouncementForModifiedEvent(event) {
    if (event.muteAriaNotifications) {
        return null;
    }
    const { overlay, action } = event;
    switch (action) {
        case 'Remove': {
            const text = ariaDescriptionForOverlay(overlay);
            if (text) {
                return (i18nString(UIStrings.srAnnotationRemoved, { PH1: text }));
            }
            break;
        }
        case 'Add': {
            const text = ariaDescriptionForOverlay(overlay);
            if (text) {
                return (i18nString(UIStrings.srAnnotationAdded, { PH1: text }));
            }
            break;
        }
        case 'UpdateLabel': {
            const label = labelForOverlay(overlay);
            if (label) {
                return i18nString(UIStrings.srLabelTextUpdated, { PH1: label });
            }
            break;
        }
        case 'UpdateTimeRange': {
            if (overlay.type !== 'TIME_RANGE') {
                return '';
            }
            const traceBounds = TraceBounds.TraceBounds.BoundsManager.instance().state()?.micro.entireTraceBounds;
            if (!traceBounds) {
                return '';
            }
            const { min, max } = overlay.bounds;
            const minText = i18n.TimeUtilities.formatMicroSecondsAsMillisFixed(Trace.Types.Timing.Micro(min - traceBounds.min));
            const maxText = i18n.TimeUtilities.formatMicroSecondsAsMillisFixed(Trace.Types.Timing.Micro(max - traceBounds.min));
            return i18nString(UIStrings.srTimeRangeBoundsUpdated, {
                PH1: minText,
                PH2: maxText,
            });
        }
        case 'UpdateLinkToEntry': {
            if (isEntriesLink(overlay) && overlay.entryFrom && overlay.entryTo) {
                const from = Trace.Name.forEntry(overlay.entryFrom);
                const to = Trace.Name.forEntry(overlay.entryTo);
                return (i18nString(UIStrings.srEntriesLinked, { PH1: from, PH2: to }));
            }
            break;
        }
        case 'EnterLabelEditState': {
            return (i18nString(UIStrings.srEnterLabelEditMode));
        }
        case 'LabelBringForward': {
            break;
        }
        default:
            Platform.assertNever(action, 'Unsupported action for AnnotationModifiedEvent');
    }
    return null;
}
//# sourceMappingURL=AnnotationHelpers.js.map