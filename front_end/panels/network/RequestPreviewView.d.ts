import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface ViewInput {
    request: SDK.NetworkRequest.NetworkRequest;
    resourceType: Common.ResourceType.ResourceType;
    mimeType: string;
    highlighterType: string;
    hasSignedExchange: boolean;
    error: string | null;
    htmlDataURL: string | null;
    parsedJSON: SourceFrame.JSONView.ParsedJSON | null;
    parsedXML: Document | null;
    isTextContent: boolean;
    hasTextContent: boolean;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class RequestPreviewView extends UI.Widget.VBox {
    #private;
    constructor(request?: SDK.NetworkRequest.NetworkRequest | HTMLElement, view?: View);
    get request(): SDK.NetworkRequest.NetworkRequest;
    set request(request: SDK.NetworkRequest.NetworkRequest);
    get contentViewPromise(): Promise<UI.Widget.AnyWidget | null>;
    wasShown(): void;
    performUpdate(): Promise<void>;
}
