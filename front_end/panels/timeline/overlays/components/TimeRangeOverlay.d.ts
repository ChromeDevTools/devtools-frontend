import type * as Trace from '../../../../models/trace/trace.js';
import * as UI from '../../../../ui/legacy/legacy.js';
export interface ViewInput {
    label: string;
    durationText: string;
    isLabelEditable: boolean;
    onLabelFocusOut: () => void;
    onLabelDblClick: () => void;
    onLabelKeyDown: (event: KeyboardEvent) => void;
    onLabelInput: () => void;
}
/**
 * Elements the view fills in through refs. The widget measures them to
 * position the label, and focuses the label box. They are undefined until the
 * first render.
 *
 * TODO(crbug.com/407941310): Replace these temporary raw element references
 * with view callbacks and declarative state in a follow-up CL.
 */
export interface ViewOutput {
    rangeContainer?: HTMLElement;
    labelBox?: HTMLElement;
    durationBox?: HTMLElement;
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
     * If the label is off to the left or right, we fix it to that corner and
     * align the text so the label is visible as long as possible.
     *
     * This runs synchronously, rather than through `requestUpdate()`, so that
     * `Overlays` can reposition the label in the same frame as the range.
     */
    updateLabelPositioning(): void;
    performUpdate(): void;
}
