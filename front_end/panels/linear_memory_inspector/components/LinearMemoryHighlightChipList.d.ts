import '../../../ui/kit/kit.js';
import * as UI from '../../../ui/legacy/legacy.js';
import type { HighlightInfo } from './LinearMemoryViewerUtils.js';
interface ViewInput {
    highlightInfos: HighlightInfo[];
    focusedMemoryHighlight?: HighlightInfo;
    onJumpToAddress: (address: number) => void;
    onDeleteHighlight: (highlightInfo: HighlightInfo) => void;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare class LinearMemoryHighlightChipList extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set highlightInfos(highlightInfos: HighlightInfo[]);
    get highlightInfos(): HighlightInfo[];
    set focusedMemoryHighlight(focusedMemoryHighlight: HighlightInfo | undefined);
    get focusedMemoryHighlight(): HighlightInfo | undefined;
    set jumpToAddress(jumpToAddress: (address: number) => void);
    get jumpToAddress(): (address: number) => void;
    set deleteHighlight(deleteHighlight: (highlightInfo: HighlightInfo) => void);
    get deleteHighlight(): (highlightInfo: HighlightInfo) => void;
    performUpdate(): void;
}
export {};
