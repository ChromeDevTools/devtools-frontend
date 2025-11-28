import '../../../kit/kit.js';
import { type TemplateResult } from '../../../lit/lit.js';
import { Provider } from './FilteredListWidget.js';
export declare class HelpQuickOpen extends Provider {
    private providers;
    constructor(jslogContext: string);
    private addProvider;
    itemCount(): number;
    itemKeyAt(itemIndex: number): string;
    itemScoreAt(itemIndex: number, _query: string): number;
    renderItem(itemIndex: number, _query: string): TemplateResult;
    jslogContextAt(itemIndex: number): string;
    selectItem(itemIndex: number | null, _promptValue: string): void;
}
