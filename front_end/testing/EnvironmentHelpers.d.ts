import * as Common from '../core/common/common.js';
import * as ProtocolClient from '../core/protocol_client/protocol_client.js';
import * as Root from '../core/root/root.js';
import * as SDK from '../core/sdk/sdk.js';
import type * as Protocol from '../generated/protocol.js';
import type * as UIModule from '../ui/legacy/legacy.js';
export declare function createTarget({ id, name, type, parentTarget, subtype, url, connection }?: {
    id?: Protocol.Target.TargetID;
    name?: string;
    type?: SDK.Target.Type;
    parentTarget?: SDK.Target.Target;
    subtype?: string;
    url?: string;
    connection?: ProtocolClient.CDPConnection.CDPConnection;
}): SDK.Target.Target;
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
