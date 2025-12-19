interface AdornerSetting {
    adorner: string;
    isEnabled: boolean;
}
type AdornerSettingsMap = Map<string, boolean>;
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
export {};
