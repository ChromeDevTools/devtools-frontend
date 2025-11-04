import type { FlameChart } from './FlameChart.js';
export declare class BrickBreaker extends HTMLElement {
    #private;
    private timelineFlameChart;
    constructor(timelineFlameChart: FlameChart);
    initButton(): void;
    connectedCallback(): void;
    disconnectedCallback(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'brick-breaker': BrickBreaker;
    }
}
