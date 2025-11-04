import * as Common from '../../core/common/common.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import type { Plugin } from './Plugin.js';
declare const UISourceCodeFrame_base: (new (...args: any[]) => {
    addEventListener<T extends Events.TOOLBAR_ITEMS_CHANGED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<EventTypes, T>;
    once<T extends Events.TOOLBAR_ITEMS_CHANGED>(eventType: T): Promise<EventTypes[T]>;
    removeEventListener<T extends Events.TOOLBAR_ITEMS_CHANGED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: Events.TOOLBAR_ITEMS_CHANGED): boolean;
    dispatchEventToListeners<T extends Events.TOOLBAR_ITEMS_CHANGED>(eventType: import("../../core/platform/TypescriptUtilities.js").NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<EventTypes, T>): void;
}) & typeof SourceFrame.SourceFrame.SourceFrameImpl;
export declare class UISourceCodeFrame extends UISourceCodeFrame_base {
    #private;
    private plugins;
    constructor(uiSourceCode: Workspace.UISourceCode.UISourceCode);
    private workingCopy;
    protected editorConfiguration(doc: string): CodeMirror.Extension;
    protected onFocus(): void;
    protected onBlur(): void;
    private installMessageAndDecorationListeners;
    uiSourceCode(): Workspace.UISourceCode.UISourceCode;
    setUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void;
    private unloadUISourceCode;
    private initializeUISourceCode;
    wasShown(): void;
    willHide(): void;
    protected getContentType(): string;
    private onNetworkPersistenceChanged;
    commitEditing(): void;
    setContent(content: string): Promise<void>;
    private createMessage;
    private allMessages;
    onTextChanged(): void;
    onWorkingCopyChanged(): void;
    private onWorkingCopyCommitted;
    private reloadPlugins;
    private onTitleChanged;
    static sourceFramePlugins(): Array<typeof Plugin>;
    private loadPlugins;
    private disposePlugins;
    private onBindingChanged;
    private reloadMessages;
    private updateStyle;
    private maybeSetContent;
    protected populateTextAreaContextMenu(contextMenu: UI.ContextMenu.ContextMenu, lineNumber: number, columnNumber: number): void;
    protected populateLineGutterContextMenu(contextMenu: UI.ContextMenu.ContextMenu, lineNumber: number): void;
    dispose(): void;
    private onMessageAdded;
    private onMessageRemoved;
    private onDecorationChanged;
    toolbarItems(): Promise<UI.Toolbar.ToolbarItem[]>;
    private getErrorPopoverContent;
}
export declare const enum Events {
    TOOLBAR_ITEMS_CHANGED = "ToolbarItemsChanged"
}
export interface EventTypes {
    [Events.TOOLBAR_ITEMS_CHANGED]: void;
}
export {};
