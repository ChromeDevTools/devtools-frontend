import * as Platform from '../../core/platform/platform.js';
import * as DevToolsState from '../../models/devtools_state/devtools_state.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface Pill {
    /** Identifies the pill in the list of pills and in visual logging. */
    id: string;
    title: Platform.UIString.LocalizedString;
    resetTitle: Platform.UIString.LocalizedString;
    onReveal: () => void;
    onReset: () => void;
}
export interface ViewInput {
    pills: Pill[];
    visiblePillCount: number;
    showMoreMenuOpen: boolean;
    onResetAll: () => void;
    onShowMoreMenuOpen: () => void;
    onShowMoreMenuClosed: () => void;
}
export interface ViewOutput {
    containerWidth?: () => number;
    containerColumnGap?: () => number;
    pillsColumnGap?: () => number;
    pillWidths?: Array<() => number>;
    moreButtonWidth?: () => number;
    resetAllButtonWidth?: () => number;
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
/** Shows a pill for each state change in the status bar. The user can reveal or reset a change, or reset all changes. */
export declare class StateChangesStatusBarPills extends UI.Widget.Widget {
    #private;
    static readonly INJECT: readonly [typeof DevToolsState.StateManager.StateManager];
    constructor(element: HTMLElement | undefined, [stateManager]: UI.Widget.WidgetDependencies<typeof StateChangesStatusBarPills>, view?: View);
    wasShown(): void;
    willHide(): void;
    performUpdate(): void;
}
