import { Provider } from './FilteredListWidget.js';
export declare class HelpQuickOpen extends Provider {
    private providers;
    constructor(jslogContext: string);
    private addProvider;
    itemCount(): number;
    itemKeyAt(itemIndex: number): string;
    itemScoreAt(itemIndex: number, _query: string): number;
    renderItem(itemIndex: number, _query: string, titleElement: Element, _subtitleElement: Element): void;
    jslogContextAt(itemIndex: number): string;
    selectItem(itemIndex: number | null, _promptValue: string): void;
    renderAsTwoRows(): boolean;
}
