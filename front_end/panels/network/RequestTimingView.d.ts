import * as SDK from '../../core/sdk/sdk.js';
import * as NetworkTimeCalculator from '../../models/network_time_calculator/network_time_calculator.js';
import * as UI from '../../ui/legacy/legacy.js';
interface ViewInput {
    requestUnfinished: boolean;
    requestStartTime: number;
    requestIssueTime: number;
    totalDuration: number;
    startTime: number;
    endTime: number;
    timeRanges: NetworkTimeCalculator.RequestTimeRange[];
    calculator: NetworkTimeCalculator.NetworkTimeCalculator;
    serverTimings: SDK.ServerTiming.ServerTiming[];
    fetchDetails?: UI.TreeOutline.TreeOutlineInShadow;
    routerDetails?: UI.TreeOutline.TreeOutlineInShadow;
    wasThrottled?: SDK.NetworkManager.Conditions;
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class RequestTimingView extends UI.Widget.VBox {
    #private;
    constructor(target?: HTMLElement, view?: View);
    static create(request: SDK.NetworkRequest.NetworkRequest, calculator: NetworkTimeCalculator.NetworkTimeCalculator): RequestTimingView;
    performUpdate(): void;
    private onToggleFetchDetails;
    set request(request: SDK.NetworkRequest.NetworkRequest);
    set calculator(calculator: NetworkTimeCalculator.NetworkTimeCalculator);
    wasShown(): void;
    willHide(): void;
    private boundaryChanged;
}
export {};
