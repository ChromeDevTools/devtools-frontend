import '../../../ui/kit/kit.js';
import '../../../ui/components/node_text/node_text.js';
import * as SDK from '../../../core/sdk/sdk.js';
export declare class NodeSelectedEvent extends Event {
    static readonly eventName = "breadcrumbsnodeselected";
    node: SDK.DOMModel.DOMNode;
    constructor(node: SDK.DOMModel.DOMNode);
}
export interface ElementsBreadcrumbsData {
    selectedNode: SDK.DOMModel.DOMNode | null;
    crumbs: SDK.DOMModel.DOMNode[];
}
export declare class ElementsBreadcrumbs extends HTMLElement {
    #private;
    set data(data: ElementsBreadcrumbsData);
    disconnectedCallback(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-elements-breadcrumbs': ElementsBreadcrumbs;
    }
    interface HTMLElementEventMap {
        [NodeSelectedEvent.eventName]: NodeSelectedEvent;
    }
}
