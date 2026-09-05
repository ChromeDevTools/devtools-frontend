import type * as SDK from '../../../../core/sdk/sdk.js';
import * as UI from '../../legacy.js';
import { ObjectTree } from './ObjectPropertiesSection.js';
export declare class CustomPreviewSection extends UI.Widget.Widget {
    #private;
    private cachedContent?;
    private headerJsonML?;
    private readonly view;
    constructor(element?: HTMLElement, view?: View);
    get object(): SDK.RemoteObject.RemoteObject | undefined;
    set object(object: SDK.RemoteObject.RemoteObject | undefined);
    get expanded(): boolean;
    set expanded(expanded: boolean);
    private parseHeader;
    performUpdate(): void;
    private toggleExpanded;
    private loadBody;
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
export interface CustomPreviewComponentViewInput {
    object?: SDK.RemoteObject.RemoteObject;
    expanded: boolean;
    disassembled: boolean;
    onContextMenu: (event: Event) => void;
}
export declare const CUSTOM_PREVIEW_COMPONENT_DEFAULT_VIEW: (input: CustomPreviewComponentViewInput, _output: undefined, target: HTMLElement | DocumentFragment) => void;
export type CustomPreviewComponentView = typeof CUSTOM_PREVIEW_COMPONENT_DEFAULT_VIEW;
export declare class CustomPreviewComponent extends UI.Widget.Widget<DocumentFragment> {
    #private;
    constructor(element?: HTMLElement, view?: CustomPreviewComponentView);
    get object(): SDK.RemoteObject.RemoteObject | undefined;
    set object(object: SDK.RemoteObject.RemoteObject | undefined);
    get expanded(): boolean;
    set expanded(expanded: boolean);
    wasShown(): void;
    performUpdate(): void;
}
