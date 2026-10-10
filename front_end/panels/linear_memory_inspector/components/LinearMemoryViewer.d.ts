import * as UI from '../../../ui/legacy/legacy.js';
import type { HighlightInfo } from './LinearMemoryViewerUtils.js';
export interface ViewInput {
    memory: Uint8Array<ArrayBuffer>;
    address: number;
    memoryOffset: number;
    numRows: number;
    numBytesInRow: number;
    onKeyDown: (event: KeyboardEvent) => void;
    highlightInfo?: HighlightInfo;
    focusedMemoryHighlight?: HighlightInfo;
    onByteSelected?: (address: number) => void;
}
/** Dimensions of the rendered cells, used to compute how many rows and bytes per row fit. */
export interface LayoutMetrics {
    byteCellWidth: number;
    textCellWidth: number;
    dividerWidth: number;
    addressTextAndDividerWidth: number;
    rowHeight: number;
}
export interface ViewOutput {
    focusView?: () => void;
    measureLayout?: () => LayoutMetrics | undefined;
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare class LinearMemoryViewer extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set memory(memory: Uint8Array<ArrayBuffer>);
    set address(address: number);
    set memoryOffset(memoryOffset: number);
    /** Whether the viewer takes keyboard focus whenever it is updated. */
    set focusOnByte(focusOnByte: boolean);
    set highlightInfo(highlightInfo: HighlightInfo | undefined);
    set focusedMemoryHighlight(focusedMemoryHighlight: HighlightInfo | undefined);
    set onByteSelected(onByteSelected: ((address: number) => void) | undefined);
    set onNumBytesPerPageChanged(onNumBytesPerPageChanged: ((numBytesPerPage: number) => void) | undefined);
    wasShown(): void;
    willHide(): void;
    performUpdate(): void;
}
export declare const DEFAULT_VIEW: View;
