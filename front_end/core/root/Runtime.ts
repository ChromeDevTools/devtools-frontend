// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const originalConsole = console;
const originalAssert = console.assert;

const queryParamsObject = new URLSearchParams(location.search);

// The following variable are initialized all the way at the bottom of this file
let importScriptPathPrefix: string;

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

  return {base: `${url.origin}/remote/serve_file/${version[1]}/`, version: version[1]};
}

export const mappingForLayoutTests = new Map<string, string>([
  ['panels/animation', 'animation'],
  ['panels/browser_debugger', 'browser_debugger'],
  ['panels/changes', 'changes'],
  ['panels/console', 'console'],
  ['panels/elements', 'elements'],
  ['panels/emulation', 'emulation'],
  ['panels/mobile_throttling', 'mobile_throttling'],
  ['panels/network', 'network'],
  ['panels/profiler', 'profiler'],
  ['panels/application', 'resources'],
  ['panels/search', 'search'],
  ['panels/sources', 'sources'],
  ['panels/snippets', 'snippets'],
  ['panels/settings', 'settings'],
  ['panels/timeline', 'timeline'],
  ['panels/web_audio', 'web_audio'],
  ['models/persistence', 'persistence'],
  ['models/workspace_diff', 'workspace_diff'],
  ['entrypoints/main', 'main'],
  ['third_party/diff', 'diff'],
  ['ui/legacy/components/inline_editor', 'inline_editor'],
  ['ui/legacy/components/data_grid', 'data_grid'],
  ['ui/legacy/components/perf_ui', 'perf_ui'],
  ['ui/legacy/components/source_frame', 'source_frame'],
  ['ui/legacy/components/color_picker', 'color_picker'],
  ['ui/legacy/components/cookie_table', 'cookie_table'],
  ['ui/legacy/components/quick_open', 'quick_open'],
  ['ui/legacy/components/utils', 'components'],
]);

export class Runtime {
  readonly #modules: Module[];
  modulesMap: {
    [x: string]: Module,
  };
  readonly #descriptorsMap: {
    [x: string]: ModuleDescriptor,
  };
  private constructor(descriptors: ModuleDescriptor[]) {
    this.#modules = [];
    this.modulesMap = {};
    this.#descriptorsMap = {};

    for (const descriptor of descriptors) {
      this.registerModule(descriptor);
    }
  }

  static instance(opts: {
    forceNew: boolean|null,
    moduleDescriptors: Array<ModuleDescriptor>|null,
  }|undefined = {forceNew: null, moduleDescriptors: null}): Runtime {
    const {forceNew, moduleDescriptors} = opts;
    if (!runtimeInstance || forceNew) {
      if (!moduleDescriptors) {
        throw new Error(`Unable to create runtime: moduleDescriptors must be provided: ${new Error().stack}`);
      }

      runtimeInstance = new Runtime(moduleDescriptors);
    }

    return runtimeInstance;
  }

  static removeInstance(): void {
    runtimeInstance = undefined;
  }

  /**
   * http://tools.ietf.org/html/rfc3986#section-5.2.4
   */
  static normalizePath(path: string): string {
    if (path.indexOf('..') === -1 && path.indexOf('.') === -1) {
      return path;
    }

    const normalizedSegments = [];
    const segments = path.split('/');
    for (const segment of segments) {
      if (segment === '.') {
        continue;
      } else if (segment === '..') {
        normalizedSegments.pop();
      } else if (segment) {
        normalizedSegments.push(segment);
      }
    }
    let normalizedPath = normalizedSegments.join('/');
    if (normalizedPath[normalizedPath.length - 1] === '/') {
      return normalizedPath;
    }
    if (path[0] === '/' && normalizedPath) {
      normalizedPath = '/' + normalizedPath;
    }
    if ((path[path.length - 1] === '/') || (segments[segments.length - 1] === '.') ||
        (segments[segments.length - 1] === '..')) {
      normalizedPath = normalizedPath + '/';
    }

    return normalizedPath;
  }

  static queryParam(name: string): string|null {
    return queryParamsObject.get(name);
  }

  static experimentsSetting(): {
    [x: string]: boolean,
  } {
    try {
      return JSON.parse(
                 self.localStorage && self.localStorage['experiments'] ? self.localStorage['experiments'] : '{}') as {
        [x: string]: boolean,
      };
    } catch (e) {
      console.error('Failed to parse localStorage[\'experiments\']');
      return {};
    }
  }

  static assert(value: boolean|undefined, message: string): void {
    if (value) {
      return;
    }
    originalAssert.call(originalConsole, value, message + ' ' + new Error().stack);
  }

  static setPlatform(platform: string): void {
    runtimePlatform = platform;
  }

  static platform(): string {
    return runtimePlatform;
  }

  static isDescriptorEnabled(descriptor: {
    experiment: ((string | undefined)|null),
    condition: ((string | undefined)|null),
  }): boolean {
    const activatorExperiment = descriptor['experiment'];
    if (activatorExperiment === '*') {
      return true;
    }
    if (activatorExperiment && activatorExperiment.startsWith('!') &&
        experiments.isEnabled(activatorExperiment.substring(1))) {
      return false;
    }
    if (activatorExperiment && !activatorExperiment.startsWith('!') && !experiments.isEnabled(activatorExperiment)) {
      return false;
    }
    const condition = descriptor['condition'];
    if (condition && !condition.startsWith('!') && !Runtime.queryParam(condition)) {
      return false;
    }
    if (condition && condition.startsWith('!') && Runtime.queryParam(condition.substring(1))) {
      return false;
    }
    return true;
  }

  static resolveSourceURL(path: string): string {
    let sourceURL: string = self.location.href;
    if (self.location.search) {
      sourceURL = sourceURL.replace(self.location.search, '');
    }
    sourceURL = sourceURL.substring(0, sourceURL.lastIndexOf('/') + 1) + path;
    return '\n/*# sourceURL=' + sourceURL + ' */';
  }

  module(moduleName: string): Module {
    return this.modulesMap[moduleName];
  }

  private registerModule(descriptor: ModuleDescriptor): void {
    const module = new Module(this, descriptor);
    this.#modules.push(module);
    this.modulesMap[descriptor['name']] = module;
    const mappedName = mappingForLayoutTests.get(descriptor['name']);
    if (mappedName !== undefined) {
      this.modulesMap[mappedName] = module;
    }
  }

  loadModulePromise(moduleName: string): Promise<boolean> {
    return this.modulesMap[moduleName].loadPromise();
  }

  loadAutoStartModules(moduleNames: string[]): Promise<boolean[]> {
    const promises = [];
    for (const moduleName of moduleNames) {
      promises.push(this.loadModulePromise(moduleName));
    }
    return Promise.all(promises);
  }

  getModulesMap(): {[x: string]: Module} {
    return this.modulesMap;
  }

  loadLegacyModule(modulePath: string): Promise<void> {
    return import(`../../${modulePath}`);
  }
}

