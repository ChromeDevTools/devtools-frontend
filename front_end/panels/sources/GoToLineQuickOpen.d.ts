import '../../ui/kit/kit.js';
import * as QuickOpen from '../../ui/legacy/components/quick_open/quick_open.js';
import { type TemplateResult } from '../../ui/lit/lit.js';
export declare class GoToLineQuickOpen extends QuickOpen.FilteredListWidget.Provider {
    #private;
    constructor();
    selectItem(_itemIndex: number | null, promptValue: string): void;
    itemCount(): number;
    renderItem(itemIndex: number, _query: string): TemplateResult;
    rewriteQuery(_query: string): string;
    queryChanged(query: string): void;
    notFoundText(_query: string): string;
    private parsePosition;
    private currentSourceFrame;
}
