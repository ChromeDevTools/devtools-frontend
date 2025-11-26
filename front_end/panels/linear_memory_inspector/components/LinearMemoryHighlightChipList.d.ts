import '../../../ui/components/icon_button/icon_button.js';
import type { HighlightInfo } from './LinearMemoryViewerUtils.js';
export interface LinearMemoryHighlightChipListData {
    highlightInfos: HighlightInfo[];
    focusedMemoryHighlight?: HighlightInfo;
    jumpToAddress?: (address: number) => void;
    deleteHighlight?: (highlightInfo: HighlightInfo) => void;
}
export declare class LinearMemoryHighlightChipList extends HTMLElement {
    #private;
    set data(data: LinearMemoryHighlightChipListData);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-linear-memory-highlight-chip-list': LinearMemoryHighlightChipList;
    }
}
