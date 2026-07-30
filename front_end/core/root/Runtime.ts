// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../platform/platform.js';

import type {ExperimentName} from './ExperimentNames.js';

let runtimePlatform = '';

let runtimeInstance: Runtime|undefined;
let isNode: boolean|undefined;
let isTraceAppEntry: boolean|undefined;

interface Global {
  location?: {
    toString(): string,
    pathname: string,
    search: string,
  };
  navigator?: {
    userAgent: string,
  };
  localStorage?: Storage;
  self?: Global;
}

const globalObject = (globalThis as unknown as Global);

/**
 * Returns the base URL (similar to `<base>`).
 * Used to resolve the relative URLs of any additional DevTools files (locale strings, etc) needed.
 * See: https://cs.chromium.org/remoteBase+f:devtools_window
 */
export function getRemoteBase(location: string = globalObject.self?.location?.toString() ?? ''): {
  base: string,
  version: string,
}|null {
  const url = new URL(location);
  const remoteBase = url.searchParams.get('remoteBase');
  if (!remoteBase) {
    return null;
  }

  const version = /\/serve_file\/(@[0-9a-zA-Z]+)\/?$/.exec(remoteBase);
  if (!version) {
    return null;
  }

  return {base: `devtools://devtools/remote/serve_file/${version[1]}/`, version: version[1]};
}

export function getPathName(): string {
  return globalObject.location?.pathname ?? '';
}

export function isNodeEntry(pathname: string): boolean {
  const nodeEntryPoints = ['node_app', 'js_app'];
  return nodeEntryPoints.some(component => pathname.includes(component));
}

export const getChromeVersion = (): string => {
  const chromeRegex = /(?:^|\W)(?:Chrome|HeadlessChrome)\/(\S+)/;
  const userAgent = Platform.HostRuntime.HOST_RUNTIME.getUserAgent();
  const chromeMatch = userAgent.match(chromeRegex);
  if (chromeMatch && chromeMatch.length > 1) {
    return chromeMatch[1];
  }
  return '';
};

export class Runtime {
  private constructor() {
  }

  static instance(opts: {
    forceNew: boolean|null,
  }|undefined = {forceNew: null}): Runtime {
    const {forceNew} = opts;
    if (!runtimeInstance || forceNew) {
      runtimeInstance = new Runtime();
    }

    return runtimeInstance;
  }

  static removeInstance(): void {
    runtimeInstance = undefined;
  }

  static #queryParamsObject: URLSearchParams;

  static #getSearchParams(): URLSearchParams|null {
    if (!Runtime.#queryParamsObject && globalObject.location) {
      Runtime.#queryParamsObject = new URLSearchParams(globalObject.location.search);
    }
    return Runtime.#queryParamsObject;
  }

  static queryParam(name: string): string|null {
    return Runtime.#getSearchParams()?.get(name) ?? null;
  }

  static setQueryParamForTesting(name: string, value: string): void {
    Runtime.#getSearchParams()?.set(name, value);
  }

  static isNode(): boolean {
    if (isNode === undefined) {
      isNode = isNodeEntry(getPathName());
    }
    return isNode;
  }

  /**
   * Returns true if viewing the slimmed-down devtools meant for just viewing a
   * performance trace, e.g. devtools://devtools/bundled/trace_app.html?traceURL=http://...
   */
  static isTraceApp(): boolean {
    if (isTraceAppEntry === undefined) {
      isTraceAppEntry = getPathName().includes('trace_app');
    }
    return isTraceAppEntry;
  }

  static setPlatform(platform: string): void {
    runtimePlatform = platform;
  }

  static platform(): string {
    return runtimePlatform;
  }

  static isDescriptorEnabled(descriptor: {experiment?: string|null, condition?: Condition}): boolean {
    const {experiment} = descriptor;
    if (experiment === '*') {
      return true;
    }
    if (experiment?.startsWith('!')) {
      const experimentName = experiment.substring(1) as ExperimentName;
      if (experiments.isEnabled(experimentName)) {
        return false;
      }
    }
    if (experiment && !experiment.startsWith('!')) {
      const experimentName = experiment as ExperimentName;
      if (!experiments.isEnabled(experimentName)) {
        return false;
      }
    }
    const {condition} = descriptor;
    return condition ? condition(hostConfig) : true;
  }

  loadLegacyModule(modulePath: string): Promise<unknown> {
    // eslint-disable-next-line no-console
    console.log('Loading legacy module: ' + modulePath);
    const importPath =
        `../../${modulePath}`;  // Extracted as a variable so esbuild doesn't attempt to bundle all the things.
    return import(importPath).then(m => {
      // eslint-disable-next-line no-console
      console.log('Loaded legacy module: ' + modulePath);
      return m;
    });
  }
}

