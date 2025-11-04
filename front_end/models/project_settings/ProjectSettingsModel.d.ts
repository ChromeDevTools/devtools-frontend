import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import type * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
/**
 * The structure of the project settings.
 *
 * @see https://goo.gle/devtools-json-design
 */
export interface ProjectSettings {
    readonly workspace?: {
        readonly root: Platform.DevToolsPath.RawPathString;
        readonly uuid: string;
    };
}
/**
 * Indicates the availability of the project settings feature.
 *
 * `'available'` means that the feature is enabled, the origin of the inspected
 * page is `localhost`. It doesn't however indicate whether or not the page is
 * actually providing a `com.chrome.devtools.json` or not.
 */
export type ProjectSettingsAvailability = 'available' | 'unavailable';
export declare class ProjectSettingsModel extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    #private;
    /**
     * Yields the availability of the project settings feature.
     *
     * `'available'` means that the feature is enabled, the origin of the inspected
     * page is `localhost`. It doesn't however indicate whether or not the page is
     * actually providing a `com.chrome.devtools.json` or not.
     *
     * @returns `'available'` if the feature is enabled and the inspected page is
     *         `localhost`, otherwise `'unavailable'`.
     */
    get availability(): ProjectSettingsAvailability;
    /**
     * Yields the current project settings.
     *
     * @returns the current project settings.
     */
    get projectSettings(): ProjectSettings;
    get projectSettingsPromise(): Promise<ProjectSettings>;
    private constructor();
    /**
     * Yields the `ProjectSettingsModel` singleton.
     *
     * @returns the singleton.
     */
    static instance({ forceNew, hostConfig, pageResourceLoader, targetManager }: {
        forceNew: boolean | null;
        hostConfig: Root.Runtime.HostConfig | null;
        pageResourceLoader: SDK.PageResourceLoader.PageResourceLoader | null;
        targetManager: SDK.TargetManager.TargetManager | null;
    }): ProjectSettingsModel;
    /**
     * Clears the `ProjectSettingsModel` singleton (if any).
     */
    static removeInstance(): void;
}
/**
 * Events emitted by the `ProjectSettingsModel`.
 */
export declare const enum Events {
    /**
     * Emitted whenever the `availability` property of the
     * `ProjectSettingsModel` changes.
     */
    AVAILABILITY_CHANGED = "AvailabilityChanged",
    /**
     * Emitted whenever the `projectSettings` property of the
     * `ProjectSettingsModel` changes.
     */
    PROJECT_SETTINGS_CHANGED = "ProjectSettingsChanged"
}
/**
 * @internal
 */
export interface EventTypes {
    [Events.AVAILABILITY_CHANGED]: ProjectSettingsAvailability;
    [Events.PROJECT_SETTINGS_CHANGED]: ProjectSettings;
}
