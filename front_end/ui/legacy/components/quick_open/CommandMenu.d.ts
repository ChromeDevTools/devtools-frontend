import * as Common from '../../../../core/common/common.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as UI from '../../legacy.js';
import { Provider } from './FilteredListWidget.js';
export declare class CommandMenu {
    #private;
    private constructor();
    static instance(opts?: {
        forceNew: boolean | null;
    }): CommandMenu;
    static createCommand(options: CreateCommandOptions): Command;
    static createSettingCommand<V>(setting: Common.Settings.Setting<V>, title: Common.UIString.LocalizedString, value: V): Command;
    static createActionCommand(options: ActionCommandOptions): Command;
    static createRevealViewCommand(options: RevealViewCommandOptions): Command;
    private loadCommands;
    commands(): Command[];
}
export interface ActionCommandOptions {
    action: UI.ActionRegistration.Action;
    userActionCode?: number;
}
export interface RevealViewCommandOptions {
    id: string;
    title: Common.UIString.LocalizedString;
    tags: string;
    category: UI.ViewManager.ViewLocationCategory;
    userActionCode?: number;
    featurePromotionId?: string;
}
export interface CreateCommandOptions {
    category: Platform.UIString.LocalizedString;
    keys: string;
    title: Common.UIString.LocalizedString;
    shortcut: string;
    jslogContext: string;
    executeHandler: () => void;
    availableHandler?: () => boolean;
    userActionCode?: number;
    deprecationWarning?: Platform.UIString.LocalizedString;
    isPanelOrDrawer?: PanelOrDrawer;
    featurePromotionId?: string;
}
export declare const enum PanelOrDrawer {
    PANEL = "PANEL",
    DRAWER = "DRAWER"
}
export declare class CommandMenuProvider extends Provider {
    private commands;
    constructor(commandsForTest?: Command[]);
    attach(): void;
    detach(): void;
    itemCount(): number;
    itemKeyAt(itemIndex: number): string;
    itemScoreAt(itemIndex: number, query: string): number;
    renderItem(itemIndex: number, query: string, wrapperElement: Element): void;
    jslogContextAt(itemIndex: number): string;
    selectItem(itemIndex: number | null, _promptValue: string): void;
    notFoundText(): string;
}
export declare class Command {
    #private;
    readonly category: Common.UIString.LocalizedString;
    readonly title: Common.UIString.LocalizedString;
    readonly key: string;
    readonly shortcut: string;
    readonly jslogContext: string;
    readonly deprecationWarning?: Platform.UIString.LocalizedString;
    readonly isPanelOrDrawer?: PanelOrDrawer;
    readonly featurePromotionId?: string;
    constructor(category: Common.UIString.LocalizedString, title: Common.UIString.LocalizedString, key: string, shortcut: string, jslogContext: string, executeHandler: () => unknown, availableHandler?: () => boolean, deprecationWarning?: Platform.UIString.LocalizedString, isPanelOrDrawer?: PanelOrDrawer, featurePromotionId?: string);
    available(): boolean;
    execute(): unknown;
}
export declare class ShowActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(_context: UI.Context.Context, _actionId: string): boolean;
}
