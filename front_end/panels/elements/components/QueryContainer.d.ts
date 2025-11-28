import '../../../ui/kit/kit.js';
import '../../../ui/components/node_text/node_text.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type { DOMNode } from './Helper.js';
export declare class QueriedSizeRequestedEvent extends Event {
    static readonly eventName = "queriedsizerequested";
    constructor();
}
export interface QueryContainerData {
    container: DOMNode;
    queryName?: string;
    onContainerLinkClick: (event: Event) => void;
}
export declare class QueryContainer extends HTMLElement {
    #private;
    set data(data: QueryContainerData);
    updateContainerQueriedSizeDetails(details: SDK.CSSContainerQuery.ContainerQueriedSizeDetails): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-query-container': QueryContainer;
    }
}
