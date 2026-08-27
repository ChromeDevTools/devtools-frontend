import * as Common from '../../core/common/common.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import type { Plugin } from './Plugin.js';
declare const UISourceCodeFrame_base: import("../../core/platform/Constructor.js").Constructor<Common.EventTarget.EventTarget<EventTypes>, any[]> & typeof SourceFrame.SourceFrame.SourceFrameImpl;
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
