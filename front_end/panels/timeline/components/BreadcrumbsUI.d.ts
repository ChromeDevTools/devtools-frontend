import * as Trace from '../../../models/trace/trace.js';
import * as UI from '../../../ui/legacy/legacy.js';
export interface ViewInput {
    initialBreadcrumb: Trace.Types.File.Breadcrumb | null;
    activeBreadcrumb: Trace.Types.File.Breadcrumb | null;
    showBreadcrumbs: boolean;
    onBreadcrumbClick: (breadcrumb: Trace.Types.File.Breadcrumb) => void;
    onBreadcrumbContextMenu: (event: Event, breadcrumb: Trace.Types.File.Breadcrumb) => void;
}
export interface ViewOutput {
    scrollToEnd?: () => void;
}
type View = typeof DEFAULT_VIEW;
export declare class BreadcrumbsUI extends UI.Widget.Widget {
    #private;
    onBreadcrumbActivated?: (breadcrumb: Trace.Types.File.Breadcrumb, childBreadcrumbsRemoved: boolean) => void;
    constructor(element?: HTMLElement, view?: View);
    set initialBreadcrumb(breadcrumb: Trace.Types.File.Breadcrumb | null);
    set activeBreadcrumb(breadcrumb: Trace.Types.File.Breadcrumb | null);
    wasShown(): void;
    performUpdate(): void;
}
export declare const DEFAULT_VIEW: (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export {};
