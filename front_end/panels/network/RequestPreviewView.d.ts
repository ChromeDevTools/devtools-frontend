import '../../ui/legacy/legacy.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare class RequestPreviewView extends UI.Widget.VBox {
    #private;
    private contentViewPromise;
    constructor(request?: SDK.NetworkRequest.NetworkRequest | HTMLElement, element?: HTMLElement);
    get request(): SDK.NetworkRequest.NetworkRequest;
    set request(request: SDK.NetworkRequest.NetworkRequest);
    showPreview(): Promise<UI.Widget.Widget>;
    wasShown(): void;
    private doShowPreview;
    private htmlPreview;
    createPreview(): Promise<UI.Widget.Widget>;
}
