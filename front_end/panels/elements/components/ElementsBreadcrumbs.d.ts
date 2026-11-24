import '../../../ui/kit/kit.js';
import '../../../ui/components/node_text/node_text.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { type Crumb } from './ElementsBreadcrumbsUtils.js';
export declare class NodeSelectedEvent extends Event {
    static readonly eventName = "breadcrumbsnodeselected";
    node: SDK.DOMModel.DOMNode;
    constructor(node: SDK.DOMModel.DOMNode);
}
/** Geometry of the scrollable crumbs window, reported by the view. */
export interface Viewport {
    windowWidth: number;
    contentWidth: number;
    scrollLeft: number;
}
export interface ViewInput {
    crumbs: Crumb[];
    overflowing: boolean;
    canScrollLeft: boolean;
    canScrollRight: boolean;
    scrollSelectedCrumbIntoView: boolean;
    onCrumbClick: (node: SDK.DOMModel.DOMNode) => void;
    onCrumbMouseMove: (node: SDK.DOMModel.DOMNode) => void;
    onCrumbMouseLeave: () => void;
    onCrumbFocus: (node: SDK.DOMModel.DOMNode) => void;
    onCrumbBlur: () => void;
    onViewportChange: (viewport: Viewport) => void;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class ElementsBreadcrumbs extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    /**
     * The crumbs are derived from the selected node and its ancestors. Call
     * `requestUpdate()` to re-render them when the DOM tree changes while the
     * selection stays the same.
     */
    set selectedNode(selectedNode: SDK.DOMModel.DOMNode | null);
    wasShown(): void;
    willHide(): void;
    onDetach(): void;
    performUpdate(): void;
}
declare global {
    interface HTMLElementEventMap {
        [NodeSelectedEvent.eventName]: NodeSelectedEvent;
    }
}
