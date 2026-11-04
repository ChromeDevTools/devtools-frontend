import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface ViewInput {
    disableRotate: boolean;
    mode: Modes;
    onSetMode: (mode: Modes) => void;
    onReset: () => void;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class TransformController extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    #private;
    private mode;
    private oldRotateX;
    private oldRotateY;
    private originX;
    private originY;
    element: HTMLElement;
    private minScale;
    private maxScale;
    /**
     * @param element The HTML element to apply transformations to.
     * @param disableRotate Optional. If true, pan and rotate will be disabled.
     *     Defaults to false.
     * @param preventDefaultOnMousedown Optional. If true, mousedown events will
     *     be prevented from their default behavior (including focus). Defaults to
     *     true.
     */
    constructor(element: HTMLElement, disableRotate?: boolean, preventDefaultOnMouseDown?: boolean, view?: View);
    toolbar(): UI.Toolbar.Toolbar;
    private registerShortcuts;
    private postChangeEvent;
    private reset;
    private setMode;
    resetAndNotify(event?: Event): void;
    setScaleConstraints(minScale: number, maxScale: number): void;
    clampOffsets(minX: number, maxX: number, minY: number, maxY: number): void;
    scale(): number;
    offsetX(): number;
    offsetY(): number;
    rotateX(): number;
    rotateY(): number;
    private onScale;
    private onPan;
    private onRotate;
    private onKeyboardZoom;
    private onKeyboardPanOrRotate;
    private onMouseWheel;
    private onDrag;
    private onDragStart;
    private onDragEnd;
}
export declare const enum Events {
    TRANSFORM_CHANGED = "TransformChanged"
}
export interface EventTypes {
    [Events.TRANSFORM_CHANGED]: void;
}
export declare const enum Modes {
    PAN = "Pan",
    ROTATE = "Rotate"
}
