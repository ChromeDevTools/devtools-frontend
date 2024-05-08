// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../platform/platform.js';

const queryParamsObject = new URLSearchParams(location.search);

let runtimePlatform = '';

let runtimeInstance: Runtime|undefined;

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

  static experimentsSetting(): {
    [x: string]: boolean,
  } {
    try {
      return Platform.StringUtilities.toKebabCaseKeys(
          JSON.parse(self.localStorage && self.localStorage['experiments'] ? self.localStorage['experiments'] : '{}') as
          {
            [x: string]: boolean,
          });
    } catch (e) {
      console.error('Failed to parse localStorage[\'experiments\']');
      return {};
    }
  }

  static setPlatform(platform: string): void {
    runtimePlatform = platform;
  }

  static platform(): string {
    return runtimePlatform;
  }

  static isDescriptorEnabled(descriptor: {
    experiment: ((string | undefined)|null),
    condition?: Condition,
  }): boolean {
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
    return condition ? condition() : true;
  }

  loadLegacyModule(modulePath: string): Promise<void> {
    return import(`../../${modulePath}`);
  }
}

export interface Option {
  title: string;
  value: string|boolean;
  raw?: boolean;
  text?: string;
}

export class ExperimentsSupport {
  #experiments: Experiment[];
  #experimentNames: Set<string>;
  #enabledTransiently: Set<string>;
  readonly #enabledByDefault: Set<string>;
  readonly #serverEnabled: Set<string>;
  constructor() {
    this.#experiments = [];
    this.#experimentNames = new Set();
    this.#enabledTransiently = new Set();
    this.#enabledByDefault = new Set();
    this.#serverEnabled = new Set();
  }

  allConfigurableExperiments(): Experiment[] {
    const result = [];
    for (const experiment of this.#experiments) {
      if (!this.#enabledTransiently.has(experiment.name)) {
        result.push(experiment);
      }
    }
    return result;
  }

  private setExperimentsSetting(value: Object): void {
    if (!self.localStorage) {
      return;
    }
    self.localStorage['experiments'] = JSON.stringify(value);
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
    if (Runtime.experimentsSetting()[experimentName] === false) {
      return false;
    }
    if (this.#enabledTransiently.has(experimentName) || this.#enabledByDefault.has(experimentName)) {
      return true;
    }
    if (this.#serverEnabled.has(experimentName)) {
      return true;
    }

    return Boolean(Runtime.experimentsSetting()[experimentName]);
  }

  setEnabled(experimentName: string, enabled: boolean): void {
    this.checkExperiment(experimentName);
    const experimentsSetting = Runtime.experimentsSetting();
    experimentsSetting[experimentName] = enabled;
    this.setExperimentsSetting(experimentsSetting);
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
    const experimentsSetting = Runtime.experimentsSetting();
    const cleanedUpExperimentSetting: {
      [x: string]: boolean,
    } = {};
    for (const {name: experimentName} of this.#experiments) {
      if (experimentsSetting.hasOwnProperty(experimentName)) {
        const isEnabled = experimentsSetting[experimentName];
        if (isEnabled || this.#enabledByDefault.has(experimentName)) {
          cleanedUpExperimentSetting[experimentName] = isEnabled;
        }
      }
    }
    this.setExperimentsSetting(cleanedUpExperimentSetting);
  }

  private checkExperiment(experimentName: string): void {
    if (!this.#experimentNames.has(experimentName)) {
      throw new Error(`Unknown experiment '${experimentName}'`);
    }
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

// React Native-specific experiments, see rn_experiments.ts
// eslint-disable-next-line rulesdir/const_enum
export enum RNExperimentName {
  REACT_NATIVE_SPECIFIC_UI = 'react-native-specific-ui',
  JS_HEAP_PROFILER_ENABLE = 'js-heap-profiler-enable',
  ENABLE_PERFORMANCE_PANEL = 'enable-performance-panel',
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum ConditionName {
  CAN_DOCK = 'can_dock',
  NOT_SOURCES_HIDE_ADD_FOLDER = '!sources.hide_add_folder',
  REACT_NATIVE_UNSTABLE_NETWORK_PANEL = 'unstable_enableNetworkPanel',
  REACT_NATIVE_USE_INTERNAL_BRANDING = 'unstable_useInternalBranding',
}
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
  IMPORTANT_DOM_PROPERTIES = 'important-dom-properties',
  JUST_MY_CODE = 'just-my-code',
  PRELOADING_STATUS_PANEL = 'preloading-status-panel',
  TIMELINE_AS_CONSOLE_PROFILE_RESULT_PANEL = 'timeline-as-console-profile-result-panel',
  OUTERMOST_TARGET_SELECTOR = 'outermost-target-selector',
  JS_PROFILER_TEMP_ENABLE = 'js-profiler-temporarily-enable',
  HIGHLIGHT_ERRORS_ELEMENTS_PANEL = 'highlight-errors-elements-panel',
  SET_ALL_BREAKPOINTS_EAGERLY = 'set-all-breakpoints-eagerly',
  SELF_XSS_WARNING = 'self-xss-warning',
  USE_SOURCE_MAP_SCOPES = 'use-source-map-scopes',
  STORAGE_BUCKETS_TREE = 'storage-buckets-tree',
  NETWORK_PANEL_FILTER_BAR_REDESIGN = 'network-panel-filter-bar-redesign',
  TRACK_CONTEXT_MENU = 'track-context-menu',
  AUTOFILL_VIEW = 'autofill-view',
  INDENTATION_MARKERS_TEMP_DISABLE = 'sources-frame-indentation-markers-temporarily-disable',

  // React Native-specific experiments - must mirror RNExperimentName above
  JS_HEAP_PROFILER_ENABLE = RNExperimentName.JS_HEAP_PROFILER_ENABLE,
  REACT_NATIVE_SPECIFIC_UI = RNExperimentName.REACT_NATIVE_SPECIFIC_UI,
  ENABLE_PERFORMANCE_PANEL = RNExperimentName.ENABLE_PERFORMANCE_PANEL,
}

/**
 * When defining conditions make sure that objects used by the function have
 * been instantiated.
 */
export type Condition = () => boolean;

export const conditions = {
  canDock: () => Boolean(Runtime.queryParam('can_dock')),
  notSourcesHideAddFolder: () => Boolean(Runtime.queryParam(ConditionName.NOT_SOURCES_HIDE_ADD_FOLDER)),
  reactNativeUnstableNetworkPanel: () => Boolean(Runtime.queryParam(ConditionName.REACT_NATIVE_UNSTABLE_NETWORK_PANEL)),
};