export class ModuleDescriptor {
  name!: string;
  dependencies!: string[]|undefined;
  modules!: string[];
  resources!: string[];
  condition!: string|undefined;
  experiment!: string|null;
  constructor() {
  }
}
export interface Option {
  title: string;
  value: string|boolean;
  raw?: boolean;
  text?: string;
}

function computeContainingFolderName(name: string): string {
  if (name.includes('/')) {
    return name.substring(name.lastIndexOf('/') + 1, name.length);
  }
  return name;
}

export class Module {
  readonly #manager: Runtime;
  readonly descriptor: ModuleDescriptor;
  readonly #nameInternal: string;
  #loadedForTest: boolean;
  #pendingLoadPromise?: Promise<boolean>;
  constructor(manager: Runtime, descriptor: ModuleDescriptor) {
    this.#manager = manager;
    this.descriptor = descriptor;
    this.#nameInternal = descriptor.name;
    this.#loadedForTest = false;
  }

  name(): string {
    return this.#nameInternal;
  }

  enabled(): boolean {
    return Runtime.isDescriptorEnabled(this.descriptor);
  }

  resource(name: string): string {
    const fullName = this.#nameInternal + '/' + name;
    const content = cachedResources.get(fullName);
    if (!content) {
      throw new Error(fullName + ' not preloaded. Check module.json');
    }
    return content;
  }