export interface Option {
  title: string;
  value: string|boolean;
  raw?: boolean;
  text?: string;
}

export class ExperimentsSupport {
  #experiments = new Map<ExperimentName, Experiment>();
  readonly #enabledForTests = new Set<ExperimentName>();
  readonly #storage = new ExperimentStorage();

  allConfigurableExperiments(): Experiment[] {
    return [...this.#experiments.values()];
  }

  register(params: {
    name: ExperimentName,
    title: string,
    aboutFlag: string,
    isEnabled: boolean,
    requiresChromeRestart: boolean,
    docLink?: Platform.DevToolsPath.UrlString,
    readonly feedbackLink?: Platform.DevToolsPath.UrlString,
  }): Experiment {
    if (this.#isExperiment(params.name)) {
      throw new Error(`Duplicate registration of experiment '${params.name}'`);
    }
    const experiment = new Experiment({...params, experiments: this});
    this.#experiments.set(params.name, experiment);
    return experiment;
  }

  isEnabled(experimentName: ExperimentName): boolean {
    if (this.#isExperiment(experimentName)) {
      return this.#enabledForTests.has(experimentName) || (this.#experiments.get(experimentName)?.isEnabled() ?? false);
    }
    throw new Error(`Unknown experiment '${experimentName}'`);
  }

  getValueFromStorage(experimentName: ExperimentName): boolean|undefined {
    return this.#storage.get(experimentName);
  }

  setEnabled(experimentName: ExperimentName, enabled: boolean): void {
    if (this.#isExperiment(experimentName)) {
      this.#experiments.get(experimentName)?.setEnabled(enabled);
      return;
    }
    throw new Error(`Unknown experiment '${experimentName}'`);
  }

  enableForTest(experimentName: ExperimentName): void {
    if (!this.#isExperiment(experimentName)) {
      throw new Error(`Unknown experiment '${experimentName}'`);
    }
    this.#enabledForTests.add(experimentName);
  }

  disableForTest(experimentName: ExperimentName): void {
    if (!this.#isExperiment(experimentName)) {
      throw new Error(`Unknown experiment '${experimentName}'`);
    }
    this.#enabledForTests.delete(experimentName);
  }

  isEnabledForTest(experimentName: ExperimentName): boolean {
    return this.#enabledForTests.has(experimentName);
  }

  clearForTest(): void {
    this.#experiments.clear();
    this.#enabledForTests.clear();
  }

  // TODO(crbug.com/464173054) remove after M156
  removeAllExperimentsFromLocalStorage(): void {
    this.#storage.removeAllExperimentsFromLocalStorage();
  }

  #isExperiment(experimentName: ExperimentName): boolean {
    return this.#experiments.has(experimentName);
  }
}

// TODO(crbug.com/464173054) remove after M156
/** Manages the 'experiments' dictionary in globalThis.localStorage */
class ExperimentStorage {
  readonly #experiments: Record<string, boolean|undefined> = {};

  constructor() {
    try {
      const storedExperiments = Platform.HostRuntime.HOST_RUNTIME.getLocalStorage()?.getItem('experiments');
      if (storedExperiments) {
        this.#experiments = JSON.parse(storedExperiments);
      }
    } catch (err) {
      console.error('Failed to parse localStorage[\'experiments\']: ' + err.message);
    }
  }

  /**
   * Experiments are stored with a tri-state:
   *   - true: Explicitly enabled.
   *   - false: Explicitly disabled.
   *   - undefined: Disabled.
   */
  get(experimentName: ExperimentName): boolean|undefined {
    return this.#experiments[experimentName];
  }

