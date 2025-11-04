import type * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
interface ViewInput {
    request: SDK.NetworkRequest.NetworkRequest;
    contentData: TextUtils.StreamingContentData.StreamingContentDataOrError;
    mimeType: string;
    renderAsText: boolean;
}
export interface ViewOutput {
    revealPosition: (position: SourceFrame.SourceFrame.RevealPosition) => Promise<void>;
}
type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class RequestResponseView extends UI.Widget.VBox {
    #private;
    request: SDK.NetworkRequest.NetworkRequest;
    constructor(request: SDK.NetworkRequest.NetworkRequest, view?: View);
    wasShown(): void;
    performUpdate(): Promise<void>;
    getMimeTypeForDisplay(): string;
    revealPosition(position: SourceFrame.SourceFrame.RevealPosition): Promise<void>;
}
export {};
