export declare class DropTarget {
    private element;
    private readonly transferTypes;
    private messageText;
    private readonly handleDrop;
    private enabled;
    private dragMaskElement;
    constructor(element: HTMLElement, transferTypes: Array<{
        kind: string;
        type: RegExp;
    }>, messageText: string, handleDrop: (arg0: DataTransfer) => void);
    setEnabled(enabled: boolean): void;
    private onDragEnter;
    private hasMatchingType;
    private onDragOver;
    private onDrop;
    private onDragLeave;
    private removeMask;
}
export interface DropTargetType {
    kind: string;
    type: RegExp;
}
export declare const Type: Record<'URI' | 'Folder' | 'File' | 'WebFile' | 'ImageFile', DropTargetType>;
