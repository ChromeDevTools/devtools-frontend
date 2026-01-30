import '../../ui/legacy/components/data_grid/data_grid.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
interface ViewInput {
    deviceBoundSessionUsages: Protocol.Network.DeviceBoundSessionWithUsage[];
}
type ViewOutput = object;
export declare const DEFAULT_VIEW: (input: ViewInput, _output: ViewOutput, target: HTMLElement) => void;
export declare class RequestDeviceBoundSessionsView extends UI.Widget.VBox {
    #private;
    constructor(request: SDK.NetworkRequest.NetworkRequest, view?: typeof DEFAULT_VIEW);
    wasShown(): void;
    willHide(): void;
    performUpdate(): void;
}
export {};
