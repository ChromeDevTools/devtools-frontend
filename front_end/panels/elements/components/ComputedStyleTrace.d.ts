export interface ComputedStyleTraceData {
    selector: string;
    active: boolean;
    onNavigateToSource: (event?: Event) => void;
    ruleOriginNode?: Node;
}
export declare class ComputedStyleTrace extends HTMLElement {
    #private;
    set data(data: ComputedStyleTraceData);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-computed-style-trace': ComputedStyleTrace;
    }
}
