import type * as NetworkTimeCalculator from '../../../../models/network_time_calculator/network_time_calculator.js';
export declare class TimelineGrid {
    #private;
    element: HTMLDivElement;
    private readonly gridHeaderElement;
    private eventDividersElement;
    constructor();
    static calculateGridOffsets(calculator: NetworkTimeCalculator.Calculator, freeZoneAtLeft?: number): DividersData;
    static drawCanvasGrid(context: CanvasRenderingContext2D, dividersData: DividersData): void;
    static drawCanvasHeaders(context: CanvasRenderingContext2D, dividersData: DividersData, formatTimeFunction: (arg0: number) => string, paddingTop: number, headerHeight: number, freeZoneAtLeft?: number): void;
    get dividersElement(): HTMLElement;
    get dividersLabelBarElement(): HTMLElement;
    updateDividers(calculator: NetworkTimeCalculator.Calculator, freeZoneAtLeft?: number): boolean;
    addEventDividers(dividers: Element[]): void;
    removeEventDividers(): void;
    hideEventDividers(): void;
    showEventDividers(): void;
    setScrollTop(scrollTop: number): void;
}
export interface DividersData {
    offsets: Array<{
        position: number;
        time: number;
    }>;
    precision: number;
}
