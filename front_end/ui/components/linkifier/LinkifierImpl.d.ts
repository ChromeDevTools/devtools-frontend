import * as Platform from '../../../core/platform/platform.js';
export interface LinkifierData {
    url: Platform.DevToolsPath.UrlString;
    lineNumber?: number;
    columnNumber?: number;
    linkText?: string;
    title?: string;
}
export declare class LinkifierClick extends Event {
    data: LinkifierData;
    static readonly eventName = "linkifieractivated";
    constructor(data: LinkifierData);
}
export declare class Linkifier extends HTMLElement {
    #private;
    set data(data: LinkifierData);
    cloneNode(deep?: boolean): Node;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-linkifier': Linkifier;
    }
}
