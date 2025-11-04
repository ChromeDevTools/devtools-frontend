export declare const enum ResizerType {
    WIDTH = "width",
    HEIGHT = "height",
    BIDIRECTION = "bidirection"
}
export interface Draggable {
    type: ResizerType;
    initialWidth?: number;
    initialHeight?: number;
    update({ width, height }: {
        width?: number;
        height?: number;
    }): void;
}
export interface Delegate {
    getDraggable(x: number, y: number): Draggable | undefined;
}
export declare class DragResizeHandler {
    private document;
    private delegate;
    private originX?;
    private originY?;
    private boundMousemove;
    private boundMousedown;
    constructor(document: Document, delegate: Delegate);
    install(): void;
    uninstall(): void;
    /**
     * Updates the cursor style of the mouse is hovered over a resizeable area.
     */
    private onMousemove;
    /**
     * Starts dragging
     */
    private onMousedown;
    /**
     * Computes the new value while the cursor is being dragged and calls InspectorOverlayHost with the new value.
     */
    private onDrag;
}
