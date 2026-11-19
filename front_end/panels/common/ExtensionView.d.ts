import type * as Extensions from '../../models/extensions/extensions.js';
import * as UI from '../../ui/legacy/legacy.js';
import type { ExtensionServer } from './ExtensionServer.js';
export interface ViewInput {
    src: string;
    className: string;
    onLoad: () => void;
}
export interface ViewOutput {
    getContentWindow?: () => Window | null;
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export interface ExtensionViewData {
    server?: ExtensionServer;
    id: string;
    src: string;
    className: string;
}
export interface ExtensionNotifierViewData {
    server?: ExtensionServer;
    id: string;
}
export declare const DEFAULT_VIEW: View;
export declare class ExtensionView extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set data({ server, id, src, className }: ExtensionViewData);
    performUpdate(): Promise<void> | void;
    wasShown(): void;
    willHide(): void;
    private onLoad;
}
export declare class ExtensionNotifierView extends UI.Widget.VBox {
    #private;
    set data({ server, id }: ExtensionNotifierViewData);
    wasShown(): void;
    willHide(): void;
}
export declare class ExtensionIframe {
    #private;
    constructor(descriptor: Extensions.RecorderPluginManager.ViewDescriptor);
    show(): void;
    hide(): void;
    frame(): HTMLIFrameElement;
}
