import * as Common from '../core/common/common.js';
import * as Root from '../core/root/root.js';
import * as SDK from '../core/sdk/sdk.js';
export interface CreationOptions {
    settingsCreationOptions: Common.Settings.SettingsCreationOptions;
    overrideAutoStartModels?: Set<SDK.SDKModel.SDKModelConstructor>;
}
export declare class Universe {
    readonly context: Root.DevToolsContext.DevToolsContext;
    constructor(options: CreationOptions);
}
