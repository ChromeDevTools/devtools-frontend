import { Overlay } from './common.js';
export interface ScreenshotToolMessage {
    x: number;
    y: number;
    width: number;
    height: number;
}
export declare class ScreenshotOverlay extends Overlay {
    private zone;
    constructor(window: Window, style?: CSSStyleSheet[]);
    install(): void;
    uninstall(): void;
    onMouseDown(event: MouseEvent): void;
    onMouseUp(event: MouseEvent): void;
    onMouseMove(event: MouseEvent): void;
    onKeyDown(event: KeyboardEvent): void;
    updateZone(): void;
}
