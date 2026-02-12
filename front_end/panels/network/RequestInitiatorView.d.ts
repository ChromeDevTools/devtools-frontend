import * as SDK from '../../core/sdk/sdk.js';
import * as Logs from '../../models/logs/logs.js';
import type * as StackTrace from '../../models/stack_trace/stack_trace.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface ViewInput {
    initiatorGraph: Logs.NetworkLog.InitiatorGraph;
    stackTrace: StackTrace.StackTrace.StackTrace | null;
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
    static createStackTracePreview(request: SDK.NetworkRequest.NetworkRequest, linkifier: Components.Linkifier.Linkifier, focusableLink?: boolean): Promise<{
        preview: Components.JSPresentationUtils.StackTracePreviewContent;
        stackTrace: StackTrace.StackTrace.StackTrace | null;
    } | null>;
    performUpdate(): Promise<void>;
    wasShown(): void;
}
export {};
