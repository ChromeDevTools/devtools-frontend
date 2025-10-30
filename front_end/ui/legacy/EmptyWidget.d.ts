import type * as Platform from '../../core/platform/platform.js';
import { VBox } from './Widget.js';
interface EmptyWidgetInput {
    header: string;
    text: string;
    link?: Platform.DevToolsPath.UrlString | undefined | null;
    extraElements?: Element[];
}
interface EmptyWidgetOutput {
    contentElement: Element | undefined;
}
type View = (input: EmptyWidgetInput, output: EmptyWidgetOutput, target: HTMLElement) => void;
export declare class EmptyWidget extends VBox {
    #private;
    constructor(headerOrElement: string | HTMLElement, text?: string, element?: HTMLElement, view?: View);
    set link(link: Platform.DevToolsPath.UrlString | undefined | null);
    set text(text: string);
    set header(header: string);
    performUpdate(): void;
}
export {};
