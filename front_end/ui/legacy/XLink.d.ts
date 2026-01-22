import * as Platform from '../../core/platform/platform.js';
import { XElement } from './XElement.js';
export declare class XLink extends XElement {
    #private;
    private clickable;
    private readonly onClick;
    private readonly onKeyDown;
    static create(url: string, linkText?: string, className?: string, preventClick?: boolean, jsLogContext?: string, tabindex?: string): HTMLElement;
    constructor();
    static get observedAttributes(): string[];
    get href(): Platform.DevToolsPath.UrlString | null;
    attributeChangedCallback(attr: string, oldValue: string | null, newValue: string | null): void;
    private updateClick;
}
