import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import { UISourceCodeFrame } from './UISourceCodeFrame.js';
interface ViewInput {
    onCopyWatchExpression(watchExpression: WatchExpression): void;
    onDeleteAll(): unknown;
    onAddExpression(): unknown;
    watchExpressions: WatchExpression[];
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class WatchExpressionsSidebarPane extends UI.Widget.VBox implements UI.ActionRegistration.ActionDelegate, UI.Toolbar.ItemsProvider {
    #private;
    private readonly addButton;
    private readonly refreshButton;
    private readonly linkifier;
    constructor();
    static instance(): WatchExpressionsSidebarPane;
    get watchExpressions(): WatchExpression[];
    toolbarItems(): UI.Toolbar.ToolbarItem[];
    private saveExpressions;
    private addButtonClicked;
    performUpdate(): Promise<void>;
    private createWatchExpression;
    private watchExpressionUpdated;
    private deleteAllButtonClicked;
    private focusAndAddExpressionToWatch;
    handleAction(_context: UI.Context.Context, _actionId: string): boolean;
    appendApplicableItems(_event: Event, contextMenu: UI.ContextMenu.ContextMenu, target: ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement | UISourceCodeFrame): void;
}
export declare class WatchExpression extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    #private;
    private nameElement;
    private valueElement;
    private element;
    private editing;
    private linkifier;
    private textPrompt?;
    private preventClickTimeout?;
    constructor(expression: string | null, expandController: ObjectUI.ObjectPropertiesSection.ObjectTreeExpansionTracker, linkifier: Components.Linkifier.Linkifier);
    get result(): SDK.RemoteObject.RemoteObject | null;
    get updateComplete(): Promise<void>;
    treeElement(): UI.TreeOutline.TreeElement;
    expression(): string | null;
    update(): void;
    startEditing(): void;
    isEditing(): boolean;
    private finishEditing;
    private dblClickOnWatchExpression;
    updateExpression(newExpression: string | null): void;
    private deleteWatchExpression;
    createWatchExpression(result?: SDK.RemoteObject.RemoteObject, exceptionDetails?: Protocol.Runtime.ExceptionDetails): Promise<void>;
    private createWatchExpressionHeader;
    private onSectionClick;
    private promptKeyDown;
    private static readonly watchObjectGroupId;
}
declare const enum Events {
    EXPRESSION_UPDATED = "ExpressionUpdated"
}
interface EventTypes {
    [Events.EXPRESSION_UPDATED]: WatchExpression;
}
export {};
