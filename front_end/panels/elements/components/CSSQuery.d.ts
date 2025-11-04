export interface CSSQueryData {
    queryPrefix: string;
    queryName?: string;
    queryText: string;
    onQueryTextClick?: (event: Event) => void;
    jslogContext: string;
}
export declare class CSSQuery extends HTMLElement {
    #private;
    set data(data: CSSQueryData);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-css-query': CSSQuery;
    }
}
