import * as UI from '../../ui/legacy/legacy.js';
import type { ExtensionServer } from './ExtensionServer.js';
interface ViewInput {
    src: string;
    className: string;
    onLoad: () => void;
}
interface ViewOutput {
    iframe?: HTMLIFrameElement;
}
export declare class ExtensionView extends UI.Widget.Widget {
    #private;
    constructor(server: ExtensionServer, id: string, src: string, className: string, view?: (input: ViewInput, output: ViewOutput, target: HTMLElement) => void);
    performUpdate(): Promise<void> | void;
    wasShown(): void;
    willHide(): void;
    private onLoad;
}
export declare class ExtensionNotifierView extends UI.Widget.VBox {
    private readonly server;
    private readonly id;
    constructor(server: ExtensionServer, id: string);
    wasShown(): void;
    willHide(): void;
}
export {};
