import * as Platform from '../platform/platform.js';
/**
 * Returns the base URL (similar to `<base>`).
 * Used to resolve the relative URLs of any additional DevTools files (locale strings, etc) needed.
 * See: https://cs.chromium.org/remoteBase+f:devtools_window
 */
export declare function getRemoteBase(location?: string): {
    base: string;
    version: string;
} | null;
export declare function getPathName(): string;
export declare function isNodeEntry(pathname: string): boolean;
export declare const getChromeVersion: () => string;
export declare class Runtime {
    #private;
    private constructor();
    static instance(opts?: {
        forceNew: boolean | null;
    } | undefined): Runtime;
    static removeInstance(): void;
    static queryParam(name: string): string | null;
    static setQueryParamForTesting(name: string, value: string): void;
    static isNode(): boolean;
    /**
     * Returns true if viewing the slimmed-down devtools meant for just viewing a
     * performance trace, e.g. devtools://devtools/bundled/trace_app.html?traceURL=http://...
     */
    static isTraceApp(): boolean;
    static setPlatform(platform: string): void;
    static platform(): string;
    static isDescriptorEnabled(descriptor: {
        experiment?: string | null;
        condition?: Condition;
    }): boolean;
    loadLegacyModule(modulePath: string): Promise<unknown>;
}
export interface Option {
    title: string;
    value: string | boolean;
    raw?: boolean;
    text?: string;
}
export declare class ExperimentsSupport {
    #private;
    allConfigurableExperiments(): Experiment[];
    register(experimentName: string, experimentTitle: string, unstable?: boolean, docLink?: string, feedbackLink?: string): void;
    isEnabled(experimentName: string): boolean;
    setEnabled(experimentName: string, enabled: boolean): void;
    enableExperimentsTransiently(experimentNames: string[]): void;
    enableExperimentsByDefault(experimentNames: string[]): void;
    setServerEnabledExperiments(experimentNames: string[]): void;
    enableForTest(experimentName: string): void;
    disableForTest(experimentName: string): void;
    clearForTest(): void;
    cleanUpStaleExperiments(): void;
    private checkExperiment;
}
export declare class Experiment {
    #private;
    name: string;
    title: string;
    unstable: boolean;
    docLink?: Platform.DevToolsPath.UrlString;
    readonly feedbackLink?: Platform.DevToolsPath.UrlString;
    constructor(experiments: ExperimentsSupport, name: string, title: string, unstable: boolean, docLink: Platform.DevToolsPath.UrlString, feedbackLink: Platform.DevToolsPath.UrlString);
    isEnabled(): boolean;
    setEnabled(enabled: boolean): void;
}
/** This must be constructed after the query parameters have been parsed. **/
export declare const experiments: ExperimentsSupport;
/**
 * @deprecated Experiments should not be used anymore, instead use base::Feature.
 * See docs/contributing/settings-experiments-features.md
 */
