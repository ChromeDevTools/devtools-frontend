interface SrgbOverlayProps {
    hue: number;
    width: number;
    height: number;
}
export declare class SrgbOverlay extends HTMLElement {
    #private;
    render({ hue, width, height }: SrgbOverlayProps): Promise<void>;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-spectrum-srgb-overlay': SrgbOverlay;
    }
}
export {};
