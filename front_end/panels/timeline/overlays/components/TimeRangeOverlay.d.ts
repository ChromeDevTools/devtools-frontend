import type * as Trace from '../../../../models/trace/trace.js';
import * as UI from '../../../../ui/legacy/legacy.js';
export interface ViewInput {
    label: string;
    durationText: string;
    isLabelEditable: boolean;
    onLabelFocusOut: () => void;
    onLabelDblClick: () => void;
    onLabelEditComplete: () => void;
    onLabelInput: (label: string) => void;
}
export interface PositionLabelOptions {
    /**
     * The bounds of the flame chart canvas that the label must stay within.
     */
    canvasRect: DOMRect;
    /**
     * Whether to hide the label if the range is too narrow: that is, if the
     * visible part of the range is not wider than the duration text.
     */
    hideLabelIfTooNarrow: boolean;
}
/**
 * Callbacks the view fills in when it renders.
 */
export interface ViewOutput {
    focusLabel: () => void;
    /**
     * Moves the label as required to keep it on screen, and hides it if the
     * visible part of the range is too narrow. Returns true once the label has
     * been measured, including when it is hidden. Returns false, without
     * changing anything, if the duration text has no width to measure against,
     * or if the view has not rendered yet.
     */
    positionLabel: (options: PositionLabelOptions) => boolean;
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class TimeRangeOverlay extends UI.Widget.Widget {
    #private;
    /**
     * Called with the new label whenever the user edits it.
     */
    onLabelChange: (label: string) => void;
    /**
     * Called when the user presses Enter or Escape while the label is empty,
     * which removes the time range.
     */
    onRemove: () => void;
    constructor(element?: HTMLElement, view?: View);
    /**
     * Sets the label text. A non-empty label makes the label non-editable until
     * the user double clicks it. An empty label makes it editable.
     */
    set label(label: string);
    set canvasRect(rect: DOMRect | null);
    set duration(duration: Trace.Types.Timing.Micro | null);
    /**
     * We use this method after the overlay has been positioned in order to move
     * the label as required to keep it on screen.
     *
     * This runs synchronously, rather than through `requestUpdate()`, so that
     * `Overlays` can reposition the label in the same frame as the range. The
     * current state is passed to the view as arguments, rather than through the
     * view input, because the last render may not include it yet.
     */
    updateLabelPositioning(): void;
    performUpdate(): void;
}
