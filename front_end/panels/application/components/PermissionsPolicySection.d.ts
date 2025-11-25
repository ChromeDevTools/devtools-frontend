import '../../../ui/components/icon_button/icon_button.js';
import '../../../ui/components/report_view/report_view.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Protocol from '../../../generated/protocol.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { type TemplateResult } from '../../../ui/lit/lit.js';
export interface PermissionsPolicySectionData {
    policies: Protocol.Page.PermissionsPolicyFeatureState[];
    showDetails: boolean;
}
export declare function renderIconLink(iconName: string, title: Platform.UIString.LocalizedString, clickHandler: (() => void) | (() => Promise<void>), jsLogContext: string): TemplateResult;
interface ViewInput {
    allowed: Protocol.Page.PermissionsPolicyFeatureState[];
    disallowed: Array<{
        policy: Protocol.Page.PermissionsPolicyFeatureState;
        blockReason?: Protocol.Page.PermissionsPolicyBlockReason;
        linkTargetDOMNode?: SDK.DOMModel.DOMNode;
        linkTargetRequest?: SDK.NetworkRequest.NetworkRequest;
    }>;
    showDetails: boolean;
    onToggleShowDetails: () => void;
    onRevealDOMNode: (linkTargetDOMNode: SDK.DOMModel.DOMNode) => Promise<void>;
    onRevealHeader: (linkTargetRequest: SDK.NetworkRequest.NetworkRequest) => Promise<void>;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare class PermissionsPolicySection extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set policies(policies: Protocol.Page.PermissionsPolicyFeatureState[]);
    get policies(): Protocol.Page.PermissionsPolicyFeatureState[];
    set showDetails(showDetails: boolean);
    get showDetails(): boolean;
    performUpdate(): Promise<void>;
}
export {};
