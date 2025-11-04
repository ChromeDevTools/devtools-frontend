import { Overlay } from './common.js';
interface WindowControlsOverlayConfig {
    selectedPlatform: string;
    themeColor: string;
}
export declare class WindowControlsOverlay extends Overlay {
    private windowsToolBar;
    private linuxToolBar;
    private macToolbarRight;
    private macToolbarLeft;
    constructor(window: Window, style?: CSSStyleSheet[]);
    install(): void;
    uninstall(): void;
    drawWindowControlsOverlay(config: WindowControlsOverlayConfig): void;
    clearOverlays(): void;
}
export {};
