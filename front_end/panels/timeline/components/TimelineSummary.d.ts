import * as UI from '../../../ui/legacy/legacy.js';
export interface CategoryData {
    value: number;
    color: string;
    title: string;
}
interface ViewInput {
    rangeStart: number;
    rangeEnd: number;
    total: number;
    categories: CategoryData[];
    isInAIWidget?: boolean;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const CATEGORY_SUMMARY_DEFAULT_VIEW: View;
export declare class CategorySummary extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set data(data: ViewInput);
    performUpdate(): void;
}
export {};
