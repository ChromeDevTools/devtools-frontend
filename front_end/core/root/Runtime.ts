// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../platform/platform.js';

const queryParamsObject = new URLSearchParams(location.search);

let runtimePlatform = '';

let runtimeInstance: Runtime|undefined;
let isNode: boolean|undefined;

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

  static queryParam(name: string): string|null {
    return queryParamsObject.get(name);
  }

  static setQueryParamForTesting(name: string, value: string): void {
    queryParamsObject.set(name, value);
  }

  static isNode(): boolean {
    if (isNode === undefined) {
      isNode = isNodeEntry(getPathName());
    }
    return isNode;
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
    if (experiment && experiment.startsWith('!') && experiments.isEnabled(experiment.substring(1))) {
      return false;
    }
    if (experiment && !experiment.startsWith('!') && !experiments.isEnabled(experiment)) {
      return false;
    }
    const {condition} = descriptor;
    return condition ? condition(hostConfig) : true;
  }

  loadLegacyModule(modulePath: string): Promise<void> {
    const importPath =
        `../../${modulePath}`;  // Extracted as a variable so esbuild doesn't attempt to bundle all the things.
    return import(importPath);
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
  readonly #experimentNames = new Set<string>();
  readonly #enabledTransiently = new Set<string>();
  readonly #enabledByDefault = new Set<string>();
  readonly #serverEnabled = new Set<string>();
  readonly #storage = new ExperimentStorage();

  allConfigurableExperiments(): Experiment[] {
    const result = [];
    for (const experiment of this.#experiments) {
      if (!this.#enabledTransiently.has(experiment.name)) {
        result.push(experiment);
      }
    }
    return result;
  }

  register(
      experimentName: string, experimentTitle: string, unstable?: boolean, docLink?: string,
      feedbackLink?: string): void {
    if (this.#experimentNames.has(experimentName)) {
      throw new Error(`Duplicate registraction of experiment '${experimentName}'`);
    }
    this.#experimentNames.add(experimentName);
    this.#experiments.push(new Experiment(
        this, experimentName, experimentTitle, Boolean(unstable),
        docLink as Platform.DevToolsPath.UrlString ?? Platform.DevToolsPath.EmptyUrlString,
        feedbackLink as Platform.DevToolsPath.UrlString ?? Platform.DevToolsPath.EmptyUrlString));
  }

  isEnabled(experimentName: string): boolean {
    this.checkExperiment(experimentName);
    // Check for explicitly disabled #experiments first - the code could call setEnable(false) on the experiment enabled
    // by default and we should respect that.
    if (this.#storage.get(experimentName) === false) {
      return false;
    }
    if (this.#enabledTransiently.has(experimentName) || this.#enabledByDefault.has(experimentName)) {
      return true;
    }
    if (this.#serverEnabled.has(experimentName)) {
      return true;
    }

    return Boolean(this.#storage.get(experimentName));
  }

  setEnabled(experimentName: string, enabled: boolean): void {
    this.checkExperiment(experimentName);
    this.#storage.set(experimentName, enabled);
  }

  enableExperimentsTransiently(experimentNames: string[]): void {
    for (const experimentName of experimentNames) {
      this.checkExperiment(experimentName);
      this.#enabledTransiently.add(experimentName);
    }
  }

  enableExperimentsByDefault(experimentNames: string[]): void {
    for (const experimentName of experimentNames) {
      this.checkExperiment(experimentName);
      this.#enabledByDefault.add(experimentName);
    }
  }

  setServerEnabledExperiments(experimentNames: string[]): void {
    for (const experiment of experimentNames) {
      this.checkExperiment(experiment);
      this.#serverEnabled.add(experiment);
    }
  }

  enableForTest(experimentName: string): void {
    this.checkExperiment(experimentName);
    this.#enabledTransiently.add(experimentName);
  }

  disableForTest(experimentName: string): void {
    this.checkExperiment(experimentName);
    this.#enabledTransiently.delete(experimentName);
  }

  clearForTest(): void {
    this.#experiments = [];
    this.#experimentNames.clear();
    this.#enabledTransiently.clear();
    this.#enabledByDefault.clear();
    this.#serverEnabled.clear();
  }

  cleanUpStaleExperiments(): void {
    this.#storage.cleanUpStaleExperiments(this.#experimentNames);
  }

  private checkExperiment(experimentName: string): void {
    if (!this.#experimentNames.has(experimentName)) {
      throw new Error(`Unknown experiment '${experimentName}'`);
    }
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
  get(experimentName: string): boolean|undefined {
    return this.#experiments[experimentName];
  }

  set(experimentName: string, enabled: boolean): void {
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

export class Experiment {
  name: string;
  title: string;
  unstable: boolean;
  docLink?: Platform.DevToolsPath.UrlString;
  readonly feedbackLink?: Platform.DevToolsPath.UrlString;
  readonly #experiments: ExperimentsSupport;
  constructor(
      experiments: ExperimentsSupport, name: string, title: string, unstable: boolean,
      docLink: Platform.DevToolsPath.UrlString, feedbackLink: Platform.DevToolsPath.UrlString) {
    this.name = name;
    this.title = title;
    this.unstable = unstable;
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

// This must be constructed after the query parameters have been parsed.
export const experiments = new ExperimentsSupport();

export const enum ExperimentName {
  CAPTURE_NODE_CREATION_STACKS = 'capture-node-creation-stacks',
  CSS_OVERVIEW = 'css-overview',
  LIVE_HEAP_PROFILE = 'live-heap-profile',
  ALL = '*',
  PROTOCOL_MONITOR = 'protocol-monitor',
  FULL_ACCESSIBILITY_TREE = 'full-accessibility-tree',
  STYLES_PANE_CSS_CHANGES = 'styles-pane-css-changes',
  HEADER_OVERRIDES = 'header-overrides',
  INSTRUMENTATION_BREAKPOINTS = 'instrumentation-breakpoints',
  AUTHORED_DEPLOYED_GROUPING = 'authored-deployed-grouping',
  JUST_MY_CODE = 'just-my-code',
  HIGHLIGHT_ERRORS_ELEMENTS_PANEL = 'highlight-errors-elements-panel',
  USE_SOURCE_MAP_SCOPES = 'use-source-map-scopes',
  NETWORK_PANEL_FILTER_BAR_REDESIGN = 'network-panel-filter-bar-redesign',
  AUTOFILL_VIEW = 'autofill-view',
  TIMELINE_SHOW_POST_MESSAGE_EVENTS = 'timeline-show-postmessage-events',
  TIMELINE_DEBUG_MODE = 'timeline-debug-mode',
  TIMELINE_ENHANCED_TRACES = 'timeline-enhanced-traces',
  TIMELINE_SERVER_TIMINGS = 'timeline-server-timings',
  FLOATING_ENTRY_POINTS_FOR_AI_ASSISTANCE = 'floating-entry-points-for-ai-assistance',
  TIMELINE_EXPERIMENTAL_INSIGHTS = 'timeline-experimental-insights',
  TIMELINE_DIM_UNRELATED_EVENTS = 'timeline-dim-unrelated-events',
  TIMELINE_ALTERNATIVE_NAVIGATION = 'timeline-alternative-navigation',
  // when adding to this enum, you'll need to also add to REGISTERED_EXPERIMENTS in EnvironmentHelpers.ts
}

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
  // Introduced in crrev.com/c/6243415
  insightsEnabled?: boolean;
}

export interface HostConfigAiAssistanceFileAgent {
  modelId: string;
  temperature: number;
  enabled: boolean;
  userTier: string;
}

export interface HostConfigImprovedWorkspaces {
  enabled: boolean;
}

export interface HostConfigVeLogging {
  enabled: boolean;
  testing: boolean;
}

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
  devToolsConsoleInsights: HostConfigConsoleInsights,
  devToolsFreestyler: HostConfigFreestyler,
  devToolsAiAssistanceNetworkAgent: HostConfigAiAssistanceNetworkAgent,
  devToolsAiAssistanceFileAgent: HostConfigAiAssistanceFileAgent,
  devToolsAiAssistancePerformanceAgent: HostConfigAiAssistancePerformanceAgent,
  devToolsImprovedWorkspaces: HostConfigImprovedWorkspaces,
  devToolsVeLogging: HostConfigVeLogging,
  devToolsWellKnown: HostConfigWellKnown,
  devToolsPrivacyUI: HostConfigPrivacyUI,
  /**
   * OffTheRecord here indicates that the user's profile is either incognito,
   * or guest mode, rather than a "normal" profile.
   */
  isOffTheRecord: boolean,
  devToolsEnableOriginBoundCookies: HostConfigEnableOriginBoundCookies,
  devToolsAnimationStylesInStylesTab: HostConfigAnimationStylesInStylesTab,
  thirdPartyCookieControls: HostConfigThirdPartyCookieControls,
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
export const hostConfig: HostConfig = Object.create(null);

/**
 * When defining conditions make sure that objects used by the function have
 * been instantiated.
 */
export type Condition = (config?: HostConfig) => boolean;

export const conditions = {
  canDock: () => Boolean(Runtime.queryParam('can_dock')),
};
