import * as Common from '../../core/common/common.js';
export declare class ResizerWidget extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    #private;
    constructor();
    isEnabled(): boolean;
    setEnabled(enabled: boolean): void;
    elements(): Element[];
    addElement(element: HTMLElement): void;
    removeElement(element: HTMLElement): void;
    updateElementCursors(): void;
    cursor(): string;
    setCursor(cursor: string): void;
    sendDragStart(x: number, y: number): void;
    sendDragMove(startX: number, currentX: number, startY: number, currentY: number, shiftKey: boolean): void;
}
export declare const enum Events {
    RESIZE_START = "ResizeStart",
    RESIZE_UPDATE_XY = "ResizeUpdateXY",
    RESIZE_UPDATE_POSITION = "ResizeUpdatePosition",
    RESIZE_END = "ResizeEnd"
}
export interface ResizeStartXYEvent {
    startX: number;
    currentX: number;
    startY: number;
    currentY: number;
}
export interface ResizeStartPositionEvent {
    startPosition: number;
    currentPosition: number;
}
export interface ResizeUpdateXYEvent {
    startX: number;
    currentX: number;
    startY: number;
    currentY: number;
    shiftKey: boolean;
}
export interface ResizeUpdatePositionEvent {
    startPosition: number;
    currentPosition: number;
    shiftKey: boolean;
}
export interface EventTypes {
    [Events.RESIZE_START]: ResizeStartXYEvent | ResizeStartPositionEvent;
    [Events.RESIZE_UPDATE_XY]: ResizeUpdateXYEvent;
    [Events.RESIZE_UPDATE_POSITION]: ResizeUpdatePositionEvent;
    [Events.RESIZE_END]: void;
}
export declare class SimpleResizerWidget extends ResizerWidget {
    #private;
    isVertical(): boolean;
    /**
     * Vertical widget resizes height (along y-axis).
     */
    setVertical(vertical: boolean): void;
    cursor(): string;
    sendDragStart(x: number, y: number): void;
    sendDragMove(startX: number, currentX: number, startY: number, currentY: number, shiftKey: boolean): void;
}
