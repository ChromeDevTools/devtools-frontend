// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

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
  ['models/persistence', 'persistence'],
]);

export class Runtime {
  _modules: Module[];
  _modulesMap: {
    [x: string]: Module,
  };
  _descriptorsMap: {
    [x: string]: ModuleDescriptor,
  };
  private constructor(descriptors: ModuleDescriptor[]) {
    this._modules = [];
    this._modulesMap = {};
    this._descriptorsMap = {};

    for (const descriptor of descriptors) {
      this._registerModule(descriptor);
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

  static _experimentsSetting(): {
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

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static _assert(value: any, message: string): void {
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
    return this._modulesMap[moduleName];
  }

  _registerModule(descriptor: ModuleDescriptor): void {
    const module = new Module(this, descriptor);
    this._modules.push(module);
    this._modulesMap[descriptor['name']] = module;
    const mappedName = mappingForLayoutTests.get(descriptor['name']);
    if (mappedName !== undefined) {
      this._modulesMap[mappedName] = module;
    }
  }

  loadModulePromise(moduleName: string): Promise<boolean> {
    return this._modulesMap[moduleName]._loadPromise();
  }

  loadAutoStartModules(moduleNames: string[]): Promise<boolean[]> {
    const promises = [];
    for (const moduleName of moduleNames) {
      promises.push(this.loadModulePromise(moduleName));
    }
    return Promise.all(promises);
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
  _manager: Runtime;
  _descriptor: ModuleDescriptor;
  _name: string;
  _loadedForTest: boolean;
  _pendingLoadPromise?: Promise<boolean>;
  constructor(manager: Runtime, descriptor: ModuleDescriptor) {
    this._manager = manager;
    this._descriptor = descriptor;
    this._name = descriptor.name;
    this._loadedForTest = false;
  }

  name(): string {
    return this._name;
  }

  enabled(): boolean {
    return Runtime.isDescriptorEnabled(this._descriptor);
  }

  resource(name: string): string {
    const fullName = this._name + '/' + name;
    const content = cachedResources.get(fullName);
    if (!content) {
      throw new Error(fullName + ' not preloaded. Check module.json');
    }
    return content;
  }

  _loadPromise(): Promise<boolean> {
    if (!this.enabled()) {
      return Promise.reject(new Error('Module ' + this._name + ' is not enabled'));
    }

    if (this._pendingLoadPromise) {
      return this._pendingLoadPromise;
    }

    const dependencies = this._descriptor.dependencies;
    const dependencyPromises = [];
    for (let i = 0; dependencies && i < dependencies.length; ++i) {
      dependencyPromises.push(this._manager._modulesMap[dependencies[i]]._loadPromise());
    }

    this._pendingLoadPromise = Promise.all(dependencyPromises).then(this._loadModules.bind(this)).then(() => {
      this._loadedForTest = true;
      return this._loadedForTest;
    });

    return this._pendingLoadPromise;
  }

  async _loadModules(): Promise<void> {
    const containingFolderName = computeContainingFolderName(this._name);

    const moduleFileName = `${containingFolderName}_module.js`;
    const entrypointFileName = `${containingFolderName}.js`;

    // If a module has resources, they are part of the `_module.js` files that are generated
    // by `build_release_applications`. These need to be loaded before any other code is
    // loaded, to make sure that the resource content is properly cached in `cachedResources`.
    if (this._descriptor.modules && this._descriptor.modules.includes(moduleFileName)) {
      await import(`../../${this._name}/${moduleFileName}`);
    }

    await import(`../../${this._name}/${entrypointFileName}`);
  }

  _modularizeURL(resourceName: string): string {
    return Runtime.normalizePath(this._name + '/' + resourceName);
  }

  fetchResource(resourceName: string): Promise<string> {
    const sourceURL = getResourceURL(this._modularizeURL(resourceName));
    return loadResourcePromise(sourceURL);
  }

  substituteURL(value: string): string {
    return value.replace(/@url\(([^\)]*?)\)/g, convertURL.bind(this));

    function convertURL(this: Module, match: string, url: string): string {
      return importScriptPathPrefix + this._modularizeURL(url);
    }
  }
}

export class ExperimentsSupport {
  _experiments: Experiment[];
  _experimentNames: Set<string>;
  _enabledTransiently: Set<string>;
  _enabledByDefault: Set<string>;
  _serverEnabled: Set<string>;
  constructor() {
    this._experiments = [];
    this._experimentNames = new Set();
    this._enabledTransiently = new Set();
    this._enabledByDefault = new Set();
    this._serverEnabled = new Set();
  }

  allConfigurableExperiments(): Experiment[] {
    const result = [];
    for (const experiment of this._experiments) {
      if (!this._enabledTransiently.has(experiment.name)) {
        result.push(experiment);
      }
    }
    return result;
  }

  enabledExperiments(): Experiment[] {
    return this._experiments.filter(experiment => experiment.isEnabled());
  }

  _setExperimentsSetting(value: Object): void {
    if (!self.localStorage) {
      return;
    }
    self.localStorage['experiments'] = JSON.stringify(value);
  }

  register(experimentName: string, experimentTitle: string, unstable?: boolean): void {
    Runtime._assert(
        !this._experimentNames.has(experimentName), 'Duplicate registration of experiment ' + experimentName);
    this._experimentNames.add(experimentName);
    this._experiments.push(new Experiment(this, experimentName, experimentTitle, Boolean(unstable)));
  }

  isEnabled(experimentName: string): boolean {
    this._checkExperiment(experimentName);
    // Check for explicitly disabled experiments first - the code could call setEnable(false) on the experiment enabled
    // by default and we should respect that.
    if (Runtime._experimentsSetting()[experimentName] === false) {
      return false;
    }
    if (this._enabledTransiently.has(experimentName) || this._enabledByDefault.has(experimentName)) {
      return true;
    }
    if (this._serverEnabled.has(experimentName)) {
      return true;
    }

    return Boolean(Runtime._experimentsSetting()[experimentName]);
  }

  setEnabled(experimentName: string, enabled: boolean): void {
    this._checkExperiment(experimentName);
    const experimentsSetting = Runtime._experimentsSetting();
    experimentsSetting[experimentName] = enabled;
    this._setExperimentsSetting(experimentsSetting);
  }

  enableExperimentsTransiently(experimentNames: string[]): void {
    for (const experimentName of experimentNames) {
      this._checkExperiment(experimentName);
      this._enabledTransiently.add(experimentName);
    }
  }

  enableExperimentsByDefault(experimentNames: string[]): void {
    for (const experimentName of experimentNames) {
      this._checkExperiment(experimentName);
      this._enabledByDefault.add(experimentName);
    }
  }

  setServerEnabledExperiments(experimentNames: string[]): void {
    for (const experiment of experimentNames) {
      this._checkExperiment(experiment);
      this._serverEnabled.add(experiment);
    }
  }

  enableForTest(experimentName: string): void {
    this._checkExperiment(experimentName);
    this._enabledTransiently.add(experimentName);
  }

  clearForTest(): void {
    this._experiments = [];
    this._experimentNames.clear();
    this._enabledTransiently.clear();
    this._enabledByDefault.clear();
    this._serverEnabled.clear();
  }

  cleanUpStaleExperiments(): void {
    const experimentsSetting = Runtime._experimentsSetting();
    const cleanedUpExperimentSetting: {
      [x: string]: boolean,
    } = {};
    for (const {name: experimentName} of this._experiments) {
      if (experimentsSetting.hasOwnProperty(experimentName)) {
        const isEnabled = experimentsSetting[experimentName];
        if (isEnabled || this._enabledByDefault.has(experimentName)) {
          cleanedUpExperimentSetting[experimentName] = isEnabled;
        }
      }
    }
    this._setExperimentsSetting(cleanedUpExperimentSetting);
  }

  _checkExperiment(experimentName: string): void {
    Runtime._assert(this._experimentNames.has(experimentName), 'Unknown experiment ' + experimentName);
  }
}

export class Experiment {
  name: string;
  title: string;
  unstable: boolean;
  _experiments: ExperimentsSupport;
  constructor(experiments: ExperimentsSupport, name: string, title: string, unstable: boolean) {
    this.name = name;
    this.title = title;
    this.unstable = unstable;
    this._experiments = experiments;
  }

  isEnabled(): boolean {
    return this._experiments.isEnabled(this.name);
  }

  setEnabled(enabled: boolean): void {
    this._experiments.setEnabled(this.name, enabled);
  }
}

export function loadResourcePromise(url: string): Promise<string> {
  return new Promise<string>(load);

  function load(fulfill: (arg0: string) => void, reject: (arg0: Error) => void): void {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = onreadystatechange;

    function onreadystatechange(e: Event): void {
      if (xhr.readyState !== XMLHttpRequest.DONE) {
        return;
      }

      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const {response} = (e.target as any);

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
  RECORDER = 'recorder',
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum ConditionName {
  CAN_DOCK = 'can_dock',
  NOT_SOURCES_HIDE_ADD_FOLDER = '!sources.hide_add_folder',
}
