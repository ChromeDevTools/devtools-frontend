import type * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import type * as Foundation from '../../foundation/foundation.js';
import type { ViewLocationResolver } from './View.js';
import type { Widget } from './Widget.js';
export declare const enum ViewPersistence {
    CLOSEABLE = "closeable",
    PERMANENT = "permanent",
    TRANSIENT = "transient"
}
export declare const enum ViewLocationValues {
    PANEL = "panel",
    SETTINGS_VIEW = "settings-view",
    ELEMENTS_SIDEBAR = "elements-sidebar",
    SOURCES_SIDEBAR_BOTTOM = "sources.sidebar-bottom",
    NAVIGATOR_VIEW = "navigator-view",
    DRAWER_VIEW = "drawer-view",
    DRAWER_SIDEBAR = "drawer-sidebar",
    NETWORK_SIDEBAR = "network-sidebar",
    SOURCES_SIDEBAR_TOP = "sources.sidebar-top",
    SOURCES_SIDEBAR_TABS = "sources.sidebar-tabs"
}
export interface ViewRegistration {
    /**
     * The name of the experiment a view is associated with. Enabling and disabling the declared
     * experiment will enable and disable the view respectively.
     */
    experiment?: Root.Runtime.ExperimentName;
    /**
     * A condition is a function that will make the view available if it
     * returns true, and not available, otherwise. Make sure that objects you
     * access from inside the condition function are ready at the time when the
     * setting conditions are checked.
     */
    condition?: Root.Runtime.Condition;
    /**
     * The command added to the command menu used to show the view. It usually follows the shape Show <title> as it must
     * not be localized at declaration since it is localized internally when appending the commands to the command menu.
     * The existing duplication of the declaration of the title is expected to be removed once the migration to the version
     * 2 of the localization model has been completed (crbug.com/1136655).
     */
    commandPrompt: () => Platform.UIString.LocalizedString;
    /**
     * A UI string used as the title of the view.
     */
    title: () => Platform.UIString.LocalizedString;
    /**
     * Whether the view is permanently visible or can be opened temporarily.
     */
    persistence?: ViewPersistence;
    /**
     * Whether the view is a preview feature (a corresponding icon is shown then).
     */
    isPreviewFeature?: boolean;
    /**
     * Unique identifier of the view.
     */
    id: Lowercase<string>;
    /**
     * An identifier for the location of the view. The location is resolved by
     * an extension of type '@UI.ViewLocationResolver'.
     */
    location?: ViewLocationValues;
    /**
     * Whether the view has a toolbar.
     */
    hasToolbar?: boolean;
    /**
     * Returns an instance of the class that wraps the view.
     * The common pattern for implementing this function is loading the module with the wrapping 'Widget'
     * lazily loaded.
     * The DevTools universe is passed along, allowing `loadView` to retrieve necessary dependencies.
     * Prefer passing individual dependencies one by one instead of forwarding the full universe. This
     * makes testing easier.
     * As an example:
     *
     * ```js
     * let loadedElementsModule;
     *
     * async function loadElementsModule() {
     *
     *   if (!loadedElementsModule) {
     *     loadedElementsModule = await import('./elements.js');
     *   }
     *   return loadedElementsModule;
     * }
     * UI.ViewManager.registerViewExtension({
     *   <...>
     *   async loadView(universe) {
     *      const Elements = await loadElementsModule();
     *      const pageResourceLoader = universe.context.get(SDK.PageResourceLoader.PageResourceLoader);
     *      return new Elements.ElementsPanel.ElementsPanel(pageResourceLoader);
     *   },
     *   <...>
     * });
     * ```
     */
    loadView: (universe: Foundation.Universe.Universe) => Promise<Widget>;
    /**
     * Used to sort the views that appear in a shared location.
     */
    order?: number;
    /**
     * The names of the settings the registered view performs as UI for.
     */
    settings?: string[];
    /**
     * Words used to find the view in the Command Menu.
     */
    tags?: Array<() => Platform.UIString.LocalizedString>;
    /**
     * Icon to be used next to view's title.
     */
    iconName?: string;
    /**
     * Whether a view needs to be promoted. A new badge is shown next to the menu items then.
     */
    featurePromotionId?: string;
}
export declare function registerViewExtension(registration: ViewRegistration): void;
export declare function getRegisteredViewExtensions(): ViewRegistration[];
export declare function maybeRemoveViewExtension(viewId: string): boolean;
export declare function registerLocationResolver(registration: LocationResolverRegistration): void;
export declare function getRegisteredLocationResolvers(): LocationResolverRegistration[];
export declare function resetViewRegistration(): void;
export declare const enum ViewLocationCategory {
    NONE = "",// `NONE` must be a falsy value. Legacy code uses if-checks for the category.
    ELEMENTS = "ELEMENTS",
    DRAWER = "DRAWER",
    DRAWER_SIDEBAR = "DRAWER_SIDEBAR",
    PANEL = "PANEL",
    NETWORK = "NETWORK",
    SETTINGS = "SETTINGS",
    SOURCES = "SOURCES"
}
export declare function getLocalizedViewLocationCategory(category: ViewLocationCategory): Platform.UIString.LocalizedString;
export interface LocationResolverRegistration {
    name: ViewLocationValues;
    category: ViewLocationCategory;
    loadResolver: () => Promise<ViewLocationResolver>;
}
