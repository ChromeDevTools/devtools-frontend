import type * as Protocol from '../../generated/protocol.js';
import * as ObjectUI from '../../ui/legacy/components/object_ui/object_ui.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type TemplateResult } from '../../ui/lit/lit.js';
import { UISourceCodeFrame } from './UISourceCodeFrame.js';
interface ViewInput {
    linkifier: Components.Linkifier.Linkifier;
    onFinishEditing(watchExpression: WatchExpression, detail: string | null): void;
    onStartEditing(watchExpression: WatchExpression): void;
    onDelete(watchExpression: WatchExpression): void;
    onCopyWatchExpression(watchExpression: WatchExpression): void;
    onDeleteAll(): unknown;
    onAddExpression(): unknown;
    onExpand(e: WatchExpression, expanded: boolean): unknown;
    watchExpressions: WatchExpression[];
}
type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class WatchExpressionsSidebarPane extends UI.Widget.VBox implements UI.ActionRegistration.ActionDelegate, UI.Toolbar.ItemsProvider {
    #private;
    private readonly linkifier;
    constructor();
    static instance(): WatchExpressionsSidebarPane;
    get watchExpressions(): WatchExpression[];
    toolbarItems(): TemplateResult;
    private saveExpressions;
    private addButtonClicked;
    private refreshButtonClicked;
    performUpdate(): Promise<void>;
    handleAction(_context: UI.Context.Context, _actionId: string): boolean;
    appendApplicableItems(_event: Event, contextMenu: UI.ContextMenu.ContextMenu, target: ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement | UISourceCodeFrame): void;
}
export declare class WatchExpression {
    #private;
    editing: boolean;
    get exceptionDetails(): Protocol.Runtime.ExceptionDetails | undefined;
    get result(): ObjectUI.ObjectPropertiesSection.ObjectTree | undefined;
    get expression(): string | null;
    setExpression(expression: string, expandController: ObjectUI.ObjectPropertiesSection.ObjectTreeExpansionTracker): Promise<void>;
    private static readonly watchObjectGroupId;
}
export {};
