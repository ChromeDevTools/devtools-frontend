import type * as Common from '../core/common/common.js';
export declare class MockStore implements Common.Settings.SettingsBackingStore {
    #private;
    register(): void;
    set(key: string, value: string): void;
    get(key: string): any;
    remove(key: string): void;
    clear(): void;
}
