import '../../../ui/components/tooltips/tooltips.js';
import * as CrUXManager from '../../../models/crux-manager/crux-manager.js';
import type * as Trace from '../../../models/trace/trace.js';
import * as UI from '../../../ui/legacy/legacy.js';
export type SubpartTable = Array<[string, Trace.Types.Timing.Milli, Trace.Types.Timing.Milli?]>;
type Metric = 'LCP' | 'CLS' | 'INP';
interface ViewInput {
    metric: 'LCP' | 'CLS' | 'INP';
    localValue?: number;
    fieldValue?: number;
    histogram?: CrUXManager.MetricResponse['histogram'];
    subparts?: SubpartTable;
    warnings?: string[];
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class MetricCard extends UI.Widget.VBox {
    #private;
    constructor(target?: HTMLElement, view?: View);
    get metric(): Metric;
    set metric(metric: Metric);
    get localValue(): number | undefined;
    set localValue(localValue: number | undefined);
    get fieldValue(): number | string | undefined;
    set fieldValue(fieldValue: number | string | undefined);
    get histogram(): CrUXManager.MetricResponse['histogram'] | undefined;
    set histogram(histogram: CrUXManager.MetricResponse['histogram'] | undefined);
    get subparts(): SubpartTable | undefined;
    set subparts(subparts: SubpartTable | undefined);
    get warnings(): string[] | undefined;
    set warnings(warnings: string[] | undefined);
    wasShown(): void;
    willHide(): void;
    performUpdate(): void;
}
export {};
