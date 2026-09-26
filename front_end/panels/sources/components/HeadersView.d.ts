import * as Persistence from '../../../models/persistence/persistence.js';
import * as Workspace from '../../../models/workspace/workspace.js';
import * as UI from '../../../ui/legacy/legacy.js';
export interface WrapperViewInput {
    data: HeadersViewComponentData;
}
export interface WrapperViewOutput {
    component?: HeadersViewComponent;
}
export type WrapperView = (input: WrapperViewInput, output: WrapperViewOutput, target: HTMLElement) => void;
export declare const HEADERS_VIEW_DEFAULT_VIEW: WrapperView;
export declare class HeadersView extends UI.View.SimpleView {
    #private;
    constructor(uiSourceCode: Workspace.UISourceCode.UISourceCode, view?: WrapperView);
    performUpdate(): void;
    getComponent(): HeadersViewComponent;
    dispose(): void;
}
export interface HeadersViewComponentData {
    headerOverrides: Persistence.NetworkPersistenceManager.HeaderOverride[];
    uiSourceCode: Workspace.UISourceCode.UISourceCode;
    parsingError: boolean;
}
export declare class HeadersViewComponent extends HTMLElement {
    #private;
    constructor();
    set data(data: HeadersViewComponentData);
}
export interface ComponentViewInput {
    headerOverrides: Persistence.NetworkPersistenceManager.HeaderOverride[];
    parsingError: boolean;
    fileName: string;
    isDeletable: (blockIndex: number, headerIndex: number) => boolean;
}
export interface ComponentViewOutput {
    focusElement?: (blockIndex: number, headerIndex?: number) => void;
}
export declare const DEFAULT_VIEW: (input: ComponentViewInput, output: ComponentViewOutput, target: HTMLElement | DocumentFragment) => void;
declare global {
    interface HTMLElementTagNameMap {
        'devtools-sources-headers-view': HeadersViewComponent;
    }
}
