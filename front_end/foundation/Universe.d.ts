import * as Common from '../core/common/common.js';
export interface CreationOptions {
    syncedStorage: Common.Settings.SettingsStorage;
    globalStorage: Common.Settings.SettingsStorage;
    localStorage: Common.Settings.SettingsStorage;
    logSettingAccess?: (name: string, value: number | string | boolean) => Promise<void>;
    runSettingsMigration?: boolean;
}
export declare class Universe {
    constructor(options: CreationOptions);
}
