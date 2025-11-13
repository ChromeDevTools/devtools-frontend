import * as Common from '../core/common/common.js';
import * as Root from '../core/root/root.js';
export interface CreationOptions {
    settingsCreationOptions: Common.Settings.SettingsCreationOptions;
}
export declare class Universe {
    readonly context: Root.DevToolsContext.DevToolsContext;
    constructor(options: CreationOptions);
}
