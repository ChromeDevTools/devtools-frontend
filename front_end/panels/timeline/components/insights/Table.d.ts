import type * as Trace from '../../../../models/trace/trace.js';
import * as Lit from '../../../../ui/lit/lit.js';
import type * as BaseInsightComponent from './BaseInsightComponent.js';
export declare const i18nString: (id: string, values?: import("../../../../core/i18n/i18nTypes.js").Values | undefined) => import("../../../../core/platform/UIString.js").LocalizedString;
type BaseInsightComponent = BaseInsightComponent.BaseInsightComponent<Trace.Insights.Types.InsightModel>;
/**
 * @file An interactive table component.
 *
 * On hover:
 *           desaturates the relevant events (in both the minimap and the flamegraph), and
 *           replaces the current insight's overlays with the overlays attached to that row.
 *           The currently selected trace bounds does not change.
 *
 *           Removing the mouse from the table without clicking on any row restores the original
 *           overlays.
 *
 * On click:
 *           "sticks" the selection, replaces overlays like hover does, and additionally updates
 *           the current trace bounds to fit the bounds of the row's overlays.
 */
export interface TableState {
    selectedRowEl: HTMLElement | null;
    selectionIsSticky: boolean;
}
export interface TableData {
    insight: BaseInsightComponent;
    headers: string[];
    rows: TableDataRow[];
}
export interface TableDataRow {
    values: Array<number | string | Lit.LitTemplate>;
    overlays?: Trace.Types.Overlays.Overlay[];
    subRows?: TableDataRow[];
}
export declare function renderOthersLabel(numOthers: number): string;
export interface RowLimitAggregator<T> {
    mapToRow: (item: T) => TableDataRow;
    createAggregatedTableRow: (remaining: T[]) => TableDataRow;
}
/**
 * Maps `arr` to a list of `TableDataRow`s  using `aggregator.mapToRow`, but limits the number of `TableDataRow`s to `limit`.
 * If the length of `arr` is larger than `limit`, any excess rows will be aggregated into the final `TableDataRow` using `aggregator.createAggregatedTableRow`.
 *
 * Useful for creating a "N others" row in a data table.
 *
 * Example: `arr` is a list of 15 items & `limit` is 10. The first 9 items in `arr` would be mapped to `TableDataRow`s using `aggregator.mapToRow` and
 * the 10th `TableDataRow` would be created by using `aggregator.createAggregatedTableRow` on the 6 items that were not sent through `aggregator.mapToRow`.
 */
export declare function createLimitedRows<T>(arr: T[], aggregator: RowLimitAggregator<T>, limit?: number): TableDataRow[];
export declare class Table extends HTMLElement {
    #private;
    set data(data: TableData);
    connectedCallback(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-performance-table': Table;
    }
}
export {};
