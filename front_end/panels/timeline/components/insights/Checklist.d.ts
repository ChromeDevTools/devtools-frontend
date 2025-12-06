/**
 * @file A list of pass/fail conditions for an insight.
 */
import '../../../../ui/kit/kit.js';
import type * as Trace from '../../../../models/trace/trace.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import * as Lit from '../../../../ui/lit/lit.js';
interface ViewInput {
    checklist: GenericChecklist;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
type GenericChecklist = Trace.Insights.Types.Checklist<any>;
export interface ChecklistData {
    checklist: GenericChecklist;
}
export interface TableDataRow {
    values: Array<number | string | Lit.LitTemplate>;
    overlays?: Trace.Types.Overlays.Overlay[];
}
export declare class Checklist extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set checklist(checklist: GenericChecklist);
    performUpdate(): void;
}
export {};
