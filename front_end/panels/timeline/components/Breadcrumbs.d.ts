import type * as Trace from '../../../models/trace/trace.js';
export declare function flattenBreadcrumbs(initialBreadcrumb: Trace.Types.File.Breadcrumb): Trace.Types.File.Breadcrumb[];
export interface SetActiveBreadcrumbOptions {
    removeChildBreadcrumbs: boolean;
    updateVisibleWindow: boolean;
}
export declare class Breadcrumbs {
    initialBreadcrumb: Trace.Types.File.Breadcrumb;
    activeBreadcrumb: Trace.Types.File.Breadcrumb;
    constructor(initialTraceWindow: Trace.Types.Timing.TraceWindowMicro);
    add(newBreadcrumbTraceWindow: Trace.Types.Timing.TraceWindowMicro): Trace.Types.File.Breadcrumb;
    isTraceWindowWithinTraceWindow(child: Trace.Types.Timing.TraceWindowMicro, parent: Trace.Types.Timing.TraceWindowMicro): boolean;
    setInitialBreadcrumbFromLoadedModifications(initialBreadcrumb: Trace.Types.File.Breadcrumb): void;
    /**
     * Sets a breadcrumb to be active.
     * Doing this will update the minimap bounds and optionally based on the
     * `updateVisibleWindow` parameter, it will also update the active window.
     * The reason `updateVisibleWindow` is configurable is because if we are
     * changing which breadcrumb is active because we want to reveal something to
     * the user, we may have already updated the visible timeline window, but we
     * are activating the breadcrumb to show the user that they are now within
     * this breadcrumb. This is used when revealing insights and annotations.
     */
    setActiveBreadcrumb(activeBreadcrumb: Trace.Types.File.Breadcrumb, options: SetActiveBreadcrumbOptions): void;
}
