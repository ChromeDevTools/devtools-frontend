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
export declare class SidebarAnnotationsTab extends UI.Widget.Widget {
    #private;
    constructor(view?: (input: SidebarAnnotationsTabViewInput, output: object, target: HTMLElement) => void);
    deduplicatedAnnotations(): readonly Trace.Types.File.Annotation[];
    setData(data: {
        annotations: Trace.Types.File.Annotation[];
        annotationEntryToColorMap: Map<Trace.Types.Events.Event, string>;
    }): void;
    performUpdate(): void;
}
export declare const DEFAULT_VIEW: (input: SidebarAnnotationsTabViewInput, output: object, target: HTMLElement) => void;
