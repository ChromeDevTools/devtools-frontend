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
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const CATEGORY_SUMMARY_DEFAULT_VIEW: View;
export declare class CategorySummary extends UI.Widget.Widget {
    #private;
    constructor(view?: View);
    set total(total: number);
    set rangeStart(rangeStart: number);
    set rangeEnd(rangeEnd: number);
    set categories(categories: CategoryData[]);
    performUpdate(): void;
}
export {};
