import type * as Buttons from '../../../components/buttons/buttons.js';
import { DataGridNode } from './DataGrid.js';
type ShowMoreDataGridNodeCallback = (arg0: number, arg1: number) => Promise<void>;
export declare class ShowMoreDataGridNode extends DataGridNode<ShowMoreDataGridNode> {
    #private;
    private readonly callback;
    private startPosition;
    private endPosition;
    private readonly chunkSize;
    showNext: Buttons.Button.Button;
    showAll: Buttons.Button.Button;
    showLast: Buttons.Button.Button;
    selectable: boolean;
    private hasCells?;
    constructor(callback: ShowMoreDataGridNodeCallback, startPosition: number, endPosition: number, chunkSize: number);
    private showNextChunk;
    private showLastChunk;
    private updateLabels;
    createCells(element: Element): void;
    createCell(columnIdentifier: string): HTMLElement;
    setStartPosition(from: number): void;
    setEndPosition(to: number): void;
    nodeSelfHeight(): number;
    dispose(): void;
}
export {};
