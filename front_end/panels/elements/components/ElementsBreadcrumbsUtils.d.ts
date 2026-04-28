import type * as SDK from '../../../core/sdk/sdk.js';
export type UserScrollPosition = 'start' | 'middle' | 'end';
export interface Crumb {
    title: CrumbTitle;
    selected: boolean;
    node: SDK.DOMModel.DOMNode;
}
export interface CrumbTitle {
    main: string;
    extras: {
        id?: string;
        classes?: string[];
    };
}
export declare const crumbsToRender: (crumbs: readonly SDK.DOMModel.DOMNode[], selectedNode: SDK.DOMModel.DOMNode | null) => Crumb[];
export declare const determineElementTitle: (domNode: SDK.DOMModel.DOMNode) => CrumbTitle;
