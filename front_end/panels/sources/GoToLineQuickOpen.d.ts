import * as QuickOpen from '../../ui/legacy/components/quick_open/quick_open.js';
export declare class GoToLineQuickOpen extends QuickOpen.FilteredListWidget.Provider {
    #private;
    constructor();
    selectItem(_itemIndex: number | null, promptValue: string): void;
    itemCount(): number;
    renderItem(itemIndex: number, _query: string, titleElement: Element, _subtitleElement: Element): void;
    rewriteQuery(_query: string): string;
    queryChanged(query: string): void;
    notFoundText(_query: string): string;
    private parsePosition;
    private currentSourceFrame;
}
