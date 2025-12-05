import type * as SDK from '../../../core/sdk/sdk.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as NetworkForward from '../forward/forward.js';
import { type HeaderDescriptor } from './HeaderSectionRow.js';
export interface ViewInput {
    headers: HeaderDescriptor[];
    isProvisionalHeaders: boolean;
    isRequestCached: boolean;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement | ShadowRoot) => void;
export declare const DEFAULT_VIEW: View;
export declare class RequestHeaderSection extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set toReveal(toReveal: {
        section: NetworkForward.UIRequestLocation.UIHeaderSection;
        header?: string;
    } | undefined);
    set request(request: Readonly<SDK.NetworkRequest.NetworkRequest>);
    performUpdate(): void;
}
