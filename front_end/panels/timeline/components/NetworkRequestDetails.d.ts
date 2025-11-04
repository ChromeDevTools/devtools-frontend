import '../../../ui/components/request_link_icon/request_link_icon.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Trace from '../../../models/trace/trace.js';
import * as LegacyComponents from '../../../ui/legacy/components/utils/utils.js';
import * as UI from '../../../ui/legacy/legacy.js';
export declare class NetworkRequestDetails extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: (input: ViewInput, output: object, target: HTMLElement) => void);
    set linkifier(linkifier: LegacyComponents.Linkifier.Linkifier | null);
    set parsedTrace(parsedTrace: Trace.TraceModel.ParsedTrace | null);
    set target(maybeTarget: SDK.Target.Target | null);
    set request(event: Trace.Types.Events.SyntheticNetworkRequest);
    set entityMapper(mapper: Trace.EntityMapper.EntityMapper | null);
    performUpdate(): Promise<void> | void;
}
export interface ViewInput {
    request: Trace.Types.Events.SyntheticNetworkRequest | null;
    target: SDK.Target.Target | null;
    previewElementsCache: WeakMap<Trace.Types.Events.SyntheticNetworkRequest, HTMLElement>;
    entityMapper: Trace.EntityMapper.EntityMapper | null;
    serverTimings: SDK.ServerTiming.ServerTiming[] | null;
    linkifier: LegacyComponents.Linkifier.Linkifier | null;
    parsedTrace: Trace.TraceModel.ParsedTrace | null;
}
export declare const DEFAULT_VIEW: (input: ViewInput, output: object, target: HTMLElement) => void;