export declare const enum ExperimentName {
    CAPTURE_NODE_CREATION_STACKS = "capture-node-creation-stacks",
    CSS_OVERVIEW = "css-overview",
    LIVE_HEAP_PROFILE = "live-heap-profile",
    ALL = "*",
    PROTOCOL_MONITOR = "protocol-monitor",
    FULL_ACCESSIBILITY_TREE = "full-accessibility-tree",
    HEADER_OVERRIDES = "header-overrides",
    INSTRUMENTATION_BREAKPOINTS = "instrumentation-breakpoints",
    AUTHORED_DEPLOYED_GROUPING = "authored-deployed-grouping",
    JUST_MY_CODE = "just-my-code",
    USE_SOURCE_MAP_SCOPES = "use-source-map-scopes",
    TIMELINE_SHOW_POST_MESSAGE_EVENTS = "timeline-show-postmessage-events",
    TIMELINE_DEBUG_MODE = "timeline-debug-mode"
}
export declare enum GenAiEnterprisePolicyValue {
    ALLOW = 0,
    ALLOW_WITHOUT_LOGGING = 1,
    DISABLE = 2
}
export interface AidaAvailability {
    enabled: boolean;
    blockedByAge: boolean;
    blockedByEnterprisePolicy: boolean;
    blockedByGeo: boolean;
    disallowLogging: boolean;
    enterprisePolicyValue: number;
}
type Channel = 'stable' | 'beta' | 'dev' | 'canary';
export interface HostConfigConsoleInsights {
    modelId: string;
    temperature: number;
    enabled: boolean;
}
export declare enum HostConfigFreestylerExecutionMode {
    ALL_SCRIPTS = "ALL_SCRIPTS",
    SIDE_EFFECT_FREE_SCRIPTS_ONLY = "SIDE_EFFECT_FREE_SCRIPTS_ONLY",
    NO_SCRIPTS = "NO_SCRIPTS"
}
export interface HostConfigFreestyler {
    modelId: string;
    temperature: number;
    enabled: boolean;
    userTier: string;
    executionMode?: HostConfigFreestylerExecutionMode;
    patching?: boolean;
    multimodal?: boolean;
    multimodalUploadInput?: boolean;
    functionCalling?: boolean;
}
export interface HostConfigAiAssistanceNetworkAgent {
    modelId: string;
    temperature: number;
    enabled: boolean;
    userTier: string;
}
export interface HostConfigAiAssistancePerformanceAgent {
    modelId: string;
    temperature: number;
    enabled: boolean;
    userTier: string;
}
export interface HostConfigAiAssistanceFileAgent {
    modelId: string;
    temperature: number;
    enabled: boolean;
    userTier: string;
}
export interface HostConfigAiCodeCompletion {
    modelId: string;
    temperature: number;
    enabled: boolean;
    userTier: string;
}
export interface HostConfigAiCodeGeneration {
    modelId: string;
    temperature: number;
    enabled: boolean;
    userTier: string;
}
export interface HostConfigDeepLinksViaExtensibilityApi {
    enabled: boolean;
}
export interface HostConfigGreenDevUi {
    enabled: boolean;
}
export interface HostConfigVeLogging {
    enabled: boolean;
    testing: boolean;
}
/**
 * @see https://goo.gle/devtools-json-design
 */
export interface HostConfigWellKnown {
    enabled: boolean;
}
export interface HostConfigPrivacyUI {
    enabled: boolean;
}
export interface HostConfigEnableOriginBoundCookies {
    portBindingEnabled: boolean;
    schemeBindingEnabled: boolean;
}
export interface HostConfigAnimationStylesInStylesTab {
    enabled: boolean;
}
export interface HostConfigThirdPartyCookieControls {
    thirdPartyCookieRestrictionEnabled: boolean;
    thirdPartyCookieMetadataEnabled: boolean;
    thirdPartyCookieHeuristicsEnabled: boolean;
    managedBlockThirdPartyCookies: string | boolean;
}
interface AiGeneratedTimelineLabels {
    enabled: boolean;
}
interface AllowPopoverForcing {
    enabled: boolean;
}
interface GlobalAiButton {
    enabled: boolean;
    promotionEnabled: boolean;
}
interface GdpProfiles {
    enabled: boolean;
    badgesEnabled: boolean;
    starterBadgeEnabled: boolean;
}
export declare enum GdpProfilesEnterprisePolicyValue {
    ENABLED = 0,
    ENABLED_WITHOUT_BADGES = 1,
    DISABLED = 2
}
interface GdpProfilesAvailability {
    enabled: boolean;
    enterprisePolicyValue: GdpProfilesEnterprisePolicyValue;
}
interface LiveEdit {
    enabled: boolean;
}
interface DevToolsFlexibleLayout {
    verticalDrawerEnabled: boolean;
}
interface AiPromptApi {
    enabled: boolean;
    allowWithoutGpu: boolean;
}
interface DevToolsIndividualRequestThrottling {
    enabled: boolean;
}
export interface DevToolsEnableDurableMessages {
    enabled: boolean;
}
interface HostConfigAiAssistanceContextSelectionAgent {
    enabled: boolean;
}
/**
 * The host configuration that we expect from the DevTools back-end.
 *
 * We use `RecursivePartial` here to enforce that DevTools code is able to
 * handle `HostConfig` objects of an unexpected shape. This can happen if
 * the implementation in the Chromium backend is changed without correctly
 * updating the DevTools frontend. Or if remote debugging a different version
 * of Chrome, resulting in the local browser window and the local DevTools
 * window being of different versions, and consequently potentially having
 * differently shaped `HostConfig`s.
 *
 * @see hostConfig
 */
