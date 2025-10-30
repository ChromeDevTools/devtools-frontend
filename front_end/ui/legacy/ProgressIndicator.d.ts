import type * as Common from '../../core/common/common.js';
export declare class ProgressIndicator extends HTMLElement implements Common.Progress.Progress {
    #private;
    constructor();
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
