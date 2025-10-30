import * as Platform from '../../core/platform/platform.js';
import type { TabbedPane } from './TabbedPane.js';
import type { ToolbarItem, ToolbarMenuButton } from './Toolbar.js';
import { VBox, type Widget, type WidgetOptions } from './Widget.js';
export interface View {
    viewId(): string;
    title(): Platform.UIString.LocalizedString;
    isCloseable(): boolean;
    isPreviewFeature(): boolean;
    iconName(): string | undefined;
    isTransient(): boolean;
    toolbarItems(): Promise<ToolbarItem[]>;
    widget(): Promise<Widget>;
    disposeView(): void | Promise<void>;
}
/**
 * Settings to control the behavior of `SimpleView` subclasses.
 */
export interface SimpleViewOptions extends WidgetOptions {
    /**
     * User visible title for the view.
     */
    title: Platform.UIString.LocalizedString;
    /**
     * Internal ID used to refer to the view.
     *
     * Note that this is also used to construct VE contexts in some places.
     *
     * Must be in extended kebab case.
     */
    viewId: Lowercase<string>;
}
export declare class SimpleView extends VBox implements View {
    #private;
    /**
     * Constructs a new `SimpleView` with the given `options`.
     *
     * @param options the settings for the resulting view.
     * @throws TypeError - if `options.viewId` is not in extended kebab case.
     */
    constructor(options: SimpleViewOptions);
    viewId(): string;
    title(): Platform.UIString.LocalizedString;
    isCloseable(): boolean;
    isTransient(): boolean;
    toolbarItems(): Promise<ToolbarItem[]>;
    widget(): Promise<Widget>;
    revealView(): Promise<void>;
    disposeView(): void;
    isPreviewFeature(): boolean;
    iconName(): string | undefined;
}
export interface ViewLocation {
    appendApplicableItems(locationName: string): void;
    appendView(view: View, insertBefore?: View | null): void;
    showView(view: View, insertBefore?: View | null, userGesture?: boolean): Promise<void>;
    removeView(view: View): void;
    isViewVisible(view: View): boolean;
    widget(): Widget;
}
export interface TabbedViewLocation extends ViewLocation {
    tabbedPane(): TabbedPane;
    enableMoreTabsButton(): ToolbarMenuButton;
}
export interface ViewLocationResolver {
    resolveLocation(location: string): ViewLocation | null;
}
