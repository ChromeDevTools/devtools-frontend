import '../../ui/legacy/legacy.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare class RequestPreviewView extends UI.Widget.VBox {
    request: SDK.NetworkRequest.NetworkRequest;
    private contentViewPromise;
    constructor(request: SDK.NetworkRequest.NetworkRequest);
    showPreview(): Promise<UI.Widget.Widget>;
    wasShown(): void;
    private doShowPreview;
    private htmlPreview;
    createPreview(): Promise<UI.Widget.Widget>;
}
