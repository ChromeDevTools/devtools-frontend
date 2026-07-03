import * as Common from '../core/common/common.js';
import * as Root from '../core/root/root.js';
import * as SDK from '../core/sdk/sdk.js';
import * as AutofillManager from '../models/autofill_manager/autofill_manager.js';
import * as Breakpoints from '../models/breakpoints/breakpoints.js';
import * as Persistence from '../models/persistence/persistence.js';
import * as ProjectSettings from '../models/project_settings/project_settings.js';
export interface CreationOptions {
    settingsCreationOptions: Common.Settings.SettingsCreationOptions;
    overrideAutoStartModels?: Set<SDK.SDKModel.SDKModelConstructor>;
    hostConfig: Root.Runtime.HostConfig;
}
export declare class Universe {
    readonly context: Root.DevToolsContext.DevToolsContext;
    readonly autofillManager: AutofillManager.AutofillManager.AutofillManager;
    constructor(options: CreationOptions);
    get breakpointManager(): Breakpoints.BreakpointManager.BreakpointManager;
    get cpuThrottlingManager(): SDK.CPUThrottlingManager.CPUThrottlingManager;
    get domDebuggerManager(): SDK.DOMDebuggerModel.DOMDebuggerManager;
    get pageResourceLoader(): SDK.PageResourceLoader.PageResourceLoader;
    get persistence(): Persistence.Persistence.PersistenceImpl;
    get projectSettingsModel(): ProjectSettings.ProjectSettingsModel.ProjectSettingsModel;
}
