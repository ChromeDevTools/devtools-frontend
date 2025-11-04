import * as Trace from '../../models/trace/trace.js';
import type { AnnotationModifiedEvent } from './ModificationsManager.js';
export declare function getAnnotationEntries(annotation: Trace.Types.File.Annotation): Trace.Types.Events.Event[];
/**
 * Gets a trace window that contains the given annotation. May return `null`
 * if there is no valid window (an ENTRIES_LINK without a `to` entry for
 * example.)
 */
export declare function getAnnotationWindow(annotation: Trace.Types.File.Annotation): Trace.Types.Timing.TraceWindowMicro | null;
export declare function isTimeRangeLabel(overlay: Trace.Types.Overlays.Overlay): overlay is Trace.Types.Overlays.TimeRangeLabel;
export declare function isEntriesLink(overlay: Trace.Types.Overlays.Overlay): overlay is Trace.Types.Overlays.EntriesLink;
export declare function isEntryLabel(overlay: Trace.Types.Overlays.Overlay): overlay is Trace.Types.Overlays.EntryLabel;
export declare function ariaDescriptionForOverlay(overlay: Trace.Types.Overlays.Overlay): string | null;
export declare function ariaAnnouncementForModifiedEvent(event: AnnotationModifiedEvent): string | null;
