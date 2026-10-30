import '../../../ui/components/settings/settings.js';
import * as Common from '../../../core/common/common.js';
import * as Trace from '../../../models/trace/trace.js';
import * as UI from '../../../ui/legacy/legacy.js';
export interface SidebarAnnotationsTabViewInput {
    annotations: readonly Trace.Types.File.Annotation[];
    annotationsHiddenSetting: Common.Settings.Setting<boolean>;
    annotationEntryToColorMap: ReadonlyMap<Trace.Types.Events.Event | Trace.Types.Events.LegacyTimelineFrame, string>;
    onAnnotationClick: (annotation: Trace.Types.File.Annotation) => void;
    onAnnotationHover: (annotation: Trace.Types.File.Annotation) => void;
    onAnnotationHoverOut: () => void;
    onAnnotationDelete: (annotation: Trace.Types.File.Annotation) => void;
}
export type View = (input: SidebarAnnotationsTabViewInput, output: undefined, target: HTMLElement) => void;
export declare class SidebarAnnotationsTab extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement | View, view?: View);
    deduplicatedAnnotations(): readonly Trace.Types.File.Annotation[];
    set annotations(annotations: Trace.Types.File.Annotation[]);
    set annotationEntryToColorMap(annotationEntryToColorMap: Map<Trace.Types.Events.Event | Trace.Types.Events.LegacyTimelineFrame, string>);
    setData(data: {
        annotations: Trace.Types.File.Annotation[];
        annotationEntryToColorMap: Map<Trace.Types.Events.Event, string>;
    }): void;
    static processAnnotationsList(annotations: Trace.Types.File.Annotation[]): Trace.Types.File.Annotation[];
    performUpdate(): void;
}
export declare const DEFAULT_VIEW: View;
