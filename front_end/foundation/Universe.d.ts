import * as Common from '../core/common/common.js';
import * as Root from '../core/root/root.js';
import * as SDK from '../core/sdk/sdk.js';
import * as AutofillManager from '../models/autofill_manager/autofill_manager.js';
export interface CreationOptions {
    settingsCreationOptions: Common.Settings.SettingsCreationOptions;
    overrideAutoStartModels?: Set<SDK.SDKModel.SDKModelConstructor>;
}
export declare class Universe {
    readonly context: Root.DevToolsContext.DevToolsContext;
    readonly autofillManager: AutofillManager.AutofillManager.AutofillManager;
    constructor(options: CreationOptions);
    get cpuThrottlingManager(): SDK.CPUThrottlingManager.CPUThrottlingManager;
    get pageResourceLoader(): SDK.PageResourceLoader.PageResourceLoader;
}