  removeAllExperimentsFromLocalStorage(): void {
    Platform.HostRuntime.HOST_RUNTIME.getLocalStorage()?.removeItem('experiments');
  }
}

export class Experiment {
  name: ExperimentName;
  title: string;
  readonly #experiments: ExperimentsSupport;
  // This is the name of the corresponding Chromium flag (in chrome/browser/about_flags.cc).
  // It is NOT the the name of the corresponding Chromium `base::Feature`.
  aboutFlag: string;
  #isEnabled: boolean;
  readonly requiresChromeRestart: boolean;
  docLink?: Platform.DevToolsPath.UrlString;
  readonly feedbackLink?: Platform.DevToolsPath.UrlString;

  constructor(params: {
    name: ExperimentName,
    title: string,
    experiments: ExperimentsSupport,
    aboutFlag: string,
    isEnabled: boolean,
    requiresChromeRestart: boolean,
    docLink?: Platform.DevToolsPath.UrlString,
    feedbackLink?: Platform.DevToolsPath.UrlString,
  }) {
    this.name = params.name;
    this.title = params.title;
    this.#experiments = params.experiments;
    this.aboutFlag = params.aboutFlag;
    this.#isEnabled = params.isEnabled;
    this.requiresChromeRestart = params.requiresChromeRestart;
    this.docLink = params.docLink;
    this.feedbackLink = params.feedbackLink;
  }

  isEnabled(): boolean {
    return this.#experiments.isEnabledForTest(this.name) || this.#isEnabled;
  }

  setEnabled(enabled: boolean): void {
    this.#isEnabled = enabled;
  }
}

/** This must be constructed after the query parameters have been parsed. **/
export const experiments = new ExperimentsSupport();

export enum GenAiEnterprisePolicyValue {
  ALLOW = 0,
  ALLOW_WITHOUT_LOGGING = 1,
  DISABLE = 2,
}

export interface AidaAvailability {
  enabled: boolean;
  blockedByAge: boolean;
  blockedByEnterprisePolicy: boolean;
  blockedByGeo: boolean;
  disallowLogging: boolean;
  enterprisePolicyValue: number;
}

type Channel = 'stable'|'beta'|'dev'|'canary';

export interface HostConfigConsoleInsights {
  modelId: string;
  temperature: number;
  enabled: boolean;
}

export enum HostConfigFreestylerExecutionMode {
  ALL_SCRIPTS = 'ALL_SCRIPTS',
  SIDE_EFFECT_FREE_SCRIPTS_ONLY = 'SIDE_EFFECT_FREE_SCRIPTS_ONLY',
  NO_SCRIPTS = 'NO_SCRIPTS',
}

