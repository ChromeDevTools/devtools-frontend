import '../../ui/kit/kit.js';
import type * as Platform from '../../core/platform/platform.js';
import { VBox } from './Widget.js';
interface ViewInput {
    header: string;
    text: string;
    link?: Platform.DevToolsPath.UrlString | null;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare class EmptyWidget extends VBox {
    #private;
    constructor(headerOrElement: string | HTMLElement, text?: string, element?: HTMLElement, view?: View);
    set link(link: Platform.DevToolsPath.UrlString | undefined | null);
    set text(text: string);
    set header(header: string);
    performUpdate(): void;
}
export {};
