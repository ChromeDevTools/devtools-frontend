import type * as TextUtils from '../../../../models/text_utils/text_utils.js';
import * as Lit from '../../../lit/lit.js';
import * as UI from '../../legacy.js';
import { type ColumnDescriptor, type ResizeMethod } from './DataGrid.js';
export declare class DataGridElement extends UI.UIUtils.HTMLElementWithLightDOMTemplate {
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
    addNodes(nodes: NodeList | Node[]): void;
    removeNodes(nodes: NodeList | Node[]): void;
    updateNode(node: Node, attributeName: string | null): void;
    deselectRow(): void;
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
declare class IfExpandedDirective extends Lit.Directive.Directive {
    #private;
    constructor(partInfo: Lit.Directive.PartInfo);
    render(content: Lit.LitTemplate | Iterable<Lit.LitTemplate>): Lit.LitTemplate | Iterable<Lit.LitTemplate>;
}
export declare const ifExpanded: (content: Lit.LitTemplate | Iterable<Lit.LitTemplate>) => Lit.DirectiveResult<typeof IfExpandedDirective>;
export {};
