import './Toolbar.js';
import * as Common from '../../core/common/common.js';
import * as Root from '../../core/root/root.js';
import type * as Foundation from '../../foundation/foundation.js';
import { type TemplateResult } from '../lit/lit.js';
import * as PlusButton from './PlusButton.js';
import { TabbedPane } from './TabbedPane.js';
import { type ToolbarItem } from './Toolbar.js';
import type { TabbedViewLocation, View, ViewLocation } from './View.js';
import { getLocalizedViewLocationCategory, getRegisteredLocationResolvers, maybeRemoveViewExtension, registerLocationResolver, registerViewExtension, resetViewRegistration, ViewLocationCategory, ViewLocationValues, ViewPersistence, type ViewRegistration } from './ViewRegistration.js';
import { type AnyWidget, VBox, type Widget } from './Widget.js';
export declare const defaultOptionsForTabs: {
    security: boolean;
    freestyler: boolean;
};
type TabbedPaneFactory = () => TabbedPane;
export declare class PreRegisteredView implements View {
    private readonly viewRegistration;
    private readonly universe?;
    private widgetPromise;
    constructor(viewRegistration: ViewRegistration, universe?: Foundation.Universe.Universe);
    title(): Common.UIString.LocalizedString;
    commandPrompt(): Common.UIString.LocalizedString;
    isCloseable(): boolean;
    isPreviewFeature(): boolean;
    featurePromotionId(): string | undefined;
    iconName(): string | undefined;
    isTransient(): boolean;
    viewId(): string;
    location(): ViewLocationValues | undefined;
    order(): number | undefined;
    settings(): string[] | undefined;
    tags(): string | undefined;
    persistence(): ViewPersistence | undefined;
    toolbarItems(): Promise<ToolbarItem[] | TemplateResult>;
    widget(): Promise<AnyWidget>;
    disposeView(): Promise<void>;
    experiment(): string | undefined;
    condition(): Root.Runtime.Condition | undefined;
}
export declare const enum Events {
    VIEW_VISIBILITY_CHANGED = "ViewVisibilityChanged"
}
export interface ViewVisibilityEventData {
    location: string;
    revealedViewId: string | undefined;
    hiddenViewId: string | undefined;
}
export interface EventTypes {
    [Events.VIEW_VISIBILITY_CHANGED]: ViewVisibilityEventData;
}
export declare class ViewManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    readonly views: Map<string, View>;
    private readonly locationNameByViewId;
    private readonly locationOverrideSetting;
    private readonly preRegisteredViews;
    private constructor();
    static instance(opts?: {
        forceNew: boolean | null;
        universe?: Foundation.Universe.Universe;
    }): ViewManager;
    static removeInstance(): void;
    static createToolbar(toolbarItems: ToolbarItem[] | TemplateResult): Element | null;
    static setWidgetForView(view: View, widget: AnyWidget): void;
    getRegisteredViewExtensions(): PreRegisteredView[];
    locationNameForViewId(viewId: string): string;
    /**
     * Moves a view to a new location
     */
    moveView(viewId: string, locationName: string, options?: {
        shouldSelectTab: (boolean);
        overrideSaving: (boolean);
    }): void;
    revealView(view: View): Promise<void>;
    /**
     * Show view in location
     */
    showViewInLocation(viewId: string, locationName: string, shouldSelectTab?: boolean | undefined): void;
    view(viewId: string): View;
    materializedWidget<T extends HTMLElement | DocumentFragment = HTMLElement>(viewId: string): Widget<T> | null;
    hasView(viewId: string): boolean;
    showView(viewId: string, userGesture?: boolean, omitFocus?: boolean): Promise<void>;
    isViewVisible(viewId: string): boolean;
    resolveLocation(location?: string): Promise<Location | null>;
    createTabbedLocation(revealCallback: (() => void), location: string, restoreSelection?: boolean, allowReorder?: boolean, options?: TabbedLocationOptions): TabbedViewLocation;
    createStackLocation(revealCallback?: (() => void), location?: string, jslogContext?: string): StackLocation;
    hasViewsForLocation(location: string): boolean;
    viewsForLocation(location: string): View[];
}
export declare class ContainerWidget extends VBox {
    private readonly view;
    private materializePromise?;
    constructor(view: View);
    materialize(): Promise<void>;
    wasShown(): void;
    private wasShownForTest;
}
declare class Location {
    #private;
    protected readonly manager: ViewManager;
    private readonly revealCallback;
    constructor(manager: ViewManager, widget: AnyWidget, revealCallback?: (() => void));
    widget(): AnyWidget;
    reveal(): void;
    showView(_view: View, _insertBefore?: View | null, _userGesture?: boolean, _omitFocus?: boolean, _shouldSelectTab?: boolean): Promise<void>;
    removeView(_view: View): void;
    isViewVisible(_view: View): boolean;
}
export interface TabbedLocationOptions {
    defaultTab?: string | null;
    isLocationVisible?: () => boolean;
    tabbedPaneFactory?: TabbedPaneFactory;
    /**
     * Installed into the `TabbedPane`'s `trailing-button` slot before any
     * tabs are appended, so the very first layout pass reserves width for it.
     */
    plusButton?: PlusButton.PlusButtonOptions;
}
export declare class StackLocation extends Location implements ViewLocation {
    #private;
    private readonly stackedPane;
    private readonly location;
    constructor(manager: ViewManager, revealCallback?: (() => void), location?: string, jslogContext?: string, initialVisibility?: boolean);
    get expandableContainers(): Map<string, AnyWidget>;
    notifyVisibilityChanged(isVisible: boolean): void;
    appendView(view: View, insertBefore?: View | null): void;
    showView(view: View, insertBefore?: View | null): Promise<void>;
    removeView(view: View): void;
    isViewVisible(view: View): boolean;
    appendApplicableItems(locationName: string): void;
}
export { getLocalizedViewLocationCategory, getRegisteredLocationResolvers, maybeRemoveViewExtension, registerLocationResolver, registerViewExtension, resetViewRegistration, ViewLocationCategory, ViewLocationValues, ViewPersistence, ViewRegistration, };
