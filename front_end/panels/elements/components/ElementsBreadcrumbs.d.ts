import '../../../ui/components/icon_button/icon_button.js';
import '../../../ui/components/node_text/node_text.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import type { DOMNode } from './Helper.js';
export declare class NodeSelectedEvent extends Event {
    static readonly eventName = "breadcrumbsnodeselected";
    legacyDomNode: SDK.DOMModel.DOMNode;
    constructor(node: DOMNode);
}
export interface ElementsBreadcrumbsData {
    selectedNode: DOMNode | null;
    crumbs: DOMNode[];
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
