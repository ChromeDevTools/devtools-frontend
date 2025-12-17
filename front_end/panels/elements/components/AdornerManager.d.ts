export declare const enum AdornerCategories {
    SECURITY = "Security",
    LAYOUT = "Layout",
    DEFAULT = "Default"
}
export interface AdornerSetting {
    adorner: string;
    isEnabled: boolean;
}
export type AdornerSettingsMap = Map<string, boolean>;
export interface RegisteredAdorner {
    readonly name: string;
    readonly category: AdornerCategories;
    readonly enabledByDefault: boolean;
}
export declare enum RegisteredAdorners {
    AD = "ad",
    CONTAINER = "container",
    FLEX = "flex",
    GRID = "grid",
    GRID_LANES = "grid-lanes",
    MEDIA = "media",
    POPOVER = "popover",
    REVEAL = "reveal",
    SCROLL = "scroll",
    SCROLL_SNAP = "scroll-snap",
    SLOT = "slot",
    VIEW_SOURCE = "view-source",
    STARTING_STYLE = "starting-style",
    SUBGRID = "subgrid",
    TOP_LAYER = "top-layer"
}
/**
 * This enum-like const object serves as the authoritative registry for all the
 * adorners available.
 **/
export declare function getRegisteredAdorner(which: RegisteredAdorners): RegisteredAdorner;
export declare const DefaultAdornerSettings: AdornerSetting[];
interface SettingStore<Setting> {
    get(): Setting;
    set(setting: Setting): void;
}
export declare class AdornerManager {
    #private;
    constructor(settingStore: SettingStore<AdornerSetting[]>);
    updateSettings(settings: AdornerSettingsMap): void;
    getSettings(): Readonly<AdornerSettingsMap>;
    isAdornerEnabled(adornerText: string): boolean;
}
/** Use idx + 1 for the order to avoid JavaScript's 0 == false issue **/
export declare const AdornerCategoryOrder: Map<AdornerCategories, number>;
export declare function compareAdornerNamesByCategory(nameA: string, nameB: string): number;
export {};