  loadPromise(): Promise<boolean> {
    if (!this.enabled()) {
      return Promise.reject(new Error('Module ' + this.#nameInternal + ' is not enabled'));
    }

    if (this.#pendingLoadPromise) {
      return this.#pendingLoadPromise;
    }

    const dependencies = this.descriptor.dependencies;
    const dependencyPromises = [];
    for (let i = 0; dependencies && i < dependencies.length; ++i) {
      dependencyPromises.push(this.#manager.getModulesMap()[dependencies[i]].loadPromise());
    }

    this.#pendingLoadPromise = Promise.all(dependencyPromises).then(this.loadModules.bind(this)).then(() => {
      this.#loadedForTest = true;
      return this.#loadedForTest;
    });

    return this.#pendingLoadPromise;
  }

  private async loadModules(): Promise<void> {
    const containingFolderName = computeContainingFolderName(this.#nameInternal);

    const moduleFileName = `${containingFolderName}_module.js`;
    const entrypointFileName = `${containingFolderName}.js`;

    // If a module has resources, they are part of the `_module.js` files that are generated
    // by `build_release_applications`. These need to be loaded before any other code is
    // loaded, to make sure that the resource content is properly cached in `cachedResources`.
    if (this.descriptor.modules && this.descriptor.modules.includes(moduleFileName)) {
      await import(`../../${this.#nameInternal}/${moduleFileName}`);
    }

    await import(`../../${this.#nameInternal}/${entrypointFileName}`);
  }

  private modularizeURL(resourceName: string): string {
    return Runtime.normalizePath(this.#nameInternal + '/' + resourceName);
  }

  fetchResource(resourceName: string): Promise<string> {
    const sourceURL = getResourceURL(this.modularizeURL(resourceName));
    return loadResourcePromise(sourceURL);
  }
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

  enabledExperiments(): Experiment[] {
    return this.#experiments.filter(experiment => experiment.isEnabled());
  }

  private setExperimentsSetting(value: Object): void {
    if (!self.localStorage) {
      return;
    }
    self.localStorage['experiments'] = JSON.stringify(value);
  }

  register(experimentName: string, experimentTitle: string, unstable?: boolean, docLink?: string): void {
    Runtime.assert(
        !this.#experimentNames.has(experimentName), 'Duplicate registration of experiment ' + experimentName);
    this.#experimentNames.add(experimentName);
    this.#experiments.push(new Experiment(this, experimentName, experimentTitle, Boolean(unstable), docLink ?? ''));
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
    Runtime.assert(this.#experimentNames.has(experimentName), 'Unknown experiment ' + experimentName);
  }
}

export class Experiment {
  name: string;
  title: string;
  unstable: boolean;
  docLink?: string;
  readonly #experiments: ExperimentsSupport;
  constructor(experiments: ExperimentsSupport, name: string, title: string, unstable: boolean, docLink: string) {
    this.name = name;
    this.title = title;
    this.unstable = unstable;
    this.docLink = docLink;
    this.#experiments = experiments;
  }

  isEnabled(): boolean {
    return this.#experiments.isEnabled(this.name);
  }

  setEnabled(enabled: boolean): void {
    this.#experiments.setEnabled(this.name, enabled);
  }
}

export function loadResourcePromise(url: string): Promise<string> {
  return new Promise<string>(load);

  function load(fulfill: (arg0: string) => void, reject: (arg0: Error) => void): void {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = onreadystatechange;

    function onreadystatechange(this: XMLHttpRequest, _e: Event): void {
      if (xhr.readyState !== XMLHttpRequest.DONE) {
        return;
      }

      const response: string = this.response;

      // DevTools Proxy server can mask 404s as 200s, check the body to be sure
      const status = /^HTTP\/1.1 404/.test(response) ? 404 : xhr.status;

      if ([0, 200, 304].indexOf(status) === -1)  // Testing harness file:/// results in 0.
      {
        reject(new Error('While loading from url ' + url + ' server responded with a status of ' + status));
      } else {
        fulfill(response);
      }
    }
    xhr.send(null);
  }
}

function getResourceURL(scriptName: string, base?: string): string {
  const sourceURL = (base || importScriptPathPrefix) + scriptName;
  const schemaIndex = sourceURL.indexOf('://') + 3;
  let pathIndex = sourceURL.indexOf('/', schemaIndex);
  if (pathIndex === -1) {
    pathIndex = sourceURL.length;
  }
  return sourceURL.substring(0, pathIndex) + Runtime.normalizePath(sourceURL.substring(pathIndex));
}

(function(): void {
const baseUrl = self.location ? self.location.origin + self.location.pathname : '';
importScriptPathPrefix = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
})();

// This must be constructed after the query parameters have been parsed.
export const experiments = new ExperimentsSupport();

export const cachedResources = new Map<string, string>();

// Only exported for LightHouse, which uses it in `report-generator.js`.
// Do not use this global in DevTools' implementation.
// TODO(crbug.com/1127292): remove this global
// @ts-ignore
globalThis.EXPORTED_CACHED_RESOURCES_ONLY_FOR_LIGHTHOUSE = cachedResources;

export let appStartedPromiseCallback: () => void;
export const appStarted = new Promise<void>(fulfill => {
  appStartedPromiseCallback = fulfill;
});

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum ExperimentName {
  CAPTURE_NODE_CREATION_STACKS = 'captureNodeCreationStacks',
  CSS_OVERVIEW = 'cssOverview',
  LIVE_HEAP_PROFILE = 'liveHeapProfile',
  DEVELOPER_RESOURCES_VIEW = 'developerResourcesView',
  TIMELINE_REPLAY_EVENT = 'timelineReplayEvent',
  CSP_VIOLATIONS_VIEW = 'cspViolationsView',
  WASM_DWARF_DEBUGGING = 'wasmDWARFDebugging',
  ALL = '*',
  PROTOCOL_MONITOR = 'protocolMonitor',
  WEBAUTHN_PANE = 'webauthnPane',
  SYNC_SETTINGS = 'syncSettings',
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum ConditionName {
  CAN_DOCK = 'can_dock',
  NOT_SOURCES_HIDE_ADD_FOLDER = '!sources.hide_add_folder',
}
