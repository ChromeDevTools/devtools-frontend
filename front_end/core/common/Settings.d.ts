import * as Platform from '../platform/platform.js';
import * as Root from '../root/root.js';
import type { EventDescriptor, EventTargetEvent, GenericEvents } from './EventTarget.js';
import { ObjectWrapper } from './Object.js';
import { getLocalizedSettingsCategory, type LearnMore, maybeRemoveSettingExtension, type RegExpSettingItem, registerSettingExtension, registerSettingsForTest, resetSettings, SettingCategory, type SettingExtensionOption, type SettingRegistration, SettingType } from './SettingRegistration.js';
export declare class Settings {
    #private;
    readonly syncedStorage: SettingsStorage;
    readonly globalStorage: SettingsStorage;
    readonly localStorage: SettingsStorage;
    settingNameSet: Set<string>;
    orderValuesBySettingCategory: Map<SettingCategory, Set<number>>;
    readonly moduleSettings: Map<string, Setting<unknown>>;
    private constructor();
    getRegisteredSettings(): SettingRegistration[];
    static hasInstance(): boolean;
    static instance(opts?: {
        forceNew: boolean | null;
        syncedStorage: SettingsStorage | null;
        globalStorage: SettingsStorage | null;
        localStorage: SettingsStorage | null;
        logSettingAccess?: (name: string, value: number | string | boolean) => Promise<void>;
    }): Settings;
    static removeInstance(): void;
    private registerModuleSetting;
    static normalizeSettingName(name: string): string;
    /**
     * Prefer a module setting if this setting is one that you might not want to
     * surface to the user to control themselves. Examples of these are settings
     * to store UI state such as how a user choses to position a split widget or
     * which panel they last opened.
     * If you are creating a setting that you expect the user to control, and
     * sync, prefer {@link Settings.createSetting}
     */
    moduleSetting<T = any>(settingName: string): Setting<T>;
    settingForTest(settingName: string): Setting<unknown>;
    /**
     * Get setting via key, and create a new setting if the requested setting does not exist.
     * @param key kebab-case string ID
     * @param defaultValue
     * @param storageType If not specified, SettingStorageType.GLOBAL is used.
     */
    createSetting<T>(key: string, defaultValue: T, storageType?: SettingStorageType): Setting<T>;
    createLocalSetting<T>(key: string, defaultValue: T): Setting<T>;
    createRegExpSetting(key: string, defaultValue: string, regexFlags?: string, storageType?: SettingStorageType): RegExpSetting;
    clearAll(): void;
    private storageFromType;
    getRegistry(): Map<string, Setting<unknown>>;
}
export interface SettingsBackingStore {
    register(setting: string): void;
    get(setting: string): Promise<string>;
    set(setting: string, value: string): void;
    remove(setting: string): void;
    clear(): void;
}
export declare const NOOP_STORAGE: SettingsBackingStore;
export declare class SettingsStorage {
    private object;
    private readonly backingStore;
    private readonly storagePrefix;
    constructor(object: Record<string, string>, backingStore?: SettingsBackingStore, storagePrefix?: string);
    register(name: string): void;
    set(name: string, value: string): void;
    has(name: string): boolean;
    get(name: string): string;
    forceGet(originalName: string): Promise<string>;
    remove(name: string): void;
    removeAll(): void;
    keys(): string[];
    dumpSizes(): void;
}
export declare class Deprecation {
    readonly disabled: boolean;
    readonly warning: Platform.UIString.LocalizedString;
    readonly experiment?: Root.Runtime.Experiment;
    constructor({ deprecationNotice }: SettingRegistration);
}
export declare class Setting<V> {
    #private;
    readonly name: string;
    readonly defaultValue: V;
    private readonly eventSupport;
    readonly storage: SettingsStorage;
    constructor(name: string, defaultValue: V, eventSupport: ObjectWrapper<GenericEvents>, storage: SettingsStorage, logSettingAccess?: (name: string, value: number | string | boolean) => Promise<void>);
    setSerializer(serializer: Serializer<unknown, V>): void;
    addChangeListener(listener: (arg0: EventTargetEvent<V>) => void, thisObject?: Object): EventDescriptor;
    removeChangeListener(listener: (arg0: EventTargetEvent<V>) => void, thisObject?: Object): void;
    title(): Platform.UIString.LocalizedString;
    setTitleFunction(titleFunction: (() => Platform.UIString.LocalizedString) | undefined): void;
    setTitle(title: Platform.UIString.LocalizedString): void;
    setRequiresUserAction(requiresUserAction: boolean): void;
    disabled(): boolean;
    disabledReasons(): Platform.UIString.LocalizedString[];
    setDisabled(disabled: boolean): void;
    get(): V;
    getIfNotDisabled(): V | undefined;
    forceGet(): Promise<V>;
    set(value: V): void;
    setRegistration(registration: SettingRegistration): void;
    type(): SettingType | null;
    options(): SimpleSettingOption[];
    reloadRequired(): boolean | null;
    category(): SettingCategory | null;
    tags(): string | null;
    order(): number | null;
    /**
     * See {@link LearnMore} for more info
     */
    learnMore(): LearnMore | null;
    get deprecation(): Deprecation | null;
    private printSettingsSavingError;
}
export declare class RegExpSetting extends Setting<any> {
    #private;
    constructor(name: string, defaultValue: string, eventSupport: ObjectWrapper<GenericEvents>, storage: SettingsStorage, regexFlags?: string, logSettingAccess?: (name: string, value: number | string | boolean) => Promise<void>);
    get(): string;
    getAsArray(): RegExpSettingItem[];
    set(value: string): void;
    setAsArray(value: RegExpSettingItem[]): void;
    asRegExp(): RegExp | null;
}
export declare class VersionController {
    #private;
    static readonly GLOBAL_VERSION_SETTING_NAME = "inspectorVersion";
    static readonly SYNCED_VERSION_SETTING_NAME = "syncedInspectorVersion";
    static readonly LOCAL_VERSION_SETTING_NAME = "localInspectorVersion";
    static readonly CURRENT_VERSION = 40;
    constructor();
    /**
     * Force re-sets all version number settings to the current version without
     * running any migrations.
     */
    resetToCurrent(): void;
    /**
     * Runs the appropriate migrations and updates the version settings accordingly.
     *
     * To determine what migrations to run we take the minimum of all version number settings.
     *
     * IMPORTANT: All migrations must be idempotent since they might be applied multiple times.
     */
    updateVersion(): void;
    private methodsToRunToUpdateVersion;
    updateVersionFrom0To1(): void;
    updateVersionFrom1To2(): void;
    updateVersionFrom2To3(): void;
    updateVersionFrom3To4(): void;
    updateVersionFrom4To5(): void;
    updateVersionFrom5To6(): void;
    updateVersionFrom6To7(): void;
    updateVersionFrom7To8(): void;
    updateVersionFrom8To9(): void;
    updateVersionFrom9To10(): void;
    updateVersionFrom10To11(): void;
    updateVersionFrom11To12(): void;
    updateVersionFrom12To13(): void;
    updateVersionFrom13To14(): void;
    updateVersionFrom14To15(): void;
    updateVersionFrom15To16(): void;
    updateVersionFrom16To17(): void;
    updateVersionFrom17To18(): void;
    updateVersionFrom18To19(): void;
    updateVersionFrom19To20(): void;
    updateVersionFrom20To21(): void;
    updateVersionFrom21To22(): void;
    updateVersionFrom22To23(): void;
    updateVersionFrom23To24(): void;
    updateVersionFrom24To25(): void;
    updateVersionFrom25To26(): void;
    updateVersionFrom26To27(): void;
    updateVersionFrom27To28(): void;
    updateVersionFrom28To29(): void;
    updateVersionFrom29To30(): void;
    updateVersionFrom30To31(): void;
    updateVersionFrom31To32(): void;
    updateVersionFrom32To33(): void;
    updateVersionFrom33To34(): void;
    updateVersionFrom34To35(): void;
    updateVersionFrom35To36(): void;
    updateVersionFrom36To37(): void;
    updateVersionFrom37To38(): void;
    updateVersionFrom38To39(): void;
    /**
     * There are two related migrations here for handling network throttling persistence:
     * 1. Go through all user custom throttling conditions and add a `key` property.
     * 2. If the user has a 'preferred-network-condition' setting, take the value
     *    of that and set the right key for the new 'active-network-condition-key'
     *    setting. Then, remove the now-obsolete 'preferred-network-condition'
     *    setting.
     */
    updateVersionFrom39To40(): void;
    private migrateSettingsFromLocalStorage;
    private clearBreakpointsWhenTooMany;
}
export declare const enum SettingStorageType {
    /** Persists with the active Chrome profile but also syncs the settings across devices via Chrome Sync. */
    SYNCED = "Synced",
    /**
     * Persists with the active Chrome profile, but not synchronized to other devices.
     * The default SettingStorageType of createSetting().
     */
    GLOBAL = "Global",
    /** Uses Window.localStorage. Not recommended, legacy. */
    LOCAL = "Local",
    /**
     * Session storage dies when DevTools window closes. Useful for atypical conditions that should be reverted when the
     * user is done with their task. (eg Emulation modes, Debug overlays). These are also not carried into/out of incognito
     */
    SESSION = "Session"
}
export declare function moduleSetting(settingName: string): Setting<unknown>;
export declare function settingForTest(settingName: string): Setting<unknown>;
export { getLocalizedSettingsCategory, maybeRemoveSettingExtension, RegExpSettingItem, registerSettingExtension, registerSettingsForTest, resetSettings, SettingCategory, SettingExtensionOption, SettingRegistration, SettingType, };
export interface Serializer<I, O> {
    stringify: (value: I) => string;
    parse: (value: string) => O;
}
export interface SimpleSettingOption {
    value: string | boolean;
    title: string;
    text?: string;
    raw?: boolean;
}
