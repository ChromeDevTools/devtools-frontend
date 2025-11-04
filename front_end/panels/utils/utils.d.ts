import '../../ui/components/icon_button/icon_button.js';
import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Workspace from '../../models/workspace/workspace.js';
import type * as Diff from '../../third_party/diff/diff.js';
import { type TemplateResult } from '../../ui/lit/lit.js';
/** These utilities are packaged in a class to allow unittests to stub or spy the implementation. **/
export declare class PanelUtils {
    static isFailedNetworkRequest(request: SDK.NetworkRequest.NetworkRequest | null): boolean;
    static getIconForNetworkRequest(request: SDK.NetworkRequest.NetworkRequest): TemplateResult;
    static iconDataForResourceType(resourceType: Common.ResourceType.ResourceType): {
        iconName: string;
        color?: string;
    };
    static getIconForSourceFile(uiSourceCode: Workspace.UISourceCode.UISourceCode): TemplateResult;
    static formatCSSChangesFromDiff(diff: Diff.Diff.DiffArray): Promise<string>;
    static highlightElement(element: HTMLElement): void;
}
