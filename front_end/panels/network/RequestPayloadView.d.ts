import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type LitTemplate } from '../../ui/lit/lit.js';
export interface ViewInput {
    decodeQueryParameters: boolean;
    setDecodeQueryParameters(value: boolean): void;
    decodeFormParameters: boolean;
    setDecodeFormParameters(value: boolean): void;
    viewQueryParamSource: boolean;
    setViewQueryParamSource(value: boolean): void;
    viewFormParamSource: boolean;
    setViewFormParamSource(value: boolean): void;
    viewJSONPayloadSource: boolean;
    setViewJSONPayloadSource(value: boolean): void;
    copyValue(value: string): void;
    formData: string | undefined;
    formParameters: SDK.NetworkRequest.NameValue[] | undefined;
    queryString: string | null;
    queryParameters: SDK.NetworkRequest.NameValue[] | null;
    objectTree: ObjectUI.ObjectPropertiesSection.ObjectTree | null;
    onPayloadContextMenu(contextMenu: UI.ContextMenu.ContextMenu): void;
    onPayloadToggle(expanded: boolean): void;
    /** Raw binary content data for the request body (when base64-encoded by backend). */
    binaryPayloadContentData: TextUtils.ContentData.ContentData | null;
    requestUrl: Platform.DevToolsPath.UrlString;
}
export type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class RequestPayloadView extends UI.Widget.VBox {
    #private;
    constructor(target?: HTMLElement, view?: View);
    set request(request: SDK.NetworkRequest.NetworkRequest);
    get request(): SDK.NetworkRequest.NetworkRequest | undefined;
    get refreshFormDataPromiseForTest(): Promise<void>;
    wasShown(): void;
    willHide(): void;
    private addEntryContextMenuHandler;
    performUpdate(): void;
    static formatParameter(value: string, className: string, decodeParameters: boolean): LitTemplate;
}
