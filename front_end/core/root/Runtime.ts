// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../platform/platform.js';

import type {ExperimentName} from './ExperimentNames.js';

let runtimePlatform = '';

let runtimeInstance: Runtime|undefined;
let isNode: boolean|undefined;
let isTraceAppEntry: boolean|undefined;

/**
 * Returns the base URL (similar to `<base>`).
 * Used to resolve the relative URLs of any additional DevTools files (locale strings, etc) needed.
 * See: https://cs.chromium.org/remoteBase+f:devtools_window
 */
export function getRemoteBase(location: string = self.location.toString()): {
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
  return window.location.pathname;
}

export function isNodeEntry(pathname: string): boolean {
  const nodeEntryPoints = ['node_app', 'js_app'];
  return nodeEntryPoints.some(component => pathname.includes(component));
}

export const getChromeVersion = (): string => {
  const chromeRegex = /(?:^|\W)(?:Chrome|HeadlessChrome)\/(\S+)/;
  const chromeMatch = navigator.userAgent.match(chromeRegex);
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
    // TODO(crbug.com/451502260): Find a more explicit way to support running in Node.js
    if (!Runtime.#queryParamsObject && 'location' in globalThis) {
      Runtime.#queryParamsObject = new URLSearchParams(location.search);
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
  #experiments: Experiment[] = [];
  #hostExperiments = new Map<ExperimentName, HostExperiment>();
  readonly #experimentNames = new Set<ExperimentName>();
  readonly #enabledForTests = new Set<ExperimentName>();
  readonly #enabledByDefault = new Set<ExperimentName>();
  readonly #serverEnabled = new Set<ExperimentName>();
  readonly #storage = new ExperimentStorage();

  allConfigurableExperiments(): Array<Experiment|HostExperiment> {
    return [...this.#experiments, ...this.#hostExperiments.values()];
  }

  registerHostExperiment(params: {
    name: ExperimentName,
    title: string,
    aboutFlag: string,
    isEnabled: boolean,
    docLink?: Platform.DevToolsPath.UrlString,
    readonly feedbackLink?: Platform.DevToolsPath.UrlString,
  }): HostExperiment {
    if (this.#isHostExperiment(params.name) || this.#isExperiment(params.name)) {
      throw new Error(`Duplicate registration of experiment '${params.name}'`);
    }
    const hostExperiment = new HostExperiment({...params, experiments: this});
    this.#hostExperiments.set(params.name, hostExperiment);
    return hostExperiment;
  }

  register(experimentName: ExperimentName, experimentTitle: string, docLink?: string, feedbackLink?: string): void {
    if (this.#isHostExperiment(experimentName) || this.#isExperiment(experimentName)) {
      throw new Error(`Duplicate registration of experiment '${experimentName}'`);
    }
    this.#experimentNames.add(experimentName);
    this.#experiments.push(new Experiment(
        this, experimentName, experimentTitle,
        docLink as Platform.DevToolsPath.UrlString ?? Platform.DevToolsPath.EmptyUrlString,
        feedbackLink as Platform.DevToolsPath.UrlString ?? Platform.DevToolsPath.EmptyUrlString));
  }

  isEnabled(experimentName: ExperimentName): boolean {
    if (this.#isHostExperiment(experimentName)) {
      return this.#enabledForTests.has(experimentName) ||
          (this.#hostExperiments.get(experimentName)?.isEnabled() ?? false);
    }
    if (this.#isExperiment(experimentName)) {
      // Check for explicitly disabled #experiments first - the code could call setEnable(false)
      // on the experiment enabled by default and we should respect that.
      if (this.#storage.get(experimentName) === false) {
        return false;
      }
      if (this.#enabledForTests.has(experimentName) || this.#enabledByDefault.has(experimentName)) {
        return true;
      }
      if (this.#serverEnabled.has(experimentName)) {
        return true;
      }
      return Boolean(this.#storage.get(experimentName));
    }
    throw new Error(`Unknown experiment '${experimentName}'`);
  }

  getValueFromStorage(experimentName: ExperimentName): boolean|undefined {
    return this.#storage.get(experimentName);
  }

  setEnabled(experimentName: ExperimentName, enabled: boolean): void {
    if (this.#isHostExperiment(experimentName)) {
      this.#hostExperiments.get(experimentName)?.setEnabled(enabled);
      return;
    }
    if (this.#isExperiment(experimentName)) {
      this.#storage.set(experimentName, enabled);
      return;
    }
    throw new Error(`Unknown experiment '${experimentName}'`);
  }

  // Only applicable to legacy experiments.
  enableExperimentsByDefault(experimentNames: ExperimentName[]): void {
    for (const experimentName of experimentNames) {
      if (!this.#isExperiment(experimentName)) {
        throw new Error(`Unknown (legacy) experiment '${experimentName}'`);
      }
      this.#enabledByDefault.add(experimentName);
    }
  }

  // Only applicable to legacy experiments.
  setServerEnabledExperiments(experiments: string[]): void {
    for (const experiment of experiments) {
      const experimentName = experiment as ExperimentName;
      if (!this.#isExperiment(experimentName)) {
        throw new Error(`Unknown (legacy) experiment '${experimentName}'`);
      }
      this.#serverEnabled.add(experimentName);
    }
  }

  enableForTest(experimentName: ExperimentName): void {
    if (!this.#isHostExperiment(experimentName) && !this.#isExperiment(experimentName)) {
      throw new Error(`Unknown experiment '${experimentName}'`);
    }
    this.#enabledForTests.add(experimentName);
  }

  disableForTest(experimentName: ExperimentName): void {
    if (!this.#isHostExperiment(experimentName) && !this.#isExperiment(experimentName)) {
      throw new Error(`Unknown experiment '${experimentName}'`);
    }
    this.#enabledForTests.delete(experimentName);
  }

  isEnabledForTest(experimentName: ExperimentName): boolean {
    return this.#enabledForTests.has(experimentName);
  }

  clearForTest(): void {
    this.#experiments = [];
    this.#hostExperiments.clear();
    this.#experimentNames.clear();
    this.#enabledForTests.clear();
    this.#enabledByDefault.clear();
    this.#serverEnabled.clear();
  }

  cleanUpStaleExperiments(): void {
    this.#storage.cleanUpStaleExperiments(this.#experimentNames);
  }

  #isHostExperiment(experimentName: ExperimentName): boolean {
    return this.#hostExperiments.has(experimentName);
  }

  #isExperiment(experimentName: ExperimentName): boolean {
    return this.#experimentNames.has(experimentName);
  }
}

