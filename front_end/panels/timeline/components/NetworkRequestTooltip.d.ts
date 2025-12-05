import '../../../ui/kit/kit.js';
import * as Trace from '../../../models/trace/trace.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
interface ViewInput {
    networkRequest: Trace.Types.Events.SyntheticNetworkRequest;
    entityMapper?: Trace.EntityMapper.EntityMapper;
    throttlingTitle?: string;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class NetworkRequestTooltip extends UI.Widget.Widget {
    #private;
    static createWidgetElement(request: Trace.Types.Events.SyntheticNetworkRequest, entityMapper?: Trace.EntityMapper.EntityMapper): UI.Widget.WidgetElement<NetworkRequestTooltip>;
    constructor(element?: HTMLElement, view?: View);
    set networkRequest(networkRequest: Trace.Types.Events.SyntheticNetworkRequest);
    set entityMapper(entityMapper: Trace.EntityMapper.EntityMapper | undefined);
    static renderPriorityValue(networkRequest: Trace.Types.Events.SyntheticNetworkRequest): Lit.TemplateResult;
    static renderTimings(networkRequest: Trace.Types.Events.SyntheticNetworkRequest): Lit.TemplateResult | null;
    static renderRedirects(networkRequest: Trace.Types.Events.SyntheticNetworkRequest): Lit.TemplateResult | null;
    performUpdate(): void;
}
export {};
