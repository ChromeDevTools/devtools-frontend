import * as Bindings from '../../models/bindings/bindings.js';
import type * as Workspace from '../../models/workspace/workspace.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface ViewInput {
    error: Bindings.SymbolizedError.SymbolizedError;
    ignoreListManager?: Workspace.IgnoreListManager.IgnoreListManager;
}
declare const DEFAULT_VIEW: (_input: ViewInput, _output: object, _target: HTMLElement) => void;
export declare class SymbolizedErrorWidget extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: typeof DEFAULT_VIEW);
    set ignoreListManager(ignoreListManager: Workspace.IgnoreListManager.IgnoreListManager);
    get ignoreListManager(): Workspace.IgnoreListManager.IgnoreListManager | undefined;
    set error(error: Bindings.SymbolizedError.SymbolizedError);
    get error(): Bindings.SymbolizedError.SymbolizedError | undefined;
    wasShown(): void;
    willHide(): void;
    performUpdate(): void;
}
export {};
