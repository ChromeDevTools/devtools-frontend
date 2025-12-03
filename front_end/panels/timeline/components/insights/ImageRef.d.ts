import type * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
interface ViewInput {
    request: Trace.Types.Events.SyntheticNetworkRequest;
    imageDataUrl: string | null;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare function imageRef(request: Trace.Types.Events.SyntheticNetworkRequest): Lit.TemplateResult;
export {};
