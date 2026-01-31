import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type LitTemplate } from '../../ui/lit/lit.js';
export declare class RequestPayloadView extends UI.Widget.VBox {
    private request;
    private decodeRequestParameters;
    private queryStringCategory;
    private formDataCategory;
    private requestPayloadCategory;
    constructor(request: SDK.NetworkRequest.NetworkRequest);
    wasShown(): void;
    willHide(): void;
    private addEntryContextMenuHandler;
    private refreshQueryString;
    private refreshFormData;
    private populateTreeElementWithSourceText;
    private refreshParams;
    static formatParameter(value: string, className: string, decodeParameters: boolean): LitTemplate;
    private populateTreeElementWithParsedParameters;
    private refreshRequestJSONPayload;
    private populateTreeElementWithObject;
    private createViewSourceToggle;
    private toggleURLDecoding;
}
export declare class Category extends UI.TreeOutline.TreeElement {
    toggleOnClick: boolean;
    private readonly expandedSetting;
    expanded: boolean;
    constructor(root: UI.TreeOutline.TreeOutline, name: string, title?: string);
    createLeaf(): UI.TreeOutline.TreeElement;
    onexpand(): void;
    oncollapse(): void;
}
