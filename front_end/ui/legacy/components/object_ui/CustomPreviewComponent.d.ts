import type * as SDK from '../../../../core/sdk/sdk.js';
import * as UI from '../../legacy.js';
import { ObjectTree } from './ObjectPropertiesSection.js';
export declare class CustomPreviewSection extends UI.Widget.Widget {
    #private;
    private expanded;
    private cachedContent?;
    private headerJsonML?;
    private readonly view;
    constructor(element?: HTMLElement, view?: View);
    get object(): SDK.RemoteObject.RemoteObject | undefined;
    set object(object: SDK.RemoteObject.RemoteObject | undefined);
    private parseHeader;
    performUpdate(): void;
    private toggleExpanded;
    private toggleExpand;
    loadBody(): Promise<void>;
}
export interface ViewInput {
    object?: SDK.RemoteObject.RemoteObject;
    headerJsonML?: unknown;
    expanded: boolean;
    cachedContent?: unknown | ObjectTree | null;
    toggleExpanded: () => void;
}
export declare const DEFAULT_VIEW: (input: ViewInput, _output: undefined, target: HTMLElement) => void;
export type View = typeof DEFAULT_VIEW;
export declare class CustomPreviewComponent {
    private readonly object;
    private customPreviewSection;
    element: HTMLSpanElement;
    constructor(object: SDK.RemoteObject.RemoteObject);
    expandIfPossible(): Promise<void>;
    private contextMenuEventFired;
    private disassemble;
}
