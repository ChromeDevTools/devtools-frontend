import type { NameValue } from '../../../core/sdk/NetworkRequest.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import * as NetworkForward from '../../../panels/network/forward/forward.js';
import { type HeaderDetailsDescriptor } from './HeaderSectionRow.js';
export declare const RESPONSE_HEADER_SECTION_DATA_KEY = "ResponseHeaderSection";
export interface ResponseHeaderSectionData {
    request: SDK.NetworkRequest.NetworkRequest;
    toReveal?: {
        section: NetworkForward.UIRequestLocation.UIHeaderSection;
        header?: string;
    };
}
declare class ResponseHeaderSectionBase extends HTMLElement {
    protected readonly shadow: ShadowRoot;
    protected headerDetails: HeaderDetailsDescriptor[];
    protected setHeaders(headers: NameValue[]): void;
    protected highlightHeaders(data: ResponseHeaderSectionData): void;
}
export declare class EarlyHintsHeaderSection extends ResponseHeaderSectionBase {
    #private;
    set data(data: ResponseHeaderSectionData);
}
export declare class ResponseHeaderSection extends ResponseHeaderSectionBase {
    #private;
    set data(data: ResponseHeaderSectionData);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-response-header-section': ResponseHeaderSection;
        'devtools-early-hints-header-section': EarlyHintsHeaderSection;
    }
}
export {};
