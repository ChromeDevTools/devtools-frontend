import * as Common from '../../core/common/common.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import { UISourceCodeFrame } from './UISourceCodeFrame.js';
export declare class WatchExpressionsSidebarPane extends UI.Widget.VBox implements UI.ActionRegistration.ActionDelegate, UI.Toolbar.ItemsProvider, UI.ContextMenu.Provider<ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement | UISourceCodeFrame> {
    private watchExpressions;
    private emptyElement;
    private readonly watchExpressionsSetting;
    private readonly addButton;
    private readonly refreshButton;
    private readonly treeOutline;
    private readonly expandController;
    private readonly linkifier;
    private constructor();
    static instance(): WatchExpressionsSidebarPane;
    toolbarItems(): UI.Toolbar.ToolbarItem[];
    focus(): void;
    private saveExpressions;
    private addButtonClicked;
    performUpdate(): Promise<void>;
    private createWatchExpression;
    private watchExpressionUpdated;
    private contextMenu;
    private populateContextMenu;
    private deleteAllButtonClicked;
    private focusAndAddExpressionToWatch;
    handleAction(_context: UI.Context.Context, _actionId: string): boolean;
    appendApplicableItems(_event: Event, contextMenu: UI.ContextMenu.ContextMenu, target: ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement | UISourceCodeFrame): void;
}
export declare class WatchExpression extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    #private;
    private nameElement;
    private valueElement;
    private readonly expandController;
    private element;
    private editing;
    private linkifier;
    private textPrompt?;
    private result?;
    private preventClickTimeout?;
    constructor(expression: string | null, expandController: ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionsTreeExpandController, linkifier: Components.Linkifier.Linkifier);
    treeElement(): UI.TreeOutline.TreeElement;
    expression(): string | null;
    update(): void;
    startEditing(): void;
    isEditing(): boolean;
    private finishEditing;
    private dblClickOnWatchExpression;
    private updateExpression;
    private deleteWatchExpression;
    private createWatchExpression;
    private createWatchExpressionHeader;
    private createWatchExpressionTreeElement;
    private onSectionClick;
    private promptKeyDown;
    populateContextMenu(contextMenu: UI.ContextMenu.ContextMenu, event: Event): void;
    private copyValueButtonClicked;
    private static readonly watchObjectGroupId;
}
declare const enum Events {
    EXPRESSION_UPDATED = "ExpressionUpdated"
}
interface EventTypes {
    [Events.EXPRESSION_UPDATED]: WatchExpression;
}
export {};
