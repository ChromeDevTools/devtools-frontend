import type * as TextUtils from '../../../../models/text_utils/text_utils.js';
import * as UI from '../../legacy.js';
import { type ColumnDescriptor, type ResizeMethod } from './DataGrid.js';
/**
 * A data grid (table) element that can be used as progressive enhancement over a <table> element.
 *
 * It can be used as
 * ```
 * <devtools-data-grid striped name=${'Display Name'}>
 *   <table>
 *     <tr>
 *       <th id="column-1">Column 1</th>
 *       <th id="column-2">Column 2</th>
 *     </tr>
 *     <tr>
 *       <td>Value 1</td>
 *       <td>Value 2</td>
 *     </tr>
 *   </table>
 * </devtools-data-grid>
 * ```
 * where a row with <th> configures the columns and rows with <td> provide the data.
 *
 * Under the hood it uses SortableDataGrid, which extends ViewportDataGrid so only
 * visible rows are layed out and sorting is provided out of the box.
 *
 * @property filters Set of text filters to be applied to the data grid.
 * @attribute inline If true, the data grid will render inline instead of taking a full container height.
 * @attribute resize Column resize method, one of 'nearest' (default), 'first' or 'last'.
 * @attribute striped If true, the data grid will have striped rows.
 * @attribute displayName
 */
declare class DataGridElement extends UI.UIUtils.HTMLElementWithLightDOMTemplate {
    #private;
    static readonly observedAttributes: string[];
    constructor();
    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void;
    set striped(striped: boolean);
    get striped(): boolean;
    set inline(striped: boolean);
    get inline(): boolean;
    set displayName(displayName: string);
    get displayName(): string | null;
    set resizeMethod(resizeMethod: ResizeMethod);
    get resizeMethod(): ResizeMethod;
    set filters(filters: TextUtils.TextUtils.ParsedFilter[]);
    get columns(): ColumnDescriptor[];
    addNodes(nodes: NodeList): void;
    removeNodes(nodes: NodeList): void;
    updateNode(node: Node, attributeName: string | null): void;
    onChange(mutationList: MutationRecord[]): void;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void, options?: boolean | AddEventListenerOptions | undefined): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions | undefined): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-data-grid': DataGridElement;
    }
}
export interface DataGridInternalToken {
    token: 'DataGridInternalToken';
}
export {};
