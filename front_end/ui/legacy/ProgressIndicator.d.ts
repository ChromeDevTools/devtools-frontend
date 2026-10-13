import type * as Common from '../../core/common/common.js';
export declare class ProgressIndicator extends HTMLElement implements Common.Progress.Progress {
    #private;
    static readonly observedAttributes: readonly ['label', 'total-work', 'worked'];
    constructor();
    attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void;
    connectedCallback(): void;
    set done(done: boolean);
    get done(): boolean;
    set canceled(value: boolean);
    get canceled(): boolean;
    set title(title: string);
    get title(): string;
    set totalWork(totalWork: number);
    get totalWork(): number;
    set worked(worked: number);
    get worked(): number;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-progress': ProgressIndicator;
    }
}
