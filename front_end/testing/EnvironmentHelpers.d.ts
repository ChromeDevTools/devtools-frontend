import * as Common from '../core/common/common.js';
import * as Root from '../core/root/root.js';
import type * as UIModule from '../ui/legacy/legacy.js';
export { createTarget } from './TargetHelpers.js';
export { stubNoopSettings } from './SettingsHelpers.js';
export declare function registerActions(actions: UIModule.ActionRegistration.ActionRegistration[]): void;
export declare function registerNoopActions(actionIds: string[]): void;
export declare function initializeGlobalVars({ reset }?: {
    reset?: boolean | undefined;
}): Promise<void>;
export declare function deinitializeGlobalVars(): Promise<void>;
export declare function describeWithEnvironment(title: string, fn: (this: Mocha.Suite) => void, opts?: {
    reset: boolean;
}): Mocha.Suite;
export declare namespace describeWithEnvironment {
    var only: (title: string, fn: (this: Mocha.Suite) => void, opts?: {
        reset: boolean;
    }) => Mocha.Suite;
    var skip: (title: string, fn: (this: Mocha.Suite) => void, _opts?: {
        reset: boolean;
    }) => void | Mocha.Suite;
}
export declare function createFakeSetting<T>(name: string, defaultValue: T): Common.Settings.Setting<T>;
export declare function createFakeRegExpSetting(name: string, defaultValue: string): Common.Settings.RegExpSetting;
export declare function setupActionRegistry(): void;
/** This needs to be invoked within a describe block, rather than within an it() block. **/
export declare function expectConsoleLogs(expectedLogs: {
    warn?: string[];
    log?: string[];
    error?: string[];
}): void;
export declare function setUserAgentForTesting(): void;
export declare function restoreUserAgentForTesting(): void;
export declare function resetHostConfig(): void;
/**
 * Update `Root.Runtime.hostConfig` for testing.
 * `Root.Runtime.hostConfig` is automatically cleaned-up between unit
 * tests.
 */
export declare function updateHostConfig(config: Root.Runtime.HostConfig): void;
export declare function waitFor(selector: string, root?: Element | ShadowRoot): Promise<Element | null>;
