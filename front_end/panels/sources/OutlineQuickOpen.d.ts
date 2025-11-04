import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as QuickOpen from '../../ui/legacy/components/quick_open/quick_open.js';
export interface OutlineItem {
    title: string;
    lineNumber: number;
    columnNumber: number;
    subtitle?: string;
}
export declare function outline(state: CodeMirror.EditorState): OutlineItem[];
export declare class OutlineQuickOpen extends QuickOpen.FilteredListWidget.Provider {
    private items;
    private active;
    constructor();
    attach(): void;
    detach(): void;
    itemCount(): number;
    itemKeyAt(itemIndex: number): string;
    itemScoreAt(itemIndex: number, query: string): number;
    renderItem(itemIndex: number, query: string, titleElement: Element, _subtitleElement: Element): void;
    selectItem(itemIndex: number | null, _promptValue: string): void;
    private currentSourceFrame;
    notFoundText(): string;
}
