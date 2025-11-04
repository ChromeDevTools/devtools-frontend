import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare const i18nString: (id: string, values?: import("../../core/i18n/i18nTypes.js").Values | undefined) => Platform.UIString.LocalizedString;
interface ViewInput {
    hasReports: boolean;
    hasEndpoints: boolean;
    endpoints: Map<string, Protocol.Network.ReportingApiEndpoint[]>;
    reports: Protocol.Network.ReportingApiReport[];
    focusedReport?: Protocol.Network.ReportingApiReport;
    onReportSelected: (id: string) => void;
}
export declare const DEFAULT_VIEW: (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare class ReportingApiView extends UI.Widget.VBox implements SDK.TargetManager.SDKModelObserver<SDK.NetworkManager.NetworkManager> {
    #private;
    constructor(view?: (input: ViewInput, output: undefined, target: HTMLElement) => void);
    modelAdded(networkManager: SDK.NetworkManager.NetworkManager): void;
    modelRemoved(networkManager: SDK.NetworkManager.NetworkManager): void;
    performUpdate(): void;
}
export {};
