import '../../../ui/kit/kit.js';
import '../../../ui/components/node_text/node_text.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as UI from '../../../ui/legacy/legacy.js';
export declare class QueriedSizeRequestedEvent extends Event {
    static readonly eventName = "queriedsizerequested";
    constructor();
}
export interface QueryContainerData {
    container: SDK.DOMModel.DOMNode;
    queryName?: string;
    onContainerLinkClick: () => void;
}
export interface ViewInput {
    nodeTitle: string;
    idToDisplay?: string;
    classesToDisplay?: string[];
    onContainerLinkClick?: () => void;
    onContainerLinkMouseEnter: () => void;
    onContainerLinkMouseLeave: () => void;
    isContainerLinkHovered: boolean;
    queriedSizeDetails?: SDK.CSSContainerQuery.ContainerQueriedSizeDetails;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class QueryContainer extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set data(data: QueryContainerData);
    updateContainerQueriedSizeDetails(details: SDK.CSSContainerQuery.ContainerQueriedSizeDetails): void;
    wasShown(): void;
    performUpdate(): void;
}
