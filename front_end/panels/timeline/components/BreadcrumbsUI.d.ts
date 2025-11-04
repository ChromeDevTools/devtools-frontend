import * as Trace from '../../../models/trace/trace.js';
/**
 * `initialBreadcrumb` is the first breadcrumb in the breadcrumbs linked list. Since
 * breadcrumbs are a linked list, the first breadcrumb is enough to be able to iterate through all of them.
 *
 * `activeBreadcrumb` is the currently active breadcrumb that the timeline is limited to.
 **/
export interface BreadcrumbsUIData {
    initialBreadcrumb: Trace.Types.File.Breadcrumb;
    activeBreadcrumb: Trace.Types.File.Breadcrumb;
}
export declare class BreadcrumbActivatedEvent extends Event {
    breadcrumb: Trace.Types.File.Breadcrumb;
    childBreadcrumbsRemoved?: boolean | undefined;
    static readonly eventName = "breadcrumbactivated";
    constructor(breadcrumb: Trace.Types.File.Breadcrumb, childBreadcrumbsRemoved?: boolean | undefined);
}
export declare class BreadcrumbsUI extends HTMLElement {
    #private;
    set data(data: BreadcrumbsUIData);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-breadcrumbs-ui': BreadcrumbsUI;
    }
}
