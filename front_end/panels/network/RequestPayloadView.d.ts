import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type LitTemplate } from '../../ui/lit/lit.js';
interface ViewInput {
    decodeRequestParameters: boolean;
    setURLDecoding(value: boolean): void;
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
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class RequestPayloadView extends UI.Widget.VBox {
    #private;
    constructor(target?: HTMLElement, view?: View);
    set request(request: SDK.NetworkRequest.NetworkRequest);
    get request(): SDK.NetworkRequest.NetworkRequest | undefined;
    wasShown(): void;
    willHide(): void;
    private addEntryContextMenuHandler;
    performUpdate(): void;
    static formatParameter(value: string, className: string, decodeParameters: boolean): LitTemplate;
}
export {};
