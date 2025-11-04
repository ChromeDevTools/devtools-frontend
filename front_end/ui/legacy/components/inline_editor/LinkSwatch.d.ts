export interface LinkSwatchRenderData {
    tooltip: {
        tooltipId: string;
    } | {
        title: string;
    } | undefined;
    text: string;
    isDefined: boolean;
    jslogContext?: string;
    onLinkActivate: (linkText: string) => void;
}
export declare class LinkSwatch extends HTMLElement {
    #private;
    protected onLinkActivate: (linkText: string, event: MouseEvent | KeyboardEvent) => void;
    connectedCallback(): void;
    set data(data: LinkSwatchRenderData);
    get linkElement(): HTMLElement | undefined;
    private render;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-link-swatch': LinkSwatch;
    }
}
