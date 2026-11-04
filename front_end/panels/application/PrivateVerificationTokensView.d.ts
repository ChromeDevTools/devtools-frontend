import '../../ui/legacy/components/data_grid/data_grid.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
/**
 * Presentation model for a single token row. All values are pre-formatted by
 * the presenter so that the view is a pure projection of its input.
 */
export interface TokenRow {
    id: string;
    issuerOrigin: Platform.DevToolsPath.UrlString;
    isIssuer: boolean;
    isRedeemer: boolean;
    keyId: number;
    expiration: string;
    creationTime: string;
    version: number;
    token: string;
}
export interface ViewInput {
    tokens: TokenRow[];
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class PrivateVerificationTokensView extends UI.Widget.VBox implements SDK.TargetManager.SDKModelObserver<SDK.PrivateVerificationTokensModel.PrivateVerificationTokensModel> {
    #private;
    constructor(element?: HTMLElement, view?: View);
    wasShown(): void;
    willHide(): void;
    modelAdded(model: SDK.PrivateVerificationTokensModel.PrivateVerificationTokensModel): void;
    modelRemoved(model: SDK.PrivateVerificationTokensModel.PrivateVerificationTokensModel): void;
    performUpdate(signal?: AbortSignal): Promise<void>;
}
export {};
