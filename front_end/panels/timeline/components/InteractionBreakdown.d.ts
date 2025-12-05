import type * as Trace from '../../../models/trace/trace.js';
import * as UI from '../../../ui/legacy/legacy.js';
interface ViewInput {
    entry: Trace.Types.Events.SyntheticInteractionPair;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class InteractionBreakdown extends UI.Widget.Widget {
    #private;
    static createWidgetElement(entry: Trace.Types.Events.SyntheticInteractionPair): UI.Widget.WidgetElement<InteractionBreakdown>;
    constructor(element?: HTMLElement, view?: View);
    set entry(entry: Trace.Types.Events.SyntheticInteractionPair);
    performUpdate(): void;
}
export {};
