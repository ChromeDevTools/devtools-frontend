import * as Trace from '../../models/trace/trace.js';
import * as TimelineComponents from '../../panels/timeline/components/components.js';
import { EntriesFilter } from './EntriesFilter.js';
export type UpdateAction = 'Remove' | 'Add' | 'UpdateLabel' | 'UpdateTimeRange' | 'UpdateLinkToEntry' | 'EnterLabelEditState' | 'LabelBringForward';
/**
 * Event dispatched after an annotation was added, removed or updated.
 * The event argument is the Overlay that needs to be created,removed
 * or updated by `Overlays.ts` and the action that needs to be applied to it.
 **/
export declare class AnnotationModifiedEvent extends Event {
    overlay: Trace.Types.Overlays.Overlay;
    action: UpdateAction;
    muteAriaNotifications: boolean;
    static readonly eventName = "annotationmodifiedevent";
    constructor(overlay: Trace.Types.Overlays.Overlay, action: UpdateAction, muteAriaNotifications?: boolean);
}
export declare class ModificationsManager extends EventTarget {
    #private;
    /**
     * Gets the ModificationsManager instance corresponding to a trace
     * given its index used in Model#traces. If no index is passed gets
     * the manager instance for the last trace. If no instance is found,
     * throws.
     */
    static activeManager(): ModificationsManager | null;
    static reset(): void;
    /**
     * Initializes a ModificationsManager instance for a parsed trace or changes the active manager for an existing one.
     * This needs to be called if and a trace has been parsed or switched to.
     */
    static initAndActivateModificationsManager(traceModel: Trace.TraceModel.Model, traceIndex: number): ModificationsManager | null;
    private constructor();
    getEntriesFilter(): EntriesFilter;
    getTimelineBreadcrumbs(): TimelineComponents.Breadcrumbs.Breadcrumbs;
    deleteEmptyRangeAnnotations(): void;
    /**
     * Stores the annotation and creates its overlay.
     * @returns the Overlay that gets created and associated with this annotation.
     */
    createAnnotation(newAnnotation: Trace.Types.File.Annotation, opts: {
        loadedFromFile: boolean;
        muteAriaNotifications: boolean;
    }): Trace.Types.Overlays.Overlay;
    linkAnnotationBetweenEntriesExists(entryFrom: Trace.Types.Events.Event, entryTo: Trace.Types.Events.Event): boolean;
    bringEntryLabelForwardIfExists(entry: Trace.Types.Events.Event): void;
    removeAnnotation(removedAnnotation: Trace.Types.File.Annotation): void;
    removeAnnotationOverlay(removedOverlay: Trace.Types.Overlays.Overlay): void;
    updateAnnotation(updatedAnnotation: Trace.Types.File.Annotation): void;
    updateAnnotationOverlay(updatedOverlay: Trace.Types.Overlays.Overlay): void;
    getAnnotationByOverlay(overlay: Trace.Types.Overlays.Overlay): Trace.Types.File.Annotation | null;
    getOverlaybyAnnotation(annotation: Trace.Types.File.Annotation): Trace.Types.Overlays.Overlay | null;
    getAnnotations(): Trace.Types.File.Annotation[];
    getOverlays(): Trace.Types.Overlays.Overlay[];
    applyAnnotationsFromCache(opts: {
        muteAriaNotifications: boolean;
    }): void;
    /**
     * Builds all modifications into a serializable object written into
     * the 'modifications' trace file metadata field.
     */
    toJSON(): Trace.Types.File.Modifications;
    applyModificationsIfPresent(): void;
}