/** Manages the 'experiments' dictionary in self.localStorage */
class ExperimentStorage {
  readonly #experiments: Record<string, boolean|undefined> = {};

  constructor() {
    try {
      const storedExperiments = self.localStorage?.getItem('experiments');
      if (storedExperiments) {
        this.#experiments = JSON.parse(storedExperiments);
      }
    } catch {
      console.error('Failed to parse localStorage[\'experiments\']');
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

  set(experimentName: ExperimentName, enabled: boolean): void {
    this.#experiments[experimentName] = enabled;
    this.#syncToLocalStorage();
  }

  cleanUpStaleExperiments(validExperiments: Set<string>): void {
    for (const [key] of Object.entries(this.#experiments)) {
      if (!validExperiments.has(key)) {
        delete this.#experiments[key];
      }
    }
    this.#syncToLocalStorage();
  }

  #syncToLocalStorage(): void {
    self.localStorage?.setItem('experiments', JSON.stringify(this.#experiments));
  }
}

/**
 * @deprecated Experiments should not be used anymore, instead use base::Feature.
 * See docs/contributing/settings-experiments-features.md
 */
export class Experiment {
  name: ExperimentName;
  title: string;
  docLink?: Platform.DevToolsPath.UrlString;
  readonly feedbackLink?: Platform.DevToolsPath.UrlString;
  readonly #experiments: ExperimentsSupport;
  constructor(
      experiments: ExperimentsSupport, name: ExperimentName, title: string, docLink: Platform.DevToolsPath.UrlString,
      feedbackLink: Platform.DevToolsPath.UrlString) {
    this.name = name;
    this.title = title;
    this.docLink = docLink;
    this.feedbackLink = feedbackLink;
    this.#experiments = experiments;
  }

  isEnabled(): boolean {
    return this.#experiments.isEnabled(this.name);
  }

  setEnabled(enabled: boolean): void {
    this.#experiments.setEnabled(this.name, enabled);
  }
}

export class HostExperiment {
  name: ExperimentName;
  title: string;
  readonly #experiments: ExperimentsSupport;
  // This is the name of the corresponding Chromium flag (in chrome/browser/about_flags.cc).
  // It is NOT the the name of the corresponding Chromium `base::Feature`.
  aboutFlag: string;
  #isEnabled: boolean;
  docLink?: Platform.DevToolsPath.UrlString;
  readonly feedbackLink?: Platform.DevToolsPath.UrlString;

  constructor(params: {
    name: ExperimentName,
    title: string,
    experiments: ExperimentsSupport,
    aboutFlag: string,
    isEnabled: boolean,
    docLink?: Platform.DevToolsPath.UrlString,
    feedbackLink?: Platform.DevToolsPath.UrlString,
  }) {
    this.name = params.name;
    this.title = params.title;
    this.#experiments = params.experiments;
    this.aboutFlag = params.aboutFlag;
    this.#isEnabled = params.isEnabled;
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

export interface HostConfigThirdPartyCookieControls {
  thirdPartyCookieRestrictionEnabled: boolean;
  thirdPartyCookieMetadataEnabled: boolean;
  thirdPartyCookieHeuristicsEnabled: boolean;
  managedBlockThirdPartyCookies: string|boolean;
}

export interface HostConfigAiAssistanceV2 {
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

interface DevToolsFlexibleLayout {
  verticalDrawerEnabled: boolean;
}

interface DeviceBoundSessionsDebugging {
  enabled: boolean;
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

interface ConsoleInsightsTeasers {
  enabled: boolean;
  allowWithoutGpu: boolean;
}

interface DevToolsProtocolMonitor {
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
  devToolsAiAssistanceV2: HostConfigAiAssistanceV2,
  devToolsAiCodeCompletion: HostConfigAiCodeCompletion,
  devToolsAiCodeGeneration: HostConfigAiCodeGeneration,
  devToolsVeLogging: HostConfigVeLogging,
  devToolsWellKnown: HostConfigWellKnown,
  devToolsIndividualRequestThrottling: DevToolsIndividualRequestThrottling,
  /**
   * OffTheRecord here indicates that the user's profile is either incognito,
   * or guest mode, rather than a "normal" profile.
   */
  isOffTheRecord: boolean,
  devToolsEnableOriginBoundCookies: HostConfigEnableOriginBoundCookies,
  devToolsAnimationStylesInStylesTab: HostConfigAnimationStylesInStylesTab,
  thirdPartyCookieControls: HostConfigThirdPartyCookieControls,
  devToolsAiGeneratedTimelineLabels: AiGeneratedTimelineLabels,
  devToolsAllowPopoverForcing: AllowPopoverForcing,
  devToolsGlobalAiButton: GlobalAiButton,
  devToolsGdpProfiles: GdpProfiles,
  devToolsGdpProfilesAvailability: GdpProfilesAvailability,
  devToolsLiveEdit: LiveEdit,
  devToolsFlexibleLayout: DevToolsFlexibleLayout,
  deviceBoundSessionsDebugging: DeviceBoundSessionsDebugging,
  devToolsAiPromptApi: AiPromptApi,
  devToolsEnableDurableMessages: DevToolsEnableDurableMessages,
  devToolsAiAssistanceContextSelectionAgent: HostConfigAiAssistanceContextSelectionAgent,
  devToolsConsoleInsightsTeasers: ConsoleInsightsTeasers,
  devToolsGeminiRebranding: HostConfigGeminiRebranding,
  devToolsProtocolMonitor: DevToolsProtocolMonitor,
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
