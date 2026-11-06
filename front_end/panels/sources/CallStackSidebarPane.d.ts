import '../../ui/kit/kit.js';
import * as Platform from '../../core/platform/platform.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as StackTrace from '../../models/stack_trace/stack_trace.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface ViewInput {
    showIgnoreListMessage: boolean;
    showIgnoreListedChecked: boolean;
    onIgnoreListCheckboxChange: (checked: boolean) => void;
    notPaused: boolean;
    warnings?: string;
    items: Item[];
    selectedItem: Item | null;
    focusedItem: Item | null;
    showIgnoreListed: boolean;
    onItemClick: (item: Item) => void;
    onItemActivate: (item: Item) => void;
    onItemContextMenu: (item: Item, contextMenu: UI.ContextMenu.ContextMenu) => void;
    onItemKeyDown: (item: Item, direction: 'ArrowUp' | 'ArrowDown' | 'Home' | 'End') => void;
    showMore: boolean;
    onShowMore: () => void;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement | DocumentFragment) => void;
export declare const DEFAULT_VIEW: (input: ViewInput, _output: undefined, target: HTMLElement | DocumentFragment) => void;
export declare class CallStackSidebarPane extends UI.View.SimpleView<DocumentFragment> implements UI.ContextFlavorListener.ContextFlavorListener {
    #private;
    private maxAsyncStackChainDepth;
    constructor(element?: HTMLElement, view?: View);
    static instance(opts?: {
        forceNew: boolean | null;
    }): CallStackSidebarPane;
    wasShown(): void;
    flavorChanged(details: SDK.DebuggerModel.DebuggerPausedDetails | null): Promise<void>;
    performUpdate(): void;
    private updatedForTest;
    private activateItem;
    activeCallFrameItem(): Item | null;
    appendIgnoreListURLContextMenuItems(contextMenu: UI.ContextMenu.ContextMenu, uiSourceCode: Workspace.UISourceCode.UISourceCode): void;
    selectNextCallFrameOnStack(): void;
    selectPreviousCallFrameOnStack(): void;
    private copyStackTrace;
}
export declare const defaultMaxAsyncStackChainDepth = 32;
export declare class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(_context: UI.Context.Context, actionId: string): boolean;
}
export declare class Item {
    isIgnoreListed: boolean;
    title: string;
    linkText: string;
    uiLocation: Workspace.UISourceCode.UILocation | null;
    isAsyncHeader: boolean;
    /** Only set for synchronous frames */
    frame?: StackTrace.StackTrace.DebuggableFrame;
    static createForDebuggableFrame(frame: StackTrace.StackTrace.DebuggableFrame): Item;
    static createForFrame(frame: StackTrace.StackTrace.Frame): Item;
    static createForAsyncHeader(stackTrace: StackTrace.StackTrace.StackTrace, fragment: StackTrace.StackTrace.AsyncFragment): Item;
    private constructor();
}
export declare function convertMissingDebugInfo(missingDebugInfo: StackTrace.StackTrace.MissingDebugInfo, functionName: string | undefined): {
    details: Platform.UIString.LocalizedString;
    resources: SDK.DebuggerModel.MissingDebugFiles[];
};
