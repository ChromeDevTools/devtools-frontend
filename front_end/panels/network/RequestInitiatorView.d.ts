import * as SDK from '../../core/sdk/sdk.js';
import * as Logs from '../../models/logs/logs.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface ViewInput {
    initiatorGraph: Logs.NetworkLog.InitiatorGraph;
    hasStackTrace: boolean;
    request: SDK.NetworkRequest.NetworkRequest;
    linkifier: Components.Linkifier.Linkifier;
    target?: SDK.Target.Target;
}
export declare const DEFAULT_VIEW: (input: ViewInput, _output: undefined, target: HTMLElement) => void;
type View = typeof DEFAULT_VIEW;
export declare class RequestInitiatorView extends UI.Widget.VBox {
    #private;
    private readonly linkifier;
    private readonly request;
    constructor(request: SDK.NetworkRequest.NetworkRequest, view?: View);
    static createStackTracePreview(request: SDK.NetworkRequest.NetworkRequest, linkifier: Components.Linkifier.Linkifier, focusableLink?: boolean): Components.JSPresentationUtils.StackTracePreviewContent | null;
    performUpdate(): void;
    wasShown(): void;
}
export {};
