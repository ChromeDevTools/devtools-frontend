export type PathCommands = Array<string | number>;
export interface Quad {
    p1: Position;
    p2: Position;
    p3: Position;
    p4: Position;
}
export interface Position {
    x: number;
    y: number;
}
export interface Bounds {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width?: number;
    height?: number;
    allPoints: Position[];
}
export interface AreaBounds {
    name: string;
    bounds: {
        allPoints: Position[];
    };
}
interface ViewportSize {
    width: number;
    height: number;
}
export interface ResetData {
    viewportSize: ViewportSize;
    viewportSizeForMediaQueries?: ViewportSize;
    deviceScaleFactor: number;
    pageScaleFactor: number;
    pageZoomFactor: number;
    emulationScaleFactor: number;
    scrollX: number;
    scrollY: number;
}
/**
 * Overlay class should be used to implement various tools and provide
 * access to globals via the window object it receives in the constructor.
 * Old logic is kept temporarily while the tools are being migrated.
 **/
export declare class Overlay {
    protected viewportSize: {
        width: number;
        height: number;
    };
    protected viewportSizeForMediaQueries?: ViewportSize;
    protected deviceScaleFactor: number;
    protected emulationScaleFactor: number;
    protected pageScaleFactor: number;
    protected pageZoomFactor: number;
    protected scrollX: number;
    protected scrollY: number;
    protected style: CSSStyleSheet[];
    protected canvas?: HTMLCanvasElement;
    protected canvasWidth: number;
    protected canvasHeight: number;
    protected platform?: string;
    private _window?;
    private _document?;
    private _context?;
    private _installed;
    constructor(window: Window, style?: CSSStyleSheet[]);
    setCanvas(canvas: HTMLCanvasElement): void;
    install(): void;
    uninstall(): void;
    reset(resetData?: ResetData): void;
    resetCanvas(): void;
    setPlatform(platform: string): void;
    dispatch(message: unknown[]): void;
    eventHasCtrlOrMeta(event: KeyboardEvent): boolean;
    get context(): CanvasRenderingContext2D;
    get document(): Document;
    get window(): Window;
    get installed(): boolean;
}
export declare function log(text: string): void;
export declare function createChild(parent: HTMLElement, tagName: string, className?: string): HTMLElement;
export declare function createTextChild(parent: HTMLElement, text: string): Text;
export declare function createElement(tagName: string, className?: string): HTMLElement;
export declare function ellipsify(str: string, maxLength: number): string;
export declare function constrainNumber(num: number, min: number, max: number): number;
declare global {
    interface Document {
        adoptedStyleSheets: CSSStyleSheet[];
    }
}
export declare function adoptStyleSheet(styleSheet: CSSStyleSheet): void;
export {};
