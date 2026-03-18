import type * as Lit from '../../../ui/lit/lit.js';
export interface ComputedStyleTraceData {
    selector: string;
    active: boolean;
    onNavigateToSource: (event?: Event) => void;
    ruleOriginNode?: Lit.LitTemplate;
}
export declare class ComputedStyleTrace extends HTMLElement {
    #private;
    connectedCallback(): void;
    set data(data: ComputedStyleTraceData);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-computed-style-trace': ComputedStyleTrace;
    }
}