export type HostConfig = Platform.TypeScriptUtilities.RecursivePartial<{
    aidaAvailability: AidaAvailability;
    channel: Channel;
    devToolsConsoleInsights: HostConfigConsoleInsights;
    devToolsDeepLinksViaExtensibilityApi: HostConfigDeepLinksViaExtensibilityApi;
    devToolsFreestyler: HostConfigFreestyler;
    devToolsGreenDevUi: HostConfigGreenDevUi;
    devToolsAiAssistanceNetworkAgent: HostConfigAiAssistanceNetworkAgent;
    devToolsAiAssistanceFileAgent: HostConfigAiAssistanceFileAgent;
    devToolsAiAssistancePerformanceAgent: HostConfigAiAssistancePerformanceAgent;
    devToolsAiCodeCompletion: HostConfigAiCodeCompletion;
    devToolsAiCodeGeneration: HostConfigAiCodeGeneration;
    devToolsVeLogging: HostConfigVeLogging;
    devToolsWellKnown: HostConfigWellKnown;
    devToolsPrivacyUI: HostConfigPrivacyUI;
    devToolsIndividualRequestThrottling: DevToolsIndividualRequestThrottling;
    /**
     * OffTheRecord here indicates that the user's profile is either incognito,
     * or guest mode, rather than a "normal" profile.
     */
    isOffTheRecord: boolean;
    devToolsEnableOriginBoundCookies: HostConfigEnableOriginBoundCookies;
    devToolsAnimationStylesInStylesTab: HostConfigAnimationStylesInStylesTab;
    thirdPartyCookieControls: HostConfigThirdPartyCookieControls;
    devToolsAiGeneratedTimelineLabels: AiGeneratedTimelineLabels;
    devToolsAllowPopoverForcing: AllowPopoverForcing;
    devToolsGlobalAiButton: GlobalAiButton;
    devToolsGdpProfiles: GdpProfiles;
    devToolsGdpProfilesAvailability: GdpProfilesAvailability;
    devToolsLiveEdit: LiveEdit;
    devToolsFlexibleLayout: DevToolsFlexibleLayout;
    devToolsAiPromptApi: AiPromptApi;
    devToolsEnableDurableMessages: DevToolsEnableDurableMessages;
    devToolsAiAssistanceContextSelectionAgent: HostConfigAiAssistanceContextSelectionAgent;
}>;
/**
 * The host configuration for this DevTools instance.
 *
 * This is initialized early during app startup and should not be modified
 * afterwards. In some cases it can be necessary to re-request the host
 * configuration from Chrome while DevTools is already running. In these
 * cases, the new host configuration should be reflected here, e.g.:
 *
 * ```js
 * const config = await new Promise<Root.Runtime.HostConfig>(
 *   resolve => InspectorFrontendHostInstance.getHostConfig(resolve));
 * Object.assign(Root.runtime.hostConfig, config);
 * ```
 */
export declare const hostConfig: Platform.TypeScriptUtilities.RecursiveReadonly<HostConfig>;
/**
 * When defining conditions make sure that objects used by the function have
 * been instantiated.
 */
export type Condition = (config?: HostConfig) => boolean;
export declare const conditions: {
    canDock: () => boolean;
};
export {};