export interface HostConfigFreestyler {
  modelId: string;
  temperature: number;
  enabled: boolean;
  userTier: string;
  executionMode?: HostConfigFreestylerExecutionMode;
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

export interface HostConfigAiAssistanceAccessibilityAgent {
  enabled: boolean;
}

export interface HostConfigAiAssistanceStorageAgent {
  enabled: boolean;
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

export interface HostConfigAiCodeCompletionStyles {
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

export interface HostConfigGeminiRebranding {
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

export interface HostConfigJpegXlImageFormat {
  enabled: boolean;
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

export enum GdpProfilesEnterprisePolicyValue {
  ENABLED = 0,
  ENABLED_WITHOUT_BADGES = 1,
  DISABLED = 2,
}

interface GdpProfilesAvailability {
  // Whether GDP profiles can be enabled on this host (only possible on branded builds).
  enabled: boolean;
  enterprisePolicyValue: GdpProfilesEnterprisePolicyValue;
}

interface LiveEdit {
  enabled: boolean;
}

interface ExtensionsOnChromeUrls {
  enabled: boolean;
}

interface DevToolsFlexibleLayout {
  verticalDrawerEnabled: boolean;
}

interface DeviceBoundSessionsDebugging {
  enabled: boolean;
}

export interface DevToolsEnableDurableMessages {
  enabled: boolean;
}

interface HostConfigAiAssistanceContextSelectionAgent {
  enabled: boolean;
}

interface ConsoleInsightsTeasers {
  enabled: boolean;
  allowWithoutGpu: boolean;
}

interface UseGcaApi {
  enabled: boolean;
}

interface DevToolsAiV2Architecture {
  enabled: boolean;
}

interface DevToolsProtocolMonitor {
  enabled: boolean;
}

interface DevToolsWebMCPSupport {
  enabled: boolean;
}

interface DevToolsAdsPanel {
  enabled: boolean;
}

interface DevToolsPlusButton {
  enabled: boolean;
}

interface DevToolsInstrumentationBreakpoints {
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
  aidaAvailability: AidaAvailability,
  channel: Channel,
  devToolsConsoleInsights: HostConfigConsoleInsights,
  devToolsDeepLinksViaExtensibilityApi: HostConfigDeepLinksViaExtensibilityApi,
  devToolsFreestyler: HostConfigFreestyler,
  devToolsGreenDevUi: HostConfigGreenDevUi,
  devToolsAiAssistanceNetworkAgent: HostConfigAiAssistanceNetworkAgent,
  devToolsAiAssistanceFileAgent: HostConfigAiAssistanceFileAgent,
  devToolsAiAssistancePerformanceAgent: HostConfigAiAssistancePerformanceAgent,
  devToolsAiAssistanceAccessibilityAgent: HostConfigAiAssistanceAccessibilityAgent,
  devToolsAiAssistanceStorageAgent: HostConfigAiAssistanceStorageAgent,
  devToolsAiV2Architecture: DevToolsAiV2Architecture,
  devToolsAiCodeCompletion: HostConfigAiCodeCompletion,
  devToolsAiCodeGeneration: HostConfigAiCodeGeneration,
  devToolsAiCodeCompletionStyles: HostConfigAiCodeCompletionStyles,
  devToolsVeLogging: HostConfigVeLogging,
  devToolsWellKnown: HostConfigWellKnown,
  /**
   * OffTheRecord here indicates that the user's profile is either incognito,
   * or guest mode, rather than a "normal" profile.
   */
  isOffTheRecord: boolean,
  devToolsEnableOriginBoundCookies: HostConfigEnableOriginBoundCookies,
  devToolsAnimationStylesInStylesTab: HostConfigAnimationStylesInStylesTab,
  devToolsJpegXlImageFormat: HostConfigJpegXlImageFormat,
  devToolsAiGeneratedTimelineLabels: AiGeneratedTimelineLabels,
  devToolsAllowPopoverForcing: AllowPopoverForcing,
  devToolsGlobalAiButton: GlobalAiButton,
  devToolsGdpProfiles: GdpProfiles,
  devToolsGdpProfilesAvailability: GdpProfilesAvailability,
  devToolsLiveEdit: LiveEdit,
  devToolsFlexibleLayout: DevToolsFlexibleLayout,
  deviceBoundSessionsDebugging: DeviceBoundSessionsDebugging,
  devToolsEnableDurableMessages: DevToolsEnableDurableMessages,
  devToolsAiAssistanceContextSelectionAgent: HostConfigAiAssistanceContextSelectionAgent,
  devToolsConsoleInsightsTeasers: ConsoleInsightsTeasers,
  devToolsGeminiRebranding: HostConfigGeminiRebranding,
  devToolsProtocolMonitor: DevToolsProtocolMonitor,
  devToolsWebMCPSupport: DevToolsWebMCPSupport,
  devToolsAdsPanel: DevToolsAdsPanel,
  devToolsUseGcaApi: UseGcaApi,
  devToolsPlusButton: DevToolsPlusButton,
  devToolsInstrumentationBreakpoints: DevToolsInstrumentationBreakpoints,
  extensionsOnChromeUrls: ExtensionsOnChromeUrls,
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
export const hostConfig: Platform.TypeScriptUtilities.RecursiveReadonly<HostConfig> = Object.create(null);

/**
 * When defining conditions make sure that objects used by the function have
 * been instantiated.
 */
export type Condition = (config?: HostConfig) => boolean;

export const conditions = {
  canDock: () => Boolean(Runtime.queryParam('can_dock')),
};
