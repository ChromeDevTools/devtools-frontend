import '../../ui/kit/kit.js';
import type * as Platform from '../../core/platform/platform.js';
import { VBox } from './Widget.js';
interface ViewInput {
    header: string;
    text: string;
    link?: Platform.DevToolsPath.UrlString | null;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement | DocumentFragment) => void;
export declare class EmptyWidget extends VBox<ShadowRoot> {
    #private;
    constructor(headerOrElement: string | HTMLElement, text?: string, element?: HTMLElement, view?: View);
    get link(): Platform.DevToolsPath.UrlString | undefined | null;
    set link(link: Platform.DevToolsPath.UrlString | undefined | null);
    get text(): string;
    set text(text: string);
    get header(): string;
    set header(header: string);
    performUpdate(): void;
}
export {};
