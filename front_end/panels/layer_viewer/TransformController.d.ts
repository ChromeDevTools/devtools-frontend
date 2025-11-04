import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as UI from '../../ui/legacy/legacy.js';
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
    private readonly controlPanelToolbar;
    private readonly modeButtons;
    /**
     * @param element The HTML element to apply transformations to.
     * @param disableRotate Optional. If true, pan and rotate will be disabled. Defaults to false.
     * @param preventDefaultOnMousedown Optional. If true, mousedown events will be prevented from their default behavior (including focus). Defaults to true.
     */
    constructor(element: HTMLElement, disableRotate?: boolean, preventDefaultOnMouseDown?: boolean);
    toolbar(): UI.Toolbar.Toolbar;
    private registerShortcuts;
    private postChangeEvent;
    private reset;
    private setMode;
    private updateModeButtons;
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
