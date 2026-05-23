import './ContextMenu.js';
import type * as Platform from '../../core/platform/platform.js';
import type { ContextMenu, MenuButton } from './ContextMenu.js';
import type { View } from './View.js';
/** Declarative configuration for the plus button. */
export interface PlusButtonOptions {
    title?: Platform.UIString.LocalizedString;
    jslogContext?: string;
}
/**
 * Minimal `TabbedPane` surface read by the populator. Defined as an
 * interface so test doubles can satisfy it without an `as unknown as
 * TabbedPane` double-cast.
 */
export interface PlusButtonTabbedPane {
    element: HTMLElement;
    hiddenTabs(): ReadonlyArray<{
        id: string;
        title: string;
        jslogContext?: string;
    }>;
    hasTab(id: string): boolean;
    firstHiddenTabIndex(): number;
    moveTab(tabId: string, newIndex: number): void;
    selectTab(tabId: string, userGesture?: boolean, forceFocus?: boolean): boolean;
}
export interface PlusButtonMenuContext {
    tabbedPane: PlusButtonTabbedPane;
    location: string;
    /**
     * Production callers pass `() => location.views.values()` (NOT
     * `manager.viewsForLocation(location)`) so views moved in via
     * `appendView` are reflected immediately. Called fresh on every
     * menu open.
     */
    views: () => Iterable<View>;
    manager: {
        viewsForLocation(location: string): View[];
        moveView(viewId: string, locationName: string): void;
    };
    showView: (view: View) => void;
}
interface AddToolEntry {
    title: string;
    jslogContext: string;
    isPreviewFeature: boolean;
    action: () => void;
}
export interface OverflowTabModel {
    id: string;
    title: string;
    jslogContext?: string;
}
export interface PlusButtonMenuModel {
    overflowTabs: readonly OverflowTabModel[];
    addToolEntries: readonly AddToolEntry[];
}
/**
 * Presenter (MVP) for the plus-button menu. {@link buildModel} is called
 * fresh on every menu open so newly-registered views — or views that
 * just left the visible tab strip — are reflected immediately.
 */
export declare class PlusButtonPresenter {
    #private;
    constructor(context: PlusButtonMenuContext);
    buildModel(): PlusButtonMenuModel;
}
/**
 * Renders the plus-button menu by asking {@link PlusButtonPresenter}
 * for a model and pushing it into `contextMenu`. Overflowed tabs (in
 * tab order) come first, followed by deduplicated "add tool" entries
 * sorted alphabetically.
 */
export declare function populatePlusButtonMenu(contextMenu: ContextMenu, context: PlusButtonMenuContext): void;
/**
 * Reveals an overflowed tab and persists its new position via
 * `moveTab(firstHidden - 1)` so the tab stays in the visible region
 * after a reload — independent of any runtime `currentTab` /
 * `lastSelectedOverflowTab` priority logic. The previously-last-visible
 * tab is pushed to the start of the overflow region, matching the
 * intuition that the newly opened tab replaces the one the user
 * implicitly stopped using.
 *
 * Exported only for testing.
 */
export declare function revealOverflowTab(tabbedPane: PlusButtonTabbedPane, tabId: string): void;
interface PlusButtonViewInput {
    title: string;
    jslogContext: string;
    populateMenuCall: (menu: ContextMenu) => void;
}
/**
 * Standard `(input, output, target)` view function so `Lit.render` is
 * called inside a view (per `@devtools/no-lit-render-outside-of-view`).
 * `output.button` is captured via `ref` to avoid a `querySelector`
 * round-trip in {@link installPlusButton}.
 *
 * `slot` is set declaratively in the template so the attribute is
 * present on the very first connection — the first `slotchange` then
 * sees the button as the trailing-slot target and no extra layout pass
 * is needed.
 */
export declare const PLUS_BUTTON_VIEW: (input: PlusButtonViewInput, output: {
    button?: MenuButton;
}, target: HTMLElement) => void;
/**
 * Renders a `<devtools-menu-button>` configured as the plus button into
 * `tabbedPane`'s `trailing-button` slot and returns the slotted host.
 * The returned `MenuButton` is used by the next CL to toggle visibility
 * (e.g. when the drawer is minimized).
 */
export declare function installPlusButton(context: PlusButtonMenuContext, options?: PlusButtonOptions): MenuButton;
export {};
