// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Workspace from '../workspace/workspace.js';

import {type DebuggerWorkspaceBinding} from './DebuggerWorkspaceBinding.js';

const UIStrings = {
  /**
   *@description Text to stop preventing the debugger from stepping into library code
   */
  removeFromIgnoreList: 'Remove from ignore list',
  /**
   *@description Text for scripts that should not be stepped into when debugging
   */
  addScriptToIgnoreList: 'Add script to ignore list',
  /**
   *@description Text for directories whose scripts should not be stepped into when debugging
   */
  addDirectoryToIgnoreList: 'Add directory to ignore list',
  /**
   *@description A context menu item in the Call Stack Sidebar Pane of the Sources panel
   */
  addAllContentScriptsToIgnoreList: 'Add all content scripts to ignore list',
  /**
   *@description A context menu item in the Call Stack Sidebar Pane of the Sources panel
   */
  addAllThirdPartyScriptsToIgnoreList: 'Add all third-party scripts to ignore list',
};

const str_ = i18n.i18n.registerUIStrings('models/bindings/IgnoreListManager.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let ignoreListManagerInstance: IgnoreListManager|undefined;

export class IgnoreListManager implements SDK.TargetManager.SDKModelObserver<SDK.DebuggerModel.DebuggerModel> {
  readonly #debuggerWorkspaceBinding: DebuggerWorkspaceBinding;
  readonly #listeners: Set<() => void>;
  readonly #isIgnoreListedURLCache: Map<string, boolean>;

  private constructor(debuggerWorkspaceBinding: DebuggerWorkspaceBinding) {
    this.#debuggerWorkspaceBinding = debuggerWorkspaceBinding;

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.GlobalObjectCleared,
        this.clearCacheIfNeeded.bind(this), this);
    Common.Settings.Settings.instance()
        .moduleSetting('skipStackFramesPattern')
        .addChangeListener(this.patternChanged.bind(this));
    Common.Settings.Settings.instance()
        .moduleSetting('skipContentScripts')
        .addChangeListener(this.patternChanged.bind(this));
    Common.Settings.Settings.instance()
        .moduleSetting('automaticallyIgnoreListKnownThirdPartyScripts')
        .addChangeListener(this.patternChanged.bind(this));
    Common.Settings.Settings.instance()
        .moduleSetting('enableIgnoreListing')
        .addChangeListener(this.patternChanged.bind(this));

    this.#listeners = new Set();

    this.#isIgnoreListedURLCache = new Map();

    SDK.TargetManager.TargetManager.instance().observeModels(SDK.DebuggerModel.DebuggerModel, this);
  }

  static instance(opts: {
    forceNew: boolean|null,
    debuggerWorkspaceBinding: DebuggerWorkspaceBinding|null,
  } = {forceNew: null, debuggerWorkspaceBinding: null}): IgnoreListManager {
    const {forceNew, debuggerWorkspaceBinding} = opts;
    if (!ignoreListManagerInstance || forceNew) {
      if (!debuggerWorkspaceBinding) {
        throw new Error(`Unable to create settings: debuggerWorkspaceBinding must be provided: ${new Error().stack}`);
      }

      ignoreListManagerInstance = new IgnoreListManager(debuggerWorkspaceBinding);
    }

    return ignoreListManagerInstance;
  }

  static removeInstance(): void {
    ignoreListManagerInstance = undefined;
  }

  addChangeListener(listener: () => void): void {
    this.#listeners.add(listener);
  }

  removeChangeListener(listener: () => void): void {
    this.#listeners.delete(listener);
  }

  modelAdded(debuggerModel: SDK.DebuggerModel.DebuggerModel): void {
    void this.setIgnoreListPatterns(debuggerModel);
    const sourceMapManager = debuggerModel.sourceMapManager();
    sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapAttached, this.sourceMapAttached, this);
    sourceMapManager.addEventListener(SDK.SourceMapManager.Events.SourceMapDetached, this.sourceMapDetached, this);
  }

  modelRemoved(debuggerModel: SDK.DebuggerModel.DebuggerModel): void {
    this.clearCacheIfNeeded();
    const sourceMapManager = debuggerModel.sourceMapManager();
    sourceMapManager.removeEventListener(SDK.SourceMapManager.Events.SourceMapAttached, this.sourceMapAttached, this);
    sourceMapManager.removeEventListener(SDK.SourceMapManager.Events.SourceMapDetached, this.sourceMapDetached, this);
  }

  private clearCacheIfNeeded(): void {
    if (this.#isIgnoreListedURLCache.size > 1024) {
      this.#isIgnoreListedURLCache.clear();
    }
  }

  private getSkipStackFramesPatternSetting(): Common.Settings.RegExpSetting {
    return Common.Settings.Settings.instance().moduleSetting('skipStackFramesPattern') as Common.Settings.RegExpSetting;
  }

  private setIgnoreListPatterns(debuggerModel: SDK.DebuggerModel.DebuggerModel): Promise<boolean> {
    const regexPatterns = this.enableIgnoreListing ? this.getSkipStackFramesPatternSetting().getAsArray() : [];
    const patterns = ([] as string[]);
    for (const item of regexPatterns) {
      if (!item.disabled && item.pattern) {
        patterns.push(item.pattern);
      }
    }
    return debuggerModel.setBlackboxPatterns(patterns);
  }

  isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean {
    const projectType = uiSourceCode.project().type();
    const isContentScript = projectType === Workspace.Workspace.projectTypes.ContentScripts;
    if (this.skipContentScripts && isContentScript) {
      return true;
    }
    if (uiSourceCode.isUnconditionallyIgnoreListed()) {
      return true;
    }
    const url = this.uiSourceCodeURL(uiSourceCode);
    return url ? this.isUserOrSourceMapIgnoreListedURL(url, uiSourceCode.isKnownThirdParty()) : false;
  }

  isUserOrSourceMapIgnoreListedURL(url: Platform.DevToolsPath.UrlString, isKnownThirdParty: boolean): boolean {
    if (this.isUserIgnoreListedURL(url)) {
      return true;
    }
    if (this.automaticallyIgnoreListKnownThirdPartyScripts && isKnownThirdParty) {
      return true;
    }
    return false;
  }

  isUserIgnoreListedURL(url: Platform.DevToolsPath.UrlString, isContentScript?: boolean): boolean {
    if (!this.enableIgnoreListing) {
      return false;
    }
    if (this.#isIgnoreListedURLCache.has(url)) {
      return Boolean(this.#isIgnoreListedURLCache.get(url));
    }
    if (isContentScript && this.skipContentScripts) {
      return true;
    }
    const regex = this.getSkipStackFramesPatternSetting().asRegExp();
    const isIgnoreListed = (regex && regex.test(url)) || false;
    this.#isIgnoreListedURLCache.set(url, isIgnoreListed);
    return isIgnoreListed;
  }

  private sourceMapAttached(
      event: Common.EventTarget.EventTargetEvent<{client: SDK.Script.Script, sourceMap: SDK.SourceMap.SourceMap}>):
      void {
    const script = event.data.client;
    const sourceMap = event.data.sourceMap;
    void this.updateScriptRanges(script, sourceMap);
  }

  private sourceMapDetached(
      event: Common.EventTarget.EventTargetEvent<{client: SDK.Script.Script, sourceMap: SDK.SourceMap.SourceMap}>):
      void {
    const script = event.data.client;
    void this.updateScriptRanges(script, undefined);
  }

  private async updateScriptRanges(script: SDK.Script.Script, sourceMap: SDK.SourceMap.SourceMap|undefined):
      Promise<void> {
    let hasIgnoreListedMappings = false;
    if (!IgnoreListManager.instance().isUserIgnoreListedURL(script.sourceURL, script.isContentScript())) {
      hasIgnoreListedMappings =
          sourceMap?.sourceURLs().some(
              url => this.isUserOrSourceMapIgnoreListedURL(url, sourceMap.hasIgnoreListHint(url))) ??
          false;
    }
    if (!hasIgnoreListedMappings) {
      if (scriptToRange.get(script) && await script.setBlackboxedRanges([])) {
        scriptToRange.delete(script);
      }
      await this.#debuggerWorkspaceBinding.updateLocations(script);
      return;
    }

    if (!sourceMap) {
      return;
    }

    const newRanges =
        sourceMap
            .findRanges(
                srcURL => this.isUserOrSourceMapIgnoreListedURL(srcURL, sourceMap.hasIgnoreListHint(srcURL)),
                {isStartMatching: true})
            .flatMap(range => [range.start, range.end]);

    const oldRanges = scriptToRange.get(script) || [];
    if (!isEqual(oldRanges, newRanges) && await script.setBlackboxedRanges(newRanges)) {
      scriptToRange.set(script, newRanges);
    }
    void this.#debuggerWorkspaceBinding.updateLocations(script);

    function isEqual(rangesA: SourceRange[], rangesB: SourceRange[]): boolean {
      if (rangesA.length !== rangesB.length) {
        return false;
      }
      for (let i = 0; i < rangesA.length; ++i) {
        if (rangesA[i].lineNumber !== rangesB[i].lineNumber || rangesA[i].columnNumber !== rangesB[i].columnNumber) {
          return false;
        }
      }
      return true;
    }
  }

  private uiSourceCodeURL(uiSourceCode: Workspace.UISourceCode.UISourceCode): Platform.DevToolsPath.UrlString|null {
    return uiSourceCode.project().type() === Workspace.Workspace.projectTypes.Debugger ? null : uiSourceCode.url();
  }

  canIgnoreListUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean {
    const url = this.uiSourceCodeURL(uiSourceCode);
    return url ? Boolean(this.urlToRegExpString(url)) : false;
  }

  ignoreListUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    const url = this.uiSourceCodeURL(uiSourceCode);
    if (url) {
      this.ignoreListURL(url);
    }
  }

  unIgnoreListUISourceCode(uiSourceCode: Workspace.UISourceCode.UISourceCode): void {
    if (uiSourceCode.project().type() === Workspace.Workspace.projectTypes.ContentScripts) {
      this.unIgnoreListContentScripts();
    }

    if (uiSourceCode.isKnownThirdParty()) {
      this.unIgnoreListThirdParty();
    }

    const url = this.uiSourceCodeURL(uiSourceCode);
    if (url) {
      this.unIgnoreListURL(url);
    }
  }

  get enableIgnoreListing(): boolean {
    return Common.Settings.Settings.instance().moduleSetting('enableIgnoreListing').get();
  }

  set enableIgnoreListing(value: boolean) {
    Common.Settings.Settings.instance().moduleSetting('enableIgnoreListing').set(value);
  }

  get skipContentScripts(): boolean {
    return this.enableIgnoreListing && Common.Settings.Settings.instance().moduleSetting('skipContentScripts').get();
  }

  get automaticallyIgnoreListKnownThirdPartyScripts(): boolean {
    return this.enableIgnoreListing &&
        Common.Settings.Settings.instance().moduleSetting('automaticallyIgnoreListKnownThirdPartyScripts').get();
  }

  ignoreListContentScripts(): void {
    if (!this.enableIgnoreListing) {
      this.enableIgnoreListing = true;
    }
    Common.Settings.Settings.instance().moduleSetting('skipContentScripts').set(true);
  }

  unIgnoreListContentScripts(): void {
    Common.Settings.Settings.instance().moduleSetting('skipContentScripts').set(false);
  }

  ignoreListThirdParty(): void {
    if (!this.enableIgnoreListing) {
      this.enableIgnoreListing = true;
    }
    Common.Settings.Settings.instance().moduleSetting('automaticallyIgnoreListKnownThirdPartyScripts').set(true);
  }

  unIgnoreListThirdParty(): void {
    Common.Settings.Settings.instance().moduleSetting('automaticallyIgnoreListKnownThirdPartyScripts').set(false);
  }

  private ignoreListURL(url: Platform.DevToolsPath.UrlString): void {
    const regexValue = this.urlToRegExpString(url);
    if (!regexValue) {
      return;
    }
    this.ignoreListRegex(regexValue, url);
  }

  private ignoreListRegex(regexValue: string, disabledForUrl?: Platform.DevToolsPath.UrlString): void {
    const regexPatterns = this.getSkipStackFramesPatternSetting().getAsArray();

    let found = false;
    for (let i = 0; i < regexPatterns.length; ++i) {
      const item = regexPatterns[i];
      if (item.pattern === regexValue || (disabledForUrl && item.disabledForUrl === disabledForUrl)) {
        item.disabled = false;
        item.disabledForUrl = undefined;
        found = true;
      }
    }
    if (!found) {
      regexPatterns.push({pattern: regexValue, disabled: false});
    }
    if (!this.enableIgnoreListing) {
      this.enableIgnoreListing = true;
    }
    this.getSkipStackFramesPatternSetting().setAsArray(regexPatterns);
  }

  private unIgnoreListURL(url: Platform.DevToolsPath.UrlString): void {
    let regexPatterns = this.getSkipStackFramesPatternSetting().getAsArray();
    const regexValue = IgnoreListManager.instance().urlToRegExpString(url);
    if (!regexValue) {
      return;
    }

    regexPatterns = regexPatterns.filter(function(item) {
      return item.pattern !== regexValue;
    });
    for (let i = 0; i < regexPatterns.length; ++i) {
      const item = regexPatterns[i];
      if (item.disabled) {
        continue;
      }
      try {
        const regex = new RegExp(item.pattern);
        if (regex.test(url)) {
          item.disabled = true;
          item.disabledForUrl = url;
        }
      } catch (e) {
      }
    }
    this.getSkipStackFramesPatternSetting().setAsArray(regexPatterns);
  }

  private removeIgnoreListPattern(regexValue: string): void {
    let regexPatterns = this.getSkipStackFramesPatternSetting().getAsArray();
    regexPatterns = regexPatterns.filter(function(item) {
      return item.pattern !== regexValue;
    });
    this.getSkipStackFramesPatternSetting().setAsArray(regexPatterns);
  }

  private ignoreListHasPattern(regexValue: string, enabledOnly: boolean): boolean {
    const regexPatterns = this.getSkipStackFramesPatternSetting().getAsArray();
    return regexPatterns.some(item => !(enabledOnly && item.disabled) && item.pattern === regexValue);
  }

  private async patternChanged(): Promise<void> {
    this.#isIgnoreListedURLCache.clear();

    const promises: Promise<unknown>[] = [];
    for (const debuggerModel of SDK.TargetManager.TargetManager.instance().models(SDK.DebuggerModel.DebuggerModel)) {
      promises.push(this.setIgnoreListPatterns(debuggerModel));
      const sourceMapManager = debuggerModel.sourceMapManager();
      for (const script of debuggerModel.scripts()) {
        promises.push(this.updateScriptRanges(script, sourceMapManager.sourceMapForClient(script)));
      }
    }
    await Promise.all(promises);
    const listeners = Array.from(this.#listeners);
    for (const listener of listeners) {
      listener();
    }
    this.patternChangeFinishedForTests();
  }

  private patternChangeFinishedForTests(): void {
    // This method is sniffed in tests.
  }

  private urlToRegExpString(url: Platform.DevToolsPath.UrlString): string {
    const parsedURL = new Common.ParsedURL.ParsedURL(url);
    if (parsedURL.isAboutBlank() || parsedURL.isDataURL()) {
      return '';
    }
    if (!parsedURL.isValid) {
      return '^' + Platform.StringUtilities.escapeForRegExp(url) + '$';
    }
    let name: string = parsedURL.lastPathComponent;
    if (name) {
      name = '/' + name;
    } else if (parsedURL.folderPathComponents) {
      name = parsedURL.folderPathComponents + '/';
    }
    if (!name) {
      name = parsedURL.host;
    }
    if (!name) {
      return '';
    }
    const scheme = parsedURL.scheme;
    let prefix = '';
    if (scheme && scheme !== 'http' && scheme !== 'https') {
      prefix = '^' + scheme + '://';
      if (scheme === 'chrome-extension') {
        prefix += parsedURL.host + '\\b';
      }
      prefix += '.*';
    }
    return prefix + Platform.StringUtilities.escapeForRegExp(name) + (url.endsWith(name) ? '$' : '\\b');
  }

  getIgnoreListURLContextMenuItems(uiSourceCode: Workspace.UISourceCode.UISourceCode):
      Array<{text: string, callback: () => void}> {
    if (uiSourceCode.project().type() === Workspace.Workspace.projectTypes.FileSystem) {
      return [];
    }

    const menuItems: Array<{text: string, callback: () => void}> = [];
    const canIgnoreList = this.canIgnoreListUISourceCode(uiSourceCode);
    const isIgnoreListed = this.isUserOrSourceMapIgnoreListedUISourceCode(uiSourceCode);
    const isContentScript = uiSourceCode.project().type() === Workspace.Workspace.projectTypes.ContentScripts;
    const isKnownThirdParty = uiSourceCode.isKnownThirdParty();

    if (isIgnoreListed) {
      if (canIgnoreList || isContentScript || isKnownThirdParty) {
        menuItems.push({
          text: i18nString(UIStrings.removeFromIgnoreList),
          callback: this.unIgnoreListUISourceCode.bind(this, uiSourceCode),
        });
      }
    } else {
      if (canIgnoreList) {
        menuItems.push({
          text: i18nString(UIStrings.addScriptToIgnoreList),
          callback: this.ignoreListUISourceCode.bind(this, uiSourceCode),
        });
      }
      if (isContentScript) {
        menuItems.push({
          text: i18nString(UIStrings.addAllContentScriptsToIgnoreList),
          callback: this.ignoreListContentScripts.bind(this),
        });
      }
      if (isKnownThirdParty) {
        menuItems.push({
          text: i18nString(UIStrings.addAllThirdPartyScriptsToIgnoreList),
          callback: this.ignoreListThirdParty.bind(this),
        });
      }
    }

    return menuItems;
  }

  getIgnoreListFolderContextMenuItems(url: Platform.DevToolsPath.UrlString):
      Array<{text: string, callback: () => void}> {
    const menuItems: Array<{text: string, callback: () => void}> = [];

    const regexValue = '^' + Platform.StringUtilities.escapeForRegExp(url) + '/';
    if (this.ignoreListHasPattern(regexValue, true)) {
      menuItems.push({
        text: i18nString(UIStrings.removeFromIgnoreList),
        callback: this.removeIgnoreListPattern.bind(this, regexValue),
      });
    } else {
      menuItems.push({
        text: i18nString(UIStrings.addDirectoryToIgnoreList),
        callback: this.ignoreListRegex.bind(this, regexValue),
      });
    }

    return menuItems;
  }
}

export interface SourceRange {
  lineNumber: number;
  columnNumber: number;
}

const scriptToRange = new WeakMap<SDK.Script.Script, SourceRange[]>();
